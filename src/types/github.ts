export interface Owner {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface Language {
  bytes: number;
  percentage: string;
}

export interface License {
  key: string;
  name: string;
  spdx_id: string;
  url: string | null;
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

export interface Package {
  name: string;
  packageType: string;
  version: string | null;
}

export interface ParentRepository {
  name: string;
  nameWithOwner: string;
  url: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  languages: Record<string, Language>;
  license: License | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  starred_at: string;
  owner: Owner;
  topics: string[];
  licenseInfo: LicenseInfo | null;
  fundingLinks: FundingLink[];
  isArchived: boolean;
  isFork: boolean;
  parent: ParentRepository | null;
  isMirror: boolean;
  latestRelease: Release | null;
  milestones: Milestone[];
  mirrorUrl: string | null;
  packages: Package[];
  pushedAt: string;
}

export interface LanguageStats {
  language: string;
  count: number;
  percentage: string;
}

export interface LanguageStatsResult {
  stats: LanguageStats[];
  totalWithLanguage: number;
  totalRepos: number;
  noLanguageCount: number;
}

export type SortBy = 'stars' | 'forks' | 'updated' | 'created' | 'starred' | 'name';
export type SortOrder = 'asc' | 'desc';
