import * as fs from "fs";
import * as path from "path";
import { ProcessedRepository } from "../types/github";

// 递减请求大小的函数
export function decrementRequestSize(currentSize: number, minSize: number): number {
  return Math.max(minSize, Math.floor(currentSize / 2));
}

// 处理语言数据
export function processLanguages(languagesData: any): Record<string, { bytes: number; percentage: string; color?: string }> {
  const languages: Record<string, { bytes: number; percentage: string; color?: string }> = {};
  
  if (languagesData?.edges && languagesData.totalSize && languagesData.totalSize > 0) {
    const totalSize = languagesData.totalSize;
    const langEdges = languagesData.edges;
    
    if (langEdges) {
      for (const langEdge of langEdges) {
        if (!langEdge?.node) {
          console.warn('Skipping empty language edge');
          continue;
        }
        
        const languageName = langEdge.node.name;
        const size = langEdge.size;
        languages[languageName] = {
          bytes: size,
          percentage: ((size / totalSize) * 100).toFixed(2),
          color: langEdge.node.color ?? undefined
        };
      }
    }
  }
  
  return languages;
}

// 处理topics
export function processTopics(topicsData: any): string[] {
  return (topicsData ?
    topicsData.nodes?.flatMap((n: any) => n?.topic?.name).filter((name: string): name is string => name !== undefined) : []) ?? [];
}

// 根据 id 去重
export function deduplicateRepositories(repos: ProcessedRepository[]): ProcessedRepository[] {
  return repos.filter((repo, index, self) =>
    index === self.findIndex(r => r.id === repo.id)
  );
}

// 确保目录存在
export function ensureDirectoryExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 生成简化版本的仓库数据
export function generateSimplifiedRepos(repos: ProcessedRepository[]): any[] {
  return repos.map(repo => ({
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
    pushedAt: repo.pushedAt ?? null
  }));
}