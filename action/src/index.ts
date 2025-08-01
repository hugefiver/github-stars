import * as core from '@actions/core';
import { graphql } from "@octokit/graphql";
import * as fs from "fs";
import * as path from "path";
import { GraphQLRepository } from "./types/github";

// Utility function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Utility function for exponential backoff
const exponentialBackoff = async (fn: () => Promise<any>, maxRetries = 5, initialDelay = 1000) => {
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
      
      const delayTime = initialDelay * Math.pow(2, retryCount - 1);
      console.log(`Rate limit hit, retrying in ${delayTime}ms (attempt ${retryCount}/${maxRetries})`);
      await delay(delayTime);
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

      const response = await exponentialBackoff(async () => {
        // Add a small delay between requests to avoid secondary rate limits
        if (cursor) {
          console.log('Waiting 500ms before next request to avoid rate limits...');
          await delay(500);
        }
        return await graphqlWithAuth(query, variables) as GraphQLResponse;
      }) as GraphQLResponse;
      const starredRepos = response.user.starredRepositories;

      if (!totalCount) {
        totalCount = starredRepos.totalCount;
        console.log(`Total starred repositories: ${totalCount}`);
      }

      const edges = starredRepos.edges;
      let index = 1;

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
          topics: topics
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
      topics: repo.topics
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
