# AI开发指南

## 概述

本指南为AI助手（Cline和GitHub Copilot）提供详细的项目开发指导，确保生成的代码符合项目标准和最佳实践。

## 项目架构

### 核心组件
- **前端应用**: React 18 + Vite + TypeScript
- **状态管理**: Jotai (区分记忆性和非记忆性状态)
- **搜索功能**: MiniSearch (高性能全文搜索)
- **后端服务**: GitHub Actions + GraphQL API
- **数据存储**: JSON格式 (完整版和简化版)

### 数据流
1. GitHub Action定时获取星标仓库数据
2. 数据存储为JSON格式 (完整版和简化版)
3. 前端应用加载简化版数据
4. 使用MiniSearch建立搜索索引
5. 用户通过界面搜索和过滤数据

## 编码规范

### React组件开发

#### 组件结构
```typescript
interface ComponentProps {
  data: Repository;
  onAction: (id: number) => void;
  className?: string;
}

const Component: React.FC<ComponentProps> = ({ data, onAction, className = '' }) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  
  // 记忆性计算
  const processedData = useMemo(() => {
    return processData(data);
  }, [data]);
  
  // 事件处理
  const handleClick = useCallback(() => {
    onAction(data.id);
  }, [data.id, onAction]);
  
  // 副作用
  useEffect(() => {
    // 处理副作用
  }, []);
  
  return (
    <div className={`component ${className}`}>
      {/* JSX内容 */}
    </div>
  );
};

export default React.memo(Component);
```

#### 状态管理原则
- **记忆性状态**: 使用Jotai atoms (用户设置、偏好)
- **非记忆性状态**: 使用useState (搜索词、过滤条件)
- **全局状态**: 使用Jotai atoms (排序方式、显示设置)
- **派生状态**: 使用useMemo计算

```typescript
// 记忆性状态 (用户设置)
const [sortBy, setSortBy] = useAtom(sortByAtom);
const [showSettings, setShowSettings] = useAtom(showSettingsAtom);

// 非记忆性状态 (搜索和过滤)
const [searchTerm, setSearchTerm] = useState('');
const [selectedLanguage, setSelectedLanguage] = useState('');

// 派生状态
const filteredData = useMemo(() => {
  return data.filter(item => 
    item.language === selectedLanguage && 
    item.name.includes(searchTerm)
  );
}, [data, selectedLanguage, searchTerm]);
```

### TypeScript类型定义

#### 接口定义原则
- 使用明确的类型定义
- 避免使用any类型
- 提供详细的属性说明
- 使用泛型提高类型复用性

```typescript
interface Repository {
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
  licenseInfo: LicenseInfo | null;
  fundingLinks: FundingLink[];
  isArchived: boolean;
  isFork: boolean;
  parent: ParentRepo | null;
  isMirror: boolean;
  latestRelease: LatestRelease | null;
  milestones: Milestone[];
  mirrorUrl: string | null;
  packages: Package[];
  pushedAt: string | null;
}

interface LicenseInfo {
  key: string;
  name: string;
  spdxId: string;
  url: string | null;
}

interface FundingLink {
  platform: string;
  url: string;
}

interface ParentRepo {
  name: string;
  nameWithOwner: string;
  url: string;
}

interface LatestRelease {
  name: string;
  tagName: string;
  createdAt: string;
  url: string;
}

interface Milestone {
  title: string;
  description: string | null;
  state: string;
  dueOn: string | null;
  url: string;
}

interface Package {
  name: string;
  packageType: string;
  version: string | null;
}
```

### 数据获取和处理

