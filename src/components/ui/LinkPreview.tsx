import { useQuery } from '@tanstack/react-query'
import { fetchLinkPreview } from '../../services/api/linkApi'
import { Globe, Image as ImageIcon, Video, FileText } from 'lucide-react'

export interface LinkPreviewProps {
  url: string
}

export function LinkPreview({ url }: LinkPreviewProps) {
  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['linkPreview', url],
    queryFn: () => fetchLinkPreview(url),
    staleTime: 1000 * 60 * 60, 
    retry: false,
    refetchOnWindowFocus: false,
  })

  if (isLoading) {
    return (
      <div className="link-preview-skeleton animate-pulse">
        <div className="skeleton-img"></div>
        <div className="skeleton-content">
          <div className="skeleton-title"></div>
          <div className="skeleton-desc"></div>
          <div className="skeleton-domain"></div>
        </div>
      </div>
    )
  }

  if (isError || !preview) {
    return null 
  }

  const { title, description, images, siteName, mediaType, favicons } = preview

  const image = images?.[0]
  const favicon = favicons?.[0]
  
  const getDomain = (urlStr: string) => {
    try {
      return new URL(urlStr).hostname.replace('www.', '')
    } catch {
      return urlStr
    }
  }

  const domain = getDomain(url)

  let Icon = Globe
  if (mediaType === 'video' || url.includes('youtube.com') || url.includes('tiktok.com')) {
    Icon = Video
  } else if (mediaType === 'image') {
    Icon = ImageIcon
  } else if (mediaType === 'article') {
    Icon = FileText
  }

  const isLargeImage = mediaType === 'video' || url.includes('youtube.com')

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={`link-preview-card ${isLargeImage ? 'layout-vertical' : 'layout-horizontal'}`}
    >
      {image && (
        <div className="link-preview-image-container">
          <img src={image} alt={title || 'Link preview image'} className="link-preview-image" loading="lazy" />
          {Icon === Video && (
            <div className="link-preview-play-icon">
              <PlayIcon />
            </div>
          )}
        </div>
      )}
      <div className="link-preview-content">
        {title && <div className="link-preview-title" title={title}>{title}</div>}
        {description && <div className="link-preview-desc" title={description}>{description}</div>}
        <div className="link-preview-footer">
          {favicon ? (
            <img src={favicon} alt="favicon" className="link-preview-favicon" />
          ) : (
            <Icon size={14} className="link-preview-icon" />
          )}
          <span className="link-preview-domain">{siteName || domain}</span>
        </div>
      </div>
    </a>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" style={{ color: 'white', opacity: 0.9 }}>
      <path d="M8 5v14l11-7z"/>
    </svg>
  )
}
