import { atom } from 'jotai';

// 排序状态
export const sortByAtom = atom<string>('starred');
export const sortOrderAtom = atom<string>('desc');

// 设置状态
export const showSettingsAtom = atom<boolean>(false);

// 仓库详情展开状态
export const expandedReposAtom = atom<Record<number, boolean>>({});

// 全局隐藏详情开关
export const hideAllDetailsAtom = atom<boolean>(false);

// 数据URL设置
export const dataUrlAtom = atom<string>('');
export const tempDataUrlAtom = atom<string>('');

// 无限滚动状态
export const displayedCountAtom = atom<number>(10);
export const loadingMoreAtom = atom<boolean>(false);

// 持久化设置到localStorage的派生atom
interface Settings {
  dataUrl: string;
  hideAllDetails: boolean;
  sortBy: string;
  sortOrder: string;
}

export const persistentSettingsAtom = atom(
  (get) => ({
    dataUrl: get(dataUrlAtom),
    hideAllDetails: get(hideAllDetailsAtom),
    sortBy: get(sortByAtom),
    sortOrder: get(sortOrderAtom),
  }),
  (get, set, update: Settings) => {
    // 更新atom状态
    set(dataUrlAtom, update.dataUrl);
    set(hideAllDetailsAtom, update.hideAllDetails);
    set(sortByAtom, update.sortBy);
    set(sortOrderAtom, update.sortOrder);
    
    // 保存到localStorage
    localStorage.setItem('github-stars-settings', JSON.stringify(update));
  }
);

// 初始化设置的atom（从localStorage读取）
export const initializeSettingsAtom = atom(
  null,
  (get, set) => {
    try {
      const savedSettings = localStorage.getItem('github-stars-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        set(dataUrlAtom, settings.dataUrl || '');
        set(hideAllDetailsAtom, settings.hideAllDetails || false);
        set(sortByAtom, settings.sortBy || 'starred');
        set(sortOrderAtom, settings.sortOrder || 'desc');
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
  }
);
