import { useTranslation } from 'react-i18next';
import { TagFilterDropdown } from '../TagFilterDropdown/TagFilterDropdown';

interface SearchControlsProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  hideAllDetails: boolean;
  onHideAllDetailsChange: (value: boolean) => void;
  selectedLanguage: string;
  onLanguageChange: (value: string) => void;
  languages: string[];
  selectedTag: string[];
  onTagChange: (tags: string[]) => void;
  filteredTagsWithCount: { tag: string; count: number }[];
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: string;
  onSortOrderChange: (value: string) => void;
}

export function SearchControls({
  inputValue,
  onInputChange,
  hideAllDetails,
  onHideAllDetailsChange,
  selectedLanguage,
  onLanguageChange,
  languages,
  selectedTag,
  onTagChange,
  filteredTagsWithCount,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: SearchControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="controls">
      <div className="search-input-container">
        <input
          type="text"
          placeholder={t('search.placeholder', 'Search repositories...')}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="filters">
        <div className="hide-details-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={hideAllDetails}
              onChange={(e) => onHideAllDetailsChange(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">{t('filters.hideDetails', 'Hide All Details')}</span>
        </div>

        <select
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="filter-select"
        >
          <option value="">{t('filters.allLanguages', 'All Languages')}</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>

        <TagFilterDropdown
          value={selectedTag}
          onChange={onTagChange}
          options={filteredTagsWithCount}
        />

        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="filter-select"
        >
          <option value="stars">
            {t('filters.sortBy')} {t('sortOptions.stars')}
          </option>
          <option value="forks">
            {t('filters.sortBy')} {t('sortOptions.forks')}
          </option>
          <option value="updated">
            {t('filters.sortBy')} {t('sortOptions.updated')}
          </option>
          <option value="created">
            {t('filters.sortBy')} {t('sortOptions.created')}
          </option>
          <option value="starred">
            {t('filters.sortBy')} {t('sortOptions.starred')}
          </option>
          <option value="name">
            {t('filters.sortBy')} {t('sortOptions.name')}
          </option>
          <option value="relevance">
            {t('filters.sortBy')} {t('sortOptions.relevance')}
          </option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => onSortOrderChange(e.target.value)}
          className="filter-select"
        >
          <option value="desc">{t('sortOrderOptions.desc')}</option>
          <option value="asc">{t('sortOrderOptions.asc')}</option>
        </select>
      </div>
    </div>
  );
}
