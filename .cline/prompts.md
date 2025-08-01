# GitHub Stars Search - Cline 提示词配置

[![AI Generated](https://img.shields.io/badge/AI-Generated-blue?logo=bot&logoColor=white)](https://github.com/saoudrizwan/claude-coder)
[![Created by Cline](https://img.shields.io/badge/Created%20by-Cline-green?logo=github&logoColor=white)](https://github.com/saoudrizwan/claude-coder)
[![Configuration File](https://img.shields.io/badge/Type-Configuration-purple)](https://github.com/saoudrizwan/claude-coder)

> **AI生成说明**: 此配置文件由Cline AI助手自动生成，用于配置GitHub Stars Search项目的Cline运行环境。

## 项目概述

这是一个GitHub星标仓库搜索应用，使用React + Vite构建，包含前端界面和GitHub Action两部分。前端提供搜索、过滤、排序功能，后端通过GitHub Actions自动获取用户的星标仓库数据。

## 技术栈

- **前端**: React, Vite, CSS3, MiniSearch
- **后端**: GitHub Actions, Node.js, Octokit  
- **部署**: GitHub Pages

## 开发指南

### 环境设置

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev

# 构建生产版本
pnpm run build

# 预览生产版本
pnpm run preview
```

### 项目结构

```
src/               # 前端源代码
├── App.jsx        # 主应用组件
├── App.css        # 应用样式
├── main.jsx       # 应用入口
└── index.css      # 全局样式

action/            # GitHub Action代码
├── action.yml     # Action配置
├── package.json   # Action依赖
└── src/index.js   # Action主要逻辑

data/              # 存储星标仓库数据
├── starred-repos.json          # 完整数据
└── starred-repos-simple.json   # 简化数据

scripts/           # 辅助脚本
├── simulate-action.cjs         # 模拟Action运行
└── simulate-action-small.cjs   # 小规模模拟

.github/workflows/ # GitHub Actions工作流配置
└── fetch-starred-repos.yml    # 定时获取数据工作流
```

### 核心功能实现

#### 搜索功能

- 使用MiniSearch库实现全文搜索
- 支持仓库名、描述、主题的模糊搜索
- 支持前缀搜索和搜索结果加权

#### 数据过滤

- 按编程语言过滤
- 按主题标签过滤
- 多种排序方式（星数、fork数、更新时间、创建时间、名称）

#### 用户体验

- 响应式设计，适配移动端和桌面端
- 无限滚动加载更多内容
- 设置浮窗允许自定义数据源
- 加载状态和错误处理

### 代码规范

#### React组件

- 使用函数组件和React Hooks
- 保持组件职责单一
- 使用useMemo优化性能
- 合理的状态管理

#### 样式规范

- 使用CSS3实现响应式设计
- 采用BEM命名规范
- 确保良好的可访问性
- 适配不同屏幕尺寸

#### 数据处理

- 使用fetch API加载数据
- 错误处理和加载状态
- 数据格式验证
- 本地存储和缓存策略

## 部署指南

### GitHub Pages部署

1. 构建项目：`pnpm run build`
2. 推送到gh-pages分支
3. 在仓库设置中启用GitHub Pages

### GitHub Action配置

- 定时自动获取星标仓库数据
- 支持手动触发
- 可重用的Action组件
- 自定义输出文件路径

## 维护事项

### 数据同步

- GitHub Actions每天自动运行
- 支持手动触发同步
- 注意API调用频率限制

### 性能优化

- 使用MiniSearch优化搜索性能
- 懒加载和分页显示
- 图片和资源优化

### 隐私保护

- 建议将仓库设为私有
- 避免敏感信息泄露
- 合理使用GitHub Token

## 常见问题

### API限制

- GitHub API限制每次最多获取1000个星标仓库
- 需要合理处理分页和错误情况

### 数据格式

- 确保JSON数据格式正确
- 处理空值和缺失字段
- 保持数据结构一致性

### 浏览器兼容性

- 支持现代浏览器
- 适配移动端浏览器
- 考虑降级方案

## 扩展功能

### 可考虑的改进

- 添加用户认证系统
- 支持多个用户的数据
- 增加高级搜索功能
- 添加数据导出功能
- 集成更多GitHub API功能

### 技术优化

- 考虑使用TypeScript
- 添加单元测试
- 优化构建流程
- 改进错误处理机制
