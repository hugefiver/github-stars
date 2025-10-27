import React, { useState, useEffect, useMemo, useRef } from 'react';
import { atom, useAtom, useSetAtom } from 'jotai';
import { Repository, LanguageStat, LanguageStats } from './types';
import {
  sortByAtom,
  sortOrderAtom,
  showSettingsAtom,
  expandedReposAtom,
  hideAllDetailsAtom,
  dataUrlAtom,
  tempDataUrlAtom,
  displayedCountAtom,
  loadingMoreAtom
} from './store/atoms';
import './App.scss';

// Helper function to get funding platform icons
const getFundingIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'github':
      return '💖';
    case 'patreon':
      return '🎭';
    case 'open collective':
      return '🏛️';
    case 'ko-fi':
      return '☕';
    case 'tidelift':
      return '🛡️';
    case 'community bridge':
      return '🌉';
    case 'liberapay':
      return '💳';
    case 'issuehunt':
      return '🏆';
    case 'otechie':
      return '👨‍💻';
    default:
      return '💰';
  }
};

// TagFilterDropdown component for multi-select tag filtering with search
const TagFilterDropdown = ({ 
  value, 
  onChange, 
  options 
}: { 
  value: string[]; 
  onChange: (tags: string[]) => void; 
  options: { tag: string; count: number }[] 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 防抖处理
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms 防抖延迟

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 过滤选项
  const filteredOptions = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return options;
    return options.filter(option => 
      option.tag.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [options, debouncedSearchTerm]);

  const handleSelect = (tag: string) => {
    const newTags = value.includes(tag)
      ? value.filter(t => t !== tag)
      : [...value, tag];
    onChange(newTags);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setSearchTerm('');
  };

  const handleClearTag = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(value.filter(t => t !== tag));
  };

  return (
    <div className="tag-filter-dropdown multi-select" ref={wrapperRef}>
      <div 
        className="dropdown-trigger"
      >
        <div className="selected-tags">
          {value.map(tag => (
            <div key={tag} className="selected-tag">
              {tag}
              <button 
                className="tag-remove" 
                onClick={(e) => handleClearTag(e, tag)}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </div>
          ))}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={value.length === 0 ? "Filter by tags..." : ""}
            className="dropdown-input"
            onFocus={() => setIsOpen(true)}
            onClick={() => setIsOpen(true)}
            onKeyDown={(e) => {
              // 如果输入框为空且按下了退格键，则删除最后一个标签
              if (e.key === 'Backspace' && searchTerm === '' && value.length > 0) {
                e.preventDefault();
                const newTags = [...value];
                newTags.pop();
                onChange(newTags);
              }
            }}
          />
        </div>
        <div className="dropdown-controls">
          {value.length > 0 && (
            <button 
              className="clear-all" 
              onClick={handleClear}
              aria-label="Clear all selections"
            >
              Clear All
            </button>
          )}
          <div 
            className="dropdown-arrow"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? '▲' : '▼'}
          </div>
        </div>
      </div>
      
          {isOpen && (
            <div className="dropdown-options">
              <div 
                className={`option ${value.length === 0 ? 'selected' : ''}`} 
                onClick={() => onChange([])}
              >
                All Tags
              </div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map(item => (
              <div 
                key={item.tag} 
                className={`option ${value.includes(item.tag) ? 'selected' : ''}`}
                onClick={() => handleSelect(item.tag)}
              >
                <span className="tag-name">{item.tag}</span>
                <span className="tag-count">{item.count}</span>
                {value.includes(item.tag) && <span className="checkmark">✓</span>}
              </div>
            ))
          ) : (
            <div className="no-options">No matching tags</div>
          )}
            </div>
          )}
    </div>
  );
};

