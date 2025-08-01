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
