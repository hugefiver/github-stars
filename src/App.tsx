import React, { useState, useEffect, useMemo } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import MiniSearch from 'minisearch';
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
  loadingMoreAtom,
  persistentSettingsAtom,
  initializeSettingsAtom
} from './store/atoms';
import './App.scss';

function App() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 搜索和过滤状态使用 useState（不记忆）
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  
  // 其他状态使用 jotai atoms（记忆设置）
  const [sortBy, setSortBy] = useAtom(sortByAtom);
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);
  const [showSettings, setShowSettings] = useAtom(showSettingsAtom);
  const [expandedRepos, setExpandedRepos] = useAtom(expandedReposAtom);
  const [hideAllDetails, setHideAllDetails] = useAtom(hideAllDetailsAtom);
  const [dataUrl, setDataUrl] = useAtom(dataUrlAtom);
  const [tempDataUrl, setTempDataUrl] = useAtom(tempDataUrlAtom);
  const [displayedCount, setDisplayedCount] = useAtom(displayedCountAtom);
  const [loadingMore, setLoadingMore] = useAtom(loadingMoreAtom);
  
  // MiniSearch 实例
  const [searchIndex, setSearchIndex] = useState<MiniSearch | null>(null);
  
  const itemsPerLoad = 10;
  
  // 在生产环境中使用完整版本，开发环境中使用简化版本
  const defaultDataUrl = import.meta.env.PROD ? './data/starred-repos.json' : './data/starred-repos-simple.json';
  
  // 初始化设置
  const initializeSettings = useSetAtom(initializeSettingsAtom);
  const [persistentSettings, setPersistentSettings] = useAtom(persistentSettingsAtom);
  
  // 组件挂载时初始化设置
  useEffect(() => {
    initializeSettings();
    // 如果没有保存的 dataUrl，使用默认值
    if (!dataUrl) {
      setDataUrl(defaultDataUrl);
      setTempDataUrl(defaultDataUrl);
    }
    // 清空搜索词，不记忆搜索状态
    setSearchTerm('');
    setSelectedLanguage('');
    setSelectedTag('');
  }, [initializeSettings, dataUrl, setDataUrl, setTempDataUrl, defaultDataUrl, setSearchTerm, setSelectedLanguage, setSelectedTag]);

  // 当重要设置改变时自动保存到 localStorage
  useEffect(() => {
    if (dataUrl) {
      setPersistentSettings({
        dataUrl,
        hideAllDetails,
        sortBy,
        sortOrder
      });
    }
  }, [dataUrl, hideAllDetails, sortBy, sortOrder, setPersistentSettings]);

  // 加载数据
  const fetchData = async (url: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setRepos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // 初始化 MiniSearch 索引
  useEffect(() => {
    const miniSearch = new MiniSearch({
      fields: ['name', 'full_name', 'description', 'language', 'topics'],
      storeFields: ['id', 'name', 'full_name', 'description', 'language', 'languages', 'topics', 'html_url', 'stargazers_count', 'forks_count', 'updated_at', 'created_at', 'starred_at'],
      searchOptions: {
        boost: { name: 2, full_name: 2, topics: 1.5 },
        fuzzy: 0.2,
        prefix: true
      }
    });
    setSearchIndex(miniSearch);
  }, []);

  // 当数据加载完成后，添加到搜索索引
  useEffect(() => {
    if (searchIndex && repos.length > 0) {
      // 先清空索引，然后重新添加所有数据
      searchIndex.removeAll();
      searchIndex.addAll(repos);
    }
  }, [repos, searchIndex]);

  // 初始加载数据
  useEffect(() => {
    fetchData(dataUrl);
  }, [dataUrl]);

  // 获取所有语言
  const languages = useMemo(() => {
    const langSet = new Set<string>();
    repos.forEach(repo => {
      if (repo.language) {
        langSet.add(repo.language);
      }
    });
    return Array.from(langSet).sort();
  }, [repos]);

  // 计算语言比例
  const languageStats = useMemo((): LanguageStats => {
    const langCount: Record<string, number> = {};
    let totalWithLanguage = 0;
    
    repos.forEach(repo => {
      if (repo.language) {
        langCount[repo.language] = (langCount[repo.language] || 0) + 1;
        totalWithLanguage++;
      }
    });
    
    const stats: LanguageStat[] = Object.entries(langCount)
      .map(([language, count]) => ({
        language,
        count,
        percentage: totalWithLanguage > 0 ? ((count / totalWithLanguage) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count);
    
    return {
      stats,
      totalWithLanguage,
      totalRepos: repos.length,
      noLanguageCount: repos.length - totalWithLanguage
    };
  }, [repos]);

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

  // 过滤和排序数据
  const filteredAndSortedRepos = useMemo(() => {
    let result: Repository[] = [];

    // 使用 MiniSearch 进行搜索
    if (searchTerm && searchIndex) {
      const searchResults = searchIndex.search(searchTerm, {
        filter: (result) => {
          // 语言过滤
          if (selectedLanguage && result.language !== selectedLanguage) {
            return false;
          }
          // 标签过滤
          if (selectedTag && (!result.topics || !result.topics.includes(selectedTag))) {
            return false;
          }
          return true;
        }
      });
      
      // 获取完整的仓库对象
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
        
        // 标签过滤
        const matchesTag = 
          !selectedTag ||
          (repo.topics && repo.topics.includes(selectedTag));
        
        return matchesLanguage && matchesTag;
      });
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0;
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
      
      // 应用排序方向
      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return result;
  }, [repos, searchTerm, selectedLanguage, selectedTag, sortBy, sortOrder, searchIndex]);

  // 显示的数据
  const displayedRepos = useMemo(() => {
    return filteredAndSortedRepos.slice(0, displayedCount);
  }, [filteredAndSortedRepos, displayedCount]);

  // 重置显示数量
  useEffect(() => {
    setDisplayedCount(itemsPerLoad);
  }, [searchTerm, selectedLanguage, selectedTag, sortBy, sortOrder]);

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
    setDataUrl(tempDataUrl);
    // 保存持久化设置到 localStorage
    setPersistentSettings({
      dataUrl: tempDataUrl,
      hideAllDetails,
      sortBy,
      sortOrder
    });
    setShowSettings(false);
  };
  
  // 重置设置
  const resetSettings = () => {
    setTempDataUrl(defaultDataUrl);
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="filter-select"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            
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
          Showing {displayedRepos.length} of {filteredAndSortedRepos.length} repositories
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

                  {/* 折叠/展开按钮 */}
                  <button 
                    className="repo-details-toggle"
                    onClick={() => setExpandedRepos(prev => ({
                      ...prev,
                      [repo.id]: !isDetailsExpanded
                    }))}
                  >
                    {isDetailsExpanded ? 'Hide Details' : 'Show Details'}
                  </button>
                  
                  {isDetailsExpanded && (
                    <div className="repo-details-section">
                      {/* 上方：Tags 和 Topics */}
                      {repo.topics && repo.topics.length > 0 && (
                        <div className="repo-topics-group">
                          <h4>Topics</h4>
                          <div className="repo-topics">
                            {repo.topics.map(topic => (
                              <span key={topic} className="repo-topic">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 下方：语言比例显示 */}
                      {repo.languages && Object.keys(repo.languages).length > 0 && (
                        <div className="repo-languages-compact">
                          <h4>Languages</h4>
                          <div className="repo-language-bar-container">
                            <div className="repo-language-bar-segmented">
                              {Object.entries(repo.languages)
                                .sort(([,a], [,b]) => parseFloat(b.percentage) - parseFloat(a.percentage))
                                .map(([language, data]) => (
                                  parseFloat(data.percentage) >= 0.5 && (
                                    <div
                                      key={language}
                                      className={`repo-language-segment lang-${language.replace(/[^a-zA-Z0-9]/g, '_')}`}
                                      style={{ width: `${data.percentage}%` }}
                                      title={`${language}: ${data.percentage}%`}
                                    ></div>
                                  )
                                ))}
                            </div>
                            <div className="repo-language-bar-labels">
                              {Object.entries(repo.languages)
                                .sort(([,a], [,b]) => parseFloat(b.percentage) - parseFloat(a.percentage))
                                .map(([language, data]) => (
                                  parseFloat(data.percentage) >= 0.5 && (
                                    <span
                                      key={language}
                                      className="repo-language-label"
                                      style={{ width: `${data.percentage}%` }}
                                    >
                                      {language}
                                    </span>
                                  )
                                ))}
                            </div>
                          </div>
                        </div>
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
                        <span className="repo-info-value">{repo.license?.name || 'N/A'}</span>
                      </div>
                      {/* 可以在这里添加其他信息，例如 homepage, default branch 等 */}
                    </div>
                  </div>
                  
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
                  value={tempDataUrl}
                  onChange={(e) => setTempDataUrl(e.target.value)}
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
