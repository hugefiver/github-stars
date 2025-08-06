# GitHub Copilot Action Development Prompts

## GitHub Action Development

### Action Structure

When developing GitHub Actions for this project:

- Follow the existing structure in `action/src/index.ts`
- Use TypeScript with proper type definitions
- Implement proper error handling with `core.setFailed`
- Use `core.getInput` for input parameters
- Use `core.setOutput` for output parameters
- Log progress with `console.log`

### Basic Action Template

```typescript
import * as core from '@actions/core';
import { graphql } from "@octokit/graphql";
import * as fs from "fs";
import * as path from "path";

async function run() {
  try {
    // Get input parameters
    const githubToken = core.getInput('github-token');
    const username = core.getInput('username');
    const outputFile = core.getInput('output-file');

    console.log(`Processing for user: ${username}`);

    // Create authenticated GraphQL client
    const graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${githubToken}`,
      },
    });

    // Main processing logic
    const result = await processData(graphqlWithAuth, username);

    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save results
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`Data saved to ${outputFile}`);

    // Set outputs
    core.setOutput('processed-count', result.length.toString());

  } catch (error) {
    core.setFailed(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

run();
```

## GraphQL Implementation

### GraphQL Query Patterns

When working with GitHub GraphQL API:

- Use typed queries with proper variable definitions
- Implement pagination with cursor-based approach
- Handle rate limiting gracefully
- Use field aliases for clarity

### Query Structure Example

```typescript
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
            stargazerCount
            forkCount
            updatedAt
            createdAt
            owner {
              login
              avatarUrl
              url
            }
            # Add other fields as needed
          }
          starredAt
        }
      }
    }
  }
`;
```

### Pagination Implementation

Follow the existing pagination pattern:

```typescript
let hasNextPage = true;
let cursor: string | null = null;
let allResults: any[] = [];

while (hasNextPage) {
  const variables = {
    username,
    cursor
  };

  const response = await graphqlWithAuth(query, variables);
  const starredRepos = response.user.starredRepositories;
  
  // Process edges
  const edges = starredRepos.edges;
  for (const edge of edges) {
    allResults.push(processEdge(edge));
  }

  console.log(`Processed ${edges.length} items, total: ${allResults.length}/${starredRepos.totalCount}`);

  // Check for next page
  hasNextPage = starredRepos.pageInfo.hasNextPage;
  cursor = starredRepos.pageInfo.endCursor;
}
```

## Rate Limiting and Error Handling

### Intelligent Rate Limit Handling

Use the existing rate limiting pattern:

```typescript
// Utility function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      
      // Implement exponential backoff or wait for reset
      const waitTime = 5000 * Math.pow(2, retryCount - 1);
      console.log(`Waiting ${waitTime}ms before retry...`);
      await delay(waitTime);
    }
  }
};
```

### Rate Limit Status Check

```typescript
async function getRateLimitStatus(graphqlWithAuth: any) {
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
    const response = await graphqlWithAuth(rateLimitQuery);
    return response.rateLimit;
  } catch (error) {
    console.log('Failed to fetch rate limit status:', error);
    throw error;
  }
}
```

## Data Processing Patterns

### Data Transformation

When processing GraphQL responses:

- Transform data to match frontend requirements
- Calculate derived fields (percentages, statistics)
- Handle null/undefined values gracefully
- Create both full and simplified data versions

### Processing Example

```typescript
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

function processRepository(repo: any, starredAt: string): ProcessedRepository {
  // Process languages
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

  // Process topics
  const topics = repo.repositoryTopics ? 
    repo.repositoryTopics.nodes.flatMap(n => n?.node?.topic?.name) : [];

  return {
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
  };
}
```

### Creating Simplified Data

```typescript
interface SimplifiedRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  languages: Record<string, { percentage: string }>;
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

function createSimplifiedVersion(fullData: ProcessedRepository[]): SimplifiedRepository[] {
  return fullData.map(repo => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    html_url: repo.html_url,
    description: repo.description,
    language: repo.language,
    languages: Object.fromEntries(
      Object.entries(repo.languages).map(([lang, data]) => [lang, { percentage: data.percentage }])
    ),
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
}
```

## Type Definitions

### GraphQL Response Types

Define proper TypeScript interfaces for GraphQL responses:

