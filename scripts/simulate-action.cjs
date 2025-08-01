const { Octokit } = require("@octokit/rest");
const fs = require("fs");
const path = require("path");

// 模拟 GitHub Action 的执行
async function simulateAction() {
  try {
    console.log("Simulating GitHub Action to fetch starred repositories...");
    
    // 获取命令行参数或者使用默认值
    const args = process.argv.slice(2);
    const username = args[0] || "hugefiver";
    const outputFile = args[1] || "./data/starred-repos.json";
    const simpleOutputFile = args[2] || "./data/starred-repos-simple.json";
    
    console.log(`Fetching starred repositories for user: ${username}`);
    
    // 创建 Octokit 实例（使用环境变量中的 token，如果没有则不认证）
    const githubToken = process.env.GITHUB_TOKEN;
    const octokit = new Octokit({
      auth: githubToken,
      // 添加请求重试机制
      request: {
        retries: 3,
        retryAfter: 5
      }
    });
    
    // 获取用户star的仓库列表
    const repos = [];
    let page = 1;
    let hasNextPage = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (hasNextPage && retryCount <= maxRetries) {
      try {
        const { data, headers } = await octokit.rest.activity.listReposStarredByUser({
          username,
          per_page: 30,
          page: page
        });
        
        // 重置重试计数
        retryCount = 0;
        
        repos.push(...data);
        
        console.log(`Fetched ${data.length} repos from page ${page}`);
        console.log(`Rate limit: ${headers['x-ratelimit-remaining']}/${headers['x-ratelimit-limit']} (resets at ${new Date(headers['x-ratelimit-reset'] * 1000)})`);
        
        // 如果返回的数据少于30条，说明已经到最后一页
        if (data.length < 30) {
          hasNextPage = false;
        } else {
          page++;
        }
        
        // 如果接近速率限制，等待一段时间
        if (headers['x-ratelimit-remaining'] < 10) {
          const resetTime = headers['x-ratelimit-reset'] * 1000;
          const waitTime = resetTime - Date.now() + 1000; // 多等1秒确保重置
          if (waitTime > 0) {
            console.log(`Approaching rate limit, waiting ${Math.ceil(waitTime/1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } else {
          // 正常情况下也添加小延迟以避免触发限制
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        if (error.status === 403 && error.message.includes('rate limit')) {
          retryCount++;
          if (retryCount <= maxRetries) {
            console.log(`Rate limit exceeded, retry ${retryCount}/${maxRetries}...`);
            // 等待直到速率限制重置
            const resetTime = error.response?.headers['x-ratelimit-reset'];
            if (resetTime) {
              const waitTime = resetTime * 1000 - Date.now() + 1000;
              if (waitTime > 0) {
                console.log(`Waiting ${Math.ceil(waitTime/1000)} seconds for rate limit reset...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
              }
            } else {
              // 如果没有重置时间信息，等待30秒
              await new Promise(resolve => setTimeout(resolve, 30000));
            }
          } else {
            throw new Error('Max retries exceeded for rate limiting');
          }
        } else {
          throw error;
        }
      }
    }
    
    console.log(`Total repositories fetched: ${repos.length}`);
    
    // 处理数据格式
    const processedRepos = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      updated_at: repo.updated_at,
      created_at: repo.created_at,
      owner: {
        login: repo.owner.login,
        avatar_url: repo.owner.avatar_url,
        html_url: repo.owner.html_url
      },
      topics: repo.topics || []
    }));
    
    // 确保 data 目录存在
    const dataDir = path.dirname(outputFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // 保存数据到文件
    fs.writeFileSync(outputFile, JSON.stringify(processedRepos, null, 2));
    console.log(`Data saved to ${outputFile}`);
    
    // 同时生成一个简化版本用于前端展示
    const simplifiedRepos = processedRepos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      updated_at: repo.updated_at,
      created_at: repo.created_at,
      owner_login: repo.owner.login,
      owner_avatar_url: repo.owner.avatar_url,
      owner_html_url: repo.owner.html_url,
      topics: repo.topics
    }));
    
    const simplifiedOutputDir = path.dirname(simpleOutputFile);
    if (!fs.existsSync(simplifiedOutputDir)) {
      fs.mkdirSync(simplifiedOutputDir, { recursive: true });
    }
    
    fs.writeFileSync(simpleOutputFile, JSON.stringify(simplifiedRepos, null, 2));
    console.log(`Simplified data saved to ${simpleOutputFile}`);
    
    console.log("\nSimulation completed successfully!");
    console.log(`- Full data: ${processedRepos.length} repositories`);
    console.log(`- Saved to: ${outputFile}`);
    console.log(`- Simplified data saved to: ${simpleOutputFile}`);
    
    // 显示前5个仓库作为示例
    console.log("\nFirst 5 repositories:");
    processedRepos.slice(0, 5).forEach((repo, index) => {
      console.log(`${index + 1}. ${repo.full_name} (${repo.stargazers_count} stars)`);
    });
    
  } catch (error) {
    console.error("Error during simulation:", error.message);
    process.exit(1);
  }
}

simulateAction();
