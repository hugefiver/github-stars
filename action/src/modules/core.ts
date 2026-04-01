import * as fs from 'fs';
import * as core from '@actions/core';
import { ProcessedRepository, SimplifiedRepository, GraphQLResponse } from '../types/github';
import { GraphqlClient, createGraphqlClient, fetchStarredRepositories } from './api';
import { AppConfig } from './config';
import { RateLimitConfig, executeWithRetry, delay } from './rateLimit';
import { getErrorMessage } from './errorHandler';
import {
  processLanguages,
  processTopics,
  deduplicateRepositories,
  ensureDirectoryExists,
  generateSimplifiedRepos,
  decrementRequestSize,
} from './utils';

const MAX_PAGE_FAILURES = 3;
const THROTTLE_EVERY_N_REQUESTS = 5;
const THROTTLE_DELAY_MS = 2000;
const PAGE_FAILURE_DELAY_MS = 5000;

async function fetchPage(
  graphqlWithAuth: GraphqlClient,
  variables: { username: string; cursor: string | null; requestSize: number },
  rateLimitConfig: RateLimitConfig
): Promise<GraphQLResponse> {
  let retryCount = 0;
  let currentSize = variables.requestSize;
  const { maxRetries, minRequestSize, initialRequestSize } = rateLimitConfig;

  while (retryCount < maxRetries) {
    try {
      const result = await executeWithRetry(
        () => fetchStarredRepositories(graphqlWithAuth, { ...variables, requestSize: currentSize }),
        maxRetries
      );

      if (result?.errors && result.errors.length > 0) {
        const errorMessage = result.errors.map((e) => e.message).join('; ');
        throw new Error(`GraphQL errors: ${errorMessage}`);
      }

      if (currentSize < initialRequestSize) {
        currentSize = initialRequestSize;
        console.log(`Request succeeded, restoring request size to ${initialRequestSize}`);
      }

      return result;
    } catch (error: unknown) {
      retryCount++;
      currentSize = decrementRequestSize(currentSize, minRequestSize);

      console.log(`Request error: ${getErrorMessage(error)}`);
      console.log(`Reducing request size to ${currentSize} (retry ${retryCount}/${maxRetries})`);

      if (retryCount >= maxRetries || currentSize <= minRequestSize) {
        throw error;
      }

      const retryDelays = [5000, 10000, 30000];
      const delayTime = retryDelays[retryCount - 1] ?? 5000;
      console.log(`Waiting ${delayTime / 1000}s before retry...`);
      await delay(delayTime);
    }
  }

  throw new Error('Max retries exhausted');
}

function mapEdgeToRepo(
  edge: NonNullable<NonNullable<GraphQLResponse['user']>['starredRepositories']['edges']>[number]
): ProcessedRepository | null {
  if (!edge) return null;
  const repo = edge.node;
  const starredAt = edge.starredAt;

  const languages = processLanguages(repo.languages);
  const topics = processTopics(repo.repositoryTopics);

  return {
    id: repo.id,
    name: repo.name,
    full_name: repo.nameWithOwner,
    html_url: repo.url,
    description: repo.description ?? null,
    language: repo.primaryLanguage ? repo.primaryLanguage.name : null,
    languages,
    stargazers_count: repo.stargazerCount,
    forks_count: repo.forkCount,
    updated_at: repo.updatedAt,
    created_at: repo.createdAt,
    starred_at: starredAt,
    owner: {
      login: repo.owner.login,
      avatar_url: repo.owner.avatarUrl,
      html_url: repo.owner.url,
    },
    topics,
    licenseInfo: repo.licenseInfo
      ? {
          key: repo.licenseInfo.key,
          name: repo.licenseInfo.name,
          spdxId: repo.licenseInfo.spdxId ?? '',
          url: repo.licenseInfo.url ?? null,
        }
      : null,
    fundingLinks: repo.fundingLinks || [],
    isArchived: repo.isArchived,
    isFork: repo.isFork,
    parent: repo.parent ?? null,
    isMirror: repo.isMirror,
    latestRelease: repo.latestRelease
      ? {
          name: repo.latestRelease.name ?? '',
          tagName: repo.latestRelease.tagName,
          createdAt: repo.latestRelease.createdAt,
          url: repo.latestRelease.url,
        }
      : null,
    mirrorUrl: repo.mirrorUrl ?? null,
    packages:
      (repo.packages?.nodes ?? [])
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((p) => ({
          totalCount: repo.packages?.totalCount ?? 0,
          name: p.name,
          packageType: String(p.packageType),
          versions:
            (p.versions?.nodes ?? [])
              .filter((v): v is NonNullable<typeof v> => v !== null)
              .map((v) => ({
                id: v.id,
                version: v.version,
                preRelease: v.preRelease,
                platform: v.platform ?? null,
                summary: v.summary ?? null,
                readme: v.readme ?? null,
                statistics: v.statistics
                  ? { downloadsTotalCount: v.statistics.downloadsTotalCount }
                  : null,
                release: v.release
                  ? {
                      name: v.release.name ?? '',
                      tagName: v.release.tagName,
                      createdAt: v.release.createdAt,
                      url: v.release.url,
                    }
                  : null,
              })) || [],
        })) || [],
    pushedAt: repo.pushedAt ?? null,
  };
}

