import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Search, Users, MessageCircle, IdCard, Loader2 } from 'lucide-react'
import { fetchMutualFriends } from '../../services/api/contactApi'
import type { ContactUser, MutualFriendDetail } from '../../types'
import { AvatarFallback } from './AvatarFallback'

type MutualFriendsModalProps = {
  targetUserId: string | null
  targetName: string
  isOpen: boolean
  onClose: () => void
  onMessage?: (user: ContactUser) => void
  onProfile?: (user: ContactUser) => void
}

// Client-side cache to avoid redundant requests during active session (TTL 2 minutes)
const mutualCache = new Map<string, { data: MutualFriendDetail[]; timestamp: number }>()
const CACHE_TTL = 2 * 60 * 1000

export function clearMutualFriendsCache() {
  mutualCache.clear()
}

export function MutualFriendsModal({
  targetUserId,
  targetName,
  isOpen,
  onClose,
  onMessage,
  onProfile,
}: MutualFriendsModalProps) {
  const { t } = useTranslation('panels')
  const [friends, setFriends] = useState<MutualFriendDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!isOpen || !targetUserId) {
      setQuery('')
      return
    }

    const cached = mutualCache.get(targetUserId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setFriends(cached.data)
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)

    fetchMutualFriends(targetUserId)
      .then((res) => {
        if (isMounted) {
          const list = res?.mutualFriends || []
          setFriends(list)
          mutualCache.set(targetUserId, { data: list, timestamp: Date.now() })
        }
      })
      .catch((err) => {
        console.error('Failed to load mutual friends:', err)
        if (isMounted) setFriends([])
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, targetUserId])

  // Keyboard navigation: Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return friends
    return friends.filter(
      (f) =>
        f.fullName.toLowerCase().includes(q) ||
        (f.handle && f.handle.toLowerCase().includes(q)),
    )
  }, [friends, query])

  if (!isOpen) return null

  const handleUserMessage = (friend: MutualFriendDetail) => {
    if (onMessage) {
      const contactUser: ContactUser = {
        id: friend.id,
        userId: friend.userId,
        fullName: friend.fullName,
        handle: friend.handle,
        email: '',
        phone: null,
        avatarUrl: friend.avatarUrl,
        bio: friend.bio || null,
        statusMessage: friend.statusMessage || null,
        presence: friend.presence,
        friendshipStatus: 'accepted',
        requestDirection: null,
        contactId: null,
      }
      onClose()
      onMessage(contactUser)
    }
  }

  const handleUserProfile = (friend: MutualFriendDetail) => {
    if (onProfile) {
      const contactUser: ContactUser = {
        id: friend.id,
        userId: friend.userId,
        fullName: friend.fullName,
        handle: friend.handle,
        email: '',
        phone: null,
        avatarUrl: friend.avatarUrl,
        bio: friend.bio || null,
        statusMessage: friend.statusMessage || null,
        presence: friend.presence,
        friendshipStatus: 'accepted',
        requestDirection: null,
        contactId: null,
      }
      onClose()
      onProfile(contactUser)
    }
  }

  return (
    <div
      className="mf-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        aria-modal="true"
        aria-labelledby="mf-dialog-title"
        className="mf-dialog"
        role="dialog"
      >
        <header className="mf-dialog-header">
          <div className="mf-dialog-title-wrap">
            <span className="mf-dialog-icon">
              <Users size={18} />
            </span>
            <div>
              <h2 id="mf-dialog-title" className="mf-dialog-title">
                {t('mutualFriendsModalTitle', {
                  name: targetName,
                  defaultValue: `Bạn chung với ${targetName}`,
                })}
              </h2>
              <span className="mf-dialog-count">
                {t('mutualFriendsTotal', {
                  count: friends.length,
                  defaultValue: `${friends.length} người bạn chung`,
                })}
              </span>
            </div>
          </div>
          <button
            className="mf-close-btn"
            onClick={onClose}
            title={t('closeBtn', { defaultValue: 'Đóng' })}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        {friends.length > 5 && (
          <div className="mf-search-bar">
            <Search size={15} className="mf-search-icon" />
            <input
              type="text"
              className="mf-search-input"
              placeholder={t('searchMutualFriendsPlaceholder', {
                defaultValue: 'Tìm kiếm bạn chung...',
              })}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="mf-search-clear"
                onClick={() => setQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        <div className="mf-dialog-body">
          {loading ? (
            <div className="mf-loading-state">
              <Loader2 size={24} className="mf-spinner" />
              <span>{t('loadingMutualFriends', { defaultValue: 'Đang tải danh sách bạn chung...' })}</span>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="mf-empty-state">
              <Users size={36} className="mf-empty-icon" />
              <span>
                {query
                  ? t('noMutualFriendsFound', { defaultValue: 'Không tìm thấy bạn chung nào' })
                  : t('noMutualFriends', { defaultValue: 'Không có bạn chung nào' })}
              </span>
            </div>
          ) : (
            <ul className="mf-list">
              {filteredFriends.map((friend) => {
                const presenceClass = `cp-presence--${friend.presence || 'offline'}`
                return (
                  <li key={friend.id || friend.userId} className="mf-item">
                    <div className="mf-item-avatar-wrap">
                      <AvatarFallback
                        className="mf-item-avatar"
                        name={friend.fullName}
                        src={friend.avatarUrl}
                      />
                      <span className={`cp-presence-dot ${presenceClass}`} />
                    </div>

                    <div className="mf-item-info">
                      <strong className="mf-item-name">{friend.fullName}</strong>
                      {friend.handle && (
                        <span className="mf-item-handle">@{friend.handle}</span>
                      )}
                    </div>

                    <div className="mf-item-actions">
                      {onProfile && (
                        <button
                          type="button"
                          className="mf-action-btn mf-action-btn--ghost"
                          onClick={() => handleUserProfile(friend)}
                          title={t('profileBtn', { defaultValue: 'Hồ sơ' })}
                        >
                          <IdCard size={15} />
                        </button>
                      )}
                      {onMessage && (
                        <button
                          type="button"
                          className="mf-action-btn mf-action-btn--primary"
                          onClick={() => handleUserMessage(friend)}
                          title={t('messageBtn', { defaultValue: 'Nhắn tin' })}
                        >
                          <MessageCircle size={15} />
                          <span>{t('messageBtn', { defaultValue: 'Nhắn tin' })}</span>
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
