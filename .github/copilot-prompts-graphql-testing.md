# GitHub Copilot GraphQL API and Testing Prompts

## GraphQL API Development

### GraphQL Query Best Practices
When working with GitHub GraphQL API in this project:
- Use specific field selection to minimize data transfer
- Implement proper pagination with cursor-based approach
- Handle rate limits intelligently
- Use GraphQL fragments for reusable field selections
- Implement proper error handling for GraphQL-specific errors

### Query Optimization
```typescript
// Optimized query with specific fields
const optimizedQuery = `
  query($username: String!, $cursor: String) {
    user(login: $username) {
      starredRepositories(first: 100, after: $cursor) {
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
```

### GraphQL Fragments
Use fragments for reusable field selections:
```typescript
// Define fragments for common field groups
const repositoryFragment = `
  fragment RepositoryFields on Repository {
    id
    name
    nameWithOwner
    description
    url
    primaryLanguage {
      name
    }
    stargazerCount
    forkCount
    updatedAt
    createdAt
  }
`;

const ownerFragment = `
  fragment OwnerFields on RepositoryOwner {
    login
    avatarUrl
    url
  }
`;

// Use fragments in queries
const queryWithFragments = `
  ${repositoryFragment}
  ${ownerFragment}
  
  query($username: String!, $cursor: String) {
    user(login: $username) {
      starredRepositories(first: 100, after: $cursor) {
        edges {
          node {
            ...RepositoryFields
            owner {
              ...OwnerFields
            }
          }
          starredAt
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;
```

## Advanced GraphQL Features

### Batch Queries
For multiple related queries, use batch operations:
```typescript
const batchQuery = `
  query($username: String!) {
    user(login: $username) {
      starredRepositories(first: 1) {
        totalCount
      }
      repositories(first: 100, orderBy: {field: STARGAZERS, direction: DESC}) {
        nodes {
          name
          stargazerCount
        }
      }
    }
    rateLimit {
      limit
      remaining
      resetAt
    }
  }
`;
```

### Conditional Field Selection
Use GraphQL directives for conditional fields:
```typescript
const conditionalQuery = `
  query($username: String!, $includeLanguages: Boolean!, $includeTopics: Boolean!) {
    user(login: $username) {
      starredRepositories(first: 100) {
        edges {
          node {
            id
            name
            description
            languages @include(if: $includeLanguages) {
              edges {
                node {
                  name
                }
                size
              }
            }
            repositoryTopics @include(if: $includeTopics) {
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
  }
`;
```

## Error Handling Patterns

### GraphQL-Specific Error Handling
```typescript
interface GraphQLError {
  message: string;
  locations: Array<{ line: number; column: number }>;
  path: Array<string | number>;
  extensions?: Record<string, any>;
}

async function executeGraphQLQuery<T>(
  graphqlWithAuth: any,
  query: string,
  variables: Record<string, any>
): Promise<T> {
  try {
    const response = await graphqlWithAuth(query, variables);
    return response;
  } catch (error: any) {
    // Handle GraphQL-specific errors
    if (error.errors && Array.isArray(error.errors)) {
      const graphqlErrors = error.errors as GraphQLError[];
      
      // Check for rate limit errors
      const rateLimitErrors = graphqlErrors.filter(err => 
        err.message.includes('rate limit') || 
        err.message.includes('API rate limit exceeded')
      );
      
      if (rateLimitErrors.length > 0) {
        throw new Error(`Rate limit exceeded: ${rateLimitErrors[0].message}`);
      }
      
      // Check for authentication errors
      const authErrors = graphqlErrors.filter(err => 
        err.message.includes('Bad credentials') ||
        err.message.includes('access denied')
      );
      
      if (authErrors.length > 0) {
        throw new Error(`Authentication failed: ${authErrors[0].message}`);
      }
      
      // Handle other GraphQL errors
      throw new Error(`GraphQL error: ${graphqlErrors.map(err => err.message).join(', ')}`);
    }
    
    // Handle non-GraphQL errors
    throw error;
  }
}
```

### Retry with Exponential Backoff
```typescript
async function executeWithRetry<T>(
  graphqlWithAuth: any,
  query: string,
  variables: Record<string, any>,
  maxRetries: number = 5
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeGraphQLQuery<T>(graphqlWithAuth, query, variables);
    } catch (error: any) {
      lastError = error;
      
      // Don't retry authentication errors
      if (error.message.includes('Bad credentials') || 
          error.message.includes('access denied')) {
        throw error;
      }
      
      // For rate limit errors, wait longer
      let waitTime: number;
      if (error.message.includes('rate limit')) {
        waitTime = Math.min(60000, 5000 * Math.pow(2, attempt - 1)); // Max 1 minute
      } else {
        waitTime = Math.min(30000, 1000 * Math.pow(2, attempt - 1)); // Max 30 seconds
      }
      
      console.log(`Attempt ${attempt} failed, waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}
```

## Testing Strategies

### Unit Testing for GraphQL Queries
```typescript
// Mock GraphQL responses for testing
const mockGraphQLResponse = {
  user: {
    starredRepositories: {
      totalCount: 150,
      pageInfo: {
        hasNextPage: true,
        endCursor: 'cursor123'
      },
      edges: [
        {
          node: {
            id: 'repo1',
            name: 'test-repo',
            nameWithOwner: 'user/test-repo',
            description: 'Test repository',
            primaryLanguage: { name: 'TypeScript' },
            stargazerCount: 100,
            forkCount: 10,
            updatedAt: '2023-01-01T00:00:00Z',
            createdAt: '2023-01-01T00:00:00Z',
            owner: {
              login: 'user',
              avatarUrl: 'https://github.com/user.png',
              url: 'https://github.com/user'
            }
          },
          starredAt: '2023-01-01T00:00:00Z'
        }
      ]
    }
  }
};

// Test function
function testQueryProcessing() {
  const processed = processRepository(mockGraphQLResponse.user.starredRepositories.edges[0].node, '2023-01-01T00:00:00Z');
  
  console.assert(processed.name === 'test-repo', 'Name should be processed correctly');
  console.assert(processed.language === 'TypeScript', 'Language should be extracted correctly');
  console.assert(processed.stargazers_count === 100, 'Star count should be processed correctly');
  
  console.log('Query processing test passed');
}
```

### Integration Testing
```typescript
// Integration test for the complete action flow
async function testActionIntegration() {
  const mockInputs = {
    'github-token': 'test-token',
    'username': 'test-user',
    'output-file': './test-output.json',
    'simple-output-file': './test-output-simple.json'
  };
  
  // Mock the GraphQL client
  const mockGraphqlWithAuth = jest.fn()
    .mockResolvedValueOnce(mockGraphQLResponse)
    .mockResolvedValueOnce({
      user: {
        starredRepositories: {
          totalCount: 150,
          pageInfo: {
            hasNextPage: false,
            endCursor: null
          },
          edges: []
        }
      }
    });
  
  try {
    await runActionWithMocks(mockInputs, mockGraphqlWithAuth);
    
    // Verify output files exist
    const fs = require('fs');
    console.assert(fs.existsSync('./test-output.json'), 'Full output file should exist');
    console.assert(fs.existsSync('./test-output-simple.json'), 'Simple output file should exist');
    
    // Verify output content
    const fullData = JSON.parse(fs.readFileSync('./test-output.json', 'utf8'));
    const simpleData = JSON.parse(fs.readFileSync('./test-output-simple.json', 'utf8'));
    
    console.assert(Array.isArray(fullData), 'Full data should be an array');
    console.assert(Array.isArray(simpleData), 'Simple data should be an array');
    console.assert(fullData.length === 1, 'Should have one repository');
    console.assert(simpleData.length === 1, 'Should have one simplified repository');
    
    console.log('Integration test passed');
  } catch (error) {
    console.error('Integration test failed:', error);
  } finally {
    // Cleanup
    if (fs.existsSync('./test-output.json')) {
      fs.unlinkSync('./test-output.json');
    }
    if (fs.existsSync('./test-output-simple.json')) {
      fs.unlinkSync('./test-output-simple.json');
    }
  }
}
```

### Performance Testing
```typescript
// Performance test for large datasets
async function testPerformanceWithLargeDataset() {
  const startTime = Date.now();
  const repositoryCount = 1000;
  
  // Generate mock data
  const mockEdges = Array.from({ length: repositoryCount }, (_, i) => ({
    node: {
      id: `repo${i}`,
      name: `repo-${i}`,
      nameWithOwner: `user/repo-${i}`,
      description: `Test repository ${i}`,
      primaryLanguage: { name: i % 2 === 0 ? 'TypeScript' : 'JavaScript' },
      stargazerCount: Math.floor(Math.random() * 10000),
      forkCount: Math.floor(Math.random() * 1000),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      owner: {
        login: 'user',
        avatarUrl: 'https://github.com/user.png',
        url: 'https://github.com/user'
      }
    },
    starredAt: new Date().toISOString()
  }));
  
  // Process the data
  const processedRepos = mockEdges.map(edge => 
    processRepository(edge.node, edge.starredAt)
  );
  
  // Create simplified version
  const simplifiedRepos = createSimplifiedVersion(processedRepos);
  
  const endTime = Date.now();
  const processingTime = endTime - startTime;
  
  console.log(`Processed ${repositoryCount} repositories in ${processingTime}ms`);
  console.log(`Average time per repository: ${processingTime / repositoryCount}ms`);
  
  // Performance assertions
  console.assert(processingTime < 5000, `Processing should take less than 5 seconds, took ${processingTime}ms`);
  console.assert(processedRepos.length === repositoryCount, 'All repositories should be processed');
  console.assert(simplifiedRepos.length === repositoryCount, 'All repositories should be simplified');
  
  console.log('Performance test passed');
}
```

## Simulation Scripts

### Local Testing Script
Create comprehensive simulation scripts:
```javascript
// scripts/test-action-comprehensive.cjs
const { run } = require('../action/dist/index.js');

async function testAction() {
  const mockInputs = {
    'github-token': process.env.GITHUB_TOKEN || 'test-token',
    'username': process.env.TEST_USERNAME || 'hugefiver',
    'output-file': './test-data/starred-repos.json',
    'simple-output-file': './test-data/starred-repos-simple.json'
  };
  
  // Mock core functions
  const mockCore = {
    getInput: (name) => mockInputs[name] || '',
    setOutput: (name, value) => console.log(`Output ${name}: ${value}`),
    setFailed: (message) => { throw new Error(message); }
  };
  
  // Mock filesystem
  const mockFs = {
    existsSync: (path) => {
      console.log(`Checking if ${path} exists`);
      return false; // Simulate file doesn't exist
    },
    mkdirSync: (path, options) => {
      console.log(`Creating directory: ${path}`);
    },
    writeFileSync: (path, data) => {
      console.log(`Writing to ${path}, size: ${data.length} characters`);
    }
  };
  
  try {
    console.log('Starting action test...');
    console.log('Inputs:', mockInputs);
    
    // Set up mocks
    global.core = mockCore;
    global.fs = mockFs;
    
    await run();
    
    console.log('Action test completed successfully');
  } catch (error) {
    console.error('Action test failed:', error.message);
    process.exit(1);
  }
}

testAction();
```

### GraphQL Query Testing
```javascript
// scripts/test-graphql-query.cjs
const { graphql } = require('@octokit/graphql');

async function testGraphQLQuery() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }
  
  const username = process.env.TEST_USERNAME || 'hugefiver';
  
  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });
  
  const testQuery = `
    query($username: String!) {
      user(login: $username) {
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
              description
              primaryLanguage {
                name
              }
              stargazerCount
              forkCount
            }
            starredAt
          }
        }
      }
      rateLimit {
        limit
        remaining
        resetAt
      }
    }
  `;
  
  try {
    console.log(`Testing GraphQL query for user: ${username}`);
    
    const result = await graphqlWithAuth(testQuery, { username });
    
    console.log('Query successful!');
    console.log(`Total starred repositories: ${result.user.starredRepositories.totalCount}`);
    console.log(`Rate limit: ${result.rateLimit.remaining}/${result.rateLimit.limit}`);
    console.log(`First 5 repositories:`);
    
    result.user.starredRepositories.edges.forEach((edge, index) => {
      console.log(`${index + 1}. ${edge.node.nameWithOwner} - ${edge.node.primaryLanguage?.name || 'No language'} - ⭐${edge.node.stargazerCount}`);
    });
    
  } catch (error) {
    console.error('GraphQL query failed:', error.message);
    process.exit(1);
  }
}

testGraphQLQuery();
```

## Data Validation

### Schema Validation
```typescript
// Validate processed data against expected schema
function validateProcessedRepository(repo: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  const requiredFields = [
    'id', 'name', 'full_name', 'html_url', 'description',
    'language', 'stargazers_count', 'forks_count', 'updated_at',
    'created_at', 'starred_at', 'owner', 'topics'
  ];
  
  requiredFields.forEach(field => {
    if (repo[field] === undefined || repo[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Type validation
  if (typeof repo.id !== 'number') {
    errors.push('id should be a number');
  }
  
  if (typeof repo.stargazers_count !== 'number') {
    errors.push('stargazers_count should be a number');
  }
  
  if (typeof repo.forks_count !== 'number') {
    errors.push('forks_count should be a number');
  }
  
  if (!Array.isArray(repo.topics)) {
    errors.push('topics should be an array');
  }
  
  // Owner object validation
  if (!repo.owner || typeof repo.owner !== 'object') {
    errors.push('owner should be an object');
  } else {
    const ownerFields = ['login', 'avatar_url', 'html_url'];
    ownerFields.forEach(field => {
      if (!repo.owner[field]) {
        errors.push(`Missing owner field: ${field}`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Usage in processing
function processAndValidateRepository(repo: any, starredAt: string) {
  const processed = processRepository(repo, starredAt);
  const validation = validateProcessedRepository(processed);
  
  if (!validation.isValid) {
    console.warn(`Validation failed for repository ${processed.name}:`, validation.errors);
    // Optionally fix common issues or skip invalid repositories
  }
  
  return processed;
}
```

### Data Consistency Checks
```typescript
// Ensure data consistency between full and simplified versions
function validateDataConsistency(fullData: any[], simpleData: any[]) {
  const inconsistencies: string[] = [];
  
  if (fullData.length !== simpleData.length) {
    inconsistencies.push(`Data length mismatch: full=${fullData.length}, simple=${simpleData.length}`);
  }
  
  fullData.forEach((fullRepo, index) => {
    const simpleRepo = simpleData[index];
    
    if (!simpleRepo) {
      inconsistencies.push(`Missing simplified repository at index ${index}`);
      return;
    }
    
    // Check key fields match
    const keyFields = ['id', 'name', 'full_name', 'stargazers_count', 'forks_count'];
    keyFields.forEach(field => {
      if (fullRepo[field] !== simpleRepo[field]) {
        inconsistencies.push(`Field ${field} mismatch for ${fullRepo.name}: full=${fullRepo[field]}, simple=${simpleRepo[field]}`);
      }
    });
    
    // Check owner mapping
    if (fullRepo.owner.login !== simpleRepo.owner_login) {
      inconsistencies.push(`Owner login mismatch for ${fullRepo.name}: full=${fullRepo.owner.login}, simple=${simpleRepo.owner_login}`);
    }
  });
  
  return inconsistencies;
}
```

## Monitoring and Logging

### Comprehensive Logging
```typescript
// Enhanced logging for monitoring
class ActionLogger {
  private startTime: number;
  private username: string;
  
  constructor(username: string) {
    this.startTime = Date.now();
    this.username = username;
    this.log('Action started');
  }
  
  log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const elapsed = Date.now() - this.startTime;
    console.log(`[${timestamp}] [${elapsed}ms] [${this.username}] ${message}`);
    
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }
  
  logRateLimit(rateLimitInfo: any) {
    this.log('Rate limit status', {
      limit: rateLimitInfo.limit,
      remaining: rateLimitInfo.remaining,
      used: rateLimitInfo.used,
      resetAt: rateLimitInfo.resetAt
    });
  }
  
  logProgress(current: number, total: number) {
    const percentage = ((current / total) * 100).toFixed(1);
    this.log(`Progress: ${current}/${total} (${percentage}%)`);
  }
  
  logSuccess(results: any) {
    const elapsed = Date.now() - this.startTime;
    this.log('Action completed successfully', {
      repositoriesProcessed: results.length,
      totalTime: `${elapsed}ms`,
      averageTimePerRepo: `${(elapsed / results.length).toFixed(2)}ms`
    });
  }
  
  logError(error: Error) {
    const elapsed = Date.now() - this.startTime;
    this.log('Action failed', {
      error: error.message,
      totalTime: `${elapsed}ms`
    });
  }
}

// Usage in action
async function run() {
  const logger = new ActionLogger(username);
  
  try {
    logger.logRateLimit(await getRateLimitStatus(graphqlWithAuth));
    
    // Processing logic with progress logging
    logger.logProgress(processedRepos.length, totalCount);
    
    logger.logSuccess(processedRepos);
  } catch (error) {
    logger.logError(error);
    core.setFailed(error.message);
  }
}
```

## Common Development Tasks

### Adding New GraphQL Fields
1. Update the GraphQL query in `action/src/index.ts`
2. Update TypeScript interfaces in `action/src/types/github.ts`
3. Update the processing logic to handle new fields
4. Update validation functions
5. Test with simulation scripts

### Optimizing Query Performance
1. Review current query for unnecessary fields
2. Implement field selection based on actual usage
3. Add conditional field selection with @include/@skip directives
4. Implement proper pagination
5. Test performance with large datasets

### Adding New Tests
1. Create unit tests for individual functions
2. Add integration tests for complete workflows
3. Implement performance tests for large datasets
4. Add error scenario testing
5. Create simulation scripts for local testing

### Debugging GraphQL Issues
1. Check GraphQL query syntax
2. Verify authentication and permissions
3. Monitor rate limit status
4. Review error messages and locations
5. Test queries with GraphQL Playground or Postman
6. Use comprehensive logging for debugging
