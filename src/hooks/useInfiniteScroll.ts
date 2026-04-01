import { useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { displayedCountAtom, loadingMoreAtom } from '../store/atoms';

const ITEMS_PER_LOAD = 10;

export function useInfiniteScroll(totalFilteredCount: number) {
  const [displayedCount, setDisplayedCount] = useAtom(displayedCountAtom);
  const [loadingMore, setLoadingMore] = useAtom(loadingMoreAtom);

  const resetDisplayedCount = useCallback(() => {
    setDisplayedCount(ITEMS_PER_LOAD);
  }, [setDisplayedCount]);

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || displayedCount >= totalFilteredCount) {
        return;
      }

      const scrollPosition = window.scrollY + window.innerHeight;
      const threshold = document.documentElement.scrollHeight - 200;

      if (scrollPosition >= threshold) {
        setLoadingMore(true);
        setTimeout(() => {
          setDisplayedCount((prev) => prev + ITEMS_PER_LOAD);
          setLoadingMore(false);
        }, 500);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, displayedCount, totalFilteredCount, setDisplayedCount, setLoadingMore]);

  return {
    displayedCount,
    loadingMore,
    resetDisplayedCount,
  };
}
