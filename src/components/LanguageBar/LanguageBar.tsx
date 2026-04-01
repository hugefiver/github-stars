import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Repository } from '../../types';
import { getLanguageColor } from '../../utils/language-colors';

interface LanguageBarProps {
  languages: Repository['languages'];
}

export function LanguageBar({ languages }: LanguageBarProps) {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  if (!languages || Object.keys(languages).length === 0) {
    return null;
  }

  const mainLanguages: [string, { bytes: number; percentage: string }][] = [];
  const otherLanguages: [string, { bytes: number; percentage: string }][] = [];
  let otherTotal = 0;

  Object.entries(languages).forEach(([lang, data]) => {
    const percentage = parseFloat(data.percentage);
    if (percentage >= 10) {
      mainLanguages.push([lang, data]);
    } else {
      otherLanguages.push([lang, data]);
      otherTotal += percentage;
    }
  });

  mainLanguages.sort((a, b) => parseFloat(b[1].percentage) - parseFloat(a[1].percentage));

  return (
    <div
      className="repo-languages-compact"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h4>{t('repo.languages', 'Languages')}</h4>
      <div className="repo-language-bar-container">
        <div className="repo-language-bar-segmented">
          {mainLanguages.map(([language, data]) => (
            <div
              key={`segment-${language}`}
              className="repo-language-segment"
              style={{
                width: `${data.percentage}%`,
                backgroundColor: getLanguageColor(language),
              }}
              title={`${language}: ${data.percentage}%`}
            />
          ))}
          {otherTotal > 0 && (
            <div
              key="segment-other"
              className="repo-language-segment"
              style={{
                width: `${otherTotal}%`,
                backgroundColor: getLanguageColor('Other'),
              }}
              title={otherLanguages
                .map(([lang, data]) => `${lang}: ${data.percentage}%`)
                .join('\n')}
            />
          )}
        </div>
        <div className="repo-language-bar-labels">
          {mainLanguages.map(([language, data]) => (
            <span
              key={`label-${language}`}
              className="repo-language-label"
              style={{ width: `${data.percentage}%` }}
            >
              {language}
            </span>
          ))}
          {otherTotal > 0 && (
            <span
              key="label-other"
              className="repo-language-label"
              style={{ width: `${otherTotal}%` }}
            >
              {t('repo.info.other', 'Other')}
            </span>
          )}
        </div>
      </div>
      {isHovered && (
        <div className="language-tooltip">
          {Object.entries(languages)
            .sort((a, b) => parseFloat(b[1].percentage) - parseFloat(a[1].percentage))
            .map(([lang, data]) => (
              <div key={lang}>
                {lang}: {data.percentage}%
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
