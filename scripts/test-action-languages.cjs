const { Octokit } = require("@octokit/rest");
const fs = require("fs");
const path = require("path");

// 模拟修改后的 GitHub Action 的执行
async function testActionLanguages() {
  try {
    console.log("Testing modified GitHub Action to fetch starred repositories with languages...");
    
    // 获取命令行参数或者使用默认值
    const args = process.argv.slice(2);
    const username = args[0] || "hugefiver";
    const outputFile = args[1] || "./data/starred-repos-test.json";
    const simpleOutputFile = args[2] || "./data/starred-repos-simple-test.json";
    
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
    
    while (hasNextPage) {
      const query = `
        query($username: String!, $cursor: String) {
          user(login: $username) {
            starredRepositories(first: 10, after: $cursor, orderBy: {field: STARRED_AT, direction: DESC}) {
              totalCount
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                name
                fullName
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
                starredAt
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
            }
          }
        }
      `;
      
      const variables = {
        username,
        cursor
      };
      
      const { data } = await octokit.graphql(query, variables);
      const starredRepos = data.user.starredRepositories;
      
      if (!totalCount) {
        totalCount = starredRepos.totalCount;
        console.log(`Total starred repositories: ${totalCount}`);
      }
      
      const nodes = starredRepos.nodes;
      
      for (const repo of nodes) {
        // 处理语言数据
        const languages = {};
        if (repo.languages && repo.languages.edges && repo.languages.totalSize > 0) {
          const totalSize = repo.languages.totalSize;
          for (const edge of repo.languages.edges) {
            const languageName = edge.node.name;
            const size = edge.size;
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
          full_name: repo.fullName,
          html_url: repo.url,
          description: repo.description,
          language: repo.primaryLanguage ? repo.primaryLanguage.name : null,
          languages: languages,
          stargazers_count: repo.stargazerCount,
          forks_count: repo.forkCount,
          updated_at: repo.updatedAt,
          created_at: repo.createdAt,
          starred_at: repo.starredAt,
          owner: {
            login: repo.owner.login,
            avatar_url: repo.owner.avatarUrl,
            html_url: repo.owner.url
          },
          topics: topics
        });
      }
      
      console.log(`Processed ${nodes.length} repositories, total: ${processedRepos.length}/${totalCount}`);
      
      // 检查是否还有下一页
      hasNextPage = starredRepos.pageInfo.hasNextPage;
      cursor = starredRepos.pageInfo.endCursor;
      
      // 限制测试只处理前20个仓库
      if (processedRepos.length >= 20) {
        console.log("Limiting test to first 20 repositories");
        break;
      }
    }
    
    console.log(`Test repositories processed: ${processedRepos.length}`);
    
    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 保存完整数据到文件
    fs.writeFileSync(outputFile, JSON.stringify(processedRepos, null, 2));
    console.log(`Full test data saved to ${outputFile}`);
    
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
    console.log(`Simplified test data saved to ${simpleOutputFile}`);
    
    console.log("\nTest completed successfully!");
    console.log(`- Full data: ${processedRepos.length} repositories`);
    console.log(`- Simplified data: ${simplifiedRepos.length} repositories`);
    
    // 显示前3个仓库的语言信息作为示例
    console.log("\nFirst 3 repositories with languages:");
    processedRepos.slice(0, 3).forEach((repo, index) => {
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
    console.error("Error during test:", error.message);
    process.exit(1);
  }
}

testActionLanguages();
