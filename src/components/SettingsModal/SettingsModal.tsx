import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SettingsModalProps {
  dataUrl: string;
  defaultDataUrl: string;
  onSave: (url: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export function SettingsModal({
  dataUrl,
  defaultDataUrl,
  onSave,
  onReset,
  onClose,
}: SettingsModalProps) {
  const { t } = useTranslation();
  const [stagedUrl, setStagedUrl] = useState(dataUrl);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('settings.title', 'Settings')}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="dataUrl">{t('settings.dataUrl', 'Data File URL:')}</label>
            <input
              type="text"
              id="dataUrl"
              value={stagedUrl}
              placeholder={defaultDataUrl}
              onChange={(e) => setStagedUrl(e.target.value)}
              className="form-input"
            />
            <p className="help-text">
              {t('settings.enterUrl', 'Enter the URL to your starred repositories JSON file.')}
              {t('settings.default', 'Default:')} {defaultDataUrl}
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="reset-button"
            onClick={() => {
              setStagedUrl('');
              onReset();
            }}
          >
            {t('settings.reset', 'Reset to Default')}
          </button>
          <button className="save-button" onClick={() => onSave(stagedUrl)}>
            {t('settings.save', 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
}
