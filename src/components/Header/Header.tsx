import { useTranslation } from 'react-i18next';

interface HeaderProps {
  onOpenSettings: () => void;
  onChangeLanguage: (lang: string) => void;
  currentLanguage: string;
}

export function Header({ onOpenSettings, onChangeLanguage, currentLanguage }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="header">
      <h1>{t('header.title', 'GitHub Stars Search')}</h1>
      <div className="badges">
        <a href="https://github.com/hugefiver" target="_blank" rel="noopener noreferrer">
          <img src="https://img.shields.io/badge/Author-hugefiver-blue" alt="Author" />
        </a>
        <a
          href="https://github.com/hugefiver/github-stars"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://img.shields.io/github/stars/hugefiver/github-stars?style=social"
            alt="GitHub Stars"
          />
        </a>
      </div>
      <p>{t('header.browse', 'Browse and search your starred repositories')}</p>
      <div className="header-controls">
        <div className="language-switcher">
          <select
            value={currentLanguage}
            onChange={(e) => onChangeLanguage(e.target.value)}
            className="language-select"
          >
            <option value="en">{t('languageSwitcher.english', 'English')}</option>
            <option value="zh">{t('languageSwitcher.chinese', '中文')}</option>
            <option value="ja">{t('languageSwitcher.japanese', '日本語')}</option>
            <option value="kr_Kim">{t('languageSwitcher.korean', '한국어')}</option>
          </select>
        </div>
        <button className="settings-button" onClick={onOpenSettings}>
          {t('header.settings', '⚙️ Settings')}
        </button>
      </div>
    </header>
  );
}
