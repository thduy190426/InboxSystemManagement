import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { getCroppedImg } from '../../utils/cropImage'
import { X, Check } from 'lucide-react'

type AvatarCropperProps = {
  imageSrc: string
  onCancel: () => void
  onCropped: (croppedBlob: Blob) => void
}

export function AvatarCropper({ imageSrc, onCancel, onCropped }: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCrop = async () => {
    if (!croppedAreaPixels) return

    try {
      setIsProcessing(true)
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      if (croppedBlob) {
        onCropped(croppedBlob)
      }
    } catch (e) {
      console.error('Lỗi khi cắt ảnh:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '90%',
          maxWidth: '500px',
          height: '50vh',
          minHeight: '400px',
          backgroundColor: '#111',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}
      >
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          marginTop: '24px',
          display: 'flex',
          gap: '16px',
          zIndex: 100000,
          backgroundColor: 'var(--surface-color)',
          padding: '12px 24px',
          borderRadius: '30px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <button
          onClick={onCancel}
          disabled={isProcessing}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '20px',
            border: 'none',
            backgroundColor: 'var(--border-color)',
            color: 'var(--text-color)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'background-color 0.2s',
          }}
        >
          <X size={18} />
          <span>Hủy bỏ</span>
        </button>
        <button
          onClick={handleCrop}
          disabled={isProcessing}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '20px',
            border: 'none',
            backgroundColor: 'var(--primary-color)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'background-color 0.2s',
            opacity: isProcessing ? 0.7 : 1,
          }}
        >
          <Check size={18} />
          <span>{isProcessing ? 'Đang xử lý...' : 'Áp dụng ảnh'}</span>
        </button>
      </div>
    </div>
  )
}