```typescript
interface GraphQLRepository {
  id: string;
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  primaryLanguage: {
    name: string;
  } | null;
  languages: {
    edges: Array<{
      node: {
        name: string;
      };
      size: number;
    }>;
    totalSize: number;
  };
  stargazerCount: number;
  forkCount: number;
  updatedAt: string;
  createdAt: string;
  owner: {
    login: string;
    avatarUrl: string;
    url: string;
  };
  repositoryTopics: {
    nodes: Array<{
      node: {
        topic: {
          name: string;
        };
      };
    }>;
  };
}

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
```

## File Operations

### Safe File Writing

```typescript
function safeWriteFile(filePath: string, data: any) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file with proper formatting
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Successfully wrote to ${filePath}`);
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    throw error;
  }
}
```

### Multiple Output Files

```typescript
// Save full data
safeWriteFile(outputFile, processedRepos);

// Save simplified data
const simplifiedRepos = createSimplifiedVersion(processedRepos);
safeWriteFile(simpleOutputFile, simplifiedRepos);

// Set outputs
core.setOutput('repositories-count', processedRepos.length.toString());
core.setOutput('output-file', outputFile);
core.setOutput('simple-output-file', simpleOutputFile);
```

## Testing and Debugging

### Local Testing

Use the existing simulation scripts for testing:

```bash
# Test the action locally
cd action
pnpm build
cd ..
node scripts/simulate-action.cjs
```

### Debug Logging

Add comprehensive logging for debugging:

```typescript
console.log(`Starting processing for user: ${username}`);
console.log(`Full output file: ${outputFile}`);
console.log(`Simple output file: ${simpleOutputFile}`);

// During processing
console.log(`Processing batch ${batchNumber + 1}`);
console.log(`Rate limit status: ${JSON.stringify(rateLimitInfo)}`);

// Final results
console.log(`Processing complete. Total repositories: ${processedRepos.length}`);
console.log(`Full data saved to: ${outputFile}`);
console.log(`Simplified data saved to: ${simpleOutputFile}`);
```

## Performance Optimization

### Batch Processing

For large datasets, implement batch processing:

```typescript
const BATCH_SIZE = 100;
let processedCount = 0;

for (const edge of edges) {
  const processed = processRepository(edge.node, edge.starredAt);
  processedRepos.push(processed);
  processedCount++;

  if (processedCount % BATCH_SIZE === 0) {
    console.log(`Processed ${processedCount} repositories...`);
  }
}
```

### Memory Management

For very large datasets:

```typescript
// Process in chunks to manage memory
async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => R,
  chunkSize: number = 1000
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const processedChunk = chunk.map(processor);
    results.push(...processedChunk);
    
    // Allow garbage collection
    if (i > 0 && i % (chunkSize * 10) === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return results;
}
```

## Error Recovery

### Retry Logic

Implement robust retry logic for transient failures:

```typescript
async function robustFetch<T>(
  fetcher: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetcher();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### Data Validation

Validate data before processing:

```typescript
function validateRepositoryData(repo: any): boolean {
  const requiredFields = ['id', 'name', 'nameWithOwner', 'url'];
  return requiredFields.every(field => repo[field] !== undefined && repo[field] !== null);
}

// Usage
if (!validateRepositoryData(repo)) {
  console.warn(`Invalid repository data, skipping: ${JSON.stringify(repo)}`);
  continue;
}
```

## Common Development Tasks

### Adding New GraphQL Fields

1. Update the GraphQL query to include new fields
2. Update the TypeScript interfaces in `action/src/types/github.ts`
3. Update the data processing logic
4. Update the simplified data structure if needed
5. Test with simulation scripts

### Modifying Output Format

1. Update the processed repository interface
2. Modify the processing logic
3. Update the simplified version creation
4. Test that frontend can handle the new format
5. Update frontend types if necessary

### Adding New Input Parameters

1. Update `action.yml` to include new inputs
2. Update the action code to read the new inputs
3. Implement logic based on the new parameters
4. Update documentation
5. Test with different parameter values

## Security Considerations

### Token Handling

- Never log or expose GitHub tokens
- Use proper authentication headers
- Validate input parameters
- Handle token expiration gracefully

### Input Validation

```typescript
function validateInputs(githubToken: string, username: string): void {
  if (!githubToken || githubToken.trim() === '') {
    throw new Error('GitHub token is required');
  }
  
  if (!username || username.trim() === '') {
    throw new Error('Username is required');
  }
  
  // Basic username validation
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(username)) {
    throw new Error('Invalid username format');
  }
}
