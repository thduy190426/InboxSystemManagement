import { useEffect, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type PostMediaLightboxProps = {
  images: string[]
  initialIndex?: number
  onClose: () => void
}

export function PostMediaLightbox({
  images,
  initialIndex = 0,
  onClose,
}: PostMediaLightboxProps) {
  const { t } = useTranslation('profile')
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialIndex, images.length - 1)),
  )

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }, [images.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }, [images.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        handlePrev()
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, handlePrev, handleNext, images.length])

  if (!images || images.length === 0) return null

  const currentImage = images[currentIndex]

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = currentImage
    a.download = `timeline-image-${currentIndex + 1}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div
      aria-label={t('lightboxClose', { defaultValue: 'Xem ảnh' })}
      aria-modal="true"
      className="post-lightbox-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
    >
      <div className="post-lightbox-header">
        <div className="post-lightbox-counter">
          {images.length > 1 && (
            <span>
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>

        <div className="post-lightbox-actions">
          <button
            aria-label={t('lightboxDownload', { defaultValue: 'Tải xuống' })}
            className="post-lightbox-btn"
            onClick={handleDownload}
            title={t('lightboxDownload', { defaultValue: 'Tải xuống' })}
            type="button"
          >
            <Download size={18} />
          </button>
          <button
            aria-label={t('lightboxClose', { defaultValue: 'Đóng' })}
            className="post-lightbox-btn"
            onClick={onClose}
            title={t('lightboxClose', { defaultValue: 'Đóng' })}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="post-lightbox-body">
        {images.length > 1 && (
          <button
            aria-label={t('previous', { defaultValue: 'Ảnh trước' })}
            className="post-lightbox-nav-btn post-lightbox-nav-prev"
            onClick={handlePrev}
            type="button"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <div className="post-lightbox-img-wrapper">
          <img
            alt=""
            className="post-lightbox-img"
            key={currentImage}
            src={currentImage}
          />
        </div>

        {images.length > 1 && (
          <button
            aria-label={t('next', { defaultValue: 'Ảnh kế tiếp' })}
            className="post-lightbox-nav-btn post-lightbox-nav-next"
            onClick={handleNext}
            type="button"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>
  )
}
