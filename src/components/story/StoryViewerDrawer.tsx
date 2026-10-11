import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Eye, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { storyApi } from '../../services/api/storyApi'
import { AvatarFallback } from '../ui/AvatarFallback'
import { MutualFriendsBadge } from '../ui/MutualFriendsBadge'
import { useTranslation } from 'react-i18next'
import type { StoryViewerItem } from '../../types'

type StoryViewerDrawerProps = {
  storyId: string
  isOpen: boolean
  onClose: () => void
  onDelete: () => void
  isDeleting?: boolean
}

export function StoryViewerDrawer({
  storyId,
  isOpen,
  onClose,
  onDelete,
  isDeleting = false,
}: StoryViewerDrawerProps) {
  const { t } = useTranslation('story')
  const [viewers, setViewers] = useState<StoryViewerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen && storyId) {
      loadViewers()
    }
  }, [isOpen, storyId])

  const loadViewers = async () => {
    setLoading(true)
    try {
      const res = await storyApi.getStoryViewers(storyId)
      if (res?.success && Array.isArray(res.data)) {
        setViewers(res.data)
      }
    } catch (err) {
      console.error('Failed to load story viewers:', err)
    } finally {
      setLoading(false)
    }
  }

  const reactionBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const v of viewers) {
      if (v.reaction) {
        counts[v.reaction] = (counts[v.reaction] || 0) + 1
      }
    }
    return counts
  }, [viewers])

  const tabs = useMemo(() => {
    const list = [
      { key: 'all', label: t('allTab'), count: viewers.length },
    ]
    for (const [emoji, count] of Object.entries(reactionBreakdown)) {
      list.push({ key: emoji, label: emoji, count })
    }
    return list
  }, [viewers.length, reactionBreakdown, t])

  const filteredViewers = useMemo(() => {
    if (activeTab === 'all') return viewers
    return viewers.filter(v => v.reaction === activeTab)
  }, [viewers, activeTab])

  if (!isOpen || !mounted || typeof document === 'undefined') return null

  return createPortal(
    <div className="story-analytics-drawer-overlay" onClick={onClose}>
      <div className="story-analytics-drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-drag-handle" />

        <header className="drawer-header">
          <h3>
            <Eye size={20} color="var(--primary)" />
            <span>{t('viewsCount', { count: viewers.length })}</span>
          </h3>
          <button className="story-action-icon-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </header>

        {tabs.length > 1 && (
          <div className="drawer-tabs">
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                className={`drawer-tab-btn ${activeTab === tab.key ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                <span style={{ opacity: 0.85, fontSize: '0.8rem' }}>({tab.count})</span>
              </button>
            ))}
          </div>
        )}

        <div className="drawer-viewers-list">
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 size={24} className="spin-animation" style={{ margin: '0 auto 8px' }} />
              <span>Đang tải danh sách người xem...</span>
            </div>
          ) : filteredViewers.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {t('noViewersYet')}
            </div>
          ) : (
            filteredViewers.map(viewer => (
              <div key={viewer.id} className="drawer-viewer-row">
                <div className="drawer-viewer-left">
                  <AvatarFallback name={viewer.full_name} src={viewer.avatar_url} />
                  <div className="drawer-viewer-name">
                    <strong>{viewer.display_name || viewer.full_name}</strong>
                    {Boolean(viewer.mutualCount && viewer.mutualCount > 0) && (
                      <MutualFriendsBadge
                        size="sm"
                        mutualCount={viewer.mutualCount}
                        mutualPreviews={viewer.mutualPreviews}
                        targetUserId={viewer.id}
                        targetName={viewer.display_name || viewer.full_name}
                      />
                    )}
                    <small>
                      {new Date(viewer.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(viewer.viewed_at).toLocaleDateString()}
                    </small>
                  </div>
                </div>

                {viewer.reaction && (
                  <div className="drawer-viewer-reaction" title={viewer.reaction}>
                    {viewer.reaction}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <footer className="drawer-footer">
          {showConfirmDelete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#ef4444' }}>
                <AlertTriangle size={16} />
                <span>Xác nhận xóa tin?</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="close-friend-toggle-btn is-inactive"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="drawer-delete-btn"
                  onClick={onDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 size={16} className="spin-animation" /> : <Trash2 size={16} />}
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="drawer-delete-btn"
              onClick={() => setShowConfirmDelete(true)}
            >
              <Trash2 size={16} />
              <span>{t('deleteStory')}</span>
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body
  )
}
