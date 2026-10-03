import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Image as ImageIcon, Send } from 'lucide-react'
import { storyApi } from '../../services/api/storyApi'

type StoryCreatorModalProps = {
  onClose: () => void
  onSuccess: () => void
  pushToast: (text: string, tone?: 'info' | 'error') => void
  isClosing?: boolean
}

export function StoryCreatorModal({ onClose, onSuccess, pushToast, isClosing }: StoryCreatorModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [privacy, setPrivacy] = useState('friends')
  const [textContent, setTextContent] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

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
      pushToast('Đã đăng tin thành công!', 'info')
      onSuccess()
    } catch (err) {
      pushToast('Lỗi khi đăng tin!', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div className={`story-creator-overlay ${isClosing ? 'is-closing' : ''}`}>
      <div className={`story-creator-modal ${isClosing ? 'is-closing' : ''}`}>
        <header>
          <h2>Tạo tin mới</h2>
          <button className="close-btn" onClick={onClose} disabled={isUploading} type="button">
            <X size={20} />
          </button>
        </header>

        <div className="story-creator-body">
          {!previewUrl ? (
            <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon size={48} />
              <p>Nhấp để chọn ảnh hoặc video</p>
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
                placeholder="Thêm văn bản vào tin..." 
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                className="story-text-input"
              />
              <div className="privacy-select">
                <label>Quyền riêng tư:</label>
                <select value={privacy} onChange={e => setPrivacy(e.target.value)}>
                  <option value="public">Công khai</option>
                  <option value="friends">Bạn bè</option>
                  <option value="only_me">Chỉ mình tôi</option>
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
              {isUploading ? 'Đang tải lên...' : 'Chia sẻ lên tin'}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body
  )
}
