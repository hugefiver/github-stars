import { useState, useEffect, useMemo } from 'react';
import { useAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { Repository, LanguageStats } from './types';
import { useFlexSearch } from './hooks/useFlexSearch';
import { useRepoData } from './hooks/useRepoData';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';
import { Header } from './components/Header/Header';
import { SearchControls } from './components/SearchControls/SearchControls';
import { RepoCard } from './components/RepoCard/RepoCard';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import {
  sortByAtom,
  sortOrderAtom,
  showSettingsAtom,
  expandedReposAtom,
  hideAllDetailsAtom,
} from './store/atoms';
import './App.scss';

function App() {
  const { t, i18n } = useTranslation();

  const { repos, loading, error, defaultDataUrl, atomDataUrl, setAtomDataUrl } = useRepoData();

  const [inputValue, setInputValue] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedTag, setSelectedTag] = useState<string[]>([]);

  const [sortBy, setSortBy] = useAtom(sortByAtom);
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);
  const [showSettings, setShowSettings] = useAtom(showSettingsAtom);
  const [expandedRepos, setExpandedRepos] = useAtom(expandedReposAtom);
  const [hideAllDetails, setHideAllDetails] = useAtom(hideAllDetailsAtom);

  const { searchResults, isSearching, searchTime, searchError, debouncedSearch, clearSearch } =
    useFlexSearch(repos);

  useEffect(() => {
    if (inputValue.trim()) {
      debouncedSearch(inputValue);
    } else {
      clearSearch();
    }
  }, [inputValue, debouncedSearch, clearSearch]);

  const languageStats = useMemo((): LanguageStats => {
    const langScore: Record<string, number> = {};
    let totalWithLanguage = 0;

    repos.forEach((repo) => {
      if (repo.languages && Object.keys(repo.languages).length > 0) {
        totalWithLanguage++;
      }
      if (repo.languages) {
        Object.entries(repo.languages).forEach(([language, data]) => {
          const percentage = parseFloat(data.percentage);
          let x = 0.1;
          if (percentage > 80) x = 1;
          else if (percentage > 50) x = 0.8;
          else if (percentage > 30) x = 0.3;
          langScore[language] = (langScore[language] || 0) + x;
        });
      }
    });

    const stats = Object.entries(langScore)
      .map(([language, score]) => ({
        language,
        count: Math.round(score),
        percentage: score.toFixed(1),
      }))
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));

    return {
      stats,
      totalWithLanguage,
      totalRepos: repos.length,
      noLanguageCount: repos.length - totalWithLanguage,
    };
  }, [repos]);

  const languages = useMemo(() => {
    const allLanguages = Array.from(
      new Set(repos.flatMap((repo) => (repo.languages ? Object.keys(repo.languages) : [])))
    );
    const top20 = languageStats.stats.slice(0, 20).map((s) => s.language);
    const rest = allLanguages.filter((l) => !top20.includes(l)).sort();
    return [...top20, ...rest];
  }, [repos, languageStats]);

  const filteredTagsWithCount = useMemo(() => {
    let filteredRepos = repos;

    if (selectedLanguage) {
      filteredRepos = filteredRepos.filter((r) => r.language === selectedLanguage);
    }
    if (selectedTag.length > 0) {
      filteredRepos = filteredRepos.filter(
        (r) => r.topics && selectedTag.every((tag) => r.topics.includes(tag))
      );
    }
    if (searchResults.length > 0) {
      const ids = new Set(searchResults.map((r) => r.id));
      filteredRepos = filteredRepos.filter((r) => ids.has(r.id));
    }

    const tagCount: Record<string, number> = {};
    filteredRepos.forEach((repo) => {
      repo.topics?.forEach((topic) => {
        tagCount[topic] = (tagCount[topic] || 0) + 1;
      });
    });

    return Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [repos, selectedLanguage, selectedTag, searchResults]);

  const isInSearchMode = inputValue.trim().length > 0;

  const filteredAndSortedRepos = useMemo(() => {
    let result: Repository[];

    if (isInSearchMode) {
      const idSet = new Set(searchResults.map((r) => r.id));
      result = repos.filter((r) => idSet.has(r.id));
    } else {
      result = repos;
    }

    result = result.filter((repo) => {
      const matchesLanguage = !selectedLanguage || repo.language === selectedLanguage;
      const matchesTags =
        selectedTag.length === 0 ||
        (repo.topics && selectedTag.every((tag) => repo.topics.includes(tag)));
      return matchesLanguage && matchesTags;
    });

    result.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'relevance' && searchResults.length > 0) {
        const scoreA = searchResults.find((r) => r.id === a.id)?.score || 0;
        const scoreB = searchResults.find((r) => r.id === b.id)?.score || 0;
        comparison = scoreB - scoreA;
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

      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return result;
  }, [repos, searchResults, selectedLanguage, selectedTag, sortBy, sortOrder, isInSearchMode]);

  const { displayedCount, loadingMore, resetDisplayedCount } = useInfiniteScroll(
    filteredAndSortedRepos.length
  );

  const displayedRepos = useMemo(
    () => filteredAndSortedRepos.slice(0, displayedCount),
    [filteredAndSortedRepos, displayedCount]
  );

  useEffect(() => {
    resetDisplayedCount();
  }, [searchResults, selectedLanguage, selectedTag, sortBy, sortOrder, resetDisplayedCount]);

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <h1>{t('header.title', 'GitHub Stars Search')}</h1>
          <p>{t('header.browse', 'Browse and search your starred repositories')}</p>
        </header>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <header className="header">
          <h1>{t('header.title', 'GitHub Stars Search')}</h1>
          <div className="error">Error: {error}</div>
        </header>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        onOpenSettings={() => setShowSettings(true)}
        onChangeLanguage={(lang) => i18n.changeLanguage(lang)}
        currentLanguage={i18n.language}
      />

      <main className="main">
        <SearchControls
          inputValue={inputValue}
          onInputChange={setInputValue}
          hideAllDetails={hideAllDetails}
          onHideAllDetailsChange={setHideAllDetails}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          languages={languages}
          selectedTag={selectedTag}
          onTagChange={setSelectedTag}
          filteredTagsWithCount={filteredTagsWithCount}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
        />

        <div className="results-info">
          {searchError && <div className="search-error">{searchError}</div>}
          {isSearching ? (
            <div className="searching-indicator">
              <span>{t('results.searching', 'Searching...')}</span>
              <span className="search-time">{searchTime.toFixed(2)}ms</span>
            </div>
          ) : (
            <div className="results-count">
              {t('results.showing', 'Showing')} {displayedRepos.length} {t('results.of', 'of')}{' '}
              {filteredAndSortedRepos.length} {t('results.repositories', 'repositories')}
            </div>
          )}
        </div>

        <div className="repo-list">
          {displayedRepos.length === 0 ? (
            <div className="no-results">
              {t('results.noResults', 'No repositories found matching your criteria.')}
            </div>
          ) : (
            displayedRepos.map((repo) => {
              const isDetailsExpanded = hideAllDetails
                ? expandedRepos[repo.id] === true
                : expandedRepos[repo.id] !== false;
              return (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  isDetailsExpanded={isDetailsExpanded}
                  onToggleExpand={() =>
                    setExpandedRepos((prev) => ({
                      ...prev,
                      [repo.id]: !isDetailsExpanded,
                    }))
                  }
                />
              );
            })
          )}
        </div>

        {loadingMore && (
          <div className="loading-more">
            <div className="loading-spinner"></div>
            <p>Loading more repositories...</p>
          </div>
        )}

        {displayedRepos.length < filteredAndSortedRepos.length && !loadingMore && (
          <div className="load-more-hint">
            <p>{t('results.loadMore', 'Scroll down to load more repositories')}</p>
          </div>
        )}

        {displayedRepos.length >= filteredAndSortedRepos.length && displayedRepos.length > 0 && (
          <div className="all-loaded">
            <p>{t('results.allLoaded', 'All repositories loaded')}</p>
          </div>
        )}
      </main>

      {showSettings && (
        <SettingsModal
          dataUrl={atomDataUrl}
          defaultDataUrl={defaultDataUrl}
          onSave={(url) => {
            setAtomDataUrl(url);
            setShowSettings(false);
          }}
          onReset={() => setAtomDataUrl('')}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default App;
