import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Star, Search, Check, Plus, Loader2 } from 'lucide-react'
import { fetchFriends } from '../../services/api/contactApi'
import { storyApi } from '../../services/api/storyApi'
import { AvatarFallback } from '../ui/AvatarFallback'
import { useTranslation } from 'react-i18next'
import type { ContactUser } from '../../types'

type CloseFriendsModalProps = {
  onClose: () => void
  pushToast?: (text: string, tone?: 'info' | 'error') => void
}

export function CloseFriendsModal({ onClose, pushToast }: CloseFriendsModalProps) {
  const { t } = useTranslation('story')
  const [friends, setFriends] = useState<ContactUser[]>([])
  const [closeFriendIds, setCloseFriendIds] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadData()
    return () => setMounted(false)
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [friendsList, closeFriendsRes] = await Promise.all([
        fetchFriends(),
        storyApi.getCloseFriends(),
      ])
      setFriends(friendsList || [])
      if (closeFriendsRes?.success && Array.isArray(closeFriendsRes.data)) {
        setCloseFriendIds(new Set(closeFriendsRes.data.map(f => Number(f.id))))
      }
    } catch (err) {
      console.error('Failed to load close friends data:', err)
      if (pushToast) pushToast(t('postError'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (friendId: number) => {
    setTogglingId(friendId)
    const wasCloseFriend = closeFriendIds.has(friendId)
    setCloseFriendIds(prev => {
      const next = new Set(prev)
      if (wasCloseFriend) {
        next.delete(friendId)
      } else {
        next.add(friendId)
      }
      return next
    })

    try {
      const res = await storyApi.toggleCloseFriend(friendId)
      if (res?.success) {
        if (pushToast) {
          pushToast(res.isCloseFriend ? t('addedCloseFriend') : t('removedCloseFriend'), 'info')
        }
      }
    } catch (err) {
      console.error('Failed to toggle close friend:', err)
      setCloseFriendIds(prev => {
        const next = new Set(prev)
        if (wasCloseFriend) next.add(friendId)
        else next.delete(friendId)
        return next
      })
      if (pushToast) pushToast(t('toggleCloseFriendErr'), 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const filteredFriends = friends.filter(friend => {
    const name = (friend.nickname || friend.fullName || '').toLowerCase()
    return name.includes(searchTerm.toLowerCase().trim())
  })

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div className="close-friends-overlay" onClick={onClose}>
      <div className="close-friends-modal" onClick={e => e.stopPropagation()}>
        <header className="close-friends-header">
          <h3>
            <Star size={20} fill="#10b981" color="#10b981" />
            {t('manageCloseFriends')}
          </h3>
          <button className="story-action-icon-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </header>

        <p className="close-friends-desc">
          {t('closeFriendsDesc')}
        </p>

        <div className="close-friends-search-wrap" style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '32px', top: '22px', color: '#94a3b8' }} />
          <input
            type="text"
            className="close-friends-search-input"
            placeholder={t('searchFriendsPlaceholder')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="close-friends-list">
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 size={24} className="spin-animation" style={{ margin: '0 auto 8px' }} />
              <span>Đang tải danh sách...</span>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {t('noFriendsFound')}
            </div>
          ) : (
            filteredFriends.map(friend => {
              const numId = Number(friend.userId || friend.id)
              const isCloseFriend = closeFriendIds.has(numId)
              const isToggling = togglingId === numId

              return (
                <div key={friend.id} className="close-friends-row" onClick={() => handleToggle(numId)}>
                  <div className="close-friend-user-info">
                    <AvatarFallback name={friend.fullName} src={friend.avatarUrl || ''} />
                    <div className="close-friend-name">
                      <strong>{friend.nickname || friend.fullName}</strong>
                      <small>@{friend.handle || friend.email}</small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`close-friend-toggle-btn ${isCloseFriend ? 'is-active' : 'is-inactive'}`}
                    disabled={isToggling}
                    onClick={e => {
                      e.stopPropagation()
                      handleToggle(numId)
                    }}
                  >
                    {isToggling ? (
                      <Loader2 size={14} className="spin-animation" />
                    ) : isCloseFriend ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> {t('closeFriends')}
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Plus size={14} /> Thêm
                      </span>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
