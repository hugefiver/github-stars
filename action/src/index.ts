import * as core from '@actions/core';
import { graphql } from "@octokit/graphql";
import * as fs from "fs";
import * as path from "path";
import { ProcessedRepository, GraphQLResponse } from "./types/github";

interface SimplifiedRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  languages: Record<string, { bytes: number; percentage: string; color?: string }>;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  starred_at: string;
  owner_login: string;
  owner_avatar_url: string;
  owner_html_url: string;
  topics: string[];
  licenseInfo: {
    key: string;
    name: string;
    spdxId: string;
    url: string | null;
  } | null;
  isArchived: boolean;
  isFork: boolean;
  isMirror: boolean;
  parent: {
    name: string;
    nameWithOwner: string;
    url: string;
  } | null;
  pushedAt: string | null;
}

// Utility function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Interface for GitHub rate limit response
interface RateLimitResponse {
  rateLimit: {
    limit: number;
    remaining: number;
    resetAt: string;
    used: number;
  };
}

// Interface for rate limit headers
interface RateLimitHeaders {
  'x-ratelimit-limit': string;
  'x-ratelimit-remaining': string;
  'x-ratelimit-used': string;
  'x-ratelimit-reset': string;
  'x-ratelimit-resource'?: string;
}

// Function to get current rate limit status
async function getRateLimitStatus(graphqlWithAuth: any): Promise<RateLimitResponse> {
  const rateLimitQuery = `
    query {
      rateLimit {
        limit
        remaining
        resetAt
        used
      }
    }
  `;

  try {
    const response = await graphqlWithAuth(rateLimitQuery) as RateLimitResponse;
    return response;
  } catch (error) {
    console.log('Failed to fetch rate limit status:', error);
    throw error;
  }
}

// Function to check and handle rate limit based on GraphQL response
const checkRateLimitFromGraphQL = async (response: any) => {
  // Extract rate limit info from GraphQL response
  const rateLimitInfo = response?.rateLimit;
  
  if (!rateLimitInfo) {
    console.log('Rate limit info not found in GraphQL response, skipping rate limit check');
    return;
  }

  const limit = rateLimitInfo.limit;
  const remaining = rateLimitInfo.remaining;
  const used = rateLimitInfo.used;
  const resetAt = rateLimitInfo.resetAt;

  console.log(`Rate Limit Status from GraphQL:`);
  console.log(`  Limit: ${limit}`);
  console.log(`  Remaining: ${remaining}`);
  console.log(`  Used: ${used}`);
  console.log(`  Reset at: ${new Date(resetAt).toISOString()}`);

  // Check if we're approaching the rate limit (less than 10% remaining or less than 5 requests)
  const threshold = Math.max(5, Math.ceil(limit * 0.1)); // 10% of limit or minimum 5 requests
  
  if (remaining <= threshold) {
    const now = new Date();
    const resetTime = new Date(resetAt);
    const waitTimeMs = Math.max(1000, resetTime.getTime() - now.getTime());
    const waitTimeSeconds = Math.ceil(waitTimeMs / 1000);
    
    console.log(`Approaching rate limit! Remaining requests: ${remaining} (threshold: ${threshold})`);
    console.log(`Rate limit will reset in ${waitTimeSeconds} seconds`);
    console.log(`Delaying next request to avoid hitting rate limit...`);
    
    // Wait for the rate limit to reset or a minimum time
    await delay(waitTimeMs);
    
    console.log('Delay completed, resuming requests');
  } else if (remaining <= threshold * 2) {
    console.log(`Warning: Getting close to rate limit. Remaining requests: ${remaining}`);
  }
};

