const core = require('@actions/core');
const { Octokit } = require("@octokit/rest");
const fs = require("fs");
const path = require("path");

async function run() {
  try {
    // 获取输入参数
    const githubToken = core.getInput('github-token');
    const username = core.getInput('username');
    const outputFile = core.getInput('output-file');
    const simpleOutputFile = core.getInput('simple-output-file');

    console.log(`Fetching starred repositories for user: ${username}`);

    // 创建 Octokit 实例
    const octokit = new Octokit({
      auth: githubToken
    });

    // 获取用户star的仓库列表
    const repos = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      const { data } = await octokit.rest.activity.listReposStarredByUser({
        username,
        per_page: 100,
        page: page++
      });

      repos.push(...data);

      // 如果返回的数据少于100条，说明已经到最后一页
      if (data.length < 100) {
        hasNextPage = false;
      }

      console.log(`Fetched ${data.length} repos from page ${page - 1}`);
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

    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 保存完整数据到文件
    fs.writeFileSync(outputFile, JSON.stringify(processedRepos, null, 2));
    console.log(`Full data saved to ${outputFile}`);

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

    // 确保简化版输出目录存在
    const simpleOutputDir = path.dirname(simpleOutputFile);
    if (!fs.existsSync(simpleOutputDir)) {
      fs.mkdirSync(simpleOutputDir, { recursive: true });
    }

    // 保存简化数据到文件
    fs.writeFileSync(simpleOutputFile, JSON.stringify(simplifiedRepos, null, 2));
    console.log(`Simplified data saved to ${simpleOutputFile}`);

    // 设置输出参数
    core.setOutput('repositories-count', repos.length.toString());
    core.setOutput('output-file', outputFile);
    core.setOutput('simple-output-file', simpleOutputFile);

  } catch (error) {
    core.setFailed(`Error fetching starred repositories: ${error.message}`);
  }
}

run();
