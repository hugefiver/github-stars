const { Octokit } = require("@octokit/rest");
const fs = require("fs");
const path = require("path");
require('dotenv').config();

// 模拟修改后的 GitHub Action 的执行（完整版，使用GraphQL获取languages）
async function simulateAction() {
  try {
    console.log("Simulating modified GitHub Action to fetch starred repositories with languages...");
    
    // 获取命令行参数或者使用默认值
    const args = process.argv.slice(2);
    const username = args[0] || "hugefiver";
    const outputFile = args[1] || "./data/starred-repos.json";
    const simpleOutputFile = args[2] || "./data/starred-repos-simple.json";
    
    console.log(`Fetching starred repositories for user: ${username}`);
    
    // 创建 Octokit 实例（使用环境变量中的 token，如果没有则不认证）
    const githubToken = process.env.GITHUB_TOKEN;
    const octokit = new Octokit({
      auth: githubToken
    });
    
    // 使用GraphQL获取用户star的仓库列表和语言信息
    const processedRepos = [];
    let hasNextPage = true;
    let cursor = null;
    let totalCount = 0;
    let retryCount = 0;
    const maxRetries = 3;
    let [page, maxPage] = [0, 10]; // 分页参数
    
    while (hasNextPage && retryCount <= maxRetries && page < maxPage) {
      try {
        const query = `
        query($username: String!, $cursor: String) {
          user(login: $username) {
            starredRepositories(first: 20, after: $cursor, orderBy: {field: STARRED_AT, direction: DESC}) {
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
                    nodes {
                      title
                      description
                      state
                      dueOn
                      url
                    }
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
                        files(first: 10) {
                          nodes {
                            name
                            size
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
        
        const data = await octokit.graphql(query, variables);
        const starredRepos = data.user.starredRepositories;
        
        // 重置重试计数
        retryCount = 0;
        
        if (!totalCount) {
          totalCount = starredRepos.totalCount;
          console.log(`Total starred repositories: ${totalCount}`);
        }
        
        const edges = starredRepos.edges;
        
        for (const edge of edges) {
          const repo = edge.node;
          const starredAt = edge.starredAt;
          
          // 处理语言数据
          const languages = {};
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
            repo.repositoryTopics.nodes.map(node => node.topic.name) : [];
          
          processedRepos.push({
            id: parseInt(repo.id.replace(/[^0-9]/g, '')),
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
        
        // 添加延迟以避免速率限制
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        page++;
      } catch (error) {
        if (error.message.includes('rate limit')) {
          retryCount++;
          if (retryCount <= maxRetries) {
            console.log(`Rate limit exceeded, retry ${retryCount}/${maxRetries}...`);
            // 等待30秒后重试
            await new Promise(resolve => setTimeout(resolve, 30000));
          } else {
            throw new Error('Max retries exceeded for rate limiting');
          }
        } else {
          throw error;
        }
      }
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
    
    // 生成简化版本（包含languages字段）
    const simplifiedRepos = processedRepos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      language: repo.language,
      languages: repo.languages, // 添加languages字段
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      updated_at: repo.updatedAt,
      created_at: repo.createdAt,
      starred_at: repo.starredAt,
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
    
    console.log("\nSimulation completed successfully!");
    console.log(`- Full data: ${processedRepos.length} repositories`);
    console.log(`- Simplified data: ${simplifiedRepos.length} repositories`);
    
    // 显示前5个仓库的语言信息作为示例
    console.log("\nFirst 5 repositories with languages:");
    processedRepos.slice(0, 5).forEach((repo, index) => {
      console.log(`${index + 1}. ${repo.full_name}`);
      console.log(`   Primary language: ${repo.language || 'None'}`);
      if (Object.keys(repo.languages).length > 0) {
        console.log(`   All languages:`);
        Object.entries(repo.languages).forEach(([lang, info]) => {
          console.log(`     - ${lang}: ${info.percentage}% (${info.bytes} bytes)`);
        });
      } else {
        console.log(`   No detailed language data available`);
      }
      console.log('');
    });
    
    // 验证简化版本是否包含languages字段
    const hasLanguagesInSimplified = simplifiedRepos.some(repo => repo.languages && Object.keys(repo.languages).length > 0);
    console.log(`\nValidation:`);
    console.log(`- Simplified version contains languages field: ${hasLanguagesInSimplified}`);
    console.log(`- Repositories with language data: ${simplifiedRepos.filter(repo => repo.languages && Object.keys(repo.languages).length > 0).length}/${simplifiedRepos.length}`);
    
  } catch (error) {
    console.error("Error during simulation:", error.message);
    process.exit(1);
  }
}

simulateAction();
