import { apiFetch, ApiRequestError, requestJson } from './apiClient'
import type { UserStoryGroup } from '../../types'

export const storyApi = {
  createStory: async (file: File, privacy: string, textContent: string = '') => {
    console.log('[storyApi] createStory called with:', { fileName: file.name, fileSize: file.size, privacy, textContent })
    const formData = new FormData()
    formData.append('media', file)
    formData.append('privacy', privacy)
    formData.append('text_content', textContent)
    
    console.log('[storyApi] Sending POST request to /stories...')
    try {
      const response = await apiFetch('/stories', {
        method: 'POST',
        body: formData,
      })
      console.log('[storyApi] Received response status:', response.status)
      const data = await response.json()
      console.log('[storyApi] Response data:', data)

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
      console.error('[storyApi] Error in apiFetch:', err)
      throw err
    }
  },

  getActiveStories: async (): Promise<{ success: boolean; data: UserStoryGroup[] }> => {
    return requestJson<{ success: boolean; data: UserStoryGroup[] }>('/stories')
  },
}

