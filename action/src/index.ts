import * as core from '@actions/core';
import { graphql } from "@octokit/graphql";
import * as fs from "fs";
import * as path from "path";
import { GraphQLRepository } from "./types/github";

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

// Function to handle rate limit with intelligent waiting
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

interface StarredRepositoryEdge {
  node: GraphQLRepository;
  starredAt: string;
}

interface GraphQLResponse {
  user: {
    starredRepositories: {
      totalCount: number;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      edges: StarredRepositoryEdge[];
    };
  };
}

interface ProcessedRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  languages: Record<string, { bytes: number; percentage: string }>;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  starred_at: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  topics: string[];
  licenseInfo: {
    key: string;
    name: string;
    spdxId: string;
    url: string | null;
  } | null;
  fundingLinks: {
    platform: string;
    url: string;
  }[];
  isArchived: boolean;
  isFork: boolean;
  parent: {
    name: string;
    nameWithOwner: string;
    url: string;
  } | null;
  isMirror: boolean;
  latestRelease: {
    name: string;
    tagName: string;
    createdAt: string;
    url: string;
  } | null;
  milestones: {
    title: string;
    description: string | null;
    state: string;
    dueOn: string | null;
    url: string;
  }[];
  mirrorUrl: string | null;
  packages: {
    name: string;
    packageType: string;
    version: string | null;
  }[];
  pushedAt: string;
}

interface SimplifiedRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  languages: Record<string, { bytes: number; percentage: string }>;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  starred_at: string;
  owner_login: string;
  owner_avatar_url: string;
  owner_html_url: string;
  topics: string[];
  /**
   * Information about the repository's license.
   * 
   * This object contains details about the license detected for the repository.
   * If no license is detected, this field will be null.
   * 
   * Structure:
   *   - key: The license key (e.g., "mit", "apache-2.0").
   *   - name: The full name of the license (e.g., "MIT License").
   *   - spdxId: The SPDX identifier for the license (e.g., "MIT", "Apache-2.0").
   *   - url: A URL to the license text or documentation, or null if unavailable.
   */
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
  pushedAt: string;
}

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
            starredRepositories(first: 100, after: $cursor, orderBy: {field: STARRED_AT, direction: ASC}) {
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
                  milestones(first: 10) {
                    title
                    description
                    state
                    dueOn
                    url
                  }
                  mirrorUrl
                  packages(first: 10) {
                    name
                    packageType
                    version
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

      const response = await handleRateLimit(graphqlWithAuth, async () => {
        return await graphqlWithAuth(query, variables) as GraphQLResponse;
      }) as GraphQLResponse;
      const starredRepos = response.user.starredRepositories;

      if (!totalCount) {
        totalCount = starredRepos.totalCount;
        console.log(`Total starred repositories: ${totalCount}`);
      }

      const edges = starredRepos.edges;

      for (const edge of edges) {
        const repo = edge.node;
        const starredAt = edge.starredAt;
        
        // 处理语言数据
        const languages: Record<string, { bytes: number; percentage: string }> = {};
        if (repo.languages && repo.languages.edges && repo.languages.totalSize > 0) {
          const totalSize = repo.languages.totalSize;
          for (const langEdge of repo.languages.edges) {
            const languageName = langEdge.node.name;
            const size = langEdge.size;
            languages[languageName] = {
              bytes: size,
              percentage: ((size / totalSize) * 100).toFixed(2)
            };
          }
        }

        // 处理topics
        const topics = repo.repositoryTopics ? 
          repo.repositoryTopics.nodes.flatMap(n => n?.node?.topic?.name) : [];

        processedRepos.push({
          id: index++,
          name: repo.name,
          full_name: repo.nameWithOwner,
          html_url: repo.url,
          description: repo.description,
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
          licenseInfo: repo.licenseInfo,
          fundingLinks: repo.fundingLinks || [],
          isArchived: repo.isArchived,
          isFork: repo.isFork,
          parent: repo.parent,
          isMirror: repo.isMirror,
          latestRelease: repo.latestRelease,
          milestones: repo.milestones || [],
          mirrorUrl: repo.mirrorUrl,
          packages: repo.packages || [],
          pushedAt: repo.pushedAt
        });
      }

      console.log(`Processed ${edges.length} repositories, total: ${processedRepos.length}/${totalCount}`);

      // 检查是否还有下一页
      hasNextPage = starredRepos.pageInfo.hasNextPage;
      cursor = starredRepos.pageInfo.endCursor;
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
      pushedAt: repo.pushedAt
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
