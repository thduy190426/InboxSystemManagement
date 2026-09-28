import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { AvatarFallback } from '../ui/AvatarFallback'
import { storyApi } from '../../services/api/storyApi'
import type { UserStoryGroup } from '../../types'
import { getRealtimeSocket } from '../../services/realtime/realtime'
import { getStoredAuthSession } from '../../services/storage/authStorage'

type StoryFeedProps = {
  onCreateClick: () => void
  onStoryClick: (group: UserStoryGroup, allGroups: UserStoryGroup[]) => void
}

export function StoryFeed({ onCreateClick, onStoryClick }: StoryFeedProps) {
  const user = getStoredAuthSession()?.user
  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([])

  useEffect(() => {
    loadStories()
  }, [])

  useEffect(() => {
    const socket = getRealtimeSocket()
    if (!socket) return

    const handleStoryCreated = () => {
      loadStories()
    }

    socket.on('story:created', handleStoryCreated)
    return () => {
      socket.off('story:created', handleStoryCreated)
    }
  }, [])

  async function loadStories() {
    try {
      const res = await storyApi.getActiveStories()
      if (res.success) {
        setStoryGroups(res.data)
      }
    } catch (err) {
      console.error('Failed to load stories', err)
    }
  }

  const myStoryGroup = storyGroups.find(g => String(g.user_id) === String(user?.id))
  const otherStoryGroups = storyGroups.filter(g => String(g.user_id) !== String(user?.id))

  return (
    <div className="story-feed">
      <div className="story-feed-scroll">
        <button 
          className="story-circle create-story"
          onClick={() => {
            if (myStoryGroup) {
              onStoryClick(myStoryGroup, storyGroups)
            } else {
              onCreateClick()
            }
          }}
          type="button"
        >
          <div className="story-avatar-wrap">
            <AvatarFallback name={user?.fullName || 'My Story'} src={user?.avatarUrl || ''} />
            {!myStoryGroup && (
              <span className="create-story-badge">
                <Plus size={12} />
              </span>
            )}
          </div>
          <span className="story-name">Tin của bạn</span>
        </button>

        {otherStoryGroups.map((group) => (
          <button
            key={group.user_id}
            className="story-circle has-story"
            onClick={() => onStoryClick(group, storyGroups)}
            type="button"
          >
            <div className="story-avatar-wrap">
              <AvatarFallback name={group.full_name} src={group.avatar_url} />
            </div>
            <span className="story-name">{group.display_name || group.full_name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
