# GitHub Copilot Instructions

## Project Overview
这是一个GitHub星标仓库搜索应用，包含前端React应用和GitHub Action两部分。前端提供搜索、过滤、排序功能，后端通过GitHub Actions自动获取用户的星标仓库数据。

## Architecture
- **Frontend**: React 18 + Vite + TypeScript + CSS3
- **State Management**: Jotai (区分记忆性和非记忆性状态)
- **Search**: MiniSearch (高性能全文搜索，支持模糊匹配和前缀搜索)
- **Backend**: GitHub Actions + Node.js 24 + Octokit + GraphQL
- **Deployment**: GitHub Pages

## Coding Standards

### React Development
- **使用函数组件和React Hooks**
- **保持组件单一职责**
- **使用TypeScript类型定义**
- **确保响应式设计**
- **使用React.memo优化性能**
- **实现懒加载和虚拟滚动**

### State Management
- **搜索和过滤状态**: 使用useState（不记忆）
- **用户设置**: 使用useAtom（记忆）
- **全局状态**: 使用Jotai atoms
- **避免不必要的状态提升**

### Data Handling
- **数据存储**: JSON格式，支持完整格式和简化格式
- **数据获取**: 使用fetch API和GraphQL
- **错误处理**: 实现完整的错误处理和加载状态
- **性能优化**: 前端使用简化格式提高加载性能

### Search Implementation
- **搜索库**: MiniSearch
- **搜索字段**: 仓库名、描述、语言、主题标签
- **搜索功能**: 模糊匹配、前缀搜索、字段权重配置
- **性能**: 高性能全文搜索

### Styling
- **CSS**: 使用CSS3和SCSS
- **响应式设计**: 适配移动端和桌面端
- **主题管理**: 使用CSS变量管理主题色彩
- **用户体验**: 确保良好的用户体验

## Code Patterns to Follow

### 1. Component Structure
```typescript
interface ComponentProps {
  // 清晰的props类型定义
  data: Repository;
  onAction: (id: number) => void;
}

const Component: React.FC<ComponentProps> = ({ data, onAction }) => {
  // 单一职责
  // 适当的错误边界处理
  // 性能优化考虑
  return (
    <div className="component">
      {/* JSX内容 */}
    </div>
  );
};

export default React.memo(Component);
```

### 2. State Management
```typescript
// 记忆性状态（用户设置）
const [sortBy, setSortBy] = useAtom(sortByAtom);

// 非记忆性状态（搜索和过滤）
const [searchTerm, setSearchTerm] = useState<string>('');
```

### 3. Data Fetching
```typescript
const fetchData = async (url: string) => {
  try {
    setLoading(true);
    setError(null);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error fetching data:', err);
    setError(err instanceof Error ? err.message : 'An unknown error occurred');
  } finally {
    setLoading(false);
  }
};
```

### 4. Search Implementation
```typescript
const miniSearch = new MiniSearch({
  fields: ['name', 'full_name', 'description', 'language', 'topics'],
  storeFields: ['id', 'name', 'full_name', 'description', 'language', 'topics'],
  searchOptions: {
    boost: { name: 2, full_name: 2, topics: 1.5 },
    fuzzy: 0.2,
    prefix: true
  }
});
```

## Avoid

### ❌ Don't Use
- **类组件**: 使用函数组件和React Hooks
- **any类型**: 严格使用TypeScript类型定义
- **直接DOM操作**: 使用React的声明式编程
- **过度嵌套组件**: 保持组件扁平化
- **过时的React API**: 使用最新的React特性

### ⚠️ Be Careful With
- **性能问题**: 避免不必要的重新渲染
- **内存泄漏**: 正确清理事件监听器和定时器
- **类型安全**: 确保所有类型定义正确
- **错误处理**: 实现完整的错误处理机制

## Testing

### Unit Testing
- **工具**: React Testing Library + Vitest
- **测试内容**: 组件渲染、用户交互、状态管理
- **Mock**: 使用MSW模拟API调用

### Integration Testing
- **测试数据流**: 验证状态管理和数据传递
- **API调用**: 测试GraphQL查询和数据处理
- **搜索功能**: 验证搜索和过滤功能

### E2E Testing
- **工具**: Playwright
- **测试场景**: 完整用户流程
- **覆盖范围**: 关键用户路径

