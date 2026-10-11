import { apiFetch, ApiRequestError, requestJson } from './apiClient'
import type {
  UserStoryGroup,
  StoryViewerItem,
  CloseFriendItem,
  StoryHighlightSummary,
  PollStats,
  SliderStats,
  Story,
} from '../../types'

export const storyApi = {
  createStory: async (file: File, privacy: string, textContent: string = '') => {
    const formData = new FormData()
    formData.append('media', file)
    formData.append('privacy', privacy)
    formData.append('text_content', textContent)
    
    try {
      const response = await apiFetch('/stories', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        const retryAfterHeader = response.headers.get('Retry-After')
        const retryAfterSeconds =
          typeof data?.retryAfterSeconds === 'number'
            ? data.retryAfterSeconds
            : retryAfterHeader
              ? Number.parseInt(retryAfterHeader, 10)
              : undefined

        throw new ApiRequestError(
          data?.message || 'Không thể đăng story!',
          response.status,
          data?.errors,
          retryAfterSeconds,
        )
      }

      return data
    } catch (err) {
      console.error('[storyApi] Error in createStory:', err)
      throw err
    }
  },

  getActiveStories: async (): Promise<{ success: boolean; data: UserStoryGroup[] }> => {
    return requestJson<{ success: boolean; data: UserStoryGroup[] }>('/stories')
  },

  recordView: async (storyId: string): Promise<{ success: boolean; storyId: string; views_count: number; isNewView: boolean }> => {
    return requestJson<{ success: boolean; storyId: string; views_count: number; isNewView: boolean }>(`/stories/${storyId}/view`, {
      method: 'POST',
    })
  },

  reactToStory: async (storyId: string, reaction: string): Promise<{ success: boolean; storyId: string; action: string; reaction: string | null; reactions_count: number }> => {
    return requestJson<{ success: boolean; storyId: string; action: string; reaction: string | null; reactions_count: number }>(`/stories/${storyId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction }),
    })
  },

  replyToStory: async (storyId: string, message: string = '', reaction: string | null = null): Promise<{ success: boolean; message: string; data: { conversationId: number; message: any } }> => {
    return requestJson<{ success: boolean; message: string; data: { conversationId: number; message: any } }>(`/stories/${storyId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, reaction }),
    })
  },

  getStoryViewers: async (storyId: string): Promise<{ success: boolean; data: StoryViewerItem[] }> => {
    return requestJson<{ success: boolean; data: StoryViewerItem[] }>(`/stories/${storyId}/viewers`)
  },

  deleteStory: async (storyId: string): Promise<{ success: boolean; message: string }> => {
    return requestJson<{ success: boolean; message: string }>(`/stories/${storyId}`, {
      method: 'DELETE',
    })
  },

  getCloseFriends: async (): Promise<{ success: boolean; data: CloseFriendItem[] }> => {
    return requestJson<{ success: boolean; data: CloseFriendItem[] }>('/stories/close-friends')
  },

  toggleCloseFriend: async (friendId: number): Promise<{ success: boolean; friend_id: number; isCloseFriend: boolean }> => {
    return requestJson<{ success: boolean; friend_id: number; isCloseFriend: boolean }>('/stories/close-friends/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friend_id: friendId }),
    })
  },

  votePoll: async (storyId: string, optionIdx: 0 | 1): Promise<{ success: boolean; pollStats: PollStats }> => {
    return requestJson<{ success: boolean; pollStats: PollStats }>(`/stories/${storyId}/poll-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionIdx }),
    })
  },

  getPollStats: async (storyId: string): Promise<{ success: boolean; pollStats: PollStats }> => {
    return requestJson<{ success: boolean; pollStats: PollStats }>(`/stories/${storyId}/poll-stats`)
  },

  voteSlider: async (storyId: string, value: number): Promise<{ success: boolean; sliderStats: SliderStats }> => {
    return requestJson<{ success: boolean; sliderStats: SliderStats }>(`/stories/${storyId}/slider-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })
  },

  getSliderStats: async (storyId: string): Promise<{ success: boolean; sliderStats: SliderStats }> => {
    return requestJson<{ success: boolean; sliderStats: SliderStats }>(`/stories/${storyId}/slider-stats`)
  },

  getStoryArchive: async (): Promise<{ success: boolean; data: Story[] }> => {
    return requestJson<{ success: boolean; data: Story[] }>('/stories/archive')
  },

  getHighlights: async (userId?: number): Promise<{ success: boolean; data: StoryHighlightSummary[] }> => {
    const query = userId ? `?userId=${userId}` : ''
    return requestJson<{ success: boolean; data: StoryHighlightSummary[] }>(`/stories/highlights${query}`)
  },

  createHighlight: async (payload: { title: string; coverUrl?: string; storyIds: string[] }): Promise<{ success: boolean; data: StoryHighlightSummary }> => {
    return requestJson<{ success: boolean; data: StoryHighlightSummary }>('/stories/highlights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  },

  getHighlightById: async (id: string): Promise<{ success: boolean; data: { highlight: StoryHighlightSummary; storyGroup: UserStoryGroup } }> => {
    return requestJson<{ success: boolean; data: { highlight: StoryHighlightSummary; storyGroup: UserStoryGroup } }>(`/stories/highlights/${id}`)
  },

  deleteHighlight: async (id: string): Promise<{ success: boolean; message: string }> => {
    return requestJson<{ success: boolean; message: string }>(`/stories/highlights/${id}`, {
      method: 'DELETE',
    })
  },
}

