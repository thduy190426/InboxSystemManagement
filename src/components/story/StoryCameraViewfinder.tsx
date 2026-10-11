import { useState, useRef, useEffect, useCallback } from 'react'
import { X, RefreshCw, Upload, Video, StopCircle, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type StoryCameraViewfinderProps = {
  onCapture: (file: File) => void
  onSelectFile: (file: File) => void
  onClose: () => void
}

export function StoryCameraViewfinder({
  onCapture,
  onSelectFile,
  onClose,
}: StoryCameraViewfinderProps) {
  useTranslation('story')
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [isCameraActive, setIsCameraActive] = useState(false)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }, [])

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    stopStream()
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setHasPermission(false)
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(e => console.warn('Video play error:', e))
      }
      setHasPermission(true)
      setIsCameraActive(true)
    } catch (err) {
      console.warn('Camera access error:', err)
      setHasPermission(false)
    }
  }, [stopStream])

  useEffect(() => {
    startCamera(facingMode)
    return () => {
      stopStream()
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }, [facingMode, startCamera, stopStream])

  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'))
  }

  
  const handleTakePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1080
    canvas.height = video.videoHeight || 1920
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `story_photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
        stopStream()
        onCapture(file)
      }
    }, 'image/jpeg', 0.92)
  }

  
  const startRecording = () => {
    if (!streamRef.current) return
    recordedChunksRef.current = []
    let mimeType = 'video/webm;codecs=vp9,opus'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4'
      }
    }

    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const file = new File([blob], `story_video_${Date.now()}.webm`, { type: 'video/webm' })
        stopStream()
        onCapture(file)
      }

      recorder.start(100)
      setIsRecording(true)
      setRecordingSeconds(0)

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(sec => {
          if (sec >= 15) {
            stopRecording()
            return 15
          }
          return sec + 1
        })
      }, 1000)
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err)
    }
  }

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      stopStream()
      onSelectFile(file)
    }
  }

  return (
    <div className="story-camera-viewfinder-overlay">
      {}
      <header className="story-camera-header">
        <button 
          className="story-camera-circle-btn" 
          onClick={onClose} 
          type="button"
          title="Đóng"
        >
          <X size={24} />
        </button>

        {isRecording && (
          <div className="story-camera-rec-badge">
            <span className="story-camera-rec-dot" />
            <span>00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 00:15</span>
          </div>
        )}

        {isCameraActive && !isRecording && (
          <button 
            className="story-camera-circle-btn" 
            onClick={handleFlipCamera} 
            type="button"
            title="Đổi camera"
          >
            <RefreshCw size={22} />
          </button>
        )}
      </header>

      {}
      <div className="story-camera-viewport">
        {hasPermission === false ? (
          <div className="story-camera-fallback">
            <AlertCircle size={48} color="#f59e0b" style={{ marginBottom: '16px' }} />
            <h3>Không thể truy cập Camera</h3>
            <p>Trình duyệt chưa được cấp quyền camera hoặc thiết bị không có webcam khả dụng.</p>
            <button 
              className="cp-btn cp-btn--primary" 
              onClick={() => fileInputRef.current?.click()}
              type="button"
              style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Upload size={18} />
              <span>Chọn ảnh hoặc video từ máy</span>
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`story-camera-stream ${facingMode === 'user' ? 'is-mirrored' : ''}`}
          />
        )}
      </div>

      {}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInputChange} 
        accept="image/*,video/*" 
        hidden 
      />

      {}
      <footer className="story-camera-footer">
        {}
        <button 
          className="story-camera-side-btn" 
          onClick={() => fileInputRef.current?.click()}
          type="button"
          title="Tải ảnh hoặc video từ máy"
          disabled={isRecording}
        >
          <Upload size={22} />
        </button>

        {}
        {hasPermission !== false && (
          <div className="story-camera-shutter-wrap">
            {isRecording ? (
              <button 
                type="button"
                className="story-camera-shutter is-recording" 
                onClick={stopRecording}
                title="Dừng quay video"
              >
                <StopCircle size={36} color="#ef4444" fill="#ef4444" />
              </button>
            ) : (
              <button 
                type="button"
                className="story-camera-shutter" 
                onClick={handleTakePhoto}
                title="Chụp ảnh"
              >
                <div className="story-camera-shutter-inner" />
              </button>
            )}
          </div>
        )}

        {hasPermission !== false && (
          <button 
            className={`story-camera-side-btn ${isRecording ? 'is-active-rec' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            type="button"
            title={isRecording ? 'Dừng quay' : 'Quay video'}
          >
            <Video size={22} />
          </button>
        )}
      </footer>
    </div>
  )
}
