import * as core from '@actions/core';
import { graphql } from "@octokit/graphql";
import * as fs from "fs";
import * as path from "path";
import { ProcessedRepository, GraphQLResponse } from "./types/github";

interface SimplifiedRepository {
  id: string;
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

// 硬编码的请求大小设置
let initialRequestSize = 70;  // 初始请求大小
const minRequestSize = 1;         // 最小请求大小
let currentRequestSize = initialRequestSize;  // 当前请求大小


// Function to check rate limit headers and wait if necessary
const checkRateLimitHeaders = async (headers: any, retryCount = 0) => {
  const retryAfter = headers['retry-after'];
  const ratelimitRemaining = headers['x-ratelimit-remaining'];
  const ratelimitReset = headers['x-ratelimit-reset'];

  let waitTimeMs = 0;

  if (retryAfter) {
    // If retry-after header is present, wait for that many seconds
    waitTimeMs = parseInt(retryAfter) * 1000;
    console.log(`Retry-after header present: ${retryAfter} seconds`);
  } else if (ratelimitRemaining === '0' && ratelimitReset) {
    // If x-ratelimit-remaining is 0, wait until x-ratelimit-reset time
    const resetTime = parseInt(ratelimitReset) * 1000; // Convert to milliseconds
    const now = Date.now();
    waitTimeMs = Math.max(0, resetTime - now);
    console.log(`Rate limit remaining is 0, reset at ${new Date(resetTime).toISOString()}`);
  } else if (parseInt(ratelimitRemaining) <= 5) {
    // If rate limit is running low (<= 5 remaining), use a small delay as precaution
    console.log('Rate limit running low, using precautionary delay');
    waitTimeMs = 5000; // 5 seconds
  }

  // Apply exponential backoff if this is a retry
  if (retryCount > 0) {
    const backoffTime = 60000 * Math.pow(2, retryCount - 1); // 60s, 120s, 240s, 480s, 960s
    waitTimeMs = Math.max(waitTimeMs, backoffTime);
    console.log(`Applying exponential backoff for retry ${retryCount}: ${backoffTime}ms`);
  }

  if (waitTimeMs > 0) {
    const waitTimeSeconds = Math.ceil(waitTimeMs / 1000);
    console.log(`Waiting ${waitTimeSeconds} seconds due to rate limit headers...`);
    await delay(waitTimeMs);
  }
};

// 处理未知错误并递减请求大小的函数
async function handleRequestWithRetry(
  graphqlWithAuth: any,
  query: string,
  variables: any,
  maxRetries: number = 5
) {
  let retryCount = 0;
  let currentSize = variables.requestSize;

  while (retryCount < maxRetries) {
    try {
      // 先处理速率限制
      const result = await handleRateLimit(graphqlWithAuth, async () => {
        return await graphqlWithAuth(query, variables);
      });

      // 检查GraphQL错误
      if (result && result.errors && result.errors.length > 0) {
        const errorMessage = result.errors.map((e: any) => e.message).join('; ');
        throw new Error(`GraphQL errors: ${errorMessage}`);
      }

      // 如果成功，恢复到初始请求大小（如果之前被递减了）
      if (currentSize < initialRequestSize) {
        currentRequestSize = initialRequestSize;
        console.log(`请求成功，恢复请求大小至 ${initialRequestSize}`);
      }

      return result;
    } catch (error: any) {
      // 如果是速率限制错误，由 handleRateLimit 处理，这里直接抛出
      const isRateLimitError = error.message?.includes('rate limit') ||
        error.message?.includes('secondary rate limit') ||
        error.message?.includes('API rate limit exceeded') ||
        (error.status === 403 && error.message?.includes('API rate limit exceeded')) ||
        (error.status === 200 && error.message?.includes('secondary rate limit'));

      if (isRateLimitError) {
        throw error;
      }

      // 未知错误，递减请求大小
      currentSize = Math.max(minRequestSize, Math.floor(currentSize / 2));
      variables.requestSize = currentSize;
      currentRequestSize = currentSize; // 更新全局当前请求大小
      retryCount++;

      console.log(`未知错误: ${error.message}`);
      console.log(`当前请求参数:`);
      console.log(`- 用户名: ${variables.username}`);
      console.log(`- 翻页游标: ${variables.cursor || 'null'}`);
      console.log(`- 请求大小: ${variables.requestSize}`);
      console.log(`递减请求大小至 ${currentSize} (重试 ${retryCount}/${maxRetries})`);

      if (retryCount >= maxRetries || currentSize === minRequestSize) {
        console.log(`达到最大重试次数或最小请求大小，跳过此批次`);
        throw error;
      }
    }
  }
}

// Function to handle rate limit with intelligent waiting
const handleRateLimit = async (graphqlWithAuth: any, fn: () => Promise<any>, maxRetries = 5) => {
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // Execute the function
      const result = await fn();

      // Check if the result has headers (for successful responses)
      if (result && result.headers) {
        await checkRateLimitHeaders(result.headers, retryCount);
      }

      return result;
    } catch (error: any) {
      retryCount++;

      // Check if it's a rate limit error
      const isRateLimitError = error.message?.includes('rate limit') ||
        error.message?.includes('secondary rate limit') ||
        error.message?.includes('API rate limit exceeded') ||
        (error.status === 403 && error.message?.includes('API rate limit exceeded')) ||
        (error.status === 200 && error.message?.includes('secondary rate limit'));

      if (!isRateLimitError || retryCount >= maxRetries) {
        throw error;
      }

      console.log(`Rate limit hit (attempt ${retryCount}/${maxRetries})`);

      // Check for response headers
      const headers = error.headers || {};
      await checkRateLimitHeaders(headers, retryCount);
    }
  }

  throw new Error(`Maximum retries (${maxRetries}) exceeded due to rate limiting`);
};

