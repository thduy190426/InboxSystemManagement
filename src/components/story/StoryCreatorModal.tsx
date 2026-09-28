import { useState, useRef } from 'react'
import { X, Image as ImageIcon, Send } from 'lucide-react'
import { storyApi } from '../../services/api/storyApi'

type StoryCreatorModalProps = {
  onClose: () => void
  onSuccess: () => void
  pushToast: (text: string, tone?: 'info' | 'error') => void
}

export function StoryCreatorModal({ onClose, onSuccess, pushToast }: StoryCreatorModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [privacy, setPrivacy] = useState('friends')
  const [textContent, setTextContent] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setPreviewUrl(URL.createObjectURL(selected))
    }
  }

  const handleSubmit = async () => {
    if (!file) return
    setIsUploading(true)
    try {
      await storyApi.createStory(file, privacy, textContent)
      pushToast('ÄÃ£ Ä‘Äƒng tin thÃ nh cÃ´ng!', 'info')
      onSuccess()
    } catch (err) {
      pushToast('Lá»—i khi Ä‘Äƒng tin!', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="story-creator-overlay">
      <div className="story-creator-modal animate-in">
        <header>
          <h2>Táº¡o tin má»›i</h2>
          <button className="close-btn" onClick={onClose} disabled={isUploading} type="button">
            <X size={20} />
          </button>
        </header>

        <div className="story-creator-body">
          {!previewUrl ? (
            <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon size={48} />
              <p>Nháº¥p Ä‘á»ƒ chá»n áº£nh hoáº·c video</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*,video/*" 
                hidden 
              />
            </div>
          ) : (
            <div className="preview-container">
              {file?.type.startsWith('video/') ? (
                <video src={previewUrl} controls className="media-preview" />
              ) : (
                <img src={previewUrl} alt="Preview" className="media-preview" />
              )}
            </div>
          )}

          {previewUrl && (
            <div className="story-options">
              <input 
                type="text" 
                placeholder="ThÃªm vÄƒn báº£n vÃ o tin..." 
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                className="story-text-input"
              />
              <div className="privacy-select">
                <label>Quyá»n riÃªng tÆ°:</label>
                <select value={privacy} onChange={e => setPrivacy(e.target.value)}>
                  <option value="public">CÃ´ng khai</option>
                  <option value="friends">Báº¡n bÃ¨</option>
                  <option value="only_me">Chá»‰ mÃ¬nh tÃ´i</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <footer className="story-creator-footer">
          {previewUrl && (
            <button 
              className="cp-btn cp-btn--primary share-btn" 
              onClick={handleSubmit}
              disabled={isUploading}
              type="button"
            >
              <Send size={16} />
              {isUploading ? 'Äang táº£i lÃªn...' : 'Chia sáº» lÃªn tin'}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

