import * as core from '@actions/core';
import { ProcessedRepository, SimplifiedRepository } from "../types/github";
import { ApiConfig, createGraphqlClient, fetchStarredRepositories, STARRED_REPOS_QUERY } from "./api";
import { RateLimitConfig, handleRateLimit, delay } from "./rateLimit";
import { 
  processLanguages, 
  processTopics, 
  deduplicateRepositories, 
  ensureDirectoryExists, 
  generateSimplifiedRepos,
  decrementRequestSize
} from "./utils";

// 配置接口
export interface Config extends ApiConfig, RateLimitConfig {
  outputFile: string;
  simpleOutputFile: string;
}

// 处理未知错误并递减请求大小的函数
async function handleRequestWithRetry(
  graphqlWithAuth: any,
  variables: { username: string; cursor: string | null; requestSize: number },
  config: RateLimitConfig
): Promise<any> {
  let retryCount = 0;
  let currentSize = variables.requestSize;
  const { maxRetries, minRequestSize, initialRequestSize } = config;

  while (retryCount < maxRetries) {
    try {
      // 先处理速率限制
      const result = await handleRateLimit(async () => {
        return await fetchStarredRepositories(graphqlWithAuth, variables);
      }, maxRetries);

      // 检查GraphQL错误
      if (result?.errors && result.errors.length > 0) {
        const errorMessage = result.errors.map((e: any) => e.message).join('; ');
        throw new Error(`GraphQL errors: ${errorMessage}`);
      }

      // 检查Status Code
      if (result?.status && result.status !== 200) {
        throw new Error(`Unexpected response status: ${result.status}`);
      }

      // 如果成功，恢复到初始请求大小（如果之前被递减了）
      if (currentSize < initialRequestSize) {
        currentSize = initialRequestSize;
        variables.requestSize = currentSize;
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
      currentSize = decrementRequestSize(currentSize, minRequestSize);
      variables.requestSize = currentSize;
      retryCount++;

      console.log(`未知错误: ${error.message}`);
      console.log(`当前请求参数:`);
      console.log(`- 用户名: ${variables.username}`);
      console.log(`- 翻页游标: ${variables.cursor || 'null'}`);
      console.log(`- 请求大小: ${variables.requestSize}`);
      console.log(`递减请求大小至 ${currentSize} (重试 ${retryCount}/${maxRetries})`);

      // 在重试前等待指定的时间：5s, 10s, 30s
      const retryDelays = [5000, 10000, 30000]; // 5s, 10s, 30s
      if (retryCount <= retryDelays.length) {
        const delayTime = retryDelays[retryCount - 1] || 5000; // 默认5s
        console.log(`等待 ${delayTime/1000} 秒后重试...`);
        await delay(delayTime);
      }

      if (retryCount >= maxRetries || currentSize === minRequestSize) {
        console.log(`达到最大重试次数或最小请求大小，跳过此批次`);
        throw error;
      }
    }
  }
}

// 主处理函数
export async function processStarredRepositories(config: Config): Promise<void> {
  const { githubToken, username, outputFile, simpleOutputFile, batchSize, initialRequestSize, minRequestSize, maxRetries } = config;
  
  // 初始化请求大小
  let currentRequestSize = initialRequestSize;
  
  // 声明variables变量以便在catch块中访问
  let variables: { username: string; cursor: string | null; requestSize: number } = { 
    username: '', 
    cursor: null, 
    requestSize: initialRequestSize 
  };

  try {
    console.log(`Fetching starred repositories for user: ${username}`);

    // 创建 graphql 实例
    const graphqlWithAuth = createGraphqlClient(githubToken);

    // 使用GraphQL获取用户star的仓库列表和语言信息
    const processedRepos: ProcessedRepository[] = [];
    let hasNextPage = true;
    let cursor: string | null = null;
    let totalCount = 0;
    let requestCount = 0; // 添加请求计数器

    while (hasNextPage) {
      variables = {
        username,
        cursor,
        requestSize: currentRequestSize
      };

      try {
        const response = await handleRequestWithRetry(
          graphqlWithAuth,
          variables,
          { initialRequestSize, minRequestSize, maxRetries }
        );

        // 检查响应中是否存在user字段
        if (!response || !response.user) {
          throw new Error('GraphQL response missing user data');
        }

        // 每发送5个请求后延迟2秒
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
          const languages = processLanguages(repo.languages);

          // 处理topics
          const topics = processTopics(repo.repositoryTopics);

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
              .filter((p: any): p is NonNullable<typeof p> => p !== null)
              .map((p: any) => ({
                totalCount: repo.packages?.totalCount ?? 0,
                name: p.name,
                packageType: String(p.packageType),
                versions: (p.versions?.nodes ?? [])
                  .filter((v: any): v is NonNullable<typeof v> => v !== null)
                  .map((v: any) => ({
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

        if (currentRequestSize < initialRequestSize) {
          currentRequestSize = initialRequestSize;
          console.log(`请求成功，恢复请求大小至 ${initialRequestSize}`);
        }

        console.log(`Processed ${edges?.length} repositories, total: ${processedRepos.length}/${totalCount}`);

        // 检查是否还有下一页
        hasNextPage = starredRepos.pageInfo.hasNextPage;
        cursor = starredRepos.pageInfo.endCursor ?? null;
      } catch (error) {
        // 如果重试后仍然失败，尝试跳过当前批次继续
        console.log(`当前批次请求失败，尝试继续下一页`);
        console.error('Error details:', error);

        // 尝试跳过当前批次，继续处理下一页
        // 如果有cursor，继续使用当前cursor，否则尝试手动推进
        if (cursor) {
          console.log(`保持当前cursor继续: ${cursor}`);
        } else {
          console.log('警告: 无法确定下一批次位置，可能需要手动处理');
        }
        
        // 减小请求大小再次尝试
        currentRequestSize = decrementRequestSize(currentRequestSize, minRequestSize);
        console.log(`减小请求大小至: ${currentRequestSize}`);
        
        // 继续下一次循环而不是终止整个流程
        await delay(5000); // 等待5秒后继续
        continue;
      }
    }

    console.log(`All repositories processed: ${processedRepos.length}`);

    // 根据 id 去重
    const uniqueRepos = deduplicateRepositories(processedRepos);
    const duplicateCount = processedRepos.length - uniqueRepos.length;
    console.log(`去重完成:`);
    console.log(`- 原始仓库数量: ${processedRepos.length}`);
    console.log(`- 去重后仓库数量: ${uniqueRepos.length}`);
    console.log(`- 重复仓库数量: ${duplicateCount}`);
    if (duplicateCount > 0) {
      console.log(`- 去重率: ${((duplicateCount / processedRepos.length) * 100).toFixed(2)}%`);
    }

    // 确保输出目录存在
    ensureDirectoryExists(outputFile);

    // 保存完整数据到文件
    require('fs').writeFileSync(outputFile, JSON.stringify(uniqueRepos, null, 2));
    console.log(`Full data saved to ${outputFile}`);

    // 检查是否在生产环境中（通过环境变量判断）
    const isProduction = process.env.NODE_ENV === 'production' || process.env.GITHUB_ACTIONS === 'true';

    // 生成简化版本（包含languages字段）
    const simplifiedRepos: SimplifiedRepository[] = generateSimplifiedRepos(uniqueRepos);

    // 确保简化版输出目录存在
    ensureDirectoryExists(simpleOutputFile);

    // 保存简化数据到文件
    require('fs').writeFileSync(simpleOutputFile, JSON.stringify(simplifiedRepos, null, 2));
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