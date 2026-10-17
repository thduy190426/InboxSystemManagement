import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { storyApi } from '../../services/api/storyApi'
import { useTranslation } from 'react-i18next'
import { StoryCameraViewfinder } from './StoryCameraViewfinder'
import { StoryStudioEditor } from './StoryStudioEditor'
import type { StoryStudioMetadata } from './StoryStudioEditor'

type StoryCreatorModalProps = {
  onClose: () => void
  onSuccess: () => void
  pushToast: (text: string, tone?: 'info' | 'error') => void
  isClosing?: boolean
}

export function StoryCreatorModal({
  onClose,
  onSuccess,
  pushToast,
  isClosing,
}: StoryCreatorModalProps) {
  const { t } = useTranslation('story')
  const [mounted, setMounted] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handleSelectFile = (selectedFile: File) => {
    setFile(selectedFile)
    setShowCamera(false)
  }

  const handlePublishStory = async (
    metadata: StoryStudioMetadata,
    privacy: 'public' | 'friends' | 'close_friends' | 'only_me'
  ) => {
    if (!file) return

    setIsUploading(true)
    try {
      let fileToUpload = file

      
      if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
        try {
          fileToUpload = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          })
        } catch (compErr) {
          console.warn('Image compression fallback to original:', compErr)
        }
      }

      const textPayload = JSON.stringify(metadata)
      await storyApi.createStory(fileToUpload, privacy, textPayload)

      pushToast(t('postSuccess'), 'info')
      onSuccess()
    } catch (err: any) {
      pushToast(err?.message || t('postError'), 'error')
      setIsUploading(false)
    }
  }

  if (!mounted || typeof document === 'undefined') return null

  
  if (showCamera) {
    return createPortal(
      <StoryCameraViewfinder
        onCapture={handleSelectFile}
        onSelectFile={handleSelectFile}
        onClose={() => setShowCamera(false)}
      />,
      document.body
    )
  }

  
  if (file) {
    return createPortal(
      <>
        <StoryStudioEditor
          mediaFile={file}
          onPublish={handlePublishStory}
          onClose={() => setFile(null)}
        />
        {isUploading && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1300,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              color: '#fff',
            }}
          >
            <Loader2 size={42} className="cp-spinner" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontWeight: 600, fontSize: '1rem' }}>
              {t('uploading', { defaultValue: 'Đang tải lên và xuất bản Story...' })}
            </p>
          </div>
        )}
      </>,
      document.body
    )
  }

  
  return createPortal(
    <div className={`story-creator-overlay ${isClosing ? 'is-closing' : ''}`}>
      <div className={`story-creator-modal ${isClosing ? 'is-closing' : ''}`}>
        <header>
          <h2>{t('createStory', { defaultValue: 'Tạo tin mới' })}</h2>
          <button className="close-btn" onClick={onClose} disabled={isUploading} type="button">
            &times;
          </button>
        </header>

        <div className="story-creator-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px 0' }}>
            <button
              type="button"
              className="upload-placeholder"
              style={{ minHeight: '180px', margin: 0, cursor: 'pointer', border: '2px dashed rgba(99, 102, 241, 0.5)' }}
              onClick={() => setShowCamera(true)}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6366f1',
                  marginBottom: '10px',
                }}
              >
                <Camera size={28} />
              </div>
              <p style={{ fontWeight: 700, margin: '4px 0', color: '#fff' }}>
                {t('openCamera', { defaultValue: 'Chụp / Quay Camera' })}
              </p>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                {t('cameraDesc', { defaultValue: 'Chụp ảnh hoặc quay video 15s trực tiếp' })}
              </span>
            </button>

            <button
              type="button"
              className="upload-placeholder"
              style={{ minHeight: '180px', margin: 0, cursor: 'pointer', border: '2px dashed rgba(255, 255, 255, 0.2)' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  marginBottom: '10px',
                }}
              >
                <ImageIcon size={28} />
              </div>
              <p style={{ fontWeight: 700, margin: '4px 0', color: '#fff' }}>
                {t('uploadFromDevice', { defaultValue: 'Thư viện thiết bị' })}
              </p>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                {t('uploadDesc', { defaultValue: 'Chọn ảnh hoặc video từ máy tính' })}
              </span>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={e => {
              const selected = e.target.files?.[0]
              if (selected) handleSelectFile(selected)
            }}
            accept="image/*,video/*"
            hidden
          />
        </div>
      </div>
    </div>,
    document.body
  )
}
