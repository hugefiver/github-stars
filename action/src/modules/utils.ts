import * as fs from 'fs';
import * as path from 'path';
import { ProcessedRepository, SimplifiedRepository } from '../types/github';
import { LanguageConnection, RepositoryTopicConnection } from '../types/graphql';

export function decrementRequestSize(currentSize: number, minSize: number): number {
  return Math.max(minSize, Math.floor(currentSize / 2));
}

export function processLanguages(
  languagesData: LanguageConnection | null | undefined
): Record<string, { bytes: number; percentage: string; color?: string }> {
  const languages: Record<string, { bytes: number; percentage: string; color?: string }> = {};

  if (!languagesData?.edges || !languagesData.totalSize || languagesData.totalSize <= 0) {
    return languages;
  }

  const totalSize = languagesData.totalSize;
  for (const langEdge of languagesData.edges) {
    if (!langEdge?.node) continue;

    languages[langEdge.node.name] = {
      bytes: langEdge.size,
      percentage: ((langEdge.size / totalSize) * 100).toFixed(2),
      color: langEdge.node.color ?? undefined,
    };
  }

  return languages;
}

export function processTopics(topicsData: RepositoryTopicConnection | null | undefined): string[] {
  if (!topicsData?.nodes) return [];
  return topicsData.nodes
    .filter((n): n is NonNullable<typeof n> => n != null)
    .map((n) => n.topic.name)
    .filter((name): name is string => name !== undefined);
}

export function deduplicateRepositories(repos: ProcessedRepository[]): ProcessedRepository[] {
  return repos.filter((repo, index, self) => index === self.findIndex((r) => r.id === repo.id));
}

export function ensureDirectoryExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function generateSimplifiedRepos(repos: ProcessedRepository[]): SimplifiedRepository[] {
  return repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    html_url: repo.html_url,
    description: repo.description,
    language: repo.language,
    languages: repo.languages,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    updated_at: repo.updated_at,
    created_at: repo.created_at,
    starred_at: repo.starred_at,
    owner_login: repo.owner.login,
    owner_avatar_url: repo.owner.avatar_url,
    owner_html_url: repo.owner.html_url,
    topics: repo.topics,
    licenseInfo: repo.licenseInfo,
    isArchived: repo.isArchived,
    isFork: repo.isFork,
    isMirror: repo.isMirror,
    parent: repo.parent,
    pushedAt: repo.pushedAt ?? null,
  }));
}
