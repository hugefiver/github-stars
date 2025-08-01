import React, { useState, useEffect, useMemo } from 'react';
import MiniSearch from 'minisearch';
import './App.css';

function App() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 搜索状态
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortBy, setSortBy] = useState('created');
  
  // MiniSearch 实例
  const [searchIndex, setSearchIndex] = useState(null);
  
  // 无限滚动状态
  const [displayedCount, setDisplayedCount] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);
  const itemsPerLoad = 10;
  
  // 设置状态
  const [showSettings, setShowSettings] = useState(false);
  // 在生产环境中使用完整版本，开发环境中使用简化版本
  const defaultDataUrl = import.meta.env.PROD ? './data/starred-repos.json' : './data/starred-repos-simple.json';
  const [dataUrl, setDataUrl] = useState(defaultDataUrl);
  const [tempDataUrl, setTempDataUrl] = useState(defaultDataUrl);

  // 加载数据
  const fetchData = async (url) => {
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 初始化 MiniSearch 索引
  useEffect(() => {
    const miniSearch = new MiniSearch({
      fields: ['name', 'full_name', 'description', 'language', 'topics'],
      storeFields: ['id', 'name', 'full_name', 'description', 'language', 'topics', 'html_url', 'stargazers_count', 'forks_count', 'updated_at', 'created_at'],
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
    const langSet = new Set();
    repos.forEach(repo => {
      if (repo.language) {
        langSet.add(repo.language);
      }
    });
    return Array.from(langSet).sort();
  }, [repos]);

  // 获取所有标签
  const allTags = useMemo(() => {
    const tagSet = new Set();
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
    let result = [];

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
      }).filter(Boolean);
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
      switch (sortBy) {
        case 'stars':
          return b.stargazers_count - a.stargazers_count;
        case 'forks':
          return b.forks_count - a.forks_count;
        case 'updated':
          return new Date(b.updated_at) - new Date(a.updated_at);
        case 'created':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [repos, searchTerm, selectedLanguage, selectedTag, sortBy, searchIndex]);

  // 显示的数据
  const displayedRepos = useMemo(() => {
    return filteredAndSortedRepos.slice(0, displayedCount);
  }, [filteredAndSortedRepos, displayedCount]);

  // 重置显示数量
  useEffect(() => {
    setDisplayedCount(itemsPerLoad);
  }, [searchTerm, selectedLanguage, selectedTag, sortBy]);

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
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // 格式化数字
  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };
  
  // 保存设置
  const saveSettings = () => {
    setDataUrl(tempDataUrl);
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
              <option value="name">Sort by Name</option>
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
            displayedRepos.map(repo => (
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
                
                <div className="repo-topics">
                  {repo.topics.map(topic => (
                    <span key={topic} className="repo-topic">
                      {topic}
                    </span>
                  ))}
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
                </div>
              </div>
            ))
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