// Enhanced GraphQL request handler that includes rate limit checking
const graphqlWithRateLimitCheck = async (graphqlWithAuth: any, query: string, variables?: any) => {
  let retryCount = 0;
  const maxRetries = 5;

  while (retryCount < maxRetries) {
    try {
      // Modify the query to include rate limit information
      const enhancedQuery = query.replace(/query\s*\(([^)]*)\)\s*{/, 'query($1) { rateLimit { limit remaining resetAt used }');
      
      // Make the GraphQL request with rate limit info
      const response = await graphqlWithAuth(enhancedQuery, variables);
      
      // Check rate limit from GraphQL response
      await checkRateLimitFromGraphQL(response);
      
      return response;
    } catch (error: any) {
      retryCount++;

      // Check if it's a rate limit error
      const isRateLimitError = error.message?.includes('rate limit') ||
        error.message?.includes('secondary rate limit') ||
        error.message?.includes('API rate limit exceeded');

      if (!isRateLimitError || retryCount >= maxRetries) {
        throw error;
      }

      console.log(`Rate limit hit (attempt ${retryCount}/${maxRetries})`);

      try {
        // Get current rate limit status
        const rateLimitInfo = await getRateLimitStatus(graphqlWithAuth);
        const resetAt = new Date(rateLimitInfo.rateLimit.resetAt);
        const now = new Date();
        const waitTimeMs = resetAt.getTime() - now.getTime();

        if (waitTimeMs > 0) {
          const waitTimeSeconds = Math.ceil(waitTimeMs / 1000);
          console.log(`Rate limit will reset at ${resetAt.toISOString()}`);
          console.log(`Waiting ${waitTimeSeconds} seconds for rate limit to reset...`);
          await delay(waitTimeMs);
        } else {
          // If reset time is in the past, wait a minimum time
          console.log('Rate limit should be reset, waiting 5 seconds to be safe...');
          await delay(5000);
        }
      } catch (rateLimitError) {
        // If we can't get rate limit info, fall back to exponential backoff
        console.log('Could not fetch rate limit info, using fallback delay');
        const fallbackDelay = 5000 * Math.pow(2, retryCount - 1); // 5s, 10s, 20s, 40s, 80s
        console.log(`Waiting ${fallbackDelay}ms before retry...`);
        await delay(fallbackDelay);
      }
    }
  }
};

// Function to handle rate limit with intelligent waiting (kept for backward compatibility)
const handleRateLimit = async (graphqlWithAuth: any, fn: () => Promise<any>, maxRetries = 5) => {
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      retryCount++;

      // Check if it's a rate limit error
      const isRateLimitError = error.message?.includes('rate limit') ||
        error.message?.includes('secondary rate limit') ||
        error.message?.includes('API rate limit exceeded');

      if (!isRateLimitError || retryCount >= maxRetries) {
        throw error;
      }

      console.log(`Rate limit hit (attempt ${retryCount}/${maxRetries})`);

      try {
        // Get current rate limit status
        const rateLimitInfo = await getRateLimitStatus(graphqlWithAuth);
        const resetAt = new Date(rateLimitInfo.rateLimit.resetAt);
        const now = new Date();
        const waitTimeMs = resetAt.getTime() - now.getTime();

        if (waitTimeMs > 0) {
          const waitTimeSeconds = Math.ceil(waitTimeMs / 1000);
          console.log(`Rate limit will reset at ${resetAt.toISOString()}`);
          console.log(`Waiting ${waitTimeSeconds} seconds for rate limit to reset...`);
          await delay(waitTimeMs);
        } else {
          // If reset time is in the past, wait a minimum time
          console.log('Rate limit should be reset, waiting 5 seconds to be safe...');
          await delay(5000);
        }
      } catch (rateLimitError) {
        // If we can't get rate limit info, fall back to exponential backoff
        console.log('Could not fetch rate limit info, using fallback delay');
        const fallbackDelay = 5000 * Math.pow(2, retryCount - 1); // 5s, 10s, 20s, 40s, 80s
        console.log(`Waiting ${fallbackDelay}ms before retry...`);
        await delay(fallbackDelay);
      }
    }
  }
};

