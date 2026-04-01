import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface TagFilterDropdownProps {
  value: string[];
  onChange: (tags: string[]) => void;
  options: { tag: string; count: number }[];
}

export function TagFilterDropdown({ value, onChange, options }: TagFilterDropdownProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return options;
    return options.filter((option) =>
      option.tag.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [options, debouncedSearchTerm]);

  const handleSelect = (tag: string) => {
    const newTags = value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag];
    onChange(newTags);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setSearchTerm('');
  };

  const handleClearTag = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div className="tag-filter-dropdown multi-select" ref={wrapperRef}>
      <div className="dropdown-trigger">
        <div className="selected-tags">
          {value.map((tag) => (
            <div key={tag} className="selected-tag">
              {tag}
              <button
                className="tag-remove"
                onClick={(e) => handleClearTag(e, tag)}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </div>
          ))}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={value.length === 0 ? t('filters.placeholder', 'Filter by tags...') : ''}
            className="dropdown-input"
            onFocus={() => setIsOpen(true)}
            onClick={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && searchTerm === '' && value.length > 0) {
                e.preventDefault();
                const newTags = [...value];
                newTags.pop();
                onChange(newTags);
              }
            }}
          />
        </div>
        <div className="dropdown-controls">
          {value.length > 0 && (
            <button className="clear-all" onClick={handleClear} aria-label="Clear all selections">
              {t('filters.clearAll', 'Clear All')}
            </button>
          )}
          <div className="dropdown-arrow" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="dropdown-options">
          <div
            className={`option ${value.length === 0 ? 'selected' : ''}`}
            onClick={() => onChange([])}
          >
            {t('filters.allTags', 'All Tags')}
          </div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item) => (
              <div
                key={item.tag}
                className={`option ${value.includes(item.tag) ? 'selected' : ''}`}
                onClick={() => handleSelect(item.tag)}
              >
                <span className="tag-name">{item.tag}</span>
                <span className="tag-count">{item.count}</span>
                {value.includes(item.tag) && <span className="checkmark">✓</span>}
              </div>
            ))
          ) : (
            <div className="no-options">{t('filters.noMatchingTags', 'No matching tags')}</div>
          )}
        </div>
      )}
    </div>
  );
}