#### API调用模式
```typescript
const fetchData = async (url: string): Promise<Repository[]> => {
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
    const error = err instanceof Error ? err.message : 'An unknown error occurred';
    setError(error);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

#### 数据处理模式
```typescript
const processData = (data: Repository[]): ProcessedData => {
  // 计算语言统计
  const languageStats = calculateLanguageStats(data);
  
  // 提取所有标签
  const allTags = extractAllTags(data);
  
  // 建立搜索索引
  const searchIndex = buildSearchIndex(data);
  
  return {
    data,
    languageStats,
    allTags,
    searchIndex
  };
};
```

### 搜索实现

#### MiniSearch配置
```typescript
const searchIndex = new MiniSearch({
  fields: ['name', 'full_name', 'description', 'language', 'topics'],
  storeFields: ['id', 'name', 'full_name', 'description', 'language', 'topics'],
  searchOptions: {
    boost: { name: 2, full_name: 2, topics: 1.5 },
    fuzzy: 0.2,
    prefix: true,
    combineWith: 'AND'
  }
});
```

#### 搜索功能实现
```typescript
const performSearch = (searchTerm: string, filters: SearchFilters): Repository[] => {
  if (!searchTerm && !hasActiveFilters(filters)) {
    return data;
  }
  
  let results: Repository[] = [];
  
  if (searchTerm) {
    const searchResults = searchIndex.search(searchTerm, {
      filter: (result) => {
        return applyFilters(result, filters);
      }
    });
    
    results = searchResults.map(result => {
      return data.find(repo => repo.id === result.id);
    }).filter((repo): repo is Repository => repo !== undefined);
  } else {
    results = data.filter(repo => applyFilters(repo, filters));
  }
  
  return results;
};
```

### 样式开发

#### CSS变量定义
```scss
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #17a2b8;
  --light-color: #f8f9fa;
  --dark-color: #343a40;
  
  --font-size-base: 16px;
  --font-size-lg: 1.25rem;
  --font-size-sm: 0.875rem;
  
  --spacing-unit: 8px;
  --border-radius: 4px;
  --box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

#### 响应式设计模式
```scss
.component {
  padding: var(--spacing-unit);
  margin-bottom: var(--spacing-unit);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  
  @media (max-width: 768px) {
    padding: calc(var(--spacing-unit) / 2);
    margin-bottom: calc(var(--spacing-unit) / 2);
  }
  
  @media (max-width: 480px) {
    padding: calc(var(--spacing-unit) / 4);
    margin-bottom: calc(var(--spacing-unit) / 4);
  }
}
```

### 性能优化

#### React优化技术
```typescript
// 使用React.memo优化组件渲染
const OptimizedComponent = React.memo(Component);

// 使用useMemo避免重复计算
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(props.data);
}, [props.data]);

// 使用useCallback避免函数重新创建
const handleClick = useCallback(() => {
  onAction(id);
}, [id, onAction]);

// 使用懒加载
const LazyComponent = React.lazy(() => import('./LazyComponent'));
```

#### 搜索性能优化
```typescript
// 搜索结果缓存
const searchCache = new Map<string, Repository[]>();

const cachedSearch = (searchTerm: string, filters: SearchFilters): Repository[] => {
  const cacheKey = `${searchTerm}-${JSON.stringify(filters)}`;
  
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }
  
  const results = performSearch(searchTerm, filters);
  searchCache.set(cacheKey, results);
  
  return results;
};

// 防抖搜索
const debouncedSearch = useMemo(() => {
  return debounce((searchTerm: string, filters: SearchFilters) => {
    const results = cachedSearch(searchTerm, filters);
    setSearchResults(results);
  }, 300);
}, []);
```

### 测试开发

#### 单元测试模式
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Component from './Component';

describe('Component', () => {
  it('renders correctly with data', () => {
    const mockData = {
      id: 1,
      name: 'Test Repository',
      // ... 其他属性
    };
    
    render(<Component data={mockData} onAction={vi.fn()} />);
    
    expect(screen.getByText('Test Repository')).toBeInTheDocument();
  });
  
  it('calls onAction when clicked', () => {
    const mockOnAction = vi.fn();
    const mockData = {
      id: 1,
      name: 'Test Repository',
      // ... 其他属性
    };
    
    render(<Component data={mockData} onAction={mockOnAction} />);
    
    fireEvent.click(screen.getByText('Test Repository'));
    expect(mockOnAction).toHaveBeenCalledWith(1);
  });
});
```

#### 集成测试模式
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'jotai';
import App from '../App';

describe('App Integration', () => {
  it('performs search correctly', async () => {
    render(
      <Provider>
        <App />
      </Provider>
    );
    
    const searchInput = screen.getByPlaceholderText('Search repositories...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.getByText('Search results for: test')).toBeInTheDocument();
    });
  });
});
```

### 错误处理

#### 错误边界组件
```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

#### 全局错误处理
```typescript
const handleGlobalError = (error: Error) => {
  console.error('Global error:', error);
  // 发送错误到监控服务
  // 显示用户友好的错误信息
};

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  console.error('Unhandled promise rejection:', event.reason);
  // 处理未处理的Promise拒绝
};

