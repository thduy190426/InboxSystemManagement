import type { ChangeEvent } from 'react'
import { useRef } from 'react'
import {
  Camera,
  Edit3,
  MessageCircle,
  UserPlus,
  UserCheck,
  UserX,
  Shield,
  Users,
  FileText,
  Heart,
  Sparkles,
  Bookmark,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AvatarFallback } from '../ui/AvatarFallback'
import { StoryHighlightBar } from '../story/StoryHighlightBar'
import type { AuthUser } from '../../services/api/authApi'
import type { ContactUser } from '../../types'

type ProfileHeaderProps = {
  user: AuthUser | ContactUser
  isOwnProfile: boolean
  stats: {
    postsCount: number
    friendsCount: number
    followersCount: number
    followingCount: number
  }
  isFollowing?: boolean
  friendshipStatus?: string
  isFollowLoading?: boolean
  isFriendLoading?: boolean
  onEditProfile?: () => void
  onFollowToggle?: () => void
  onFriendAction?: () => void
  onSendMessage?: () => void
  onAvatarChange?: (file: File) => void
  isAvatarUploading?: boolean
  onStatClick?: (targetTab: string) => void
}

export function ProfileHeader({
  user,
  isOwnProfile,
  stats,
  isFollowing = false,
  friendshipStatus = 'none',
  isFollowLoading = false,
  isFriendLoading = false,
  onEditProfile,
  onFollowToggle,
  onFriendAction,
  onSendMessage,
  onAvatarChange,
  isAvatarUploading = false,
  onStatClick,
}: ProfileHeaderProps) {
  const { t } = useTranslation('profile')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const displayName =
    ('displayName' in user && user.displayName) || user.fullName || t('defaultUser')
  const handle = user.handle ? `@${user.handle}` : null
  const role = 'role' in user ? user.role : null
  const presence = user.presence || 'offline'
  const statusMessage = user.statusMessage || null
  const statusEmoji = 'statusEmoji' in user && user.statusEmoji ? user.statusEmoji : '💬'

  function handleAvatarInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file && onAvatarChange) {
      onAvatarChange(file)
    }
    event.target.value = ''
  }

  const renderFriendButton = () => {
    if (isOwnProfile) return null

    let icon = <UserPlus size={15} />
    let label = t('friendAdd', { defaultValue: 'Thêm bạn bè' })
    let btnClass = 'profile-btn profile-btn--secondary'

    if (friendshipStatus === 'accepted') {
      icon = <UserCheck size={15} />
      label = t('friendStatus', { defaultValue: 'Bạn bè' })
      btnClass = 'profile-btn profile-btn--ghost'
    } else if (friendshipStatus === 'pending') {
      icon = <UserX size={15} />
      label = t('friendCancel', { defaultValue: 'Hủy lời mời' })
      btnClass = 'profile-btn profile-btn--ghost'
    }

    return (
      <button
        className={btnClass}
        disabled={isFriendLoading}
        onClick={onFriendAction}
        type="button"
      >
        {icon}
        <span>{label}</span>
      </button>
    )
  }

  return (
    <div className="profile-header-card">
      <div className="profile-header-top">
        <div className="profile-avatar-container">
          <div className="profile-avatar-frame">
            <AvatarFallback
              className="profile-avatar-large"
              name={displayName}
              src={user.avatarUrl}
            />
            <span className={`profile-presence-indicator cp-presence--${presence}`} />
            {isOwnProfile && (
              <>
                <input
                  accept="image/*"
                  className="sr-only"
                  disabled={isAvatarUploading}
                  onChange={handleAvatarInput}
                  ref={avatarInputRef}
                  style={{ display: 'none' }}
                  type="file"
                />
                <button
                  className="profile-avatar-upload-btn"
                  disabled={isAvatarUploading}
                  onClick={() => avatarInputRef.current?.click()}
                  title={t('changeAvatar', { defaultValue: 'Đổi ảnh đại diện' })}
                  type="button"
                >
                  <Camera size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="profile-user-summary">
          <div className="profile-names-row">
            <h1 className="profile-display-name">{displayName}</h1>
            {role && (
              <span className={`profile-header-role-badge pp-role-badge--${role.toLowerCase()}`}>
                <Shield size={11} />
                <span>{role.toUpperCase()}</span>
              </span>
            )}
          </div>

          {handle && <span className="profile-handle-tag">{handle}</span>}

          {statusMessage && (
            <div className="profile-status-bubble">
              <span className="profile-status-emoji">{statusEmoji}</span>
              <span className="profile-status-text">{statusMessage}</span>
            </div>
          )}

          {user.bio && <p className="profile-bio-text">{user.bio}</p>}
        </div>

        <div className="profile-actions-toolbar">
          {isOwnProfile ? (
            <button
              className="profile-btn profile-btn--primary"
              onClick={onEditProfile}
              type="button"
            >
              <Edit3 size={15} />
              <span>{t('editProfile', { defaultValue: 'Chỉnh sửa hồ sơ' })}</span>
            </button>
          ) : (
            <>
              {onSendMessage && (
                <button
                  className="profile-btn profile-btn--primary"
                  onClick={onSendMessage}
                  type="button"
                >
                  <MessageCircle size={15} />
                  <span>{t('messageBtn', { defaultValue: 'Nhắn tin' })}</span>
                </button>
              )}

              {renderFriendButton()}

              <button
                className={`profile-btn ${isFollowing ? 'profile-btn--following' : 'profile-btn--accent'}`}
                disabled={isFollowLoading}
                onClick={onFollowToggle}
                type="button"
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={15} />
                    <span>{t('followingBtn', { defaultValue: 'Đang theo dõi' })}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>{t('followBtn', { defaultValue: 'Theo dõi' })}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="profile-stats-bar">
        <button
          className="profile-stat-item"
          onClick={() => onStatClick?.('timeline')}
          type="button"
        >
          <span className="profile-stat-icon"><FileText size={16} /></span>
          <strong className="profile-stat-number">{stats.postsCount}</strong>
          <span className="profile-stat-label">{t('statPosts', { defaultValue: 'Bài viết' })}</span>
        </button>

        <button
          className="profile-stat-item"
          onClick={() => onStatClick?.('friends')}
          type="button"
        >
          <span className="profile-stat-icon"><Users size={16} /></span>
          <strong className="profile-stat-number">{stats.friendsCount}</strong>
          <span className="profile-stat-label">{t('statFriends', { defaultValue: 'Bạn bè' })}</span>
        </button>

        <button
          className="profile-stat-item"
          onClick={() => onStatClick?.('followers')}
          type="button"
        >
          <span className="profile-stat-icon"><Heart size={16} /></span>
          <strong className="profile-stat-number">{stats.followersCount}</strong>
          <span className="profile-stat-label">{t('statFollowers', { defaultValue: 'Người theo dõi' })}</span>
        </button>

        <button
          className="profile-stat-item"
          onClick={() => onStatClick?.('followers')}
          type="button"
        >
          <span className="profile-stat-icon"><Sparkles size={16} /></span>
          <strong className="profile-stat-number">{stats.followingCount}</strong>
          <span className="profile-stat-label">{t('statFollowing', { defaultValue: 'Đang theo dõi' })}</span>
        </button>
      </div>

      <div className="profile-highlights-wrapper">
        <div className="profile-highlights-label">
          <Bookmark size={13} />
          <span>{t('highlightsTitle', { defaultValue: 'Tin nổi bật' })}</span>
        </div>
        <StoryHighlightBar
          isOwnProfile={isOwnProfile}
          userId={Number(user.id)}
        />
      </div>
    </div>
  )
}
