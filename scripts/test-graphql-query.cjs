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
    
    // 更新的 GraphQL 查询，包含 packages 和完整的 version 结构
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
                packages(first: 5) {
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
                      files(first: 5) {
                        nodes {
                          name
                          size
                          url
                        }
                      }
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
      username: "hugefiver"  // 使用默认用户名
    };
    
    console.log("Executing GraphQL query...");
    console.log("Query:", query);
    console.log("Variables:", variables);
    
    const response = await octokit.graphql(query, variables);
    console.log("Full API response:", JSON.stringify(response, null, 2));
    
    console.log("\n=== GraphQL Query Results ===");
    if (!response || !response.user) {
      console.log("❌ No user data found in response");
      return false;
    }
    console.log("User:", response.user.login);
    console.log("Total starred repositories:", response.user.starredRepositories.totalCount);
    console.log("Has next page:", response.user.starredRepositories.pageInfo.hasNextPage);
    console.log("Number of edges returned:", response.user.starredRepositories.edges.length);
    
    console.log("\n=== First Repository Details ===");
    if (response.user.starredRepositories.edges.length > 0) {
      const firstEdge = response.user.starredRepositories.edges[0];
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

      console.log("\n=== Packages Data ===");
      if (firstRepo.packages && firstRepo.packages.nodes && firstRepo.packages.nodes.length > 0) {
        console.log(`Found ${firstRepo.packages.nodes.length} packages:`);
        firstRepo.packages.nodes.forEach((pkg, index) => {
          console.log(`\n--- Package ${index + 1} ---`);
          console.log(`Name: ${pkg.name}`);
          console.log(`Package Type: ${pkg.packageType}`);
          if (pkg.version) {
            console.log(`Version ID: ${pkg.version.id}`);
            console.log(`Version: ${pkg.version.version}`);
            console.log(`Pre-release: ${pkg.version.preRelease}`);
            console.log(`Platform: ${pkg.version.platform || 'N/A'}`);
            console.log(`Summary: ${pkg.version.summary || 'N/A'}`);
            console.log(`Readme: ${pkg.version.readme ? 'Available' : 'Not available'}`);
            
            if (pkg.version.statistics) {
              console.log("Statistics:");
              console.log(`  Downloads Total: ${pkg.version.statistics.downloadsTotalCount || 'N/A'}`);
            }
            
            if (pkg.version.release) {
              console.log("Release:");
              console.log(`  Name: ${pkg.version.release.name}`);
              console.log(`  Tag: ${pkg.version.release.tagName}`);
              console.log(`  Created: ${pkg.version.release.createdAt}`);
              console.log(`  URL: ${pkg.version.release.url}`);
            }
            
            if (pkg.version.package) {
              console.log("Package Info:");
              console.log(`  Name: ${pkg.version.package.name}`);
              console.log(`  Type: ${pkg.version.package.packageType}`);
              if (pkg.version.package.repository) {
                console.log("  Repository:");
                console.log(`    Name: ${pkg.version.package.repository.name}`);
                console.log(`    Full Name: ${pkg.version.package.repository.nameWithOwner}`);
                console.log(`    URL: ${pkg.version.package.repository.url}`);
              }
            }
            
            if (pkg.version.files && pkg.version.files.nodes) {
              console.log(`Files (${pkg.version.files.nodes.length} files):`);
              pkg.version.files.nodes.forEach(file => {
                console.log(`  - ${file.name} (${file.size} bytes)`);
              });
            }
          } else {
            console.log("Version: Not available");
          }
        });
      } else {
        console.log("No packages found for this repository");
        // Let's check other repositories for packages
        console.log("\n=== Checking other repositories for packages ===");
        let foundRepoWithPackages = false;
        for (let i = 1; i < response.user.starredRepositories.edges.length; i++) {
          const edge = response.user.starredRepositories.edges[i];
          const repo = edge.node;
          if (repo.packages && repo.packages.nodes && repo.packages.nodes.length > 0) {
            console.log(`Found repository with packages: ${repo.nameWithOwner}`);
            console.log(`Number of packages: ${repo.packages.nodes.length}`);
            const firstPackage = repo.packages.nodes[0];
            console.log(`First package name: ${firstPackage.name}`);
            console.log(`First package type: ${firstPackage.packageType}`);
            if (firstPackage.version) {
              console.log(`Version: ${firstPackage.version.version}`);
              console.log(`Version ID: ${firstPackage.version.id}`);
              console.log(`Pre-release: ${firstPackage.version.preRelease}`);
              foundRepoWithPackages = true;
              break;
            }
          }
        }
        if (!foundRepoWithPackages) {
          console.log("No packages found in any of the first 5 repositories");
        }
      }
    } else {
      console.log("No repositories found");
    }
    
    console.log("\n=== Query Validation ===");
    
    // 检查查询是否返回了预期的数据结构
    const firstRepo = response.user?.starredRepositories?.edges[0]?.node;
    
    // Find a repository with packages if possible
    let repoWithPackages = firstRepo;
    for (let i = 0; i < response.user?.starredRepositories?.edges.length; i++) {
      const repo = response.user.starredRepositories.edges[i]?.node;
      if (repo?.packages?.nodes && repo.packages.nodes.length > 0) {
        repoWithPackages = repo;
        break;
      }
    }
    
    const validation = {
      userExists: !!response.user,
      userLogin: response.user?.login === "hugefiver",
      hasStarredRepos: !!response.user?.starredRepositories,
      hasTotalCount: typeof response.user?.starredRepositories?.totalCount === 'number',
      hasPageInfo: !!response.user?.starredRepositories?.pageInfo,
      hasEdges: Array.isArray(response.user?.starredRepositories?.edges),
      firstEdgeHasNode: response.user?.starredRepositories?.edges[0]?.node ? true : false,
      firstEdgeHasStarredAt: response.user?.starredRepositories?.edges[0]?.starredAt ? true : false,
      firstRepoHasId: firstRepo?.id ? true : false,
      firstRepoHasLanguages: firstRepo?.languages ? true : false,
      firstRepoHasPackages: firstRepo?.packages ? true : false,
      firstRepoPackagesHasNodes: firstRepo?.packages?.nodes ? true : false,
      // Only validate version fields if we found a repository with packages
      hasAnyRepoWithPackages: response.user?.starredRepositories?.edges.some(edge => edge.node.packages?.nodes?.length > 0),
      firstPackageHasVersion: repoWithPackages?.packages?.nodes[0]?.version ? true : false,
      firstVersionHasId: repoWithPackages?.packages?.nodes[0]?.version?.id ? true : false,
      firstVersionHasStatistics: repoWithPackages?.packages?.nodes[0]?.version?.statistics ? true : false,
      firstVersionHasRelease: repoWithPackages?.packages?.nodes[0]?.version?.release ? true : false,
      firstVersionHasPackage: repoWithPackages?.packages?.nodes[0]?.version?.package ? true : false,
      firstVersionHasFiles: repoWithPackages?.packages?.nodes[0]?.version?.files ? true : false
    };
    
    console.log("Validation results:");
    Object.entries(validation).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? '✓' : '✗'}`);
    });
    
    // 检查是否有任何验证失败
    const hasErrors = Object.entries(validation).some(([key, val]) => {
      // Skip version-related validation if no repository has packages
      if (!validation.hasAnyRepoWithPackages && 
          ['firstPackageHasVersion', 'firstVersionHasId', 'firstVersionHasStatistics', 
           'firstVersionHasRelease', 'firstVersionHasPackage', 'firstVersionHasFiles', 
           'hasAnyRepoWithPackages'].includes(key)) {
        return false;
      }
      return !val;
    });
    
    if (hasErrors) {
      console.log("\n❌ GraphQL query has issues!");
      return false;
    } else {
      console.log("\n✅ GraphQL query appears to be working correctly!");
      if (validation.hasAnyRepoWithPackages) {
        console.log("✅ Found repository with packages - version structure is valid!");
      } else {
        console.log("ℹ️  No repositories with packages found in first 5 results, but query structure is correct");
        console.log("ℹ️  This is normal - many repositories don't have GitHub Packages");
      }
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
