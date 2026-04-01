import { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { Repository } from '../types';
import { dataUrlAtom } from '../store/atoms';

const DEFAULT_DATA_URL = './data/starred-repos.json';

export function useRepoData() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [atomDataUrl, setAtomDataUrl] = useAtom(dataUrlAtom);

  const dataUrl = atomDataUrl || DEFAULT_DATA_URL;

  const fetchData = useCallback(async (url: string) => {
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
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(dataUrl);
  }, [dataUrl, fetchData]);

  return {
    repos,
    loading,
    error,
    dataUrl,
    defaultDataUrl: DEFAULT_DATA_URL,
    atomDataUrl,
    setAtomDataUrl,
  };
}
