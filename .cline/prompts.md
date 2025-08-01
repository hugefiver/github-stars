# GitHub Stars Search - Cline 提示词配置

[![AI Generated](https://img.shields.io/badge/AI-Generated-blue?logo=bot&logoColor=white)](https://github.com/saoudrizwan/claude-coder)
[![Created by Cline](https://img.shields.io/badge/Created%20by-Cline-green?logo=github&logoColor=white)](https://github.com/saoudrizwan/claude-coder)
[![Configuration File](https://img.shields.io/badge/Type-Configuration-purple)](https://github.com/saoudrizwan/claude-coder)

> **AI生成说明**: 此配置文件由Cline AI助手自动生成，用于配置GitHub Stars Search项目的Cline运行环境。

## 项目概述

这是一个完全由AI生成的GitHub星标仓库搜索应用，使用React 18 + Vite + TypeScript构建，包含前端界面和可重用的GitHub Action两部分。前端提供搜索、过滤、排序功能，后端通过GitHub Actions自动获取用户的星标仓库数据。项目遵循AI生成内容政策，所有代码和文档必须由AI生成。

## 技术栈

### 前端技术栈

- **核心框架**: React 18, TypeScript
- **构建工具**: Vite
- **样式**: CSS3 (原生CSS，使用CSS变量)
- **搜索**: MiniSearch (高性能全文搜索)
- **HTTP客户端**: @octokit/rest
- **环境变量**: dotenv

### 后端技术栈

- **运行环境**: Node.js 24
- **Action框架**: GitHub Actions
- **API客户端**: @octokit/graphql, @octokit/rest
- **构建工具**: @vercel/ncc
- **类型支持**: TypeScript

### 部署技术栈

- **静态托管**: GitHub Pages
- **CI/CD**: GitHub Actions
- **包管理**: pnpm
- **域名**: <https://hugefiver.github.io/github-stars-search>

## 开发指南

### 环境设置

```bash
# 安装前端依赖
pnpm install

# 安装Action依赖
cd action && pnpm install && cd ..

# 启动开发服务器
pnpm run dev

# 构建生产版本
pnpm run build

# 构建Action
cd action && pnpm run build && cd ..

# 预览生产版本
pnpm run preview

# 测试GraphQL查询
node scripts/test-graphql-query.cjs

# 模拟Action运行
node scripts/simulate-action.cjs
```

### 项目结构

```
src/                     # 前端React源代码
├── App.tsx             # 主应用组件
├── App.css             # 应用样式
├── main.tsx            # 应用入口
├── index.css           # 全局样式
├── types.ts            # 前端类型定义
└── types/              # 类型定义目录
    └── env.d.ts        # 环境变量类型

action/                 # GitHub Action源代码
├── action.yml          # Action配置
├── package.json        # Action依赖
├── tsconfig.json       # TypeScript配置
├── build.ts            # 构建脚本
├── src/                # Action源码
│   ├── index.ts        # Action主要逻辑
│   └── types/          # 类型定义
│       └── github.ts   # GitHub API类型
└── dist/               # 构建输出目录

docs/                   # 构建输出和GitHub Pages文件
├── data/               # 数据存储目录
│   ├── starred-repos.json          # 完整数据
│   └── starred-repos-simple.json   # 简化数据
├── assets/             # 静态资源
└── index.html          # 主页面

scripts/                # 辅助脚本
├── simulate-action.cjs         # 模拟Action运行
├── simulate-action-small.cjs   # 小规模模拟
├── test-action-languages.cjs   # 测试语言处理
└── test-graphql-query.cjs      # 测试GraphQL查询

.github/workflows/      # GitHub Actions工作流配置
└── fetch-starred-repos.yml    # 定时获取数据工作流

data/                   # 本地数据存储
├── starred-repos.json          # 完整数据
└── starred-repos-simple.json   # 简化数据
```

### 核心功能实现

#### 搜索功能 (MiniSearch)

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

- **全文搜索**: 支持仓库名、描述、主题的模糊搜索
- **前缀搜索**: 支持部分匹配和自动补全
- **字段权重**: 对重要字段给予更高权重
- **高性能**: O(1) 搜索复杂度，预先构建索引

#### 数据过滤和排序

- **语言过滤**: 按编程语言筛选仓库
- **标签过滤**: 按仓库主题标签筛选
- **多种排序**: 按星数、fork数、更新时间、创建时间、星标时间、名称排序
- **排序方向**: 支持升序和降序排列

#### 用户体验功能

- **响应式设计**: 适配移动端和桌面端
- **无限滚动**: 自动加载更多内容
- **设置浮窗**: 允许自定义数据源URL
- **加载状态**: 显示加载进度和错误处理
- **语言统计**: 可视化编程语言分布

### 代码规范

#### React组件规范

```typescript
// 使用函数组件和React Hooks
const RepositoryCard: React.FC<RepositoryCardProps> = ({ repository }) => {
  // 使用useMemo优化性能
  const memoizedData = useMemo(() => {
    return processRepositoryData(repository);
  }, [repository]);

  // 使用React.memo避免不必要的重新渲染
  return (
    <div className="repository-card">
      {/* 组件内容 */}
    </div>
  );
};

export default React.memo(RepositoryCard);
```

- **函数组件**: 优先使用函数组件和React Hooks
- **TypeScript**: 严格的类型定义和接口
- **性能优化**: 使用useMemo、React.memo等优化手段
- **状态管理**: 合理使用useState、useEffect等Hooks

#### TypeScript规范

```typescript
// 核心类型定义
interface Repository {
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

interface SearchFilters {
  selectedLanguage: string | null;
  selectedTag: string | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
```

- **严格类型**: 定义清晰的接口和类型
- **空值处理**: 正确处理null和undefined
- **类型安全**: 确保编译时类型检查

#### 样式规范

```css
/* 使用CSS变量管理主题色彩 */
:root {
  --primary-color: #0366d6;
  --secondary-color: #586069;
  --background-color: #ffffff;
  --text-color: #24292e;
  --border-color: #e1e4e8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .repository-card {
    padding: 12px;
    font-size: 14px;
  }
}

/* BEM命名规范 */
.repository-card {
  &__header {
    font-weight: bold;
  }
  
  &__description {
    color: var(--secondary-color);
  }
  
  &--featured {
    border: 2px solid var(--primary-color);
  }
}
```

- **CSS变量**: 使用CSS变量管理主题色彩
- **响应式设计**: 适配不同屏幕尺寸
- **BEM命名**: 采用BEM命名规范
- **性能优化**: 避免过度嵌套和复杂选择器

#### GitHub Action开发规范

```typescript
// Action主要逻辑
async function run(): Promise<void> {
  try {
    // 获取输入参数
    const githubToken = core.getInput('github-token');
    const username = core.getInput('username');
    const outputFile = core.getInput('output-file');
    
    // 获取数据
    const repositories = await fetchAllStarredRepositories(username);
    
    // 保存数据
    await saveDataToFile(repositories, outputFile);
    
    // 设置输出参数
    core.setOutput('repositories-count', repositories.length.toString());
    core.setOutput('output-file', outputFile);
    
  } catch (error) {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

- **错误处理**: 完整的错误处理和日志记录
- **输入验证**: 验证所有输入参数
- **输出设置**: 正确设置Action输出参数
- **性能考虑**: 合理使用分页和缓存

## 部署指南

### GitHub Pages部署

```bash
# 构建项目
pnpm run build

# 构建输出到docs目录
# docs/ 目录包含：
# - index.html
# - assets/
# - data/
# - 其他静态资源
```

1. **构建项目**: 运行 `pnpm run build`
2. **推送到仓库**: 提交docs目录到gh-pages分支
3. **启用GitHub Pages**: 在仓库设置中启用GitHub Pages
4. **配置域名**: 设置自定义域名（可选）

### GitHub Action配置

#### Action输入参数

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `github-token` | GitHub 认证令牌 | `${{ github.token }}` |
| `username` | 要获取 Star 仓库的用户名 | `${{ github.actor }}` |
| `output-file` | 保存完整仓库数据的文件路径 | `./starred-repos.json` |
| `simple-output-file` | 保存简化仓库数据的文件路径 | `./starred-repos-simple.json` |

#### Action输出参数

| 输出 | 描述 |
|------|------|
| `repositories-count` | 获取到的 Star 仓库数量 |
| `output-file` | 完整仓库数据文件的路径 |
| `simple-output-file` | 简化仓库数据文件的路径 |

#### 工作流配置

```yaml
name: Fetch Starred Repositories

on:
  schedule:
    - cron: '0 0 * * *'  # 每天运行
  workflow_dispatch:     # 手动触发
  push:
    branches:
      - master

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

## 维护事项

### 数据同步机制

- **定时同步**: GitHub Actions每天自动运行一次
- **手动触发**: 支持手动触发数据同步
- **API限制**: 注意GitHub API调用频率限制
- **数据格式**: 保持完整数据和简化数据的一致性

### 性能优化策略

- **搜索性能**: 使用MiniSearch预先构建搜索索引
- **渲染性能**: 实现虚拟滚动和懒加载
- **数据缓存**: 合理使用浏览器缓存和本地存储
- **构建优化**: 优化构建流程和输出大小

### 隐私和安全

- **仓库设置**: 建议将仓库设为私有以保护隐私
- **Token安全**: 合理使用GitHub Token，遵循最小权限原则
- **数据保护**: 只处理公开的仓库信息
- **HTTPS**: 确保所有通信都通过HTTPS

## 常见问题

### API限制问题

**问题**: GitHub API调用被限制
**解决**:

- 检查Token权限范围
- 合理使用分页获取数据
- 等待API限制重置
- 优化查询效率

### 数据格式问题

**问题**: JSON数据格式不正确
**解决**:

- 验证GraphQL查询语法
- 检查数据转换逻辑
- 处理空值和缺失字段
- 保持数据结构一致性

### 搜索性能问题

**问题**: 搜索响应慢或结果不准确
**解决**:

- 重新构建MiniSearch索引
- 优化搜索配置和权重
- 实现搜索防抖
- 检查过滤逻辑

### 构建部署问题

**问题**: 构建失败或部署不成功
**解决**:

- 检查依赖版本兼容性
- 验证构建配置
- 检查GitHub Actions权限
- 查看构建日志定位问题

## 扩展功能

### 功能扩展建议

- **用户认证**: 添加GitHub OAuth认证
- **多用户支持**: 支持多个用户的星标仓库数据
- **高级搜索**: 支持更复杂的搜索条件组合
- **数据导出**: 支持导出搜索结果为CSV/JSON
- **统计分析**: 提供更详细的统计图表

### 技术优化建议

- **PWA支持**: 添加Service Worker支持离线使用
- **服务端渲染**: 考虑使用Next.js改善首屏加载
- **微前端**: 将功能拆分为独立的微前端模块
- **容器化**: 使用Docker容器化部署
- **监控告警**: 添加性能监控和错误告警

### 架构改进建议

- **数据缓存**: 实现更智能的数据缓存策略
- **API网关**: 统一管理API调用和限流
- **消息队列**: 使用消息队列处理异步任务
- **数据库**: 考虑使用数据库存储历史数据
- **CDN优化**: 使用CDN加速静态资源加载

## AI生成内容政策

本项目完全由AI生成，所有贡献必须遵循以下原则：

1. **AI生成要求**: 所有代码、文档、配置文件必须由AI生成
2. **技术栈一致性**: 使用项目指定的技术栈和工具
3. **代码质量**: 确保生成的代码符合项目规范和最佳实践
4. **文档完整性**: 生成的文档必须清晰、准确、完整
5. **测试验证**: 所有生成的内容必须经过测试验证

## 开发工具和脚本

### 测试脚本

```bash
# 测试GraphQL查询
node scripts/test-graphql-query.cjs

# 测试语言处理
node scripts/test-action-languages.cjs

# 模拟完整Action运行
node scripts/simulate-action.cjs

# 小规模模拟测试
node scripts/simulate-action-small.cjs
```

### 调试工具

- **浏览器开发者工具**: 调试前端应用
- **React DevTools**: 调试React组件
- **GitHub Actions日志**: 查看Action执行日志
- **GraphQL IDE**: 测试GraphQL查询

这些配置和指南将帮助Cline更好地理解项目上下文，提供更准确的开发协助。