window.addEventListener('error', (event) => {
  handleGlobalError(event.error);
});

window.addEventListener('unhandledrejection', handleUnhandledRejection);
```

### 可访问性

#### ARIA标签使用
```typescript
const AccessibleComponent = ({ data, onAction }) => {
  return (
    <div 
      className="accessible-component"
      role="article"
      aria-label={`Repository: ${data.name}`}
    >
      <h2>
        <a 
          href={data.html_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${data.name} on GitHub`}
        >
          {data.name}
        </a>
      </h2>
      
      <button
        onClick={() => onAction(data.id)}
        aria-label={`Star ${data.name} repository`}
        aria-pressed={data.isStarred}
      >
        ⭐ Star
      </button>
    </div>
  );
};
```

#### 键盘导航支持
```typescript
const KeyboardAccessibleComponent = () => {
  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };
  
  return (
    <div 
      tabIndex={0}
      onKeyDown={(e) => handleKeyDown(e, () => console.log('Activated'))}
      role="button"
      aria-label="Interactive element"
    >
      Content
    </div>
  );
};
```

## 开发流程

### 代码生成指南
1. **组件生成**: 优先使用函数组件和TypeScript
2. **状态管理**: 根据需求选择useState或useAtom
3. **类型定义**: 为所有props和state定义明确类型
4. **性能优化**: 使用React.memo、useMemo、useCallback
5. **错误处理**: 实现完整的错误处理机制
6. **测试覆盖**: 为组件编写单元测试和集成测试

### 代码审查清单
- [ ] TypeScript类型安全
- [ ] React最佳实践
- [ ] 性能优化
- [ ] 错误处理
- [ ] 响应式设计
- [ ] 可访问性
- [ ] 测试覆盖
- [ ] 代码规范
- [ ] 文档完整性

### 部署注意事项
1. **构建检查**: 确保构建过程正常
2. **环境配置**: 验证环境变量和配置
3. **数据同步**: 确认GitHub Action正常工作
4. **性能监控**: 监控关键性能指标
5. **错误追踪**: 配置错误追踪系统

## 最佳实践

### 代码组织
- 按功能模块组织代码
- 使用绝对路径导入
- 保持组件单一职责
- 遵循一致的命名规范

### 性能最佳实践
- 使用React.lazy进行代码分割
- 实现虚拟滚动处理大量数据
- 优化搜索算法和索引
- 使用适当的缓存策略

### 安全最佳实践
- 验证所有用户输入
- 避免XSS攻击
- 不在前端暴露敏感信息
- 使用安全的API调用方式

### 维护最佳实践
- 定期更新依赖
- 监控性能指标
- 收集用户反馈
- 持续优化用户体验

## 常见问题解决

### 搜索性能问题
- 使用MiniSearch优化搜索性能
- 实现搜索结果缓存
- 使用防抖技术减少搜索频率
- 优化搜索索引配置

### 状态管理问题
- 正确区分记忆性和非记忆性状态
- 避免不必要的状态提升
- 使用适当的状态管理工具
- 实现状态的持久化

### 样式兼容性问题
- 使用CSS变量管理主题
- 实现响应式设计
- 测试不同设备和浏览器
- 使用现代CSS特性

### 构建和部署问题
- 检查构建配置
- 验证环境变量
- 确认依赖版本
- 测试部署流程

## 参考资源

### 官方文档
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Jotai Documentation](https://jotai.org/)
- [MiniSearch Documentation](https://lucaong.github.io/minisearch/)

### 工具和库
- [React Testing Library](https://testing-library.com/)
- [Vitest](https://vitest.dev/)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [GitHub Actions](https://docs.github.com/en/actions)

### 社区资源
- [React Community](https://react.dev/community)
- [TypeScript Community](https://www.typescriptlang.org/community)
- [Stack Overflow](https://stackoverflow.com/)
- [GitHub Discussions](https://github.com/features/discussions)

## 结论

本指南为AI助手提供了完整的项目开发指导，涵盖了从架构设计到具体实现的各个方面。遵循这些指导原则，可以确保生成的代码符合项目标准，具有良好的性能、可维护性和用户体验。

AI助手应该根据具体的开发需求，结合本指南和项目实际情况，生成高质量的代码和文档。
