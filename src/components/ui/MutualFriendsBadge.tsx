import React from 'react'
import { useTranslation } from 'react-i18next'
import type { MutualFriendPreview } from '../../types'
import { AvatarFallback } from './AvatarFallback'

type MutualFriendsBadgeProps = {
  mutualCount?: number
  mutualPreviews?: MutualFriendPreview[]
  targetUserId: string | number
  targetName: string
  onOpenModal?: (targetUserId: string, targetName: string) => void
  size?: 'sm' | 'md'
  className?: string
}

export function MutualFriendsBadge({
  mutualCount = 0,
  mutualPreviews = [],
  targetUserId,
  targetName,
  onOpenModal,
  size = 'md',
  className = '',
}: MutualFriendsBadgeProps) {
  const { t } = useTranslation('panels')

  if (!mutualCount || mutualCount <= 0) {
    return null
  }

  const previews = mutualPreviews.slice(0, 3)
  const isClickable = Boolean(onOpenModal)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onOpenModal) {
      onOpenModal(String(targetUserId), targetName)
    }
  }

  return (
    <div
      className={`mf-badge mf-badge--${size} ${isClickable ? 'mf-badge--interactive' : ''} ${className}`.trim()}
      onClick={isClickable ? handleClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick(e as any)
              }
            }
          : undefined
      }
      title={t('viewMutualFriends', { defaultValue: 'Xem bạn chung' })}
    >
      {previews.length > 0 && (
        <div className="mf-avatar-stack" aria-hidden="true">
          {previews.map((friend, idx) => (
            <div
              key={friend.id || friend.userId || idx}
              className="mf-stack-avatar-wrap"
              style={{ zIndex: 3 - idx }}
            >
              <AvatarFallback
                className="mf-stack-avatar"
                name={friend.fullName}
                src={friend.avatarUrl}
              />
            </div>
          ))}
        </div>
      )}
      <span className="mf-count-label">
        {t('mutualFriendsCount', {
          count: mutualCount,
          defaultValue: `${mutualCount} bạn chung`,
        })}
      </span>
    </div>
  )
}
