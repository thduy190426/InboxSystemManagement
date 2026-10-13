import { useState } from 'react'
import { Sparkles, UserCheck, Heart, User as UserIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AvatarFallback } from '../ui/AvatarFallback'
import type { ContactUser } from '../../types'

type FollowersTabProps = {
  followers: ContactUser[]
  following: ContactUser[]
  isLoading?: boolean
  onToggleFollow?: (user: ContactUser) => Promise<void> | void
  onViewUserProfile?: (user: ContactUser) => void
}

export function FollowersTab({
  followers,
  following,
  isLoading = false,
  onToggleFollow,
  onViewUserProfile,
}: FollowersTabProps) {
  const { t } = useTranslation('profile')
  const [subTab, setSubTab] = useState<'followers' | 'following'>('followers')

  if (isLoading) {
    return (
      <div className="profile-tab-content">
        <div className="empty-tab-state">
          <p>{t('loading', { defaultValue: 'Đang tải danh sách...' })}</p>
        </div>
      </div>
    )
  }

  const activeList = subTab === 'followers' ? followers : following

  return (
    <div className="profile-tab-content followers-tab-shell">
      {/* Subtab Bar */}
      <div className="followers-subtab-bar">
        <button
          className={`followers-subtab-btn${subTab === 'followers' ? ' followers-subtab-btn--active' : ''}`}
          onClick={() => setSubTab('followers')}
          type="button"
        >
          <Heart size={14} />
          <span>
            {t('statFollowers', { defaultValue: 'Người theo dõi' })} ({followers.length})
          </span>
        </button>

        <button
          className={`followers-subtab-btn${subTab === 'following' ? ' followers-subtab-btn--active' : ''}`}
          onClick={() => setSubTab('following')}
          type="button"
        >
          <Sparkles size={14} />
          <span>
            {t('statFollowing', { defaultValue: 'Đang theo dõi' })} ({following.length})
          </span>
        </button>
      </div>

      {/* Content List */}
      {activeList.length === 0 ? (
        <div className="empty-tab-state">
          <p>
            {subTab === 'followers'
              ? t('noFollowersYet', { defaultValue: 'Chưa có người theo dõi nào.' })
              : t('noFollowingYet', { defaultValue: 'Chưa theo dõi người dùng nào.' })}
          </p>
        </div>
      ) : (
        <div className="friends-grid-layout">
          {activeList.map((item) => (
            <div className="friend-profile-card" key={item.id}>
              <div
                className="friend-card-left"
                onClick={() => onViewUserProfile?.(item)}
                style={{ cursor: onViewUserProfile ? 'pointer' : 'default' }}
              >
                <AvatarFallback
                  className="friend-card-avatar"
                  name={item.fullName}
                  src={item.avatarUrl}
                />
                <div style={{ minWidth: 0 }}>
                  <div className="friend-card-name">{item.fullName}</div>
                  <div className="friend-card-sub">
                    {item.handle ? `@${item.handle}` : null}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {onViewUserProfile && (
                  <button
                    className="profile-btn profile-btn--ghost"
                    onClick={() => onViewUserProfile(item)}
                    style={{ padding: '7px 10px' }}
                    title={t('viewProfileBtn', { defaultValue: 'Xem trang cá nhân' })}
                    type="button"
                  >
                    <UserIcon size={14} />
                  </button>
                )}

                {onToggleFollow && (
                  <button
                    className={`profile-btn ${subTab === 'following' ? 'profile-btn--following' : 'profile-btn--accent'}`}
                    onClick={() => onToggleFollow(item)}
                    style={{ padding: '7px 12px', fontSize: '12px' }}
                    type="button"
                  >
                    {subTab === 'following' ? (
                      <>
                        <UserCheck size={13} />
                        <span>{t('followingBtn', { defaultValue: 'Đang theo dõi' })}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>{t('followBtn', { defaultValue: 'Theo dõi' })}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
