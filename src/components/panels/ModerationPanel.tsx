import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import { useModerationSettings } from '../../hooks/useModerationSettings'

export function ModerationPanel({ pushToast }: { pushToast?: (text: string, tone?: 'info' | 'error') => void }) {
  const { t } = useTranslation('panels')
  const { settings, updateSettings } = useModerationSettings()
  const [bannedWordsInput, setBannedWordsInput] = useState('')
  const [blockedFileInput, setBlockedFileInput] = useState('')

  const handleAddBannedWord = () => {
    const word = bannedWordsInput.trim().toLowerCase()
    if (!word) return
    if (settings.bannedWords.includes(word)) {
      pushToast?.(t('keywordExistsErr'), 'error')
      return
    }
    updateSettings({ bannedWords: [...settings.bannedWords, word] })
    setBannedWordsInput('')
    pushToast?.(t('keywordAdded'), 'info')
  }

  const handleRemoveBannedWord = (word: string) => {
    updateSettings({ bannedWords: settings.bannedWords.filter((w) => w !== word) })
  }

  const handleAddBlockedFile = () => {
    let ext = blockedFileInput.trim().toLowerCase()
    if (!ext) return
    if (!ext.startsWith('.')) ext = '.' + ext
    if (settings.blockedFileTypes.includes(ext)) {
      pushToast?.(t('formatExistsErr'), 'error')
      return
    }
    updateSettings({ blockedFileTypes: [...settings.blockedFileTypes, ext] })
    setBlockedFileInput('')
    pushToast?.(t('formatAdded'), 'info')
  }

  const handleRemoveBlockedFile = (ext: string) => {
    updateSettings({ blockedFileTypes: settings.blockedFileTypes.filter((e) => e !== ext) })
  }

  return (
    <div className="admin-content-section moderation-section" style={{ marginTop: '32px' }}>
      <div className="section-header">
        <h2>
          <ShieldCheck size={18} />
          {t('modPanelTitle')}
        </h2>
        <div className="section-actions">
          <select 
            value={settings.bannedWordAction}
            onChange={(e) => updateSettings({ bannedWordAction: e.target.value as 'mask' | 'block' })}
            style={{ padding: '8px', borderRadius: '8px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-color)' }}
          >
            <option value="mask">{t('actionMask')}</option>
            <option value="block">{t('actionBlock')}</option>
          </select>
        </div>
      </div>
      
      <div className="moderation-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
        <div className="moderation-card" style={{ background: 'var(--surface-hover)', padding: '16px', borderRadius: '12px' }}>
          <h3>{t('bannedWordsTitle')}</h3>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>{t('bannedWordsDesc')}</p>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="text" 
              value={bannedWordsInput}
              onChange={(e) => setBannedWordsInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBannedWord()}
              placeholder={t('keywordPlaceholder')}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--background)', color: 'var(--text)' }}
            />
            <button onClick={handleAddBannedWord} className="primary-button" style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--accent-color)', color: 'white', border: 'none', cursor: 'pointer' }}>
              {t('addBtn')}
            </button>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {settings.bannedWords.map(word => (
              <span key={word} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--background)', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border-color)' }}>
                {word}
                <X size={14} style={{ cursor: 'pointer', color: 'var(--error-color)' }} onClick={() => handleRemoveBannedWord(word)} />
              </span>
            ))}
            {settings.bannedWords.length === 0 && <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{t('noKeywords')}</span>}
          </div>
        </div>

        <div className="moderation-card" style={{ background: 'var(--surface-hover)', padding: '16px', borderRadius: '12px' }}>
          <h3>{t('blockedFilesTitle')}</h3>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>{t('blockedFilesDesc')}</p>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="text" 
              value={blockedFileInput}
              onChange={(e) => setBlockedFileInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBlockedFile()}
              placeholder={t('formatPlaceholder')}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--background)', color: 'var(--text)' }}
            />
            <button onClick={handleAddBlockedFile} className="primary-button" style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--accent-color)', color: 'white', border: 'none', cursor: 'pointer' }}>
              {t('addBtn')}
            </button>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {settings.blockedFileTypes.map(ext => (
              <span key={ext} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--background)', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border-color)' }}>
                {ext}
                <X size={14} style={{ cursor: 'pointer', color: 'var(--error-color)' }} onClick={() => handleRemoveBlockedFile(ext)} />
              </span>
            ))}
            {settings.blockedFileTypes.length === 0 && <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{t('noFormats')}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
