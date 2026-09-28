import { apiFetch, requestJson } from './apiClient'
import type { UserStoryGroup } from '../../types'

export const storyApi = {
  createStory: async (file: File, privacy: string, textContent: string = '') => {
    const formData = new FormData()
    formData.append('media', file)
    formData.append('privacy', privacy)
    formData.append('text_content', textContent)
    
    const response = await apiFetch('/stories', {
      method: 'POST',
      body: formData,
      // Do not set Content-Type to multipart/form-data manually, fetch will set it with boundary
    })
    
    return response.json()
  },

  getActiveStories: async (): Promise<{ success: boolean; data: UserStoryGroup[] }> => {
    return requestJson<{ success: boolean; data: UserStoryGroup[] }>('/stories')
  },
}