// LanguageBar component to display language distribution with tooltip
const LanguageBar = ({ languages }: { languages: Repository['languages'] }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!languages || Object.keys(languages).length === 0) {
    return null;
  }

  // Separate main languages (>=10%) and other languages (<10%)
  const mainLanguages: [string, { bytes: number; percentage: string }][] = [];
  const otherLanguages: [string, { bytes: number; percentage: string }][] = [];
  let otherTotal = 0;

  Object.entries(languages).forEach(([lang, data]) => {
    const percentage = parseFloat(data.percentage);
    if (percentage >= 10) {
      mainLanguages.push([lang, data]);
    } else {
      otherLanguages.push([lang, data]);
      otherTotal += percentage;
    }
  });

  mainLanguages.sort((a, b) => parseFloat(b[1].percentage) - parseFloat(a[1].percentage));

  return (
    <div 
      className="repo-languages-compact"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h4>Languages</h4>
      <div className="repo-language-bar-container">
        <div className="repo-language-bar-segmented">
          {mainLanguages.map(([language, data]) => (
            <div
              key={`segment-${language}`}
              className={`repo-language-segment lang-${language.replace(/[^a-zA-Z0-9]/g, '_')}`}
              style={{ width: `${data.percentage}%` }}
              title={`${language}: ${data.percentage}%`}
            ></div>
          ))}
          {otherTotal > 0 && (
            <div
              key="segment-other"
              className="repo-language-segment lang-Other"
              style={{ width: `${otherTotal}%` }}
              title={otherLanguages.map(([lang, data]) => `${lang}: ${data.percentage}%`).join('\n')}
            ></div>
          )}
        </div>
        <div className="repo-language-bar-labels">
          {mainLanguages.map(([language, data]) => (
            <span
              key={`label-${language}`}
              className="repo-language-label"
              style={{ width: `${data.percentage}%` }}
            >
              {language}
            </span>
          ))}
          {otherTotal > 0 && (
            <span
              key="label-other"
              className="repo-language-label"
              style={{ width: `${otherTotal}%` }}
            >
              Other
            </span>
          )}
        </div>
      </div>
      {isHovered && (
        <div className="language-tooltip">
          {Object.entries(languages)
            .sort((a, b) => parseFloat(b[1].percentage) - parseFloat(a[1].percentage))
            .map(([lang, data]) => (
              <div key={lang}>
                {lang}: {data.percentage}%
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

function App() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 搜索和过滤状态使用 useState（不记忆）
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string[]>([]);

  // 其他状态使用 jotai atoms（记忆设置）
  const [sortBy, setSortBy] = useAtom(sortByAtom);
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);
  const [showSettings, setShowSettings] = useAtom(showSettingsAtom);
  const [expandedRepos, setExpandedRepos] = useAtom(expandedReposAtom);
  const [hideAllDetails, setHideAllDetails] = useAtom(hideAllDetailsAtom);
  const [atomDataUrl, setAtomDataUrl] = useAtom(dataUrlAtom);
  const [displayedCount, setDisplayedCount] = useAtom(displayedCountAtom);
  const [loadingMore, setLoadingMore] = useAtom(loadingMoreAtom);

  // Web Worker 实例和状态
  const [searchWorker, setSearchWorker] = useState<Worker | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchTime, setSearchTime] = useState<number>(0);

  const itemsPerLoad = 10;

  // 在生产环境中使用完整版本，开发环境中使用简化版本
  // const defaultDataUrl = import.meta.env.PROD ? './data/starred-repos.json' : './data/starred-repos-simple.json';
  const defaultDataUrl = './data/starred-repos.json';
  const dataUrl = atomDataUrl || defaultDataUrl;

  // 组件挂载时设置默认值
  useEffect(() => {
    // 清空搜索词，不记忆搜索状态
    setSearchTerm('');
    setSelectedLanguage('');
    setSelectedTag([]);
  }, [dataUrl, setAtomDataUrl, defaultDataUrl, setSearchTerm, setSelectedLanguage, setSelectedTag]);

  // 加载数据
  let response: Response | null = null;
  const fetchData = async (url: string) => {
    try {
      setLoading(true);
      setError(null);
      response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setRepos(data);
    } catch (err) {
      console.error('Error fetching data:', err);
      console.log(response);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // 初始化搜索 Worker
  useEffect(() => {
    const worker = new Worker(new URL('./search.worker.ts', import.meta.url));
    setSearchWorker(worker);

    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      switch (type) {
        case 'INITIALIZED':
          console.log('Search worker initialized');
          break;
        case 'INDEX_BUILT':
          console.log('Search index built with', payload.count, 'repositories');
          break;
        case 'SEARCH_RESULTS':
          const endTime = performance.now();
          setSearchResults(payload.results);
          setIsSearching(false);
          setSearchTime(endTime - startTimeRef.current);
          break;
        case 'ERROR':
          console.error('Search worker error:', payload.error);
          setIsSearching(false);
          break;
      }
    };

    // 初始化 worker
    worker.postMessage({ type: 'INITIALIZE', payload: {} });

    return () => {
      worker.terminate();
    };
  }, []);

  // 记录搜索开始时间的 ref
  const startTimeRef = useRef<number>(0);

  // 当数据加载完成后，构建搜索索引
  useEffect(() => {
    if (searchWorker && repos.length > 0) {
      searchWorker.postMessage({
        type: 'BUILD_INDEX',
        payload: { repositories: repos }
      });
    }
  }, [repos, searchWorker]);

  // 当数据 URL 变化时，重新构建索引
  useEffect(() => {
    if (searchWorker && repos.length > 0) {
      searchWorker.postMessage({
        type: 'UPDATE_DATA',
        payload: { repositories: repos }
      });
    }
  }, [dataUrl, searchWorker, repos]);

  // 初始加载数据
  useEffect(() => {
    fetchData(dataUrl);
  }, [dataUrl]);

  // 计算语言比例
  const languageStats = useMemo((): LanguageStats => {
    const langScore: Record<string, number> = {};
    let totalWithLanguage = 0;
    
    repos.forEach(repo => {
      // 修正：基于 repo.languages 判断是否有语言数据
      if (repo.languages && Object.keys(repo.languages).length > 0) {
        totalWithLanguage++;
      }
      // 计算每个仓库中各语言的score
      if (repo.languages) {
        Object.entries(repo.languages).forEach(([language, data]) => {
          const percentage = parseFloat(data.percentage);
          let x = 0.1;
          if (percentage > 80) {
            x = 1;
          } else if (percentage > 50) {
            x = 0.8;
          } else if (percentage > 30) {
            x = 0.3;
          }
          langScore[language] = (langScore[language] || 0) + x;
        });
      }
    });
    
    const stats: LanguageStat[] = Object.entries(langScore)
      .map(([language, score]) => ({
        language,
        count: Math.round(score), // 使用score作为count
        percentage: score.toFixed(1) // 使用score作为percentage显示
      }))
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
    
    return {
      stats,
      totalWithLanguage,
      totalRepos: repos.length,
      noLanguageCount: repos.length - totalWithLanguage
    };
  }, [repos, repos.length]);

  // 获取所有语言
  const languages = useMemo(() => {
    // 修正：使用 repo.languages 获取所有出现的语言
    const allLanguages = Array.from(new Set(repos.flatMap(repo =>
      repo.languages ? Object.keys(repo.languages) : []
    ).filter((lang): lang is string => lang !== null)));

    const top20 = languageStats.stats.slice(0, 20).map(stat => stat.language);
    const rest = allLanguages.filter(lang => !top20.includes(lang)).sort();
    return [...top20, ...rest];
  }, [repos, languageStats]);

  // 获取所有标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    repos.forEach(repo => {
      if (repo.topics) {
        repo.topics.forEach(topic => {
          tagSet.add(topic);
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [repos]);

  // 计算过滤后的标签及其匹配的仓库数量
  const filteredTagsWithCount = useMemo(() => {
    // 如果没有选择任何标签或其他筛选条件，则返回所有标签
    if (selectedLanguage === '' && selectedTag.length === 0 && searchResults.length === 0) {
      const tagCount: Record<string, number> = {};
      repos.forEach(repo => {
        if (repo.topics) {
          repo.topics.forEach(topic => {
            tagCount[topic] = (tagCount[topic] || 0) + 1;
          });
        }
      });
      
      return Object.entries(tagCount)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
    }
    
    // 获取当前筛选后的仓库列表
    let filteredRepos = repos;
    
    // 应用语言筛选
    if (selectedLanguage) {
      filteredRepos = filteredRepos.filter(repo => repo.language === selectedLanguage);
    }
    
    // 应用标签筛选（必须包含所有已选标签）
    if (selectedTag.length > 0) {
      filteredRepos = filteredRepos.filter(repo =>
        repo.topics && selectedTag.every(tag => repo.topics.includes(tag))
      );
    }
    
    // 应用搜索词筛选
    if (searchResults.length > 0) {
      filteredRepos = searchResults.map(result => {
        const repo = repos.find(r => r.id === result.id);
        return repo;
      }).filter((repo): repo is Repository => repo !== undefined);
    }
    
    // 计算这些仓库中的标签及其数量
    const tagCount: Record<string, number> = {};
    filteredRepos.forEach(repo => {
      if (repo.topics) {
        repo.topics.forEach(topic => {
          tagCount[topic] = (tagCount[topic] || 0) + 1;
        });
      }
    });
    
    return Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [repos, selectedLanguage, selectedTag, searchResults]);

  // 过滤和排序数据
  const filteredAndSortedRepos = useMemo(() => {
    let result: Repository[] = [];

    // 使用 Web Worker 搜索结果
    if (searchResults.length > 0) {
      result = searchResults.map(result => {
        const repo = repos.find(r => r.id === result.id);
        return repo;
      }).filter((repo): repo is Repository => repo !== undefined);
    } else {
      // 如果没有搜索词，使用原始数据进行过滤
      result = repos.filter(repo => {
        // 语言过滤
        const matchesLanguage =
          !selectedLanguage ||
          repo.language === selectedLanguage;

        // 标签过滤 - 仓库必须包含所有选中的标签
        const matchesTags =
          selectedTag.length === 0 ||
          (repo.topics && selectedTag.every(tag => repo.topics.includes(tag)));

        return matchesLanguage && matchesTags;
      });
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      
      // 如果是按相关性排序且有搜索结果，使用搜索评分
      if (sortBy === 'relevance' && searchResults.length > 0) {
        const scoreA = searchResults.find(r => r.id === a.id)?.score || 0;
        const scoreB = searchResults.find(r => r.id === b.id)?.score || 0;
        comparison = scoreB - scoreA; // 评分高的排在前面
      } else {
        switch (sortBy) {
          case 'stars':
            comparison = b.stargazers_count - a.stargazers_count;
            break;
          case 'forks':
            comparison = b.forks_count - a.forks_count;
            break;
          case 'updated':
            comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            break;
          case 'created':
            comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            break;
          case 'starred':
            comparison = new Date(b.starred_at).getTime() - new Date(a.starred_at).getTime();
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          default:
            comparison = 0;
        }
      }

      // 应用排序方向
      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return result;
  }, [repos, searchResults, selectedLanguage, selectedTag, sortBy, sortOrder]);

  // 显示的数据
  const displayedRepos = useMemo(() => {
    return filteredAndSortedRepos.slice(0, displayedCount);
  }, [filteredAndSortedRepos, displayedCount]);

  // 搜索输入防抖
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchWorker && inputValue.trim()) {
        setIsSearching(true);
        startTimeRef.current = performance.now();
        searchWorker.postMessage({
          type: 'SEARCH',
          payload: { query: inputValue.trim(), limit: 100 }
        });
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [inputValue, searchWorker]);

  // 重置显示数量
  useEffect(() => {
    setDisplayedCount(itemsPerLoad);
  }, [searchResults, selectedLanguage, selectedTag, sortBy, sortOrder]);

  // 无限滚动处理
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || displayedRepos.length >= filteredAndSortedRepos.length) {
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
  }, [loadingMore, displayedRepos.length, filteredAndSortedRepos.length]);

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  // 保存设置
  const saveSettings = () => {
    setShowSettings(false);
  };

  // 重置设置
  const resetSettings = () => {
    setAtomDataUrl('');
  };

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <h1>GitHub Stars Search</h1>
          <p>Loading starred repositories...</p>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <header className="header">
          <h1>GitHub Stars Search</h1>
          <div className="error">Error: {error}</div>
        </header>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>GitHub Stars Search</h1>
        <div className="badges">
          <a href="https://github.com/hugefiver" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/Author-hugefiver-blue" alt="Author" />
          </a>
          <a href="https://github.com/hugefiver/github-stars" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/github/stars/hugefiver/github-stars?style=social" alt="GitHub Stars" />
          </a>
        </div>
        <p>Browse and search your starred repositories</p>
        <button className="settings-button" onClick={() => setShowSettings(true)}>
          ⚙️ Settings
        </button>
      </header>

      <main className="main">
        {/* 搜索和过滤区域 */}
        <div className="controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search repositories..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filters">
            {/* 全局隐藏详情开关 */}
            <div className="hide-details-toggle">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={hideAllDetails}
                  onChange={(e) => setHideAllDetails(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">Hide All Details</span>
            </div>

            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="filter-select"
            >
              <option value="">All Languages</option>
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>

            <TagFilterDropdown
              value={selectedTag}
              onChange={setSelectedTag}
              options={filteredTagsWithCount.map(({ tag, count }) => ({ tag, count }))}
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="stars">Sort by Stars</option>
              <option value="forks">Sort by Forks</option>
              <option value="updated">Sort by Updated</option>
              <option value="created">Sort by Created</option>
              <option value="starred">Sort by Starred</option>
              <option value="name">Sort by Name</option>
              <option value="relevance">Sort by Relevance</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="filter-select"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        {/* 结果统计 */}
        <div className="results-info">
          {isSearching ? (
            <div className="searching-indicator">
              <span>Searching...</span>
              <span className="search-time">{searchTime.toFixed(2)}ms</span>
            </div>
          ) : (
            <div className="results-count">
              Showing {displayedRepos.length} of {filteredAndSortedRepos.length} repositories
            </div>
          )}
        </div>

        {/* 仓库列表 */}
        <div className="repo-list">
          {displayedRepos.length === 0 ? (
            <div className="no-results">
              No repositories found matching your criteria.
            </div>
          ) : (
            displayedRepos.map(repo => {
              // 如果全局隐藏详情开启，则默认隐藏，但允许单独展开
              // 如果全局隐藏详情关闭，则使用原来的逻辑（默认展开）
              const isDetailsExpanded = hideAllDetails
                ? expandedRepos[repo.id] === true  // 只有明确设置为true才展开
                : expandedRepos[repo.id] !== false; // 默认展开，除非明确设置为false
              return (
                <div key={repo.id} className="repo-card">
                  <div className="repo-header">
                    <h2 className="repo-name">
                      <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                        {repo.full_name}
                      </a>
                    </h2>
                    <span className="repo-language">{repo.language}</span>
                  </div>

                  <p className="repo-description">
                    {repo.description || 'No description provided.'}
                  </p>


                  {isDetailsExpanded && (
                    <div className="repo-details-section">
                      {/* 上方：Tags 和 Topics */}
                      {repo.topics && repo.topics.length > 0 && (
                        <div className="repo-topics-group">
                          <h4>Topics</h4>
                          <div className="repo-topics">
                            {repo.topics.map(topic => (
                              <span key={`${repo.id}-${topic}`} className="repo-topic">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 下方：语言比例显示 */}
                      {repo.languages && Object.keys(repo.languages).length > 0 && (
                        <LanguageBar languages={repo.languages} />
                      )}
                    </div>
                  )}

                  {/* 仓库信息（例如 license 和 primary language） */}
                  <div className="repo-additional-info">
                    <h4>Repository Information</h4>
                    <div className="repo-info-grid">
                      <div className="repo-info-item">
                        <span className="repo-info-label">Primary Language:</span>
                        <span className="repo-info-value">{repo.language || 'N/A'}</span>
                      </div>
                      <div className="repo-info-item">
                        <span className="repo-info-label">License:</span>
                        <span className="repo-info-value">{repo.licenseInfo?.name || 'N/A'}</span>
                      </div>
                      <div className="repo-info-item">
                        <span className="repo-info-label">Status:</span>
                        <span className="repo-info-value">
                          {repo.isArchived && <span className="status-archived">📦 Archived</span>}
                          {repo.isFork && <span className="status-fork">🍴 Fork</span>}
                          {repo.isMirror && <span className="status-mirror">🪞 Mirror</span>}
                          {!repo.isArchived && !repo.isFork && !repo.isMirror && <span>Active</span>}
                        </span>
                      </div>
                      {repo.parent && (
                        <div className="repo-info-item">
                          <span className="repo-info-label">Parent:</span>
                          <span className="repo-info-value">
                            <a href={repo.parent.url} target="_blank" rel="noopener noreferrer">
                              {repo.parent.nameWithOwner}
                            </a>
                          </span>
                        </div>
                      )}
                      {repo.latestRelease && (
                        <div className="repo-info-item">
                          <span className="repo-info-label">Latest Release:</span>
                          <span className="repo-info-value">
                            <a href={repo.latestRelease.url} target="_blank" rel="noopener noreferrer">
                              {repo.latestRelease.name} ({repo.latestRelease.tagName})
                            </a>
                          </span>
                        </div>
                      )}
                      {repo.mirrorUrl && (
                        <div className="repo-info-item">
                          <span className="repo-info-label">Mirror URL:</span>
                          <span className="repo-info-value">
                            <a href={repo.mirrorUrl} target="_blank" rel="noopener noreferrer">
                              {repo.mirrorUrl}
                            </a>
                          </span>
                        </div>
                      )}
                      {repo.pushedAt && (
                        <div className="repo-info-item">
                          <span className="repo-info-label">Last Pushed:</span>
                          <span className="repo-info-value">{formatDate(repo.pushedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Funding Links */}
                  {repo.fundingLinks && repo.fundingLinks.length > 0 && (
                    <div className="repo-funding">
                      <h4>Funding</h4>
                      <div className="funding-links">
                        {repo.fundingLinks.map((funding, index) => (
                          <a
                            key={`${repo.id}-funding-${index}`}
                            href={funding.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="funding-link"
                            title={`Fund on ${funding.platform}`}
                          >
                            {getFundingIcon(funding.platform)}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Packages */}
                  {repo.packages && repo.packages.length > 0 && (
                    <div className="repo-packages">
                      <h4>Packages</h4>
                      <div className="package-list">
                        {repo.packages.map((pkg, index) => (
                          <span key={`${repo.id}-package-${index}`} className="package-badge">
                            {pkg.name} {pkg.version && `(${pkg.version})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Milestones */}
                  {repo.milestones && repo.milestones.length > 0 && (
                    <div className="repo-milestones">
                      <h4>Milestones</h4>
                      <div className="milestone-list">
                        {repo.milestones.slice(0, 5).map((milestone, index) => (
                          <div key={`${repo.id}-milestone-${index}`} className="milestone-item">
                            <span className={`milestone-state milestone-${milestone.state.toLowerCase()}`}>
                              {milestone.state}
                            </span>
                            <a href={milestone.url} target="_blank" rel="noopener noreferrer" className="milestone-title">
                              {milestone.title}
                            </a>
                            {milestone.dueOn && (
                              <span className="milestone-due">
                                Due: {formatDate(milestone.dueOn)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="repo-stats">
                    <span className="stat">
                      <span className="stat-icon">⭐</span>
                      {formatNumber(repo.stargazers_count)}
                    </span>
                    <span className="stat">
                      <span className="stat-icon">🍴</span>
                      {formatNumber(repo.forks_count)}
                    </span>
                    <span className="stat">
                      <span className="stat-icon">📅</span>
                      Updated {formatDate(repo.updated_at)}
                    </span>
                    {repo.starred_at && (
                      <span className="stat">
                        <span className="stat-icon">⭐</span>
                        Starred {formatDate(repo.starred_at)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 加载更多指示器 */}
        {loadingMore && (
          <div className="loading-more">
            <div className="loading-spinner"></div>
            <p>Loading more repositories...</p>
          </div>
        )}

        {/* 显示是否还有更多数据 */}
        {displayedRepos.length < filteredAndSortedRepos.length && !loadingMore && (
          <div className="load-more-hint">
            <p>Scroll down to load more repositories</p>
          </div>
        )}

        {/* 显示已加载所有数据 */}
        {displayedRepos.length >= filteredAndSortedRepos.length && displayedRepos.length > 0 && (
          <div className="all-loaded">
            <p>All repositories loaded</p>
          </div>
        )}
      </main>

      {/* 设置浮窗 */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="close-button" onClick={() => setShowSettings(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="dataUrl">Data File URL:</label>
                <input
                  type="text"
                  id="dataUrl"
                  value={atomDataUrl}
                  placeholder={defaultDataUrl}
                  onChange={(e) => setAtomDataUrl(e.target.value)}
                  className="form-input"
                />
                <p className="help-text">
                  Enter the URL to your starred repositories JSON file.
                  Default: {defaultDataUrl}
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="reset-button" onClick={resetSettings}>
                Reset to Default
              </button>
              <button className="save-button" onClick={saveSettings}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
