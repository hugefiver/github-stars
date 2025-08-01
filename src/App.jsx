import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

function App() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 搜索状态
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [sortBy, setSortBy] = useState('stars');
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // 设置状态
  const [showSettings, setShowSettings] = useState(false);
  const [dataUrl, setDataUrl] = useState('./data/starred-repos-simple.json');
  const [tempDataUrl, setTempDataUrl] = useState('./data/starred-repos-simple.json');

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

  // 过滤和排序数据
  const filteredAndSortedRepos = useMemo(() => {
    let result = repos.filter(repo => {
      // 搜索过滤
      const matchesSearch = 
        !searchTerm ||
        repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        repo.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repo.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // 语言过滤
      const matchesLanguage = 
        !selectedLanguage ||
        repo.language === selectedLanguage;
      
      return matchesSearch && matchesLanguage;
    });

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
  }, [repos, searchTerm, selectedLanguage, sortBy]);

  // 分页数据
  const totalPages = Math.ceil(filteredAndSortedRepos.length / itemsPerPage);
  const paginatedRepos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedRepos.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedRepos, currentPage]);

  // 重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLanguage, sortBy]);

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
    setTempDataUrl('./data/starred-repos-simple.json');
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
          Showing {paginatedRepos.length} of {filteredAndSortedRepos.length} repositories
        </div>

        {/* 仓库列表 */}
        <div className="repo-list">
          {paginatedRepos.length === 0 ? (
            <div className="no-results">
              No repositories found matching your criteria.
            </div>
          ) : (
            paginatedRepos.map(repo => (
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

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Previous
            </button>
            
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Next
            </button>
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
                  Default: ./data/starred-repos-simple.json
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
