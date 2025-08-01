# 技术文档

## 项目概述

GitHub Stars Search 是一个完全由 AI 生成的项目，用于自动获取和展示用户的 GitHub Star 仓库。该项目包含一个可重用的 GitHub Action 和一个 React 前端应用。

## 系统架构

### 整体架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub API   │    │  GitHub Action  │    │   React Frontend│
│                 │    │                 │    │                 │
│ • GraphQL API   │◄──►│ • Data Fetching │◄──►│ • Search & UI   │
│ • REST API      │    │ • Data Processing│    │ • Visualization │
│ • Rate Limits   │    │ • File Output   │    │ • Responsive    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Pages │    │   JSON Files    │    │   Browser      │
│                 │    │                 │    │                 │
│ • Static Hosting│    │ • Structured Data│    │ • User Interface│
│ • CDN          │    │ • Caching       │    │ • Interactions  │
│ • HTTPS        │    │ • Versioning    │    │ • Local Storage │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 数据流

1. **GitHub Action** 定时从 GitHub GraphQL API 获取数据
2. **数据处理**：将 GraphQL 响应转换为结构化的 JSON 格式
3. **文件存储**：将处理后的数据保存为 JSON 文件
4. **前端消费**：React 应用读取 JSON 文件并提供用户界面
5. **用户交互**：用户通过界面搜索、过滤和浏览仓库

## 技术栈详解

### 后端技术栈

#### GitHub Action

- **运行环境**: Node.js 24
- **主要依赖**:
  - `@actions/core`: GitHub Actions 核心库
  - `@actions/github`: GitHub API 客户端
  - `@octokit/graphql`: GraphQL 客户端
  - `@octokit/rest`: REST API 客户端
- **构建工具**: Vercel ncc (用于打包)

#### GraphQL 实现

- **查询语言**: GraphQL
- **API 端点**: <https://api.github.com/graphql>
- **认证方式**: Bearer Token (GitHub Token)
- **分页**: 基于 cursor 的分页

### 前端技术栈

#### React 应用

- **框架**: React 18
- **语言**: TypeScript
- **构建工具**: Vite
- **包管理**: pnpm
- **样式**: CSS3 (原生 CSS)

#### 核心库

- **MiniSearch**: 高性能全文搜索库
- **React DOM**: DOM 渲染
- **无其他 UI 库**: 保持轻量级

### 部署技术栈

#### GitHub Pages

- **静态托管**: GitHub Pages
- **域名**: <https://hugefiver.github.io/github-stars-search>
- **HTTPS**: 自动启用
- **CDN**: GitHub 全球 CDN

#### GitHub Actions 工作流

- **触发器**: 定时任务、手动触发、推送事件
- **环境**: Ubuntu Latest
- **权限**: contents, pages, id-token

## 数据结构设计

### GraphQL 查询结构

```graphql
query($username: String!, $cursor: String) {
  user(login: $username) {
    starredRepositories(first: 100, after: $cursor, orderBy: {field: STARRED_AT, direction: ASC}) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          # 仓库基本信息
          id
          name
          nameWithOwner
          description
          url
          
          # 语言信息
          primaryLanguage {
            name
          }
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            edges {
              node {
                name
              }
              size
            }
            totalSize
          }
          
          # 统计信息
          stargazerCount
          forkCount
          updatedAt
          createdAt
          
          # 所有者信息
          owner {
            login
            avatarUrl
            url
          }
          
          # 主题标签
          repositoryTopics(first: 10) {
            nodes {
              topic {
                name
              }
            }
          }
        }
        starredAt
      }
    }
  }
}
```

### 输出数据结构

#### 完整数据格式 (starred-repos.json)

```typescript
interface ProcessedRepository {
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
}
```

#### 简化数据格式 (starred-repos-simple.json)

```typescript
interface SimplifiedRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  languages: Record<string, { percentage: string }>;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  starred_at: string;
  owner_login: string;
  owner_avatar_url: string;
  owner_html_url: string;
}
```

## 核心功能实现

### 1. GitHub Action 实现

#### 主要功能模块

```typescript
// 1. 认证和配置
const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${githubToken}`,
  },
});