export async function processStarredRepositories(config: AppConfig): Promise<void> {
  const {
    githubToken,
    username,
    outputFile,
    simpleOutputFile,
    initialRequestSize,
    minRequestSize,
    maxRetries,
  } = config;

  try {
    console.log(`Fetching starred repositories for user: ${username}`);

    const graphqlWithAuth = createGraphqlClient(githubToken);
    const processedRepos: ProcessedRepository[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    let totalCount = 0;
    let requestCount = 0;
    let consecutivePageFailures = 0;

    while (hasNextPage) {
      try {
        const response = await fetchPage(
          graphqlWithAuth,
          { username, cursor, requestSize: initialRequestSize },
          { initialRequestSize, minRequestSize, maxRetries }
        );

        if (!response?.user) {
          throw new Error('GraphQL response missing user data');
        }

        consecutivePageFailures = 0;

        requestCount++;
        if (requestCount % THROTTLE_EVERY_N_REQUESTS === 0) {
          console.log(`Sent ${requestCount} requests, throttling ${THROTTLE_DELAY_MS}ms...`);
          await delay(THROTTLE_DELAY_MS);
        }

        const starredRepos = response.user.starredRepositories;

        if (!totalCount) {
          totalCount = starredRepos.totalCount;
          console.log(`Total starred repositories: ${totalCount}`);
        }

        const edges = starredRepos.edges;
        for (const edge of edges ?? []) {
          const repo = mapEdgeToRepo(edge);
          if (repo) processedRepos.push(repo);
        }

        console.log(
          `Processed ${edges?.length ?? 0} repositories, total: ${processedRepos.length}/${totalCount}`
        );

        hasNextPage = starredRepos.pageInfo.hasNextPage;
        cursor = starredRepos.pageInfo.endCursor ?? null;
      } catch (error: unknown) {
        consecutivePageFailures++;

        if (consecutivePageFailures >= MAX_PAGE_FAILURES) {
          console.error(
            `Failed ${MAX_PAGE_FAILURES} consecutive pages, aborting. Last error: ${getErrorMessage(error)}`
          );
          break;
        }

        console.warn(
          `Page fetch failed (${consecutivePageFailures}/${MAX_PAGE_FAILURES}): ${getErrorMessage(error)}`
        );

        if (cursor) {
          console.log(`Retrying from cursor: ${cursor}`);
        } else {
          console.warn('No cursor available, cannot advance past failure');
          break;
        }

        await delay(PAGE_FAILURE_DELAY_MS);
      }
    }

    console.log(`All repositories processed: ${processedRepos.length}`);

    const uniqueRepos = deduplicateRepositories(processedRepos);
    const duplicateCount = processedRepos.length - uniqueRepos.length;
    console.log(
      `Deduplication: ${processedRepos.length} → ${uniqueRepos.length} (${duplicateCount} duplicates)`
    );

    ensureDirectoryExists(outputFile);
    fs.writeFileSync(outputFile, JSON.stringify(uniqueRepos, null, 2));
    console.log(`Full data saved to ${outputFile}`);

    const simplifiedRepos: SimplifiedRepository[] = generateSimplifiedRepos(uniqueRepos);
    ensureDirectoryExists(simpleOutputFile);
    fs.writeFileSync(simpleOutputFile, JSON.stringify(simplifiedRepos, null, 2));
    console.log(`Simplified data saved to ${simpleOutputFile}`);

    core.setOutput('repositories-count', uniqueRepos.length.toString());
    core.setOutput('output-file', outputFile);
    core.setOutput('simple-output-file', simpleOutputFile);
  } catch (error: unknown) {
    console.error('Error Details:', error);
    core.setFailed(`Error fetching starred repositories: ${getErrorMessage(error)}`);
  }
}
