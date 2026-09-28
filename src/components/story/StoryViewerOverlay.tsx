import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import type { UserStoryGroup } from '../../types'
import { AvatarFallback } from '../ui/AvatarFallback'

type StoryViewerOverlayProps = {
  initialGroup: UserStoryGroup
  allGroups: UserStoryGroup[]
  onClose: () => void
  onReply: (userId: number, text: string) => void
  isClosing?: boolean
}

export function StoryViewerOverlay({ initialGroup, allGroups, onClose, onReply, isClosing }: StoryViewerOverlayProps) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(() => allGroups.findIndex(g => g.user_id === initialGroup.user_id))
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [replyText, setReplyText] = useState('')

  const currentGroup = allGroups[currentGroupIndex]
  const currentItem = currentGroup?.items[currentItemIndex]

  useEffect(() => {
    if (!currentItem) return
    const isVideo = currentItem.media_type === 'video'
    const duration = isVideo ? 15000 : 5000
    
    let start = Date.now()
    let animationFrame: number

    const tick = () => {
      const elapsed = Date.now() - start
      if (elapsed >= duration) {
        handleNext()
      } else {
        setProgress((elapsed / duration) * 100)
        animationFrame = requestAnimationFrame(tick)
      }
    }

    animationFrame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(animationFrame)
  }, [currentGroupIndex, currentItemIndex, currentItem])

  const handleNext = () => {
    if (currentItemIndex < currentGroup.items.length - 1) {
      setCurrentItemIndex(prev => prev + 1)
      setProgress(0)
    } else if (currentGroupIndex < allGroups.length - 1) {
      setCurrentGroupIndex(prev => prev + 1)
      setCurrentItemIndex(0)
      setProgress(0)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1)
      setProgress(0)
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(prev => prev - 1)
      setCurrentItemIndex(allGroups[currentGroupIndex - 1].items.length - 1)
      setProgress(0)
    }
  }

  const handleSendReply = () => {
    if (replyText.trim()) {
      onReply(currentGroup.user_id, replyText)
      setReplyText('')
      pushToast('Đã gửi phản hồi')
    }
  }

  if (!currentItem) return null

  return (
    <div className={`story-viewer-overlay ${isClosing ? 'is-closing' : ''}`}>
      <div className="story-viewer-backdrop" onClick={onClose} />
      
      <button className="story-nav-btn prev" onClick={handlePrev}>
        <ChevronLeft size={32} />
      </button>

      <div className="story-viewer-content">
        <div className="story-progress-container">
          {currentGroup.items.map((item, idx) => (
            <div key={item.id} className="story-progress-bar">
              <div 
                className="story-progress-fill" 
                style={{ 
                  width: idx < currentItemIndex ? '100%' : idx === currentItemIndex ? `${progress}%` : '0%' 
                }} 
              />
            </div>
          ))}
        </div>

        <header className="story-viewer-header">
          <div className="story-user-info">
            <AvatarFallback name={currentGroup.full_name} src={currentGroup.avatar_url} />
            <div className="story-meta">
              <strong>{currentGroup.display_name || currentGroup.full_name}</strong>
              <small>{new Date(currentItem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
            </div>
          </div>
          <button className="story-close-btn" onClick={onClose}><X size={24} /></button>
        </header>

        <div className="story-media-container" onClick={handleNext}>
          {currentItem.media_type === 'video' ? (
            <video src={currentItem.media_url} autoPlay playsInline className="story-media" />
          ) : (
            <img src={currentItem.media_url} alt="Story" className="story-media" />
          )}
          {currentItem.text_content && (
            <div className="story-text-overlay">
              {currentItem.text_content}
            </div>
          )}
        </div>

        <footer className="story-viewer-footer">
          <input 
            type="text" 
            className="story-reply-input" 
            placeholder="Trả lời..." 
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendReply()}
          />
          <button className="story-reaction-btn"><Heart size={24} /></button>
        </footer>
      </div>

      <button className="story-nav-btn next" onClick={handleNext}>
        <ChevronRight size={32} />
      </button>
    </div>
  )
}

function pushToast(text: string) {
  alert(text)
}
