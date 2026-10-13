import type { ChangeEvent } from 'react'
import { useRef } from 'react'
import { Camera, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type ProfileCoverProps = {
  coverUrl: string | null
  isOwnProfile: boolean
  isUploading?: boolean
  onCoverChange?: (file: File) => void
}

export function ProfileCover({
  coverUrl,
  isOwnProfile,
  isUploading = false,
  onCoverChange,
}: ProfileCoverProps) {
  const { t } = useTranslation('profile')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file && onCoverChange) {
      onCoverChange(file)
    }
    event.target.value = ''
  }

  return (
    <div className="profile-cover-container">
      {coverUrl ? (
        <img
          alt=""
          className="profile-cover-img"
          src={coverUrl}
        />
      ) : (
        <div className="profile-cover-placeholder">
          <div className="profile-cover-mesh" />
        </div>
      )}

      <div className="profile-cover-overlay" />

      {isOwnProfile && (
        <div className="profile-cover-actions">
          <input
            accept="image/*"
            className="sr-only"
            disabled={isUploading}
            onChange={handleFileSelect}
            ref={fileInputRef}
            type="file"
          />
          <button
            className="profile-cover-btn"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            {isUploading ? (
              <>
                <RefreshCw className="animate-spin" size={15} />
                <span>{t('uploadingCover', { defaultValue: 'Đang tải...' })}</span>
              </>
            ) : (
              <>
                <Camera size={15} />
                <span>{t('changeCover', { defaultValue: 'Đổi ảnh bìa' })}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
