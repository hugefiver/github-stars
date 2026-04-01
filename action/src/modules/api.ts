import { graphql } from '@octokit/graphql';
import { GraphQLResponse } from '../types/github';

export type GraphqlClient = ReturnType<typeof graphql.defaults>;

// GraphQL查询语句
export const STARRED_REPOS_QUERY = `
  query($username: String!, $cursor: String, $requestSize: Int!) {
    user(login: $username) {
      starredRepositories(first: $requestSize, after: $cursor, orderBy: {field: STARRED_AT, direction: ASC}) {
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
                  color
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
            mirrorUrl
            packages(first: 3) {
              totalCount
              nodes {
                name
                packageType
                versions(last: 3) {
                  nodes {
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

export function createGraphqlClient(token: string): GraphqlClient {
  return graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  });
}

export async function fetchStarredRepositories(
  graphqlWithAuth: GraphqlClient,
  variables: { username: string; cursor: string | null; requestSize: number }
): Promise<GraphQLResponse> {
  return (await graphqlWithAuth(STARRED_REPOS_QUERY, variables)) as GraphQLResponse;
}
