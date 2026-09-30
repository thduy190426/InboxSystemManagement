import { useCallback, useRef, useState } from 'react'

export function useMediaRecording() {
  const [recordingKind, setRecordingKind] = useState<'audio' | 'video' | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordingError, setRecordingError] = useState('')
  
  const [recordedMediaUrl, setRecordedMediaUrl] = useState('')
  const [recordedMediaFile, setRecordedMediaFile] = useState<File | null>(null)
  const [recordedMediaKind, setRecordedMediaKind] = useState<'audio' | 'video' | null>(null)

  const recordingChunksRef = useRef<Blob[]>([])
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<number | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)

  const clearRecordedMedia = useCallback(() => {
    if (recordedMediaUrl) {
      URL.revokeObjectURL(recordedMediaUrl)
    }

    setRecordedMediaUrl('')
    setRecordedMediaFile(null)
    setRecordedMediaKind(null)
    setRecordingDuration(0)
  }, [recordedMediaUrl])

  const getSupportedAudioMimeType = useCallback(() => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
    return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || ''
  }, [])

  const getSupportedVideoMimeType = useCallback(() => {
    const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || ''
  }, [])

  const getMediaFileExtension = useCallback((type: string, kind: 'audio' | 'video') => {
    if (type.includes('mp4')) {
      return kind === 'audio' ? 'm4a' : 'mp4'
    }
    if (type.includes('ogg')) {
      return 'ogg'
    }
    return 'webm'
  }, [])

  const startMediaRecording = useCallback(async (kind: 'audio' | 'video') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError('Trình duyệt không hỗ trợ ghi âm/ghi hình!')
      return
    }

    try {
      clearRecordedMedia()
      setRecordingError('')

      const stream = await navigator.mediaDevices.getUserMedia(
        kind === 'audio' ? { audio: true } : { audio: true, video: true },
      )
      const mimeType = kind === 'audio' ? getSupportedAudioMimeType() : getSupportedVideoMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      recordingChunksRef.current = []
      recordingStreamRef.current = stream
      mediaRecorderRef.current = recorder
      
      if (kind === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || (kind === 'audio' ? 'audio/webm' : 'video/webm')
        const blob = new Blob(recordingChunksRef.current, { type })
        const extension = getMediaFileExtension(type, kind)
        const file = new File([blob], `${kind}-message-${Date.now()}.${extension}`, { type })
        const url = URL.createObjectURL(blob)

        setRecordedMediaFile(file)
        setRecordedMediaUrl(url)
        setRecordedMediaKind(kind)
        recordingChunksRef.current = []
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null
        mediaRecorderRef.current = null
      }

      recorder.start()
      setRecordingKind(kind)
      setRecordingDuration(0)
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((current) => current + 1)
      }, 1000)
    } catch {
      setRecordingError('Không thể truy cập micro/camera!')
    }
  }, [clearRecordedMedia, getSupportedAudioMimeType, getSupportedVideoMimeType, getMediaFileExtension])

  const stopMediaRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    setRecordingKind(null)

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      return
    }

    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
    recordingStreamRef.current = null
  }, [])

  const cancelMediaRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }

    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
    recordingStreamRef.current = null
    mediaRecorderRef.current = null
    recordingChunksRef.current = []
    setRecordingKind(null)
    clearRecordedMedia()
  }, [clearRecordedMedia])

  const formatRecordingDuration = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
  }, [])

  return {
    recordingKind,
    recordingDuration,
    recordingError,
    recordedMediaUrl,
    recordedMediaFile,
    recordedMediaKind,
    videoPreviewRef,
    startMediaRecording,
    stopMediaRecording,
    cancelMediaRecording,
    clearRecordedMedia,
    formatRecordingDuration,
    setRecordingError
  }
}
