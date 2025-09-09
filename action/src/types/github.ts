// 更新后的类型定义文件
import * as gh from './graphql';

// GraphQL响应类型
export type StarredRepositoryConnection = gh.StarredRepositoryConnection;

// GraphQL响应接口
export interface GraphQLResponse {
  errors?: Array<{ message: string; type?: string }>;
  user?: {
    starredRepositories: StarredRepositoryConnection;
  };
  status?: number;
  headers?: any;
}

// 处理后的仓库接口
export interface ProcessedRepository {
  id: string;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  languages: Record<string, {
    bytes: number;
    percentage: string;
    color?: string;
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
    versions: {
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
    }[];
  }[];
  pushedAt: string | null;
}

// 简化仓库接口
export interface SimplifiedRepository {
  id: string;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  languages: Record<string, { bytes: number; percentage: string; color?: string }>;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  starred_at: string;
  owner_login: string;
  owner_avatar_url: string;
  owner_html_url: string;
  topics: string[];
  licenseInfo: {
    key: string;
    name: string;
    spdxId: string;
    url: string | null;
  } | null;
  isArchived: boolean;
  isFork: boolean;
  isMirror: boolean;
  parent: {
    name: string;
    nameWithOwner: string;
    url: string;
  } | null;
  pushedAt: string | null;
}