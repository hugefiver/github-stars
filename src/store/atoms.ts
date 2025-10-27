import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// 设置状态
export const showSettingsAtom = atom<boolean>(false);

// 仓库详情展开状态
export const expandedReposAtom = atom<Record<number, boolean>>({});

// 临时数据URL设置（不持久化）
export const tempDataUrlAtom = atom<string>('');

// 无限滚动状态
export const displayedCountAtom = atom<number>(10);
export const loadingMoreAtom = atom<boolean>(false);

// 搜索状态
export const searchResultsAtom = atom<any[]>([]);
export const isSearchingAtom = atom<boolean>(false);
export const searchTimeAtom = atom<number>(0);
export const searchErrorAtom = atom<string | null>(null);

// 使用 Jotai 的 atomWithStorage 来持久化设置到 localStorage
// 为每个设置创建独立的持久化 atom
export const dataUrlAtom = atomWithStorage<string>('github-stars-dataUrl', '');
export const hideAllDetailsAtom = atomWithStorage<boolean>('github-stars-hideAllDetails', false);
export const sortByAtom = atomWithStorage<string>('github-stars-sortBy', 'starred');
export const sortOrderAtom = atomWithStorage<string>('github-stars-sortOrder', 'desc');
