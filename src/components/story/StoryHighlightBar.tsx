import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Bookmark } from 'lucide-react'
import { storyApi } from '../../services/api/storyApi'
import type { StoryHighlightSummary, UserStoryGroup } from '../../types'
import { StoryHighlightModal } from './StoryHighlightModal'
import { StoryViewerOverlay } from './StoryViewerOverlay'
import { useTranslation } from 'react-i18next'

interface StoryHighlightBarProps {
  userId?: number
  isOwnProfile?: boolean
}

export function StoryHighlightBar({
  userId,
  isOwnProfile = true,
}: StoryHighlightBarProps) {
  const { t } = useTranslation('story')
  const [highlights, setHighlights] = useState<StoryHighlightSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeStoryGroup, setActiveStoryGroup] = useState<UserStoryGroup | null>(null)
  const [loadingHighlightId, setLoadingHighlightId] = useState<string | null>(null)

  const loadHighlights = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await storyApi.getHighlights(userId)
      if (res.success && res.data) {
        setHighlights(res.data)
      }
    } catch (err) {
      console.warn('[StoryHighlightBar] Error loading highlights:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadHighlights()
  }, [loadHighlights])

  const handleOpenHighlight = async (highlight: StoryHighlightSummary) => {
    setLoadingHighlightId(highlight.id)
    try {
      const res = await storyApi.getHighlightById(highlight.id)
      if (res.success && res.data?.storyGroup && res.data.storyGroup.items?.length > 0) {
        setActiveStoryGroup(res.data.storyGroup)
      }
    } catch (err) {
      console.warn('[StoryHighlightBar] Failed to play highlight:', err)
    } finally {
      setLoadingHighlightId(null)
    }
  }

  // If not own profile and no highlights, hide the bar completely
  if (!isOwnProfile && highlights.length === 0 && !isLoading) {
    return null
  }

  return (
    <div className="story-highlights-bar-container">
      <div className="story-highlights-bar">
        {/* Nút "+ Mới" cho chủ sở hữu profile */}
        {isOwnProfile && (
          <button
            type="button"
            className="story-highlight-bubble-wrap"
            onClick={() => setIsModalOpen(true)}
            title={t('addNewHighlight', { defaultValue: 'Thêm Tin nổi bật mới' })}
          >
            <div className="story-highlight-add-ring">
              <Plus size={24} />
            </div>
            <span className="story-highlight-title">
              {t('newHighlight', { defaultValue: 'Mới' })}
            </span>
          </button>
        )}

        {/* Danh sách highlights */}
        {highlights.map(hl => {
          const isLoadingThis = loadingHighlightId === hl.id
          return (
            <button
              key={hl.id}
              type="button"
              className="story-highlight-bubble-wrap"
              onClick={() => handleOpenHighlight(hl)}
              disabled={isLoadingThis}
              title={`${hl.title} (${hl.story_count} ${t('storiesCount', { defaultValue: 'tin' })})`}
            >
              <div className="story-highlight-ring">
                {isLoadingThis ? (
                  <div className="story-highlight-icon-fallback">
                    <Loader2 size={20} className="story-spinner" />
                  </div>
                ) : hl.cover_url ? (
                  <img
                    src={hl.cover_url}
                    alt={hl.title}
                    className="story-highlight-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="story-highlight-icon-fallback">
                    <Bookmark size={20} />
                  </div>
                )}
              </div>
              <span className="story-highlight-title">{hl.title}</span>
            </button>
          )
        })}

        {isLoading && highlights.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 8px', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>
            <Loader2 size={16} className="story-spinner" />
            <span>{t('loadingHighlights', { defaultValue: 'Đang tải tin nổi bật...' })}</span>
          </div>
        )}
      </div>

      {/* Modal tạo Highlight mới */}
      <StoryHighlightModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadHighlights}
      />

      {/* Viewer Overlay xem phát lại highlight */}
      {activeStoryGroup && (
        <StoryViewerOverlay
          initialGroup={activeStoryGroup}
          allGroups={[activeStoryGroup]}
          onClose={() => setActiveStoryGroup(null)}
        />
      )}
    </div>
  )
}
