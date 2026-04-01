import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const showSettingsAtom = atom(false);
export const expandedReposAtom = atom<Record<number, boolean>>({});
export const displayedCountAtom = atom(10);
export const loadingMoreAtom = atom(false);

export const dataUrlAtom = atomWithStorage<string>('github-stars-dataUrl', '');
export const hideAllDetailsAtom = atomWithStorage<boolean>('github-stars-hideAllDetails', false);
export const sortByAtom = atomWithStorage<string>('github-stars-sortBy', 'starred');
export const sortOrderAtom = atomWithStorage<string>('github-stars-sortOrder', 'desc');
