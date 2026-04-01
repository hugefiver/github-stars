import { useTranslation } from 'react-i18next';
import { Repository } from '../../types';
import { formatDate, formatNumber } from '../../utils/formatters';
import { getFundingIcon } from '../../utils/funding-icons';
import { LanguageBar } from '../LanguageBar/LanguageBar';

interface RepoCardProps {
  repo: Repository;
  isDetailsExpanded: boolean;
  onToggleExpand: () => void;
}

export function RepoCard({ repo, isDetailsExpanded, onToggleExpand }: RepoCardProps) {
  const { t } = useTranslation();

  return (
    <div className="repo-card">
      <div className="repo-header">
        <h2 className="repo-name">
          <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
            {repo.full_name}
          </a>
        </h2>
        <span className="repo-language">{repo.language}</span>
      </div>

      <p className="repo-description">{repo.description || 'No description provided.'}</p>

      <button className="toggle-details" onClick={onToggleExpand}>
        {isDetailsExpanded ? '▲' : '▼'}
      </button>

      {isDetailsExpanded && (
        <div className="repo-details-section">
          {repo.topics && repo.topics.length > 0 && (
            <div className="repo-topics-group">
              <h4>{t('repo.topics', 'Topics')}</h4>
              <div className="repo-topics">
                {repo.topics.map((topic) => (
                  <span key={`${repo.id}-${topic}`} className="repo-topic">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {repo.languages && Object.keys(repo.languages).length > 0 && (
            <LanguageBar languages={repo.languages} />
          )}
        </div>
      )}

      <div className="repo-additional-info">
        <h4>{t('repo.info.title', 'Repository Information')}</h4>
        <div className="repo-info-grid">
          <div className="repo-info-item">
            <span className="repo-info-label">
              {t('repo.info.primaryLanguage', 'Primary Language:')}
            </span>
            <span className="repo-info-value">{repo.language || 'N/A'}</span>
          </div>
          <div className="repo-info-item">
            <span className="repo-info-label">{t('repo.info.license', 'License:')}</span>
            <span className="repo-info-value">{repo.licenseInfo?.name || 'N/A'}</span>
          </div>
          <div className="repo-info-item">
            <span className="repo-info-label">{t('repo.info.status', 'Status:')}</span>
            <span className="repo-info-value">
              {repo.isArchived && <span className="status-archived">📦 Archived</span>}
              {repo.isFork && <span className="status-fork">🍴 Fork</span>}
              {repo.isMirror && <span className="status-mirror">🪞 Mirror</span>}
              {!repo.isArchived && !repo.isFork && !repo.isMirror && <span>Active</span>}
            </span>
          </div>
          {repo.parent && (
            <div className="repo-info-item">
              <span className="repo-info-label">{t('repo.info.parent', 'Parent:')}</span>
              <span className="repo-info-value">
                <a href={repo.parent.url} target="_blank" rel="noopener noreferrer">
                  {repo.parent.nameWithOwner}
                </a>
              </span>
            </div>
          )}
          {repo.latestRelease && (
            <div className="repo-info-item">
              <span className="repo-info-label">
                {t('repo.info.latestRelease', 'Latest Release:')}
              </span>
              <span className="repo-info-value">
                <a href={repo.latestRelease.url} target="_blank" rel="noopener noreferrer">
                  {repo.latestRelease.name} ({repo.latestRelease.tagName})
                </a>
              </span>
            </div>
          )}
          {repo.mirrorUrl && (
            <div className="repo-info-item">
              <span className="repo-info-label">{t('repo.info.mirrorUrl', 'Mirror URL:')}</span>
              <span className="repo-info-value">
                <a href={repo.mirrorUrl} target="_blank" rel="noopener noreferrer">
                  {repo.mirrorUrl}
                </a>
              </span>
            </div>
          )}
          {repo.pushedAt && (
            <div className="repo-info-item">
              <span className="repo-info-label">{t('repo.info.lastPushed', 'Last Pushed:')}</span>
              <span className="repo-info-value">{formatDate(repo.pushedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {repo.fundingLinks && repo.fundingLinks.length > 0 && (
        <div className="repo-funding">
          <h4>{t('repo.funding', 'Funding')}</h4>
          <div className="funding-links">
            {repo.fundingLinks.map((funding, index) => (
              <a
                key={`${repo.id}-funding-${index}`}
                href={funding.url}
                target="_blank"
                rel="noopener noreferrer"
                className="funding-link"
                title={`Fund on ${funding.platform}`}
              >
                {getFundingIcon(funding.platform)}
              </a>
            ))}
          </div>
        </div>
      )}

      {repo.packages && repo.packages.length > 0 && (
        <div className="repo-packages">
          <h4>{t('repo.packages', 'Packages')}</h4>
          <div className="package-list">
            {repo.packages.map((pkg, index) => (
              <span key={`${repo.id}-package-${index}`} className="package-badge">
                {pkg.name} {pkg.version && `(${pkg.version})`}
              </span>
            ))}
          </div>
        </div>
      )}

      {repo.milestones && repo.milestones.length > 0 && (
        <div className="repo-milestones">
          <h4>{t('repo.milestones', 'Milestones')}</h4>
          <div className="milestone-list">
            {repo.milestones.slice(0, 5).map((milestone, index) => (
              <div key={`${repo.id}-milestone-${index}`} className="milestone-item">
                <span className={`milestone-state milestone-${milestone.state.toLowerCase()}`}>
                  {milestone.state}
                </span>
                <a
                  href={milestone.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="milestone-title"
                >
                  {milestone.title}
                </a>
                {milestone.dueOn && (
                  <span className="milestone-due">Due: {formatDate(milestone.dueOn)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="repo-stats">
        <span className="stat">
          <span className="stat-icon">⭐</span>
          {formatNumber(repo.stargazers_count)}
        </span>
        <span className="stat">
          <span className="stat-icon">🍴</span>
          {formatNumber(repo.forks_count)}
        </span>
        <span className="stat">
          <span className="stat-icon">📅</span>
          Updated {formatDate(repo.updated_at)}
        </span>
        {repo.starred_at && (
          <span className="stat">
            <span className="stat-icon">⭐</span>
            Starred {formatDate(repo.starred_at)}
          </span>
        )}
      </div>
    </div>
  );
}
