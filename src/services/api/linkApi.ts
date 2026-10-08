import { requestJson } from './apiClient'

export interface LinkPreviewData {
  url: string
  title?: string
  siteName?: string
  description?: string
  mediaType?: string
  contentType?: string
  images?: string[]
  videos?: { url: string; secureUrl?: string; type?: string; width?: string; height?: string }[]
  favicons?: string[]
}

export async function fetchLinkPreview(url: string): Promise<LinkPreviewData | null> {
  try {
    const response = await requestJson<{ success: boolean; data: LinkPreviewData }>(
      `/link-preview?url=${encodeURIComponent(url)}`
    )
    if (response.success && response.data) {
      return response.data
    }
    return null
  } catch (error) {
    console.error('Failed to fetch link preview', error)
    return null
  }
}
