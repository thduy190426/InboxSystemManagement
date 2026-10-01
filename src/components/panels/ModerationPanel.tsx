import { useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import { useModerationSettings } from '../../hooks/useModerationSettings'

export function ModerationPanel({ pushToast }: { pushToast?: (text: string, tone?: 'info' | 'error') => void }) {
  const { settings, updateSettings } = useModerationSettings()
  const [bannedWordsInput, setBannedWordsInput] = useState('')
  const [blockedFileInput, setBlockedFileInput] = useState('')

  const handleAddBannedWord = () => {
    const word = bannedWordsInput.trim().toLowerCase()
    if (!word) return
    if (settings.bannedWords.includes(word)) {
      pushToast?.('Từ khóa đã tồn tại', 'error')
      return
    }
    updateSettings({ bannedWords: [...settings.bannedWords, word] })
    setBannedWordsInput('')
    pushToast?.('Đã thêm từ khóa', 'info')
  }

  const handleRemoveBannedWord = (word: string) => {
    updateSettings({ bannedWords: settings.bannedWords.filter((w) => w !== word) })
  }

  const handleAddBlockedFile = () => {
    let ext = blockedFileInput.trim().toLowerCase()
    if (!ext) return
    if (!ext.startsWith('.')) ext = '.' + ext
    if (settings.blockedFileTypes.includes(ext)) {
      pushToast?.('Định dạng đã tồn tại', 'error')
      return
    }
    updateSettings({ blockedFileTypes: [...settings.blockedFileTypes, ext] })
    setBlockedFileInput('')
    pushToast?.('Đã thêm định dạng', 'info')
  }

  const handleRemoveBlockedFile = (ext: string) => {
    updateSettings({ blockedFileTypes: settings.blockedFileTypes.filter((e) => e !== ext) })
  }

  return (
    <div className="admin-content-section moderation-section" style={{ marginTop: '32px' }}>
      <div className="section-header">
        <h2>
          <ShieldCheck size={18} />
          Kiểm duyệt Nội dung
        </h2>
        <div className="section-actions">
          <select 
            value={settings.bannedWordAction}
            onChange={(e) => updateSettings({ bannedWordAction: e.target.value as 'mask' | 'block' })}
            style={{ padding: '8px', borderRadius: '8px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-color)' }}
          >
            <option value="mask">Bíp (***) từ khóa cấm</option>
            <option value="block">Chặn gửi tin nhắn</option>
          </select>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="moderation-card" style={{ background: 'var(--surface-hover)', padding: '16px', borderRadius: '12px' }}>
          <h3>Từ khóa cấm</h3>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>Các từ ngữ không được phép sử dụng trong tin nhắn.</p>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="text" 
              value={bannedWordsInput}
              onChange={(e) => setBannedWordsInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBannedWord()}
              placeholder="Nhập từ khóa (vd: fuck)"
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--background)', color: 'var(--text)' }}
            />
            <button onClick={handleAddBannedWord} className="primary-button" style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--accent-color)', color: 'white', border: 'none', cursor: 'pointer' }}>
              Thêm
            </button>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {settings.bannedWords.map(word => (
              <span key={word} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--background)', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border-color)' }}>
                {word}
                <X size={14} style={{ cursor: 'pointer', color: 'var(--error-color)' }} onClick={() => handleRemoveBannedWord(word)} />
              </span>
            ))}
            {settings.bannedWords.length === 0 && <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Chưa có từ khóa nào.</span>}
          </div>
        </div>

        <div className="moderation-card" style={{ background: 'var(--surface-hover)', padding: '16px', borderRadius: '12px' }}>
          <h3>Định dạng tệp bị cấm</h3>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>Các định dạng không được phép gửi lên hệ thống.</p>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="text" 
              value={blockedFileInput}
              onChange={(e) => setBlockedFileInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBlockedFile()}
              placeholder="Nhập đuôi file (vd: .exe)"
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--background)', color: 'var(--text)' }}
            />
            <button onClick={handleAddBlockedFile} className="primary-button" style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--accent-color)', color: 'white', border: 'none', cursor: 'pointer' }}>
              Thêm
            </button>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {settings.blockedFileTypes.map(ext => (
              <span key={ext} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--background)', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', border: '1px solid var(--border-color)' }}>
                {ext}
                <X size={14} style={{ cursor: 'pointer', color: 'var(--error-color)' }} onClick={() => handleRemoveBlockedFile(ext)} />
              </span>
            ))}
            {settings.blockedFileTypes.length === 0 && <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Chưa có định dạng nào.</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
