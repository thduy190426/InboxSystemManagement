import type { MessageAttachment } from '../../types'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

export type GalleryViewerProps = {
  galleryImage: MessageAttachment | null
  setGalleryImage: (image: MessageAttachment | null) => void
  renderDownloadLink: (attachment: MessageAttachment) => React.ReactNode
}

export function GalleryViewer({
  galleryImage,
  setGalleryImage,
  renderDownloadLink,
}: GalleryViewerProps) {
  const { t } = useTranslation()
  if (!galleryImage) return null

  return (
    <div className="gallery-backdrop" role="presentation">
      <section aria-label={t('image', { defaultValue: 'Hình ảnh' })} className="gallery-viewer" role="dialog">
        <header>
          <div>
            <strong>{galleryImage.name}</strong>
            <small>
              {galleryImage.meta} &bull; {galleryImage.mimeType}
            </small>
          </div>

          <button onClick={() => setGalleryImage(null)} title={t('close', { defaultValue: 'Đóng' })} type="button">
            <X size={20} />
          </button>
        </header>

        <figure>
          <img alt={galleryImage.name} src={galleryImage.url} />
          <footer>{renderDownloadLink(galleryImage)}</footer>
        </figure>
      </section>
    </div>
  )
}
