import { useState, useEffect, useRef, useMemo } from 'react';
import { Repository } from '../types';

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
        const flexsearchModule = await import('flexsearch');
        const FlexSearch = flexsearchModule.default || flexsearchModule;
        
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
  const buildIndex = (index: any, repos: Repository[]) => {
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

    try {
      // 执行搜索
      const results = searchIndex.search(searchTerm.trim(), {
        limit: 100
      });

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
    debouncedSearch
  };
};