async function run() {
  try {
    // 获取输入参数
    const githubToken = core.getInput('github-token');
    const username = core.getInput('username');
    const outputFile = core.getInput('output-file');
    const simpleOutputFile = core.getInput('simple-output-file');

    console.log(`Fetching starred repositories for user: ${username}`);

    // 创建 graphql 实例
    const graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${githubToken}`,
      },
    });

    // 使用GraphQL获取用户star的仓库列表和语言信息
    const processedRepos: ProcessedRepository[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    let totalCount = 0;
    let index = 1;

    while (hasNextPage) {
      const query = `
        query($username: String!, $cursor: String) {
          user(login: $username) {
            starredRepositories(first: 50, after: $cursor, orderBy: {field: STARRED_AT, direction: ASC}) {
              totalCount
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  id
                  name
                  nameWithOwner
                  description
                  url
                  primaryLanguage {
                    name
                  }
                  languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                    edges {
                      node {
                        name
                        color
                      }
                      size
                    }
                    totalSize
                  }
                  stargazerCount
                  forkCount
                  updatedAt
                  createdAt
                  owner {
                    login
                    avatarUrl
                    url
                  }
                  repositoryTopics(first: 10) {
                    nodes {
                      topic {
                        name
                      }
                    }
                  }
                  licenseInfo {
                    key
                    name
                    spdxId
                    url
                  }
                  fundingLinks {
                    platform
                    url
                  }
                  isArchived
                  isFork
                  parent {
                    name
                    nameWithOwner
                    url
                  }
                  isMirror
                  latestRelease {
                    name
                    tagName
                    createdAt
                    url
                  }
                  mirrorUrl
                  packages(first: 10) {
                    totalCount
                    nodes {
                      name
                      packageType
                      version(version: "latest") {
                        id
                        version
                        preRelease
                        platform
                        summary
                        readme
                        statistics {
                          downloadsTotalCount
                        }
                        release {
                          name
                          tagName
                          createdAt
                          url
                        }
                        package {
                          name
                          packageType
                          repository {
                            name
                            nameWithOwner
                            url
                          }
                        }
                      }
                    }
                  }
                  pushedAt
                }
                starredAt
              }
            }
          }
        }
      `;

      const variables = {
        username,
        cursor
      };

      const response = await graphqlWithRateLimitCheck(graphqlWithAuth, query, variables) as GraphQLResponse;
      const starredRepos = response.user.starredRepositories;

      if (!totalCount) {
        totalCount = starredRepos.totalCount;
        console.log(`Total starred repositories: ${totalCount}`);
      }

      const edges = starredRepos.edges;

      for (const edge of edges ?? []) {
        if (!edge) {
          console.warn('Skipping empty edge');
          continue;
        }
        const repo = edge.node;
        const starredAt = edge.starredAt;

        // 处理语言数据
        const languages: Record<string, { bytes: number; percentage: string; color?: string }> = {};
        if (repo.languages?.edges && repo.languages.totalSize && repo.languages.totalSize > 0) {
          const totalSize = repo.languages.totalSize;
          const langEdges = repo.languages.edges;
          if (langEdges) {
            for (const langEdge of langEdges) {
              if (!langEdge || !langEdge.node) {
                console.warn('Skipping empty language edge');
                continue;
              }
              const languageName = langEdge.node.name;
              const size = langEdge.size;
              languages[languageName] = {
                bytes: size,
                percentage: ((size / totalSize) * 100).toFixed(2),
                color: langEdge.node.color ?? undefined
              };
            }
          }
        }

        // 处理topics
        const topics = (repo.repositoryTopics ?
          repo.repositoryTopics.nodes?.flatMap(n => n?.topic?.name).filter((name): name is string => name !== undefined) : []) ?? [];

        processedRepos.push({
          id: index++,
          name: repo.name,
          full_name: repo.nameWithOwner,
          html_url: repo.url,
          description: repo.description ?? null,
          language: repo.primaryLanguage ? repo.primaryLanguage.name : null,
          languages: languages,
          stargazers_count: repo.stargazerCount,
          forks_count: repo.forkCount,
          updated_at: repo.updatedAt,
          created_at: repo.createdAt,
          starred_at: starredAt,
          owner: {
            login: repo.owner.login,
            avatar_url: repo.owner.avatarUrl,
            html_url: repo.owner.url
          },
          topics: topics,
          licenseInfo: repo.licenseInfo ? {
            key: repo.licenseInfo.key,
            name: repo.licenseInfo.name,
            spdxId: repo.licenseInfo.spdxId ?? '',
            url: repo.licenseInfo.url ?? null
          } : null,
          fundingLinks: repo.fundingLinks || [],
          isArchived: repo.isArchived,
          isFork: repo.isFork,
          parent: repo.parent ?? null,
          isMirror: repo.isMirror,
          latestRelease: repo.latestRelease ? {
            name: repo.latestRelease.name ?? '',
            tagName: repo.latestRelease.tagName,
            createdAt: repo.latestRelease.createdAt,
            url: repo.latestRelease.url
          } : null,
          mirrorUrl: repo.mirrorUrl ?? null,
          packages: (repo.packages?.nodes ?? [])
            .filter((p): p is NonNullable<typeof p> => p !== null)
            .map(p => ({
              totalCount: repo.packages?.totalCount ?? 0,
              name: p.name,
              packageType: String(p.packageType),
              version: p.version ? {
                id: p.version.id,
                version: p.version.version,
                preRelease: p.version.preRelease,
                platform: p.version.platform ?? null,
                summary: p.version.summary ?? null,
                readme: p.version.readme ?? null,
                statistics: p.version.statistics ? {
                  downloadsTotalCount: p.version.statistics.downloadsTotalCount
                } : null,
                release: p.version.release ? {
                  name: p.version.release.name ?? '',
                  tagName: p.version.release.tagName,
                  createdAt: p.version.release.createdAt,
                  url: p.version.release.url
                } : null,
                package: p.version.package ? {
                  name: p.version.package.name,
                  packageType: p.version.package.packageType,
                  repository: p.version.package.repository ? {
                    name: p.version.package.repository.name,
                    nameWithOwner: p.version.package.repository.nameWithOwner,
                    url: p.version.package.repository.url
                  } : null
                } : null
              } : null
            })) || [],
          pushedAt: repo.pushedAt ?? null
        });
      }

      console.log(`Processed ${edges?.length} repositories, total: ${processedRepos.length}/${totalCount}`);

      // 检查是否还有下一页
      hasNextPage = starredRepos.pageInfo.hasNextPage;
      cursor = starredRepos.pageInfo.endCursor ?? null;
    }

    console.log(`All repositories processed: ${processedRepos.length}`);

    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 保存完整数据到文件
    fs.writeFileSync(outputFile, JSON.stringify(processedRepos, null, 2));
    console.log(`Full data saved to ${outputFile}`);

    // 检查是否在生产环境中（通过环境变量判断）
    const isProduction = process.env.NODE_ENV === 'production' || process.env.GITHUB_ACTIONS === 'true';

    // 生成简化版本（包含languages字段）
    const simplifiedRepos: SimplifiedRepository[] = processedRepos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      language: repo.language,
      languages: repo.languages, // 添加languages字段
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      updated_at: repo.updated_at,
      created_at: repo.created_at,
      starred_at: repo.starred_at,
      owner_login: repo.owner.login,
      owner_avatar_url: repo.owner.avatar_url,
      owner_html_url: repo.owner.html_url,
      topics: repo.topics,
      licenseInfo: repo.licenseInfo,
      isArchived: repo.isArchived,
      isFork: repo.isFork,
      isMirror: repo.isMirror,
      parent: repo.parent,
      pushedAt: repo.pushedAt ?? null
    }));

    // 确保简化版输出目录存在
    const simpleOutputDir = path.dirname(simpleOutputFile);
    if (!fs.existsSync(simpleOutputDir)) {
      fs.mkdirSync(simpleOutputDir, { recursive: true });
    }

    // 保存简化数据到文件
    fs.writeFileSync(simpleOutputFile, JSON.stringify(simplifiedRepos, null, 2));
    console.log(`Simplified data saved to ${simpleOutputFile}`);

    if (isProduction) {
      console.log('Production environment detected, but simplified data generation is enabled');
    }

    // 设置输出参数
    core.setOutput('repositories-count', processedRepos.length.toString());
    core.setOutput('output-file', outputFile);
    core.setOutput('simple-output-file', simpleOutputFile);

  } catch (error) {
    core.setFailed(`Error fetching starred repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

run();
