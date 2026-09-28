import React, { useState, useRef, useEffect } from 'react'
import { X, Crop, RotateCw, Send, EyeOff, Play, Pause, Trash2 } from 'lucide-react'

export type PendingAttachment = {
  id: string
  file: File
  url: string
  type: 'image' | 'video' | 'audio' | 'file'
  size: number
  viewOnce?: boolean
  rotation?: number
}

type Props = {
  attachments: PendingAttachment[]
  onClose: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<PendingAttachment>) => void
  onSend: () => void
}

export function AttachmentPreviewOverlay({ attachments, onClose, onRemove, onUpdate, onSend }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeAttachment = attachments[activeIndex]
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (attachments.length === 0) {
      onClose()
    } else if (activeIndex >= attachments.length) {
      setActiveIndex(attachments.length - 1)
    }
  }, [attachments, activeIndex, onClose])

  if (!activeAttachment) return null

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  function handleRotate() {
    if (activeAttachment.type === 'image') {
      const current = activeAttachment.rotation || 0
      onUpdate(activeAttachment.id, { rotation: (current + 90) % 360 })
    }
  }

  function toggleViewOnce() {
    onUpdate(activeAttachment.id, { viewOnce: !activeAttachment.viewOnce })
  }

  function togglePlay() {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <div className="attachment-preview-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', color: 'white'
    }}>
      <div className="preview-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)'
      }}>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: 'white', cursor: 'pointer',
          padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)'
        }}>
          <X size={24} />
        </button>
        <div style={{ fontSize: '15px', fontWeight: 500 }}>
          Đã chọn {attachments.length} tệp
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="preview-content" style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', padding: '20px', overflow: 'hidden'
      }}>
        {activeAttachment.type === 'image' && (
          <img
            src={activeAttachment.url}
            alt="Preview"
            style={{
              maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
              transform: `rotate(${activeAttachment.rotation || 0}deg)`,
              transition: 'transform 0.3s ease'
            }}
          />
        )}
        {activeAttachment.type === 'video' && (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <video
              ref={videoRef}
              src={activeAttachment.url}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              onEnded={() => setIsPlaying(false)}
              loop
            />
            <button
              onClick={togglePlay}
              style={{
                position: 'absolute', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white',
                width: '64px', height: '64px', borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: isPlaying ? 0 : 1, transition: 'opacity 0.2s'
              }}
            >
              <Play size={32} style={{ marginLeft: '4px' }} />
            </button>
          </div>
        )}
        {activeAttachment.type === 'file' || activeAttachment.type === 'audio' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📄</div>
            <h3 style={{ margin: 0, wordBreak: 'break-all', padding: '0 20px' }}>Tệp đính kèm</h3>
          </div>
        ) : null}

        <div className="preview-metadata" style={{
          position: 'absolute', top: '20px', right: '20px',
          background: 'rgba(0,0,0,0.6)', padding: '8px 12px', borderRadius: '8px',
          fontSize: '13px'
        }}>
          {formatBytes(activeAttachment.size)}
        </div>
      </div>

      <div className="preview-toolbar" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '16px'
      }}>
        {activeAttachment.type === 'image' && (
          <>
            <button onClick={handleRotate} title="Xoay ảnh" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              <RotateCw size={24} />
            </button>
            <button title="Cắt ảnh (Đang phát triển)" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'not-allowed' }}>
              <Crop size={24} />
            </button>
          </>
        )}
        {(activeAttachment.type === 'image' || activeAttachment.type === 'video') && (
          <button
            onClick={toggleViewOnce}
            title="Xem một lần"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeAttachment.viewOnce ? 'var(--primary)' : 'white'
            }}
          >
            <EyeOff size={24} />
          </button>
        )}
        <button
          onClick={() => onRemove(activeAttachment.id)}
          title="Xóa tệp này"
          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
        >
          <Trash2 size={24} />
        </button>
      </div>

      <div className="preview-thumbnails" style={{
        display: 'flex', alignItems: 'center', padding: '16px', gap: '8px',
        overflowX: 'auto', background: '#1a1a1a'
      }}>
        {attachments.map((att, idx) => (
          <button
            key={att.id}
            onClick={() => setActiveIndex(idx)}
            style={{
              width: '60px', height: '60px', borderRadius: '8px', border: 'none',
              padding: 0, cursor: 'pointer', overflow: 'hidden', position: 'relative',
              boxShadow: activeIndex === idx ? '0 0 0 2px var(--primary)' : 'none',
              opacity: activeIndex === idx ? 1 : 0.5,
              background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {att.type === 'image' || att.type === 'video' ? (
              <img
                src={att.url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '24px' }}>📄</span>
            )}
            {att.type === 'video' && (
              <div style={{
                position: 'absolute', bottom: '4px', right: '4px',
                background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '2px 4px',
                fontSize: '10px', color: 'white'
              }}>
                <Play size={10} />
              </div>
            )}
          </button>
        ))}
        
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={onSend}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--primary)', color: 'white', border: 'none',
              padding: '12px 24px', borderRadius: '24px', fontSize: '15px',
              fontWeight: 500, cursor: 'pointer'
            }}
          >
            <span>Gửi {attachments.length} tệp</span>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