// 2. 分页数据获取
async function fetchStarredRepositories(username: string, cursor: string | null = null) {
  const query = `...`; // GraphQL 查询
  const variables = { username, cursor };
  return await graphqlWithAuth(query, variables);
}

// 3. 数据处理和转换
function processRepositoryData(repo: GraphQLRepository, starredAt: string): ProcessedRepository {
  // 处理语言统计
  const languages = processLanguageData(repo.languages);
  
  // 处理主题标签
  const topics = processTopicData(repo.repositoryTopics);
  
  return {
    // ... 字段映射
  };
}

// 4. 文件输出
function saveDataToFile(data: ProcessedRepository[], filePath: string) {
  const outputDir = path.dirname(filePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
```

#### 错误处理

```typescript
try {
  // 主要逻辑
  const processedRepos = await fetchAllStarredRepositories(username);
  await saveDataToFile(processedRepos, outputFile);
  
  // 设置输出参数
  core.setOutput('repositories-count', processedRepos.length.toString());
  core.setOutput('output-file', outputFile);
  core.setOutput('simple-output-file', simpleOutputFile);
  
} catch (error) {
  core.setFailed(`Error fetching starred repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

### 2. 前端搜索实现

#### MiniSearch 配置

```typescript
const miniSearch = new MiniSearch({
  fields: ['name', 'full_name', 'description', 'language', 'topics'],
  storeFields: ['id', 'name', 'full_name', 'description', 'language', 'languages', 'topics', 'html_url', 'stargazers_count', 'forks_count', 'updated_at', 'created_at', 'starred_at'],
  searchOptions: {
    boost: { name: 2, full_name: 2, topics: 1.5 },
    fuzzy: 0.2,
    prefix: true
  }
});
```

#### 搜索逻辑

```typescript
function searchRepositories(searchTerm: string, filters: SearchFilters): Repository[] {
  if (searchTerm && searchIndex) {
    const searchResults = searchIndex.search(searchTerm, {
      filter: (result) => {
        // 应用语言过滤
        if (filters.selectedLanguage && result.language !== filters.selectedLanguage) {
          return false;
        }
        // 应用标签过滤
        if (filters.selectedTag && (!result.topics || !result.topics.includes(filters.selectedTag))) {
          return false;
        }
        return true;
      }
    });
    
    // 获取完整的仓库对象
    return searchResults.map(result => {
      const repo = repos.find(r => r.id === result.id);
      return repo;
    }).filter((repo): repo is Repository => repo !== undefined);
  } else {
    // 无搜索词时的过滤逻辑
    return repos.filter(repo => {
      const matchesLanguage = !filters.selectedLanguage || repo.language === filters.selectedLanguage;
      const matchesTag = !filters.selectedTag || (repo.topics && repo.topics.includes(filters.selectedTag));
      return matchesLanguage && matchesTag;
    });
  }
}
```

### 3. 无限滚动实现

```typescript
function useInfiniteScroll(items: Repository[], itemsPerLoad: number = 10) {
  const [displayedCount, setDisplayedCount] = useState(itemsPerLoad);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || displayedCount >= items.length) {
        return;
      }

      const scrollPosition = window.scrollY + window.innerHeight;
      const threshold = document.documentElement.scrollHeight - 200;

      if (scrollPosition >= threshold) {
        setLoadingMore(true);
        setTimeout(() => {
          setDisplayedCount(prev => prev + itemsPerLoad);
          setLoadingMore(false);
        }, 500);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, displayedCount, items.length]);

  return {
    displayedItems: items.slice(0, displayedCount),
    hasMore: displayedCount < items.length,
    loadingMore
  };
}
```

## 性能优化

### 1. 搜索性能优化

- **MiniSearch 索引**: 预先构建搜索索引，提供 O(1) 搜索复杂度
- **模糊搜索**: 支持拼写错误的搜索
- **字段权重**: 对重要字段（如名称）给予更高权重
- **前缀搜索**: 支持部分匹配

### 2. 渲染性能优化

- **虚拟滚动**: 只渲染可见区域的仓库卡片
- **React.memo**: 避免不必要的重新渲染
- **懒加载**: 图片和资源按需加载
- **防抖处理**: 搜索输入防抖

### 3. 数据处理优化

- **分页获取**: 避免一次性获取大量数据
- **数据缓存**: 本地缓存已获取的数据
- **增量更新**: 只更新变化的数据

## 安全考虑

### 1. GitHub Token 安全

- **最小权限原则**: 只授予必要的权限
- **Token 范围**: 使用 repository 范围的 token
- **环境变量**: 通过 GitHub Secrets 存储 token
- **自动轮换**: 定期更新 token

### 2. 数据安全

- **公开数据**: 只处理公开的仓库信息
- **敏感信息**: 不存储或处理敏感信息
- **HTTPS**: 所有通信都通过 HTTPS
- **输入验证**: 验证所有用户输入

### 3. 前端安全

- **XSS 防护**: 对用户输入进行转义
- **CORS**: 配置适当的跨域策略
- **内容安全策略**: 实施 CSP 策略

## 部署流程

### 1. GitHub Actions 工作流

```yaml
name: Fetch Starred Repositories

on:
  schedule:
    - cron: '0 0 * * *'  # 每天运行
  workflow_dispatch:     # 手动触发
  push:
    branches:
      - master
    paths-ignore:
      - 'docs/**'

jobs:
  fetch-starred-repos:
    runs-on: ubuntu-latest
    permissions: 
      contents: write 
      pages: write 
      id-token: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Fetch starred repositories
        uses: ./action
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          username: ${{ github.actor }}
          output-file: ./docs/data/starred-repos.json
          simple-output-file: ./docs/data/starred-repos-simple.json
          
      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install
          
      - name: Build frontend
        run: pnpm run build
          
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

### 2. 构建和部署步骤

1. **代码检出**: 检出最新代码
2. **数据获取**: 运行 GitHub Action 获取最新数据
3. **依赖安装**: 安装前端依赖
4. **前端构建**: 构建生产版本
5. **文件部署**: 部署到 GitHub Pages

## 监控和日志

### 1. GitHub Actions 日志

- **执行日志**: 记录每个步骤的执行情况
- **错误日志**: 记录错误信息和堆栈跟踪
- **性能指标**: 记录执行时间和资源使用

### 2. 前端监控

- **错误捕获**: 捕获和报告前端错误
- **性能监控**: 监控页面加载性能
- **用户行为**: 分析用户搜索和浏览行为

## 故障排除

### 1. 常见问题

#### GitHub API 限制

- **问题**: API 请求被限制
- **解决**: 检查 token 权限，等待限制重置

#### GraphQL 查询错误

- **问题**: 查询语法错误或字段不存在
- **解决**: 检查 GraphQL 文档，验证查询语法

#### 前端搜索问题

- **问题**: 搜索结果不准确或性能差
- **解决**: 重新构建搜索索引，优化搜索配置

### 2. 调试工具

#### GraphQL 测试工具

```bash
# 运行 GraphQL 查询测试
node scripts/test-graphql-query.cjs

# 运行完整的 action 模拟
node scripts/simulate-action.cjs
```

#### 前端调试

- **开发者工具**: 浏览器开发者工具
- **React DevTools**: React 组件调试
- **网络面板**: 检查 API 请求

## 未来扩展

### 1. 功能扩展

- **高级搜索**: 支持更复杂的搜索条件
- **数据导出**: 支持导出搜索结果
- **统计分析**: 提供更详细的统计信息
- **多用户支持**: 支持多个用户的数据

### 2. 技术改进

- **PWA**: 支持离线使用
- **服务端渲染**: 提高首屏加载速度
- **数据缓存**: 改进缓存策略
- **国际化**: 支持多语言

### 3. 架构优化

- **微服务**: 拆分为独立的服务
- **容器化**: 使用 Docker 部署
- **API 网关**: 统一 API 入口
- **监控告警**: 完善的监控系统

## 贡献指南

本项目完全由 AI 生成，所有贡献都应遵循 AI 生成内容政策。详细信息请参考 [CONTRIBUTING.md](../CONTRIBUTING.md)。

## 许可证

本项目采用 MIT 许可证。详细信息请参考 [LICENSE](../LICENSE) 文件。
