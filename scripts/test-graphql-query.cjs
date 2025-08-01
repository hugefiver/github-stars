const { Octokit } = require("@octokit/rest");
require('dotenv').config();

async function testGraphQLQuery() {
  try {
    console.log("Testing GraphQL query for GitHub API...");
    
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error("GITHUB_TOKEN not found in environment variables");
    }
    
    const octokit = new Octokit({
      auth: githubToken
    });
    
    // 简化的 GraphQL 查询来测试基本功能
    const query = `
      query($username: String!) {
        user(login: $username) {
          login
          starredRepositories(first: 5) {
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
                primaryLanguage {
                  name
                }
                languages(first: 3) {
                  edges {
                    node {
                      name
                    }
                    size
                  }
                  totalSize
                }
              }
              starredAt
            }
          }
        }
      }
    `;
    
    const variables = {
      username: "hugefiver"  // 使用默认用户名
    };
    
    console.log("Executing GraphQL query...");
    console.log("Query:", query);
    console.log("Variables:", variables);
    
    const result = await octokit.graphql(query, variables);
    console.log("Full API response:", JSON.stringify(result, null, 2));
    
    console.log("\n=== GraphQL Query Results ===");
    if (!result || !result.user) {
      console.log("❌ No user data found in response");
      return false;
    }
    console.log("User:", result.user.login);
    console.log("Total starred repositories:", result.user.starredRepositories.totalCount);
    console.log("Has next page:", result.user.starredRepositories.pageInfo.hasNextPage);
    console.log("Number of edges returned:", result.user.starredRepositories.edges.length);
    
    console.log("\n=== First Repository Details ===");
    if (result.user.starredRepositories.edges.length > 0) {
      const firstEdge = result.user.starredRepositories.edges[0];
      const firstRepo = firstEdge.node;
      const starredAt = firstEdge.starredAt;
      console.log("ID:", firstRepo.id);
      console.log("Name:", firstRepo.name);
      console.log("Full Name:", firstRepo.nameWithOwner);
      console.log("Starred At:", starredAt);
      console.log("Primary Language:", firstRepo.primaryLanguage?.name || "None");
      console.log("Languages data:", firstRepo.languages);
      
      if (firstRepo.languages && firstRepo.languages.edges) {
        console.log("Language breakdown:");
        firstRepo.languages.edges.forEach(edge => {
          console.log(`  - ${edge.node.name}: ${edge.size} bytes`);
        });
        console.log(`Total size: ${firstRepo.languages.totalSize} bytes`);
      }
    } else {
      console.log("No repositories found");
    }
    
    console.log("\n=== Query Validation ===");
    
    // 检查查询是否返回了预期的数据结构
    const validation = {
      userExists: !!result.user,
      userLogin: result.user?.login === "hugefiver",
      hasStarredRepos: !!result.user?.starredRepositories,
      hasTotalCount: typeof result.user?.starredRepositories?.totalCount === 'number',
      hasPageInfo: !!result.user?.starredRepositories?.pageInfo,
      hasEdges: Array.isArray(result.user?.starredRepositories?.edges),
      firstEdgeHasNode: result.user?.starredRepositories?.edges[0]?.node ? true : false,
      firstEdgeHasStarredAt: result.user?.starredRepositories?.edges[0]?.starredAt ? true : false,
      firstRepoHasId: result.user?.starredRepositories?.edges[0]?.node?.id ? true : false,
      firstRepoHasLanguages: result.user?.starredRepositories?.edges[0]?.node?.languages ? true : false
    };
    
    console.log("Validation results:");
    Object.entries(validation).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✓' : '✗'}`);
    });
    
    // 检查是否有任何验证失败
    const hasErrors = Object.values(validation).some(result => !result);
    if (hasErrors) {
      console.log("\n❌ GraphQL query has issues!");
      return false;
    } else {
      console.log("\n✅ GraphQL query appears to be working correctly!");
      return true;
    }
    
  } catch (error) {
    console.error("❌ Error testing GraphQL query:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    return false;
  }
}

testGraphQLQuery().then(success => {
  if (success) {
    console.log("\n🎉 GraphQL query test completed successfully!");
  } else {
    console.log("\n💥 GraphQL query test failed!");
    process.exit(1);
  }
});