async function run() {
  // 获取输入参数
  const githubToken = core.getInput('github-token');
  const username = core.getInput('username');
  const outputFile = core.getInput('output-file');
  const simpleOutputFile = core.getInput('simple-output-file');
  const batchSizeInput = parseInt(core.getInput('batch-size'));

  initialRequestSize = Math.min(Math.max(batchSizeInput, 10), 100); // 限制在1到100之间
  currentRequestSize = initialRequestSize;

  // 声明variables变量以便在catch块中访问
  let variables: { username: string; cursor: string | null; requestSize: number } = { username: '', cursor: null, requestSize: initialRequestSize };

  try {

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
    let requestCount = 0; // 添加请求计数器

    while (hasNextPage) {
      const query = `
        query($username: String!, $cursor: String, $requestSize: Int!) {
          user(login: $username) {
            starredRepositories(first: $requestSize, after: $cursor, orderBy: {field: STARRED_AT, direction: ASC}) {
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
                  packages(first: 3) {
                    totalCount
                    nodes {
                      name
                      packageType
                      versions(last: 3) {
                        nodes {
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

      variables = {
        username,
        cursor,
        requestSize: currentRequestSize
      };

      try {
        const response = await handleRequestWithRetry(
          graphqlWithAuth,
          query,
          variables
        ) as GraphQLResponse;

        // 检查响应中是否存在user字段
        if (!response.user) {
          throw new Error('GraphQL response missing user data');
        }

        // 每发送5个请求后延迟5秒
        requestCount++;
        if (requestCount % 5 === 0) {
          console.log(`已发送 ${requestCount} 个请求，延迟 2 秒...`);
          await delay(2000);
        }
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
            id: repo.id,
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
                versions: (p.versions?.nodes ?? [])
                  .filter((v): v is NonNullable<typeof v> => v !== null)
                  .map(v => ({
                    id: v.id,
                    version: v.version,
                    preRelease: v.preRelease,
                    platform: v.platform ?? null,
                    summary: v.summary ?? null,
                    readme: v.readme ?? null,
                    statistics: v.statistics ? {
                      downloadsTotalCount: v.statistics.downloadsTotalCount
                    } : null,
                    release: v.release ? {
                      name: v.release.name ?? '',
                      tagName: v.release.tagName,
                      createdAt: v.release.createdAt,
                      url: v.release.url
                    } : null
                  })) || []
              })) || [],
            pushedAt: repo.pushedAt ?? null
          });
        }

        console.log(`Processed ${edges?.length} repositories, total: ${processedRepos.length}/${totalCount}`);

        // 检查是否还有下一页
        hasNextPage = starredRepos.pageInfo.hasNextPage;
        cursor = starredRepos.pageInfo.endCursor ?? null;
      } catch (error) {
        // 如果重试后仍然失败，尝试跳过当前批次继续
        console.log(`当前批次请求失败，尝试继续下一页`);

        // 这里可以实现更智能的跳过逻辑，比如：
        // 1. 尝试将 cursor 前移一定数量
        // 2. 或者直接跳到下一页（如果可能）
        // 3. 或者终止整个流程

        // 为了简单起见，我们先终止整个流程
        throw error;
      }
    }

    console.log(`All repositories processed: ${processedRepos.length}`);

    // 根据 id 去重
    const uniqueRepos = processedRepos.filter((repo, index, self) =>
      index === self.findIndex(r => r.id === repo.id)
    );
    const duplicateCount = processedRepos.length - uniqueRepos.length;
    console.log(`去重完成:`);
    console.log(`- 原始仓库数量: ${processedRepos.length}`);
    console.log(`- 去重后仓库数量: ${uniqueRepos.length}`);
    console.log(`- 重复仓库数量: ${duplicateCount}`);
    if (duplicateCount > 0) {
      console.log(`- 去重率: ${((duplicateCount / processedRepos.length) * 100).toFixed(2)}%`);
    }

    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 保存完整数据到文件
    fs.writeFileSync(outputFile, JSON.stringify(uniqueRepos, null, 2));
    console.log(`Full data saved to ${outputFile}`);

    // 检查是否在生产环境中（通过环境变量判断）
    const isProduction = process.env.NODE_ENV === 'production' || process.env.GITHUB_ACTIONS === 'true';

    // 生成简化版本（包含languages字段）
    const simplifiedRepos: SimplifiedRepository[] = uniqueRepos.map(repo => ({
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
    core.setOutput('repositories-count', uniqueRepos.length.toString());
    core.setOutput('output-file', outputFile);
    core.setOutput('simple-output-file', simpleOutputFile);

  } catch (error) {
    // 打印请求参数以便调试
    console.error('GraphQL Variables:');
    console.error(JSON.stringify(variables, null, 2));
    console.error('Error Details:');
    console.error(error);

    core.setFailed(`Error fetching starred repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

run();
