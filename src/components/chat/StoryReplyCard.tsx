import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Play, Image as ImageIcon, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Message } from '../../types'

type StoryReplyCardProps = {
  message: Message
}

export function StoryReplyCard({ message }: StoryReplyCardProps) {
  const { t } = useTranslation('story')
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  let metadata: any = null
  try {
    if (typeof (message as any).metadata === 'string') {
      metadata = JSON.parse((message as any).metadata)
    } else if ((message as any).metadata) {
      metadata = (message as any).metadata
    }
  } catch (e) {
    metadata = null
  }

  if (!metadata || metadata.type !== 'story_reply') {
    return null
  }

  const { storyMediaUrl, storyMediaType, storyTextContent, reaction } = metadata

  return (
    <>
      <div 
        className="story-reply-card"
        onClick={() => storyMediaUrl && setShowPreviewModal(true)}
        title={t('viewOriginalStory')}
      >
        {storyMediaUrl && (
          <div style={{ position: 'relative', width: '44px', height: '58px', flexShrink: 0 }}>
            {storyMediaType === 'video' ? (
              <>
                <video 
                  src={storyMediaUrl} 
                  className="story-reply-thumb" 
                  muted 
                  playsInline 
                />
                <span style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '6px',
                  color: '#fff'
                }}>
                  <Play size={16} fill="#fff" />
                </span>
              </>
            ) : (
              <img 
                src={storyMediaUrl} 
                alt="Story thumbnail" 
                className="story-reply-thumb" 
              />
            )}
          </div>
        )}

        <div className="story-reply-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {storyMediaType === 'video' ? <Play size={12} color="var(--primary)" /> : <ImageIcon size={12} color="var(--primary)" />}
            <span className="story-reply-title">
              {reaction ? t('reactedToStory') : t('repliedToStory')}
            </span>
            {reaction && (
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{reaction}</span>
            )}
          </div>

          {storyTextContent && (
            <span className="story-reply-snippet">
              "{storyTextContent}"
            </span>
          )}
        </div>
      </div>

      {showPreviewModal && storyMediaUrl && typeof document !== 'undefined' && createPortal(
        <div 
          className="story-viewer-overlay"
          onClick={() => setShowPreviewModal(false)}
          style={{ zIndex: 10005 }}
        >
          <div className="story-viewer-backdrop" />
          <button 
            className="story-close-btn" 
            onClick={() => setShowPreviewModal(false)}
            style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 20, color: '#fff' }}
          >
            <X size={28} />
          </button>
          <div 
            className="story-viewer-content"
            onClick={e => e.stopPropagation()}
            style={{ height: '80vh', maxWidth: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {storyMediaType === 'video' ? (
              <video src={storyMediaUrl} controls autoPlay playsInline className="story-media" />
            ) : (
              <img src={storyMediaUrl} alt="Story Preview" className="story-media" />
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
