import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight, Heart, Eye, Star, Volume2, VolumeX } from 'lucide-react'
import type { UserStoryGroup } from '../../types'
import { AvatarFallback } from '../ui/AvatarFallback'
import { storyApi } from '../../services/api/storyApi'
import { getStoredAuthSession } from '../../services/storage/authStorage'
import { useTranslation } from 'react-i18next'
import { StoryReactionSelector } from './StoryReactionSelector'
import { StoryViewerDrawer } from './StoryViewerDrawer'
import type { StoryStudioMetadata } from './StoryStudioEditor'
import { STORY_FILTERS } from './StoryFilterSelector'
import {
  InteractivePollWidget,
  InteractiveSliderWidget,
  InteractiveCountdownWidget,
} from './StoryInteractiveWidgets'

type StoryViewerOverlayProps = {
  initialGroup: UserStoryGroup
  allGroups: UserStoryGroup[]
  onClose: () => void
  onReply?: (userId: number, text: string, storyId?: string) => void
  onStoryDeleted?: (storyId: string) => void
  pushToast?: (text: string, tone?: 'info' | 'error') => void
  isClosing?: boolean
}

function parseStoryMetadata(textContent?: string | null): StoryStudioMetadata | null {
  if (!textContent) return null
  try {
    const data = JSON.parse(textContent)
    if (data && data.version === 2) return data
  } catch (e) {}
  return null
}

