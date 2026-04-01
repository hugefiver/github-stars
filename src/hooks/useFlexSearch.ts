import { useState, useEffect, useRef, useCallback } from 'react';
import FlexSearch, { Index } from 'flexsearch';
import { Repository } from '../types';
import { parseQuery, ParsedQuery } from '../lib/query-parser';

export interface SearchResult {
  id: number;
  name: string;
  full_name: string;
  description: string;
  language: string;
  topics: string[];
  score: number;
}

const FIELD_ALIASES: Record<string, keyof Repository> = {
  tag: 'topics',
  topic: 'topics',
  lang: 'language',
  language: 'language',
  desc: 'description',
  description: 'description',
  name: 'full_name',
  full_name: 'full_name',
};

function resolveField(field: string): keyof Repository {
  return FIELD_ALIASES[field] ?? (field as keyof Repository);
}

function matchesFieldCondition(
  repo: Repository,
  repoField: keyof Repository,
  value: string | string[],
  operator: 'AND' | 'OR'
): boolean {
  const repoValue = repo[repoField];

  if (typeof value === 'string') {
    return matchSingleValue(repoValue, value);
  }

  switch (operator) {
    case 'AND':
      return value.every((v) => matchSingleValue(repoValue, v));
    case 'OR':
    default:
      return value.some((v) => matchSingleValue(repoValue, v));
  }
}

function matchSingleValue(repoValue: Repository[keyof Repository], expected: string): boolean {
  if (Array.isArray(repoValue)) {
    return repoValue.some(
      (v) => typeof v === 'string' && v.toLowerCase() === expected.toLowerCase()
    );
  }
  if (typeof repoValue === 'string') {
    return repoValue.toLowerCase().includes(expected.toLowerCase());
  }
  if (repoValue != null) {
    return String(repoValue).toLowerCase().includes(expected.toLowerCase());
  }
  return false;
}

function getSortValue(result: SearchResult, field: string): string | number {
  switch (field) {
    case 'repo_name':
    case 'name':
    case 'full_name':
      return result.full_name.toLowerCase();
    case 'lang':
    case 'language':
      return (result.language || '').toLowerCase();
    case 'description':
      return (result.description || '').toLowerCase();
    case 'id':
      return result.id;
    case 'score':
      return result.score;
    default:
      return '';
  }
}

function sortSearchResults(
  results: SearchResult[],
  sortBy: string | null,
  sortOrder: 'asc' | 'desc' | null
): SearchResult[] {
  if (!sortBy) return results;

  const sorted = [...results];
  sorted.sort((a, b) => {
    const fieldA = getSortValue(a, sortBy);
    const fieldB = getSortValue(b, sortBy);

    const cmp =
      typeof fieldA === 'number' && typeof fieldB === 'number'
        ? fieldA - fieldB
        : String(fieldA).localeCompare(String(fieldB));

    return sortOrder === 'desc' ? -cmp : cmp;
  });

  return sorted;
}

function buildRepoMap(repos: Repository[]): Map<number, Repository> {
  const map = new Map<number, Repository>();
  for (const repo of repos) {
    map.set(repo.id, repo);
  }
  return map;
}

function toSearchResult(repo: Repository): SearchResult {
  return {
    id: repo.id,
    name: repo.name || '',
    full_name: repo.full_name || '',
    description: repo.description || '',
    language: repo.language || '',
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    score: 1,
  };
}

const SEARCH_LIMIT = 5000;
const DEBOUNCE_MS = 300;

export const useFlexSearch = (repositories: Repository[]) => {
  const [searchIndex, setSearchIndex] = useState<Index | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);

  const startTimeRef = useRef(0);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const repositoriesRef = useRef(repositories);
  repositoriesRef.current = repositories;

  const searchIndexRef = useRef(searchIndex);
  searchIndexRef.current = searchIndex;

  const buildIndex = useCallback((index: Index, repos: Repository[]) => {
    index.clear();
    for (const repo of repos) {
      const content = [
        repo.name ?? '',
        repo.full_name ?? '',
        repo.description ?? '',
        repo.language ?? '',
        Array.isArray(repo.topics) ? repo.topics.join(' ') : '',
      ].join(' ');
      index.add(repo.id, content);
    }
  }, []);

  useEffect(() => {
    const index = new FlexSearch.Index({ tokenize: 'forward', context: true });
    setSearchIndex(index);

    if (repositories.length > 0) {
      buildIndex(index, repositories);
    }

    return () => {
      try {
        index.destroy?.();
      } catch {
        // FlexSearch 0.8 has a bug in destroy() with context: true
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchIndex && repositories.length > 0) {
      buildIndex(searchIndex, repositories);
    }
  }, [repositories, searchIndex, buildIndex]);

  const performSearch = useCallback(
    (searchTerm: string) => {
      const index = searchIndexRef.current;
      const repos = repositoriesRef.current;

      if (!index || !searchTerm.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      startTimeRef.current = performance.now();

      try {
        const parsed: ParsedQuery = parseQuery(searchTerm.trim());

        const fieldEntries = Object.entries(parsed.fields).map(
          ([field, value]) =>
            [resolveField(field), value, parsed.booleanOps[field] ?? 'AND'] as const
        );

        const negatedEntries = Object.entries(parsed.negatedFields).map(
          ([field, value]) => [resolveField(field), value] as const
        );

        let ids: number[];

        if (parsed.query) {
          ids = index.search(parsed.query, { limit: SEARCH_LIMIT }) as number[];
        } else if (fieldEntries.length > 0 || negatedEntries.length > 0) {
          ids = repos.map((r) => r.id);
        } else {
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        const repoMap = buildRepoMap(repos);

        let filtered: Repository[];

        const hasFieldFilters = fieldEntries.length > 0 || negatedEntries.length > 0;

        if (hasFieldFilters) {
          filtered = ids.reduce<Repository[]>((acc, id) => {
            const repo = repoMap.get(id);
            if (!repo) return acc;

            const matchesPositive = fieldEntries.every(([repoField, value, op]) =>
              matchesFieldCondition(repo, repoField, value, op)
            );
            if (!matchesPositive) return acc;

            const matchesNegated = negatedEntries.some(([repoField, value]) =>
              matchesFieldCondition(repo, repoField, value, 'OR')
            );
            if (matchesNegated) return acc;

            acc.push(repo);
            return acc;
          }, []);
        } else {
          filtered = ids.reduce<Repository[]>((acc, id) => {
            const repo = repoMap.get(id);
            if (repo) acc.push(repo);
            return acc;
          }, []);
        }

        let results = filtered.slice(0, SEARCH_LIMIT).map(toSearchResult);
        results = sortSearchResults(results, parsed.sortBy, parsed.sortOrder);

        setSearchResults(results);
        setSearchTime(performance.now() - startTimeRef.current);
      } catch (err) {
        console.error('Search error:', err);
        setSearchError('Search failed');
      } finally {
        setIsSearching(false);
      }
    },
    [] // stable: uses refs for mutable data
  );

  const debouncedSearch = useCallback(
    (searchTerm: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchTerm);
      }, DEBOUNCE_MS);
    },
    [performSearch]
  );

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

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    searchResults,
    isSearching,
    searchTime,
    searchError,
    debouncedSearch,
    clearSearch,
  };
};
