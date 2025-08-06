import * as gh from './graphql';

type StarredRepositoryConnection = gh.StarredRepositoryConnection

export interface GraphQLResponse {
  user: {
    starredRepositories: StarredRepositoryConnection;
  };
}

export interface ProcessedRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  languages: Record<string, {
    bytes: number;
    percentage: string;
  }>;
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
  licenseInfo: {
    key: string;
    name: string;
    spdxId: string;
    url: string | null;
  } | null;
  fundingLinks: {
    platform: string;
    url: string;
  }[];
  isArchived: boolean;
  isFork: boolean;
  parent: {
    name: string;
    nameWithOwner: string;
    url: string;
  } | null;
  isMirror: boolean;
  latestRelease: {
    name: string;
    tagName: string;
    createdAt: string;
    url: string;
  } | null;
  mirrorUrl: string | null;
  packages: {
    totalCount: number;
    name: string;
    packageType: string;
    version: {
      id: string;
      version: string;
      preRelease: boolean;
      platform: string | null;
      summary: string | null;
      readme: string | null;
      statistics: {
        downloadsTotalCount: number;
      } | null;
      release: {
        name: string;
        tagName: string;
        createdAt: string;
        url: string;
      } | null;
    } | null;
  }[];
  pushedAt: string | null;
}
