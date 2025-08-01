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
