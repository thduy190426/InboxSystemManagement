import { MessageCircle, User as UserIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AvatarFallback } from '../ui/AvatarFallback'
import type { ContactUser } from '../../types'

type FriendsTabProps = {
  friends: ContactUser[]
  isLoading?: boolean
  onSendMessage?: (friend: ContactUser) => void
  onViewFriendProfile?: (friend: ContactUser) => void
}

export function FriendsTab({
  friends,
  isLoading = false,
  onSendMessage,
  onViewFriendProfile,
}: FriendsTabProps) {
  const { t } = useTranslation('profile')

  if (isLoading) {
    return (
      <div className="profile-tab-content">
        <div className="empty-tab-state">
          <p>{t('loading', { defaultValue: 'Đang tải danh sách bạn bè...' })}</p>
        </div>
      </div>
    )
  }

  if (friends.length === 0) {
    return (
      <div className="profile-tab-content">
        <div className="empty-tab-state">
          <p>{t('noFriendsYet', { defaultValue: 'Chưa có bạn bè nào trong danh sách.' })}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-tab-content">
      <div className="friends-grid-layout">
        {friends.map((friend) => {
          const presence = friend.presence || 'offline'
          return (
            <div className="friend-profile-card" key={friend.id}>
              <div
                className="friend-card-left"
                onClick={() => onViewFriendProfile?.(friend)}
                style={{ cursor: onViewFriendProfile ? 'pointer' : 'default' }}
              >
                <div className="friend-card-avatar-wrap">
                  <AvatarFallback
                    className="friend-card-avatar"
                    name={friend.fullName}
                    src={friend.avatarUrl}
                  />
                  <span className={`cp-presence-dot cp-presence--${presence}`} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="friend-card-name">{friend.fullName}</div>
                  <div className="friend-card-sub">
                    {friend.handle ? `@${friend.handle}` : null}
                    {friend.mutualCount ? ` • ${friend.mutualCount} bạn chung` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {onSendMessage && (
                  <button
                    className="profile-btn profile-btn--secondary"
                    onClick={() => onSendMessage(friend)}
                    style={{ padding: '7px 12px' }}
                    title={t('messageBtn', { defaultValue: 'Nhắn tin' })}
                    type="button"
                  >
                    <MessageCircle size={15} />
                  </button>
                )}
                {onViewFriendProfile && (
                  <button
                    className="profile-btn profile-btn--ghost"
                    onClick={() => onViewFriendProfile(friend)}
                    style={{ padding: '7px 12px' }}
                    title={t('viewProfileBtn', { defaultValue: 'Xem trang cá nhân' })}
                    type="button"
                  >
                    <UserIcon size={15} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
