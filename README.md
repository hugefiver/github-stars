# GitHub Stars Search

[![AI Created](https://img.shields.io/badge/AI-Fully%20Created-blue?logo=openai)](https://github.com/Qwen3-Coder)
[![Powered by Qwen3-Coder](https://img.shields.io/badge/Powered%20by-Qwen3--Coder-brightgreen)](https://github.com/Qwen3-Coder)
[![Built with Void Editor](https://img.shields.io/badge/Built%20with-Void%20Editor-purple?logo=void)](https://github.com/void-editor)
[![GLM-4.5](https://img.shields.io/badge/GLM-4.5-Enhanced-orange?logo=zhipu-ai)](https://github.com/THUDM/GLM-4)

这是一个自动获取您的 GitHub Star 仓库信息并在网页上展示的工具。它包含两个主要部分：

1. 使用 GitHub Actions 定期从 GitHub API 获取您 Star 的仓库信息
2. 前端页面，用于浏览和搜索这些仓库

## 功能特点

- 自动每天同步您的 GitHub Star 仓库信息
- 响应式设计，支持移动端浏览
- 强大的搜索功能：
  - 按关键字搜索（仓库名、描述、主题）
  - 按编程语言过滤
  - 多种排序方式（按星数、fork 数、更新时间等）
- 分页显示，提高浏览体验
- 可自定义数据源设置
- 详细的编程语言分布统计
- 无限滚动加载
- 仓库主题标签展示

## 技术栈

- **后端**: GitHub Actions, Node.js 24, Octokit, GraphQL
- **前端**: React 18, Vite, TypeScript, CSS3, MiniSearch
- **部署**: GitHub Pages
- **包管理**: pnpm

## 可重用的 GitHub Action

这个项目包含一个可重用的 GitHub Action，可以轻松集成到其他项目中：

### 在其他仓库中使用

```yaml
- name: Fetch starred repositories
  uses: hugefiver/github-stars-search/action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    username: ${{ github.actor }}
    output-file: ./data/starred-repos.json
    simple-output-file: ./data/starred-repos-simple.json
```

### Action 输入参数

| 参数 | 描述 | 默认值 |
|------|------|--------|
| `github-token` | GitHub 认证令牌 | `${{ github.token }}` |
| `username` | 要获取 Star 仓库的用户名 | `${{ github.actor }}` |
| `output-file` | 保存完整仓库数据的文件路径 | `./starred-repos.json` |
| `simple-output-file` | 保存简化仓库数据的文件路径 | `./starred-repos-simple.json` |

### Action 输出参数

| 输出 | 描述 |
|------|------|
| `repositories-count` | 获取到的 Star 仓库数量 |
| `output-file` | 完整仓库数据文件的路径 |
| `simple-output-file` | 简化仓库数据文件的路径 |

## 前端功能

### 设置浮窗

前端页面包含一个设置浮窗，允许用户自定义数据文件的位置：

- 点击右上角的"⚙️ Settings"按钮打开设置
- 输入自定义数据文件的 URL
- 默认使用当前网站的 `./data/starred-repos-simple.json` 文件

### 搜索和过滤

- **关键字搜索**：在仓库名、描述和主题标签中搜索（使用 MiniSearch 实现高性能搜索）
- **语言过滤**：按编程语言筛选仓库
- **标签过滤**：按仓库主题标签筛选
- **多种排序**：按星数、fork 数、更新时间、创建时间、星标时间和名称排序
- **排序方向**：支持升序和降序排列

### 响应式设计

- 适配桌面和移动设备
- 在小屏幕上自动调整布局
- 无限滚动加载更多内容

### 仓库信息展示

- 仓库基本信息（名称、描述、URL）
- 编程语言分布统计和可视化
- 仓库主题标签
- 统计信息（星数、fork 数、更新时间、星标时间）

## 如何使用

### 1. 克隆此仓库

```bash
git clone https://github.com/hugefiver/github-stars-search.git
cd github-stars-search
```

### 2. 构建 Action（如果需要修改）

进入 action 目录并安装依赖：

```bash
cd action
pnpm install
pnpm run build
```

### 3. 配置 GitHub Actions

工作流文件位于 `.github/workflows/fetch-starred-repos.yml`，默认配置为每天自动运行一次。

工作流现已优化：

- 统一使用 Node.js 24 环境
- 改进了依赖安装和构建过程
- 使用最新的 GitHub Actions 版本
- 自动部署到 GitHub Pages

### 4. 启用 GitHub Pages

1. 转到仓库设置 (Settings)
2. 在 "Pages" 部分，选择：
   - Source: Deploy from a branch
   - Branch: gh-pages
3. 保存设置

### 5. 手动触发首次运行

您可以手动触发工作流来立即获取数据：

1. 转到仓库的 "Actions" 标签
2. 选择 "Fetch Starred Repositories" 工作流
3. 点击 "Run workflow" 按钮

## 开发

### 前端开发

安装依赖：

```bash
pnpm install
```

启动开发服务器：

```bash
pnpm run dev
```

构建生产版本：

```bash
pnpm run build
```

### Action 开发

```bash
cd action
pnpm install
pnpm run build
```

## 数据结构

### 完整数据格式 (starred-repos.json)

获取的仓库信息包括：

- 仓库 ID 和名称
- 完整名称和 URL
- 描述和主要编程语言
- 详细的编程语言分布统计（字节大小和百分比）
- Star 数和 Fork 数
- 创建和更新时间
- 星标时间
- 所有者信息（登录名、头像、URL）
- 仓库主题标签

### 简化数据格式 (starred-repos-simple.json)

前端使用的数据格式，包含：

- 基本仓库信息
- 编程语言分布统计
- 主题标签
- 统计信息

数据保存在 `docs/data/starred-repos-simple.json` 文件中供前端使用。

## GraphQL API 实现

项目使用 GitHub GraphQL API 获取数据，具有以下特点：

- 使用 `nameWithOwner` 字段获取完整仓库名
- 正确处理 `StarredRepositoryEdge` 结构
- 支持分页获取大量数据
- 获取详细的编程语言统计信息
- 获取仓库主题标签

## 注意事项

- 由于 GitHub API 的限制，每次最多获取 1000 个 Star 的仓库
- 为了保护隐私，建议将此仓库设为私有
- 前端页面只能访问公开的仓库信息
- 使用 GraphQL API 需要注意速率限制
- 项目完全由 AI 生成，遵循项目的 AI 生成内容政策

## 项目结构

```
github-stars-search/
├── action/                 # GitHub Action 源码
│   ├── src/
│   │   ├── index.ts       # Action 主要逻辑
│   │   └── types/         # TypeScript 类型定义
│   ├── action.yml         # Action 配置
│   └── package.json
├── src/                   # 前端源码
│   ├── App.tsx           # 主要组件
│   ├── types.ts          # 前端类型定义
│   └── ...
├── docs/                  # 构建输出和 GitHub Pages
├── .github/workflows/     # GitHub Actions 工作流
└── scripts/              # 测试和模拟脚本
```
