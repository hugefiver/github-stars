import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import FlexSearch, {Index} from 'flexsearch';
import { Repository } from '../types';
import { parseQuery } from '../lib/query-parser';

interface ParsedQuery {
  query: string; // 主搜索词，例如 'xyz'
  fields: { [key: string]: string | string[] | ParsedQuery[] }; // 例如 { tag: ['abc', 'def'] } 或 { tag: [ParsedQuery, ParsedQuery] } 用于嵌套
  booleanOps: { [key: string]: 'AND' | 'OR' | 'NOT' }; // 处理字段之间的布尔逻辑
  sortBy: string | null; // 例如 'repo_name'
  sortOrder: 'asc' | 'desc' | null; // 例如 'asc'
}

interface SearchDocument {
  id: number;
  name: string;
  full_name: string;
  description: string;
  language: string;
  topics: string;
}

interface SearchResult {
  id: number;
  name: string;
  full_name: string;
  description: string;
  language: string;
  topics: string[];
  score: number;
}

export const useFlexSearch = (repositories: Repository[]) => {
  const [searchIndex, setSearchIndex] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchTime, setSearchTime] = useState<number>(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const startTimeRef = useRef<number>(0);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初始化搜索索引
  useEffect(() => {
    const initializeSearch = async () => {
      try {        
        // 创建搜索索引配置
        const index = new FlexSearch.Index({
          tokenize: "forward",
          context: true
        });
        
        setSearchIndex(index);
        
        // 如果已有数据，立即构建索引
        if (repositories.length > 0) {
          buildIndex(index, repositories);
        }
      } catch (error) {
        console.error('Error initializing search:', error);
        setSearchError('Failed to initialize search');
      }
    };
    
    initializeSearch();
    
    // 清理函数
    return () => {
      if (searchIndex) {
        searchIndex.destroy?.();
      }
    };
  }, []);

  // 构建搜索索引的辅助函数
  const buildIndex = (index: Index, repos: Repository[]) => {
    // 清空现有索引
    index.clear();
    
    // 批量添加数据到索引
    repos.forEach((repo: Repository) => {
      // 确保所有字段都是字符串类型
      const content = [
        String(repo.name || ''),
        String(repo.full_name || ''),
        String(repo.description || ''),
        String(repo.language || ''),
        Array.isArray(repo.topics) ? repo.topics.join(' ') : ''
      ].join(' ');
      
      // 使用 id 作为文档 ID 添加到索引
      index.add(repo.id, content);
    });
  };

  // 当数据变化时，重新构建索引
  useEffect(() => {
    if (searchIndex && repositories.length > 0) {
      buildIndex(searchIndex, repositories);
    }
  }, [repositories, searchIndex]);

  // 执行搜索
  const performSearch = async (searchTerm: string) => {
    if (!searchIndex || !searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    startTimeRef.current = performance.now();
    const searchResultLimit = Math.min(Math.max(repositories.length, 100), 5000);

    try {
      // 解析查询字符串
      const parsedQuery: ParsedQuery = parseQuery(searchTerm.trim());
      
      // 构建字段查询条件
      const fieldConditions: { [key: string]: string | string[] | ParsedQuery[] } = {};
      Object.keys(parsedQuery.fields).forEach(field => {
        const value = parsedQuery.fields[field];
        // 将字段映射到仓库属性
        let repoField = field;
        if (field === 'tag' || field === 'topic') {
          repoField = 'topics';
        } else if (field === 'lang') {
          repoField = 'language';
        } else if (field === 'desc') {
          repoField = 'description';
        } else if (field === 'name') {
          repoField = 'full_name';
        }
        
        (fieldConditions as any)[repoField] = value;
      });

      // 执行搜索
      let results: number[] = [];
      
      // 如果有字段查询条件，需要过滤
      if (Object.keys(fieldConditions).length > 0) {
        // 先获取所有可能匹配的ID
        const allResults = searchIndex.search(parsedQuery.query || '*', {
          limit: searchResultLimit
        }) as number[];
        
        // 根据字段条件过滤结果
        results = allResults.filter((id: number) => {
          const repo = repositories.find((r: Repository) => r.id === id);
          if (!repo) return false;
          
          // 检查所有字段条件
          for (const [field, value] of Object.entries(fieldConditions)) {
            const repoValue = (repo as any)[field];
            
            // 检查值是否是嵌套查询
            if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
              // 这是嵌套查询，需要特殊处理
              const nestedQueries = value as ParsedQuery[];
              const op = parsedQuery.booleanOps[field] || 'OR';
              
              // 对每个嵌套查询进行评估
              const nestedResults = nestedQueries.map(nestedQuery => {
                // 为嵌套查询创建一个临时的字段条件
                const nestedFieldConditions: { [key: string]: string | string[] } = {};
                Object.keys(nestedQuery.fields).forEach(nestedField => {
                  const nestedValue = nestedQuery.fields[nestedField];
                  // 将字段映射到仓库属性
                  let nestedRepoField = nestedField;
                  if (nestedField === 'tag' || nestedField === 'topic') {
                    nestedRepoField = 'topics';
                  } else if (nestedField === 'lang') {
                    nestedRepoField = 'language';
                  } else if (nestedField === 'desc') {
                    nestedRepoField = 'description';
                  } else if (nestedField === 'name') {
                    nestedRepoField = 'full_name';
                  }
                  
                  // 确保nestedValue是字符串或字符串数组
                  if (typeof nestedValue === 'string') {
                    nestedFieldConditions[nestedRepoField] = nestedValue;
                  } else if (Array.isArray(nestedValue) && nestedValue.every(v => typeof v === 'string')) {
                    nestedFieldConditions[nestedRepoField] = nestedValue as string[];
                  }
                });
                
                // 检查嵌套查询的所有字段条件
                for (const [nestedField, nestedValue] of Object.entries(nestedFieldConditions)) {
                  const nestedRepoValue = (repo as any)[nestedField];
                  
                  if (Array.isArray(nestedValue)) {
                    // 数组值处理
                    const nestedOp = nestedQuery.booleanOps[nestedField] || 'OR';
                    if (nestedOp === 'AND') {
                      // AND: 所有值都必须匹配
                      return nestedValue.every(v => {
                        if (typeof v === 'string') {
                          return Array.isArray(nestedRepoValue) ? nestedRepoValue.includes(v) :
                          nestedRepoValue && nestedRepoValue.toString().toLowerCase().includes(v.toLowerCase());
                        }
                        return false; // 如果v不是字符串，返回false
                      });
                    } else if (nestedOp === 'OR') {
                      // OR: 任意一个值匹配即可
                      return nestedValue.some(v => {
                        if (typeof v === 'string') {
                          return Array.isArray(nestedRepoValue) ? nestedRepoValue.includes(v) :
                          nestedRepoValue && nestedRepoValue.toString().toLowerCase().includes(v.toLowerCase());
                        }
                        return false; // 如果v不是字符串，返回false
                      });
                    } else if (nestedOp === 'NOT') {
                      // NOT: 不能包含任何值
                      return !nestedValue.some(v => {
                        if (typeof v === 'string') {
                          return Array.isArray(nestedRepoValue) ? nestedRepoValue.includes(v) :
                          nestedRepoValue && nestedRepoValue.toString().toLowerCase().includes(v.toLowerCase());
                        }
                        return true; // 如果v不是字符串，返回true（因为不匹配）
                      });
                    }
                  } else {
                    // 单个值处理
                    if (typeof nestedValue === 'string') {
                      if (Array.isArray(nestedRepoValue)) {
                        return nestedRepoValue.includes(nestedValue);
                      } else {
                        return nestedRepoValue && nestedRepoValue.toString().toLowerCase().includes(nestedValue.toLowerCase());
                      }
                    }
                    return false; // 如果nestedValue不是字符串，返回false
                  }
                }
                
                // 如果没有字段条件，默认为匹配
                return true;
              });
              
              // 根据操作符评估嵌套查询结果
              if (op === 'AND') {
                if (!nestedResults.every(r => r)) {
                  return false;
                }
              } else if (op === 'OR') {
                if (!nestedResults.some(r => r)) {
                  return false;
                }
              } else if (op === 'NOT') {
                if (nestedResults.some(r => r)) {
                  return false;
                }
              }
            } else if (Array.isArray(value)) {
              // 数组值处理
              const op = parsedQuery.booleanOps[field] || 'OR';
              if (op === 'AND') {
                // AND: 所有值都必须匹配
                if (!value.every(v => {
                  if (typeof v === 'string') {
                    return Array.isArray(repoValue) ? repoValue.includes(v) :
                    repoValue && repoValue.toString().toLowerCase().includes(v.toLowerCase());
                  }
                  return true; // 如果v不是字符串，返回true（因为不匹配）
                })) {
                  return false;
                }
              } else if (op === 'OR') {
                // OR: 任意一个值匹配即可
                if (!value.some(v => {
                  if (typeof v === 'string') {
                    return Array.isArray(repoValue) ? repoValue.includes(v) :
                    repoValue && repoValue.toString().toLowerCase().includes(v.toLowerCase());
                  }
                  return false; // 如果v不是字符串，返回false
                })) {
                  return false;
                }
              } else if (op === 'NOT') {
                // NOT: 不能包含任何值
                if (value.some(v => {
                  if (typeof v === 'string') {
                    return Array.isArray(repoValue) ? repoValue.includes(v) :
                    repoValue && repoValue.toString().toLowerCase().includes(v.toLowerCase());
                  }
                  return false; // 如果v不是字符串，返回false
                })) {
                  return false;
                }
              }
            } else {
              // 单个值处理
              if (typeof value === 'string') {
                if (Array.isArray(repoValue)) {
                  if (!repoValue.includes(value)) {
                    return false;
                  }
                } else {
                  if (!repoValue || !repoValue.toString().toLowerCase().includes(value.toLowerCase())) {
                    return false;
                  }
                }
              }
              // 如果value不是字符串，忽略这个条件
            }
          }
          
          return true;
        });
      } else {
        // 没有字段查询条件，直接搜索
        results = searchIndex.search(parsedQuery.query || '*', {
          limit: searchResultLimit
        }) as number[];
      }

      // 处理搜索结果 - Index 模式只返回 ID 数组
      let processedResults: SearchResult[] = [];

      if (results && Array.isArray(results)) {
        // 根据 ID 查找原始仓库数据
        processedResults = results.map((id: number) => {
          const repo = repositories.find((r: Repository) => r.id === id);
          if (repo) {
            return {
              id: repo.id,
              name: repo.name || '',
              full_name: repo.full_name || '',
              description: repo.description || '',
              language: repo.language || '',
              topics: Array.isArray(repo.topics) ? repo.topics : [],
              score: 1 // Index 模式不提供评分
            };
          }
          // 如果找不到对应的仓库，返回空对象
          return {
            id,
            name: '',
            full_name: '',
            description: '',
            language: '',
            topics: [],
            score: 1
          };
        }).filter(result => result.id !== undefined); // 过滤掉无效结果
      }

      // 根据排序字段对结果进行排序
      if (parsedQuery.sortBy) {
        processedResults.sort((a, b) => {
          let comparison = 0;
          
          // 获取排序字段的值
          let sortFieldA, sortFieldB;
          
          switch (parsedQuery.sortBy) {
            case 'repo_name':
            case 'name':
              sortFieldA = a.full_name.toLowerCase();
              sortFieldB = b.full_name.toLowerCase();
              break;
            case 'lang':
            case 'language':
              sortFieldA = (a.language || '').toLowerCase();
              sortFieldB = (b.language || '').toLowerCase();
              break;
            case 'stars':
              sortFieldA = a.id; // 使用ID作为近似值，因为我们没有直接的star数
              sortFieldB = b.id;
              break;
            default:
              // 尝试从对象中获取字段值
              sortFieldA = (a as any)[parsedQuery.sortBy as keyof SearchResult];
              sortFieldB = (b as any)[parsedQuery.sortBy as keyof SearchResult];
          }
          
          // 处理比较
          if (typeof sortFieldA === 'string' && typeof sortFieldB === 'string') {
            comparison = sortFieldA.localeCompare(sortFieldB);
          } else if (typeof sortFieldA === 'number' && typeof sortFieldB === 'number') {
            comparison = sortFieldA - sortFieldB;
          } else {
            // 转换为字符串进行比较
            comparison = (sortFieldA || '').toString().localeCompare((sortFieldB || '').toString());
          }
          
          // 应用排序方向
          return parsedQuery.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      const endTime = performance.now();
      setSearchResults(processedResults);
      setIsSearching(false);
      setSearchTime(endTime - startTimeRef.current);
    } catch (error) {
      console.error('Search error:', error);
      setIsSearching(false);
      setSearchError('Search failed');
    }
  };

  // 带防抖的搜索函数
  const debouncedSearch = useMemo(() => {
    return (searchTerm: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchTerm);
      }, 300);
    };
  }, [searchIndex]);

  // 清除搜索（取消防抖并清空结果）
  const clearSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setSearchResults([]);
    setIsSearching(false);
    setSearchTime(0);
    setSearchError(null);
  }, []);

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    searchIndex,
    searchResults,
    isSearching,
    searchTime,
    searchError,
    performSearch,
    debouncedSearch,
    clearSearch
  };
};