## Performance Considerations

### React Optimization
- **React.memo**: 优化组件渲染
- **useMemo/useCallback**: 避免不必要的计算
- **懒加载**: 实现组件和数据的懒加载
- **虚拟滚动**: 处理大量数据列表

### Search Performance
- **索引优化**: 合理配置MiniSearch索引
- **搜索算法**: 使用高效的搜索算法
- **缓存策略**: 实现搜索结果缓存

### API Performance
- **GraphQL优化**: 使用高效的GraphQL查询
- **分页处理**: 实现数据分页加载
- **缓存策略**: 合理使用API缓存

## Accessibility

### WCAG 2.1 Standards
- **键盘导航**: 确保所有功能可通过键盘访问
- **屏幕阅读器**: 提供适当的ARIA标签
- **颜色对比**: 确保足够的颜色对比度
- **焦点管理**: 正确的焦点处理

### Best Practices
- **语义化HTML**: 使用适当的HTML标签
- **ARIA属性**: 提供必要的ARIA属性
- **可访问性测试**: 使用屏幕阅读器测试

## Documentation

### Code Comments
- **复杂逻辑**: 为复杂算法添加注释
- **业务逻辑**: 解释业务规则和流程
- **API调用**: 说明API参数和返回值

### Type Definitions
- **接口定义**: 定义清晰的TypeScript接口
- **属性说明**: 包含详细的属性说明
- **泛型使用**: 合理使用泛型提高类型复用性

### README Updates
- **安装说明**: 清晰的安装步骤
- **使用指南**: 详细的使用说明
- **开发指南**: 开发环境配置和流程
- **API文档**: API接口说明

## Quality Assurance

### Code Review Checklist
- [ ] TypeScript类型安全
- [ ] React最佳实践
- [ ] 性能优化
- [ ] 错误处理
- [ ] 响应式设计
- [ ] 可访问性
- [ ] 测试覆盖
- [ ] 代码规范

### Performance Metrics
- **搜索响应时间**: < 100ms
- **组件渲染性能**: < 16ms
- **API调用效率**: 优化GraphQL查询
- **内存使用**: 避免内存泄漏

### Security Considerations
- **输入验证**: 验证所有用户输入
- **XSS防护**: 避免XSS攻击
- **敏感信息**: 不要在前端存储敏感信息
- **API安全**: 使用安全的API调用方式

## Development Workflow

### Git Workflow
- **分支策略**: 使用master主分支，功能开发使用feature分支
- **提交规范**: 清晰的提交信息
- **代码审查**: 所有PR必须经过审查
- **自动化测试**: CI/CD流程包含自动化测试

### Build Process
- **前端构建**: 使用Vite构建到docs目录
- **Action构建**: 使用ncc打包到action/dist目录
- **依赖管理**: 统一使用pnpm管理依赖
- **环境配置**: 区分开发和生产环境

## AI Assistant Integration

### Cline Configuration
- **项目描述**: 详细的项目信息和技术栈
- **开发指南**: 完整的开发规范和最佳实践
- **代码生成**: 优先使用函数组件和TypeScript
- **质量保证**: 代码审查和测试标准

### GitHub Copilot
- **项目理解**: 通过本文件提供项目上下文
- **代码生成**: 遵循项目的编码规范和模式
- **最佳实践**: 生成符合项目标准的代码
- **文档生成**: 自动生成代码注释和文档

## Environment Configuration

### Development Environment
- **Node.js**: 版本24
- **包管理器**: pnpm
- **TypeScript**: 严格模式
- **开发工具**: VSCode + 相关插件

### Production Environment
- **部署**: GitHub Pages
- **数据同步**: GitHub Actions自动同步
- **性能监控**: 监控关键性能指标
- **错误追踪**: 实现错误追踪和报告

## Git Configuration

当调用 git 命令时，必须使用 `git --no-pager` 选项以避免分页器干扰。

### 支持的 Git 命令

以下 git 命令必须使用 `--no-pager` 选项：

```bash
git --no-pager log
git --no-pager status
git --no-pager diff
git --no-pager show
git --no-pager blame
git --no-pager branch
git --no-pager tag
git --no-pager stash
git --no-pager reflog