export function StoryViewerOverlay({
  initialGroup,
  allGroups,
  onClose,
  onReply,
  onStoryDeleted,
  pushToast,
  isClosing,
}: StoryViewerOverlayProps) {
  const currentUser = getStoredAuthSession()?.user
  const { t } = useTranslation('story')

  const [currentGroupIndex, setCurrentGroupIndex] = useState(() => {
    const idx = allGroups.findIndex(g => String(g.user_id) === String(initialGroup.user_id))
    return idx >= 0 ? idx : 0
  })
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showReactions, setShowReactions] = useState(false)
  const [reactions, setReactions] = useState<Record<string, string | null>>({})
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [mounted, setMounted] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const audioMusicRef = useRef<HTMLAudioElement | null>(null)
  const progressStartTimeRef = useRef<number>(Date.now())
  const elapsedBeforePauseRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const viewRecordedRef = useRef<Record<string, boolean>>({})

  const currentGroup = allGroups[currentGroupIndex]
  const currentItem = currentGroup?.items[currentItemIndex]
  const isAuthor = String(currentUser?.id) === String(currentGroup?.user_id)

  const currentReaction = currentItem ? (reactions[currentItem.id] ?? currentItem.my_reaction ?? null) : null

  // Phân tích metadata lớp phủ (nếu có)
  const storyMetadata = parseStoryMetadata(currentItem?.text_content)
  const currentFilterClass = storyMetadata?.filter
    ? STORY_FILTERS.find(f => f.id === storyMetadata.filter)?.className || 'story-filter-normal'
    : 'story-filter-normal'

  useEffect(() => {
    setMounted(true)
    return () => {
      setMounted(false)
      if (audioMusicRef.current) {
        audioMusicRef.current.pause()
        audioMusicRef.current.src = ''
      }
    }
  }, [])

  // Quản lý phát nhạc nền
  useEffect(() => {
    const musicUrl = storyMetadata?.music?.url

    if (!musicUrl || isDrawerOpen) {
      if (audioMusicRef.current) {
        audioMusicRef.current.pause()
        audioMusicRef.current.src = ''
      }
      return
    }

    if (!audioMusicRef.current) {
      audioMusicRef.current = new Audio()
    }

    audioMusicRef.current.src = musicUrl
    audioMusicRef.current.muted = isMuted
    audioMusicRef.current.loop = true

    if (!isPaused) {
      audioMusicRef.current.play().catch(e => console.warn('Story music playback error:', e))
    }

    return () => {
      if (audioMusicRef.current) {
        audioMusicRef.current.pause()
      }
    }
  }, [currentItem?.id, storyMetadata?.music?.url, isMuted, isDrawerOpen])

  // Đồng bộ tạm dừng/phát nhạc theo trạng thái pause của Story
  useEffect(() => {
    if (!audioMusicRef.current || !storyMetadata?.music?.url) return
    if (isPaused || isDrawerOpen) {
      audioMusicRef.current.pause()
    } else {
      audioMusicRef.current.play().catch(() => {})
    }
  }, [isPaused, isDrawerOpen, storyMetadata?.music?.url])

  // Preloading next media
  useEffect(() => {
    if (!currentGroup) return

    let nextItem = currentGroup.items[currentItemIndex + 1]
    if (!nextItem && currentGroupIndex < allGroups.length - 1) {
      nextItem = allGroups[currentGroupIndex + 1]?.items[0]
    }

    if (nextItem && nextItem.media_url) {
      if (nextItem.media_type === 'image') {
        const img = new Image()
        img.src = nextItem.media_url
      }
    }
  }, [currentGroupIndex, currentItemIndex, currentGroup, allGroups])

  // Record view after 800ms
  useEffect(() => {
    if (!currentItem || isAuthor || viewRecordedRef.current[currentItem.id]) return

    const timer = setTimeout(() => {
      viewRecordedRef.current[currentItem.id] = true
      storyApi.recordView(currentItem.id).catch(err => {
        console.warn('Failed to record story view:', err)
      })
    }, 800)

    return () => clearTimeout(timer)
  }, [currentItem?.id, isAuthor])

  const handleNext = useCallback(() => {
    if (!currentGroup) return
    if (currentItemIndex < currentGroup.items.length - 1) {
      setCurrentItemIndex(prev => prev + 1)
      setProgress(0)
      elapsedBeforePauseRef.current = 0
    } else if (currentGroupIndex < allGroups.length - 1) {
      setCurrentGroupIndex(prev => prev + 1)
      setCurrentItemIndex(0)
      setProgress(0)
      elapsedBeforePauseRef.current = 0
    } else {
      onClose()
    }
  }, [currentItemIndex, currentGroup, currentGroupIndex, allGroups.length, onClose])

  const handlePrev = useCallback(() => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1)
      setProgress(0)
      elapsedBeforePauseRef.current = 0
    } else if (currentGroupIndex > 0) {
      const prevGroup = allGroups[currentGroupIndex - 1]
      setCurrentGroupIndex(prev => prev - 1)
      setCurrentItemIndex(prevGroup.items.length - 1)
      setProgress(0)
      elapsedBeforePauseRef.current = 0
    }
  }, [currentItemIndex, currentGroupIndex, allGroups])

  // Progress animation ticker
  useEffect(() => {
    if (!currentItem || isPaused || isDrawerOpen) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause()
      }
      return
    }

    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(() => {})
    }

    const isVideo = currentItem.media_type === 'video'
    const duration = isVideo ? (videoRef.current?.duration ? videoRef.current.duration * 1000 : 15000) : 5000

    progressStartTimeRef.current = Date.now() - elapsedBeforePauseRef.current

    const tick = () => {
      const elapsed = Date.now() - progressStartTimeRef.current
      elapsedBeforePauseRef.current = elapsed

      if (elapsed >= duration) {
        setProgress(100)
        handleNext()
      } else {
        setProgress((elapsed / duration) * 100)
        animationFrameRef.current = requestAnimationFrame(tick)
      }
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [currentGroupIndex, currentItemIndex, currentItem, isPaused, isDrawerOpen, handleNext])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDrawerOpen) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === ' ') {
        e.preventDefault()
        setIsPaused(prev => !prev)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev, isDrawerOpen, onClose])

  const handlePointerDown = () => {
    setIsPaused(true)
  }

  const handlePointerUp = () => {
    setIsPaused(false)
  }

  const handleMediaAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width

    if (clickX < width * 0.35) {
      handlePrev()
    } else {
      handleNext()
    }
  }

  const handleReact = async (emoji: string) => {
    if (!currentItem) return
    const isRemoving = currentReaction === emoji
    const nextEmoji = isRemoving ? null : emoji

    // Optimistic UI update
    setReactions(prev => ({ ...prev, [currentItem.id]: nextEmoji }))
    setShowReactions(false)

    try {
      await storyApi.reactToStory(currentItem.id, emoji)
      if (pushToast) {
        pushToast(isRemoving ? 'Đã gỡ cảm xúc' : t('reactSent', { emoji }), 'info')
      }

      // Gửi vào tin nhắn trò chuyện 1-1 nếu tác giả là người khác và thả emoji mới
      if (!isRemoving && !isAuthor) {
        storyApi.replyToStory(currentItem.id, '', emoji).catch(err => {
          console.warn('Failed to bridge reaction to chat:', err)
        })
      }
    } catch (err) {
      console.error('Failed to react:', err)
      // Rollback
      setReactions(prev => ({ ...prev, [currentItem.id]: currentReaction }))
    }
  }

  const handleSendReply = async () => {
    if (!currentItem || !replyText.trim()) return
    const textToSend = replyText.trim()
    setReplyText('')

    try {
      if (onReply) {
        onReply(currentGroup.user_id, textToSend, currentItem.id)
      }
      await storyApi.replyToStory(currentItem.id, textToSend)
      if (pushToast) pushToast(t('replySent'), 'info')
    } catch (err: any) {
      console.error('Failed to send reply:', err)
      if (pushToast) pushToast(err?.message || 'Không thể gửi phản hồi', 'error')
    }
  }

  const handleDeleteStory = async () => {
    if (!currentItem) return
    setIsDeleting(true)
    try {
      await storyApi.deleteStory(currentItem.id)
      if (pushToast) pushToast(t('deleteStorySuccess'), 'info')
      if (onStoryDeleted) onStoryDeleted(currentItem.id)

      setIsDrawerOpen(false)
      // Chuyển sang story tiếp theo hoặc đóng viewer
      if (currentGroup.items.length > 1) {
        handleNext()
      } else {
        onClose()
      }
    } catch (err: any) {
      console.error('Failed to delete story:', err)
      if (pushToast) pushToast(err?.message || t('deleteStoryError'), 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!currentItem || !mounted || typeof document === 'undefined') return null

  const isCloseFriendStory = currentItem.is_close_friend || currentItem.privacy === 'close_friends'

  return createPortal(
    <div className={`story-viewer-overlay ${isClosing ? 'is-closing' : ''}`}>
      <div className="story-viewer-backdrop" onClick={onClose} />
      
      {/* Prev Navigation Button */}
      <button 
        className="story-nav-btn prev" 
        onClick={handlePrev}
        type="button"
        title="Quay lại"
      >
        <ChevronLeft size={32} />
      </button>

      <div className="story-viewer-content">
        {/* Progress Bars */}
        <div className="story-progress-container">
          {currentGroup.items.map((item, idx) => (
            <div key={item.id} className="story-progress-bar">
              <div 
                className="story-progress-fill" 
                style={{ 
                  width: idx < currentItemIndex ? '100%' : idx === currentItemIndex ? `${progress}%` : '0%',
                  background: isCloseFriendStory ? '#10b981' : '#ffffff'
                }} 
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <header className="story-viewer-header">
          <div className="story-user-info">
            <AvatarFallback name={currentGroup.full_name} src={currentGroup.avatar_url} />
            <div className="story-meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong>{currentGroup.display_name || currentGroup.full_name}</strong>
                {isCloseFriendStory && (
                  <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.78rem', fontWeight: 600 }}>
                    <Star size={12} fill="#10b981" />
                    <span>{t('closeFriends')}</span>
                  </span>
                )}
              </div>
              <small>{new Date(currentItem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Nút bật/tắt âm thanh (hỗ trợ cả video và nhạc nền) */}
            {(currentItem.media_type === 'video' || storyMetadata?.music) && (
              <button
                className="story-action-icon-btn"
                onClick={() => setIsMuted(prev => !prev)}
                type="button"
                style={{ color: '#fff' }}
                title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            )}
            <button className="story-close-btn" onClick={onClose} type="button">
              <X size={24} />
            </button>
          </div>
        </header>

        {/* Media Container with gestures */}
        <div 
          className="story-media-container"
          onClick={handleMediaAreaClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title={t('holdToPause')}
        >
          {/* Media Player with Filter */}
          {currentItem.media_type === 'video' ? (
            <video 
              ref={videoRef}
              src={currentItem.media_url} 
              autoPlay 
              playsInline 
              muted={isMuted}
              className={`story-media ${currentFilterClass}`} 
            />
          ) : (
            <img 
              src={currentItem.media_url} 
              alt="Story" 
              className={`story-media ${currentFilterClass}`} 
            />
          )}

          {/* Music badge if story has background music */}
          {storyMetadata?.music && (
            <div className="story-viewer-music-badge">
              <div className="story-spinning-disc" />
              <span>{storyMetadata.music.title}</span>
            </div>
          )}

          {/* Overlays Rendering (v2 JSON metadata) */}
          {storyMetadata?.overlays && storyMetadata.overlays.length > 0 ? (
            storyMetadata.overlays.map(item => {
              let background = 'transparent'
              let color = item.color || '#fff'

              if (item.bgColor === 'box') {
                background = 'rgba(0, 0, 0, 0.65)'
                if (item.color === '#000000') background = 'rgba(255, 255, 255, 0.75)'
              } else if (item.bgColor === 'solid') {
                background = item.color || '#fff'
                color = item.color === '#000000' ? '#fff' : '#000'
              }

              return (
                <div
                  key={item.id}
                  className="story-studio-overlay-item"
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    cursor: 'default',
                  }}
                >
                  {item.type === 'text' && (
                    <div
                      className={`story-text-overlay story-font-${item.font || 'modern'}`}
                      style={{ color, background }}
                    >
                      {item.text}
                    </div>
                  )}

                  {item.type === 'emoji' && (
                    <span className="story-sticker-overlay">{item.value}</span>
                  )}

                  {item.type === 'location' && (
                    <div className="story-location-tag">
                      <span style={{ color: '#ef4444' }}>📍</span>
                      <span>{item.text}</span>
                    </div>
                  )}

                  {item.type === 'hashtag' && (
                    <div className="story-hashtag-tag">
                      <span>{item.text}</span>
                    </div>
                  )}

                  {item.type === 'mention' && (
                    <div className="story-mention-tag">
                      <span>{item.text}</span>
                    </div>
                  )}

                  {item.type === 'poll' && item.pollData && (
                    <InteractivePollWidget
                      storyId={currentItem.id}
                      pollData={item.pollData}
                    />
                  )}

                  {item.type === 'slider' && item.sliderData && (
                    <InteractiveSliderWidget
                      storyId={currentItem.id}
                      sliderData={item.sliderData}
                    />
                  )}

                  {item.type === 'countdown' && item.countdownData && (
                    <InteractiveCountdownWidget
                      countdownData={item.countdownData}
                    />
                  )}
                </div>
              )
            })
          ) : (
            /* Fallback cho Story text thô cũ */
            currentItem.text_content && (
              <div className="story-text-overlay">
                {currentItem.text_content}
              </div>
            )
          )}
        </div>

        {/* Author Viewer Button */}
        {isAuthor && (
          <button 
            type="button"
            className="story-viewers-btn"
            onClick={() => setIsDrawerOpen(true)}
          >
            <Eye size={18} />
            <span>{currentItem.views_count ?? 0} {t('viewers')}</span>
          </button>
        )}

        {/* Footer for non-author */}
        {!isAuthor && (
          <footer className="story-viewer-footer">
            <input 
              type="text" 
              className="story-reply-input" 
              placeholder={t('replyPlaceholder')} 
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  handleSendReply()
                }
              }}
              onClick={e => e.stopPropagation()}
            />

            <div 
              className="story-reaction-wrapper"
              onClick={e => e.stopPropagation()}
            >
              <StoryReactionSelector
                isOpen={showReactions}
                currentReaction={currentReaction}
                onReact={handleReact}
              />

              <button 
                type="button"
                className="story-reaction-btn"
                onMouseEnter={() => setShowReactions(true)}
                onClick={() => {
                  if (currentReaction) {
                    handleReact(currentReaction)
                  } else {
                    handleReact('❤️')
                  }
                }}
                style={{
                  fontSize: currentReaction ? '24px' : 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: currentReaction ? 'inherit' : '#ffffff'
                }}
                title={currentReaction ? 'Gỡ cảm xúc' : 'Thả cảm xúc'}
              >
                {currentReaction ? <span>{currentReaction}</span> : <Heart size={24} />}
              </button>
            </div>
          </footer>
        )}
      </div>

      {/* Next Navigation Button */}
      <button 
        className="story-nav-btn next" 
        onClick={handleNext}
        type="button"
        title="Tiếp theo"
      >
        <ChevronRight size={32} />
      </button>

      {/* Author Analytics Drawer */}
      {isAuthor && (
        <StoryViewerDrawer
          storyId={currentItem.id}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onDelete={handleDeleteStory}
          isDeleting={isDeleting}
        />
      )}
    </div>,
    document.body
  )
}
