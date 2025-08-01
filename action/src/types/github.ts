export interface Owner {
  login: string;
  avatarUrl: string;
  url: string;
}

export interface LanguageEdge {
  node: {
    name: string;
  };
  size: number;
}

export interface Languages {
  edges: LanguageEdge[];
  totalSize: number;
}

export interface RepositoryTopicEdge {
  node: {
    topic: {
      name: string;
    };
  };
}

export interface RepositoryTopics {
  nodes: RepositoryTopicEdge[];
}

export interface PrimaryLanguage {
  name: string;
}

export interface GraphQLRepository {
  id: string;
  name: string;
  nameWithOwner: string;
  description: string | null;
  url: string;
  primaryLanguage: PrimaryLanguage | null;
  languages: Languages;
  stargazerCount: number;
  forkCount: number;
  updatedAt: string;
  createdAt: string;
  owner: Owner;
  repositoryTopics: RepositoryTopics | null;
}

export interface StarredRepositoryEdge {
  node: GraphQLRepository;
  starredAt: string;
}

export interface StarredRepositories {
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  edges: StarredRepositoryEdge[];
}

export interface GraphQLResponse {
  user: {
    starredRepositories: StarredRepositories;
  };
}

export interface ProcessedRepository {
  page_id: number;
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
}
