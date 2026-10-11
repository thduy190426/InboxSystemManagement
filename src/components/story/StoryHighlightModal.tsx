import { useState, useEffect } from 'react'
import { X, Sparkles, Check, Image as ImageIcon, Loader2 } from 'lucide-react'
import { storyApi } from '../../services/api/storyApi'
import type { Story } from '../../types'
import { useTranslation } from 'react-i18next'

interface StoryHighlightModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function StoryHighlightModal({
  isOpen,
  onClose,
  onSuccess,
}: StoryHighlightModalProps) {
  const { t } = useTranslation('story')
  const [title, setTitle] = useState('')
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([])
  const [selectedCoverUrl, setSelectedCoverUrl] = useState<string | null>(null)
  const [archiveStories, setArchiveStories] = useState<Story[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setTitle('')
    setSelectedStoryIds([])
    setSelectedCoverUrl(null)
    setErrorMsg(null)
    setIsLoading(true)

    storyApi.getStoryArchive()
      .then(res => {
        if (res.success && res.data) {
          setArchiveStories(res.data)
        }
      })
      .catch(err => {
        console.warn('[StoryHighlightModal] Error loading archive:', err)
        setErrorMsg(t('loadArchiveError', { defaultValue: 'Không thể tải kho lưu trữ story.' }))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isOpen])

  if (!isOpen) return null

  const handleToggleStory = (story: Story) => {
    const isSelected = selectedStoryIds.includes(story.id)
    if (isSelected) {
      const next = selectedStoryIds.filter(id => id !== story.id)
      setSelectedStoryIds(next)
      if (selectedCoverUrl === story.media_url) {
        const remainingStory = archiveStories.find(s => next.includes(s.id))
        setSelectedCoverUrl(remainingStory ? remainingStory.media_url : null)
      }
    } else {
      const next = [...selectedStoryIds, story.id]
      setSelectedStoryIds(next)
      if (!selectedCoverUrl) {
        setSelectedCoverUrl(story.media_url || null)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle || selectedStoryIds.length === 0) return

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await storyApi.createHighlight({
        title: cleanTitle,
        coverUrl: selectedCoverUrl || undefined,
        storyIds: selectedStoryIds,
      })

      if (res.success) {
        onSuccess()
        onClose()
      } else {
        setErrorMsg((res as any).message || 'Không thể tạo Tin nổi bật.')
      }
    } catch (err: any) {
      console.warn('[StoryHighlightModal] Create error:', err)
      setErrorMsg(err.message || 'Lỗi kết nối khi tạo Tin nổi bật.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return `${d.getDate()}/${d.getMonth() + 1}`
    } catch {
      return ''
    }
  }

  return (
    <div className="story-highlight-modal-backdrop" onClick={onClose}>
      <div
        className="story-highlight-modal-dialog"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="highlight-modal-title"
      >
        {/* Header */}
        <div className="story-highlight-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#ec4899" />
            <h3 id="highlight-modal-title">
              {t('createHighlightTitle', { defaultValue: 'Tạo Tin Nổi Bật Mới' })}
            </h3>
          </div>
          <button
            type="button"
            className="story-camera-circle-btn"
            style={{ width: '32px', height: '32px' }}
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="story-highlight-modal-body">
            {errorMsg && (
              <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', color: '#fca5a5', fontSize: '0.85rem' }}>
                {errorMsg}
              </div>
            )}

            {/* Input Name & Cover preview */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: selectedCoverUrl ? `url(${selectedCoverUrl}) center / cover no-repeat` : 'rgba(255, 255, 255, 0.08)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {!selectedCoverUrl && <ImageIcon size={22} color="rgba(255,255,255,0.4)" />}
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>
                  {t('highlightNameLabel', { defaultValue: 'Tên Tin nổi bật:' })}
                </label>
                <input
                  type="text"
                  className="cp-input"
                  placeholder={t('highlightNamePlaceholder', { defaultValue: 'Nhập tên bộ sưu tập (ví dụ: Du lịch, Kỷ niệm)...' })}
                  value={title}
                  maxLength={30}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Stories from Archive */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                  {t('selectArchivedStories', { defaultValue: 'Chọn Story từ kho lưu trữ:' })}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                  {selectedStoryIds.length} {t('selected', { defaultValue: 'đã chọn' })}
                </span>
              </div>

              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '36px', gap: '8px', color: 'rgba(255,255,255,0.6)' }}>
                  <Loader2 size={20} className="story-spinner" />
                  <span>{t('loadingArchive', { defaultValue: 'Đang tải tin lưu trữ...' })}</span>
                </div>
              ) : archiveStories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem' }}>
                  {t('noArchivedStories', { defaultValue: 'Bạn chưa có tin nào trong kho lưu trữ để tạo Tin nổi bật.' })}
                </div>
              ) : (
                <div className="story-archive-picker-grid">
                  {archiveStories.map(story => {
                    const isSelected = selectedStoryIds.includes(story.id)
                    const thumb = story.media_url
                    return (
                      <div
                        key={story.id}
                        className={`story-archive-card ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => handleToggleStory(story)}
                      >
                        {story.media_type === 'video' ? (
                          <video
                            src={story.media_url}
                            className="story-archive-thumb"
                            muted
                            playsInline
                          />
                        ) : thumb ? (
                          <img
                            src={thumb}
                            alt="Story thumbnail"
                            className="story-archive-thumb"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="story-archive-thumb"
                            style={{
                              background: '#6366f1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '8px',
                              color: '#fff',
                              fontSize: '0.72rem',
                              textAlign: 'center',
                            }}
                          >
                            {story.text_content ? story.text_content.slice(0, 30) : 'Story'}
                          </div>
                        )}

                        <div className="story-archive-check">
                          <Check size={14} />
                        </div>

                        <span className="story-archive-date">
                          {formatDate(story.created_at)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="story-highlight-modal-footer">
            <button
              type="button"
              className="cp-btn cp-btn--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('cancel', { defaultValue: 'Hủy' })}
            </button>
            <button
              type="submit"
              className="cp-btn cp-btn--primary"
              disabled={isSubmitting || !title.trim() || selectedStoryIds.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isSubmitting && <Loader2 size={15} className="story-spinner" />}
              <span>{t('createHighlightAction', { defaultValue: 'Tạo Tin Nổi Bật' })}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
