export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  languages?: Record<string, { percentage: string }>;
  topics: string[];
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  starred_at: string;
  license?: {
    name: string;
  } | null;
  licenseInfo?: {
    key: string;
    name: string;
    spdxId: string;
    url: string | null;
  } | null;
  fundingLinks?: {
    platform: string;
    url: string;
  }[];
  isArchived?: boolean;
  isFork?: boolean;
  parent?: {
    name: string;
    nameWithOwner: string;
    url: string;
  } | null;
  isMirror?: boolean;
  latestRelease?: {
    name: string;
    tagName: string;
    createdAt: string;
    url: string;
  } | null;
  milestones?: {
    title: string;
    description: string | null;
    state: string;
    dueOn: string | null;
    url: string;
  }[];
  mirrorUrl?: string | null;
  packages?: {
    name: string;
    packageType: string;
    version: string | null;
  }[];
  pushedAt?: string;
}

export interface LanguageStat {
  language: string;
  count: number;
  percentage: string;
}

export interface LanguageStats {
  stats: LanguageStat[];
  totalWithLanguage: number;
  totalRepos: number;
  noLanguageCount: number;
}
