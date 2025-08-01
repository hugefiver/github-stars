const { Octokit } = require("@octokit/rest");
const fs = require("fs");
const path = require("path");

// 模拟 GitHub Action 的执行（简化版，只获取少量数据用于测试）
async function simulateActionSmall() {
  try {
    console.log("Simulating GitHub Action (small dataset) to fetch starred repositories...");
    
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
    
    // 只获取前几页数据用于测试
    const repos = [];
    const maxPages = 3; // 只获取3页数据
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        const { data } = await octokit.rest.activity.listReposStarredByUser({
          username,
          per_page: 10, // 每页只获取10个仓库
          page: page
        });
        
        repos.push(...data);
        console.log(`Fetched ${data.length} repos from page ${page}`);
        
        // 添加延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 如果返回的数据少于10条，说明已经到最后一页
        if (data.length < 10) {
          break;
        }
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error.message);
        break;
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
    
    // 显示所有仓库作为示例
    console.log("\nRepositories fetched:");
    processedRepos.forEach((repo, index) => {
      console.log(`${index + 1}. ${repo.full_name} (${repo.stargazers_count} stars)`);
    });
    
  } catch (error) {
    console.error("Error during simulation:", error.message);
    process.exit(1);
  }
}

simulateActionSmall();
