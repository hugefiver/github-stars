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

export interface LicenseInfo {
  key: string;
  name: string;
  spdxId: string;
  url: string | null;
}

export interface FundingLink {
  platform: string;
  url: string;
}

export interface Release {
  name: string;
  tagName: string;
  createdAt: string;
  url: string;
}

export interface Milestone {
  title: string;
  description: string | null;
  state: string;
  dueOn: string | null;
  url: string;
}

export interface MilestoneConnection {
  nodes: Milestone[];
}

export interface Package {
  name: string;
  packageType: string;
  version: string | null;
}

export interface PackageConnection {
  nodes: Package[];
}

export interface ParentRepository {
  name: string;
  nameWithOwner: string;
  url: string;
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
  licenseInfo: LicenseInfo | null;
  fundingLinks: FundingLink[];
  isArchived: boolean;
  isFork: boolean;
  parent: ParentRepository | null;
  isMirror: boolean;
  latestRelease: Release | null;
  milestones: MilestoneConnection;
  mirrorUrl: string | null;
  packages: PackageConnection;
  pushedAt: string;
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
  milestones: {
    title: string;
    description: string | null;
    state: string;
    dueOn: string | null;
    url: string;
  }[];
  mirrorUrl: string | null;
  packages: {
    name: string;
    packageType: string;
    version: string | null;
  }[];
  pushedAt: string;
}
