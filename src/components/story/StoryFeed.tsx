import { useEffect, useState } from 'react'
import { Plus, Star } from 'lucide-react'
import { AvatarFallback } from '../ui/AvatarFallback'
import { storyApi } from '../../services/api/storyApi'
import type { UserStoryGroup } from '../../types'
import { getRealtimeSocket } from '../../services/realtime/realtime'
import { getStoredAuthSession } from '../../services/storage/authStorage'
import { useTranslation } from 'react-i18next'
import { FeatureBadge } from '../ui/FeatureBadge'
import { CloseFriendsModal } from './CloseFriendsModal'

type StoryFeedProps = {
  onCreateClick: () => void
  onStoryClick: (group: UserStoryGroup, allGroups: UserStoryGroup[]) => void
  pushToast?: (text: string, tone?: 'info' | 'error') => void
}

export function StoryFeed({ onCreateClick, onStoryClick, pushToast }: StoryFeedProps) {
  const user = getStoredAuthSession()?.user
  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([])
  const [showCloseFriendsModal, setShowCloseFriendsModal] = useState(false)
  const { t } = useTranslation('story')

  useEffect(() => {
    loadStories()
  }, [])

  useEffect(() => {
    const socket = getRealtimeSocket()
    if (!socket) return

    const handleStoryCreated = (newStory?: any) => {
      if (newStory && String(newStory.user_id) !== String(user?.id) && newStory.media_type === 'video') {
        const authorName = newStory.user?.display_name || newStory.user?.full_name || t('friend')
        if (pushToast) {
          pushToast(t('newVideoToast', { author: authorName }), 'info')
        }
        import('../../services/core/browserNotifications').then(({ showBrowserNotification }) => {
          showBrowserNotification(t('notificationTitle'), {
            body: t('newVideoNotification', { author: authorName })
          })
        }).catch(err => console.error(err))
      }
      loadStories()
    }

    const handleStoryDeleted = () => {
      loadStories()
    }

    socket.on('story:created', handleStoryCreated)
    socket.on('story:deleted', handleStoryDeleted)

    return () => {
      socket.off('story:created', handleStoryCreated)
      socket.off('story:deleted', handleStoryDeleted)
    }
  }, [user?.id, t, pushToast])

  async function loadStories() {
    try {
      const res = await storyApi.getActiveStories()
      if (res?.success && Array.isArray(res.data)) {
        setStoryGroups(res.data)
      }
    } catch (err) {
      console.error('Failed to load stories', err)
    }
  }

  const myStoryGroup = storyGroups.find(g => String(g.user_id) === String(user?.id) && Array.isArray(g.items) && g.items.length > 0)
  const otherStoryGroups = storyGroups.filter(g => String(g.user_id) !== String(user?.id) && Array.isArray(g.items) && g.items.length > 0)

  return (
    <div className="story-feed" data-tour="story-feed">
      <div className="story-feed-scroll">
        {}
        <button 
          className={`story-circle create-story ${myStoryGroup ? 'has-story' : ''}`}
          data-tour="create-story-btn"
          onClick={() => {
            if (myStoryGroup) {
              onStoryClick(myStoryGroup, storyGroups)
            } else {
              onCreateClick()
            }
          }}
          type="button"
          title={myStoryGroup ? t('yourStory') : t('createStory')}
        >
          <div className="story-avatar-wrap">
            <AvatarFallback name={user?.fullName || t('yourStory')} src={user?.avatarUrl || ''} />
            {!myStoryGroup && (
              <span className="create-story-badge">
                <Plus size={12} />
              </span>
            )}
          </div>
          <span className="story-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            {t('yourStory')}
            <FeatureBadge featureId="story" />
          </span>
        </button>

        {}
        {otherStoryGroups.map((group) => {
          const isCloseFriend = group.is_close_friend || group.items.some(it => it.is_close_friend || it.privacy === 'close_friends')
          const isAllViewed = group.items.length > 0 && group.items.every(it => it.has_viewed)

          let circleClass = 'story-circle has-story'
          if (isCloseFriend) {
            circleClass += ' is-close-friend'
          } else if (isAllViewed) {
            circleClass += ' is-viewed'
          }

          return (
            <button
              key={group.user_id}
              className={circleClass}
              onClick={() => onStoryClick(group, storyGroups)}
              type="button"
            >
              <div className="story-avatar-wrap" style={{ position: 'relative' }}>
                <AvatarFallback name={group.full_name} src={group.avatar_url} />
                {isCloseFriend && (
                  <span className="story-close-friend-badge" title={t('closeFriends')}>
                    <Star size={10} fill="#ffffff" color="#ffffff" />
                  </span>
                )}
              </div>
              <span className="story-name">{group.display_name || group.full_name}</span>
            </button>
          )
        })}

        {}
        <button
          className="story-circle manage-close-friends-btn"
          onClick={() => setShowCloseFriendsModal(true)}
          type="button"
          title={t('manageCloseFriends')}
          style={{ opacity: 0.9 }}
        >
          <div 
            className="story-avatar-wrap" 
            style={{ 
              background: 'rgba(16, 185, 129, 0.12)', 
              borderColor: '#10b981', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#10b981'
            }}
          >
            <Star size={24} fill="#10b981" />
          </div>
          <span className="story-name" style={{ color: '#10b981' }}>{t('closeFriends')}</span>
        </button>
      </div>

      {showCloseFriendsModal && (
        <CloseFriendsModal
          onClose={() => setShowCloseFriendsModal(false)}
          pushToast={pushToast}
        />
      )}
    </div>
  )
}
