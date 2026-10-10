import { useState, useRef } from 'react'
import type { RefObject } from 'react'

type DeviceOption = {
  id: string
  label: string
}

export function useCallMedia(
  callType: 'audio' | 'video',
  onError: (msg: string) => void,
  t: any,
  peersRef: RefObject<Map<number, any>>
) {
  const [isMicOn, setIsMicOn] = useState(true)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(callType === 'video')
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isBlurOn, setIsBlurOn] = useState(false)
  
  const [audioInputs, setAudioInputs] = useState<DeviceOption[]>([])
  const [audioOutputs, setAudioOutputs] = useState<DeviceOption[]>([])
  const [videoInputs, setVideoInputs] = useState<DeviceOption[]>([])
  
  const [selectedAudioInputId, setSelectedAudioInputId] = useState('')
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState('default')
  const [selectedVideoInputId, setSelectedVideoInputId] = useState('')

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  
  const blurCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null)
  const segmenterRef = useRef<any>(null)
  const blurRafId = useRef<number | null>(null)
  const rawStreamRef = useRef<MediaStream | null>(null)

  const canSelectAudioOutput =
    typeof HTMLMediaElement !== 'undefined' &&
    'setSinkId' in HTMLMediaElement.prototype

  async function refreshMediaDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return
    }

    const devices = await navigator.mediaDevices.enumerateDevices()
    const nextAudioInputs = devices
      .filter((device) => device.kind === 'audioinput')
      .map((device, index) => ({
        id: device.deviceId,
        label: device.label || `Micro ${index + 1}`,
      }))
    const nextVideoInputs = devices
      .filter((device) => device.kind === 'videoinput')
      .map((device, index) => ({
        id: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
      }))
    const nextAudioOutputs = devices
      .filter((device) => device.kind === 'audiooutput')
      .map((device, index) => ({
        id: device.deviceId || 'default',
        label: device.label || `Loa ${index + 1}`,
      }))

    setAudioInputs(nextAudioInputs)
    setAudioOutputs(nextAudioOutputs.filter((device) => device.id !== 'default'))
    setVideoInputs(nextVideoInputs)
    setSelectedAudioInputId((current) => current || nextAudioInputs[0]?.id || '')
    setSelectedAudioOutputId((current) => {
      if (current && (current === 'default' || nextAudioOutputs.some((device) => device.id === current))) {
        return current
      }
      return nextAudioOutputs[0]?.id || 'default'
    })
    setSelectedVideoInputId((current) => current || nextVideoInputs[0]?.id || '')
  }

  async function ensureLocalStream() {
    if (localStreamRef.current) {
      return localStreamRef.current
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(t('errBrowserNotSupport', { defaultValue: 'Trình duyệt không hỗ trợ gọi audio/video!' }))
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: selectedAudioInputId ? { deviceId: { exact: selectedAudioInputId }, noiseSuppression: true, echoCancellation: true } : { noiseSuppression: true, echoCancellation: true },
      video: callType === 'video'
        ? selectedVideoInputId
          ? { deviceId: { exact: selectedVideoInputId } }
          : true
        : false,
    })

    stream.getAudioTracks().forEach((track) => {
      track.enabled = isMicOn
    })
    stream.getVideoTracks().forEach((track) => {
      track.enabled = isCameraOn
    })

    localStreamRef.current = stream
    refreshMediaDevices().catch(() => undefined)

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
    }

    return stream
  }

  function stopMedia() {
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    if (blurRafId.current) cancelAnimationFrame(blurRafId.current)
    if (segmenterRef.current) segmenterRef.current.close()
  }

  function toggleCamera() {
    const nextEnabled = !isCameraOn
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled
    })
    setIsCameraOn(nextEnabled)
  }

  function toggleSpeaker() {
    setIsSpeakerOn((current) => !current)
  }

  async function replaceDeviceTrack() {
    if (!localStreamRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedAudioInputId ? { deviceId: { exact: selectedAudioInputId }, noiseSuppression: true, echoCancellation: true } : { noiseSuppression: true, echoCancellation: true },
        video: callType === 'video' ? (selectedVideoInputId ? { deviceId: { exact: selectedVideoInputId } } : true) : false,
      })
      localStreamRef.current.getTracks().forEach(track => {
         if (!isScreenSharing || track.kind !== 'video') track.stop()
      })
      stream.getAudioTracks().forEach((track) => track.enabled = isMicOn)
      if (!isScreenSharing) {
        stream.getVideoTracks().forEach((track) => track.enabled = isCameraOn)
      }
      
      const newTracks = [...stream.getAudioTracks(), ...(isScreenSharing ? localStreamRef.current.getVideoTracks() : stream.getVideoTracks())]
      const newStream = new MediaStream(newTracks)
      localStreamRef.current = newStream
      if (localVideoRef.current) localVideoRef.current.srcObject = newStream
      
      if (peersRef.current) {
        peersRef.current.forEach(({ peer }: any) => {
          const senders = peer.getSenders()
          const audioTrack = newStream.getAudioTracks()[0]
          if (audioTrack) {
            const audioSender = senders.find((s: any) => s.track?.kind === 'audio')
            if (audioSender) audioSender.replaceTrack(audioTrack)
          }
          const videoTrack = newStream.getVideoTracks()[0]
          if (videoTrack) {
            const videoSender = senders.find((s: any) => s.track?.kind === 'video')
            if (videoSender) videoSender.replaceTrack(videoTrack)
          }
        })
      }
    } catch (e) {
      console.error('Failed to replace track', e)
    }
  }

  async function toggleScreenShare() {
    if (isScreenSharing) {
      setIsScreenSharing(false)
      try {
        const stream = await ensureLocalStream()
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          if (peersRef.current) {
            peersRef.current.forEach(({ peer }: any) => {
              const sender = peer.getSenders().find((s: any) => s.track?.kind === 'video')
              if (sender) sender.replaceTrack(videoTrack)
            })
          }
          if (localVideoRef.current) localVideoRef.current.srcObject = stream
        }
      } catch (e) {}
      return
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = screenStream.getVideoTracks()[0]
      
      screenTrack.onended = () => toggleScreenShare()

      if (localStreamRef.current) {
        const oldVideo = localStreamRef.current.getVideoTracks()[0]
        if (oldVideo) oldVideo.stop()
        localStreamRef.current.removeTrack(oldVideo)
        localStreamRef.current.addTrack(screenTrack)
      }

      if (peersRef.current) {
        peersRef.current.forEach(({ peer }: any) => {
          const sender = peer.getSenders().find((s: any) => s.track?.kind === 'video')
          if (sender) sender.replaceTrack(screenTrack)
        })
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([screenTrack])
      }
      setIsScreenSharing(true)
    } catch (error) {
      onError(t('errScreenShare', { defaultValue: 'Không thể chia sẻ màn hình' }))
    }
  }

  async function toggleBackgroundBlur() {
    try {
      if (isBlurOn) {
        setIsBlurOn(false)
        if (blurRafId.current) {
          cancelAnimationFrame(blurRafId.current)
          blurRafId.current = null
        }
        
        if (rawStreamRef.current && localStreamRef.current) {
          const rawVideoTrack = rawStreamRef.current.getVideoTracks()[0]
          const oldVideo = localStreamRef.current.getVideoTracks()[0]
          if (oldVideo) {
            localStreamRef.current.removeTrack(oldVideo)
          }
          if (rawVideoTrack) {
            localStreamRef.current.addTrack(rawVideoTrack)
            if (peersRef.current) {
              peersRef.current.forEach(({ peer }: any) => {
                const sender = peer.getSenders().find((s: any) => s.track?.kind === 'video')
                if (sender) sender.replaceTrack(rawVideoTrack)
              })
            }
          }
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current
          }
        }
        return
      }

      setIsBlurOn(true)
      
      if (!segmenterRef.current) {
        const { ImageSegmenter, FilesetResolver } = await import('@mediapipe/tasks-vision')
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
        )
        segmenterRef.current = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          outputCategoryMask: true
        })
      }

      if (!hiddenVideoRef.current) {
        hiddenVideoRef.current = document.createElement('video')
        hiddenVideoRef.current.autoplay = true
        hiddenVideoRef.current.playsInline = true
        hiddenVideoRef.current.muted = true
      }
      if (!blurCanvasRef.current) {
        blurCanvasRef.current = document.createElement('canvas')
      }

      if (!rawStreamRef.current && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0]
        if (videoTrack) {
          rawStreamRef.current = new MediaStream([videoTrack])
        }
      }

      if (!rawStreamRef.current) {
        onError(t('noCameraBlur', { defaultValue: "Không tìm thấy luồng Camera!" }))
        setIsBlurOn(false)
        return
      }

      hiddenVideoRef.current.srcObject = rawStreamRef.current
      await hiddenVideoRef.current.play()

      const canvas = blurCanvasRef.current
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      let lastVideoTime = -1

      function renderLoop() {
        if (!isBlurOn || !hiddenVideoRef.current || !segmenterRef.current || !ctx) return

        const video = hiddenVideoRef.current
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }

        if (video.currentTime !== lastVideoTime && canvas.width > 0 && canvas.height > 0) {
          lastVideoTime = video.currentTime
          
          const startTimeMs = performance.now()
          const result = segmenterRef.current.segmentForVideo(video, startTimeMs)

          if (result && result.categoryMask) {
            const width = canvas.width
            const height = canvas.height
            const maskArray = result.categoryMask.getAsUint8Array()
            
            ctx.drawImage(video, 0, 0, width, height)
            const clearData = ctx.getImageData(0, 0, width, height)
            
            ctx.filter = 'blur(12px)'
            ctx.drawImage(video, 0, 0, width, height)
            ctx.filter = 'none'
            const blurredData = ctx.getImageData(0, 0, width, height)
            
            for (let i = 0; i < maskArray.length; i++) {
              if (maskArray[i] > 0) {
                const offset = i * 4
                blurredData.data[offset] = clearData.data[offset]
                blurredData.data[offset+1] = clearData.data[offset+1]
                blurredData.data[offset+2] = clearData.data[offset+2]
                blurredData.data[offset+3] = clearData.data[offset+3]
              }
            }
            
            ctx.putImageData(blurredData, 0, 0)
          }
        }
        blurRafId.current = requestAnimationFrame(renderLoop)
      }

      renderLoop()

      const processedStream = canvas.captureStream(30)
      const processedVideoTrack = processedStream.getVideoTracks()[0]

      if (localStreamRef.current) {
        const oldVideo = localStreamRef.current.getVideoTracks()[0]
        if (oldVideo) {
          localStreamRef.current.removeTrack(oldVideo)
        }
        localStreamRef.current.addTrack(processedVideoTrack)
      }

      if (peersRef.current) {
        peersRef.current.forEach(({ peer }: any) => {
          const sender = peer.getSenders().find((s: any) => s.track?.kind === 'video')
          if (sender) sender.replaceTrack(processedVideoTrack)
        })
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
      }

    } catch (error) {
      console.error(error)
      onError(t('blurFailed', { defaultValue: 'Không thể khởi tạo Mờ phông nền!' }))
      setIsBlurOn(false)
    }
  }

  return {
    isMicOn,
    setIsMicOn,
    isSpeakerOn,
    setIsSpeakerOn,
    isCameraOn,
    setIsCameraOn,
    isScreenSharing,
    setIsScreenSharing,
    isBlurOn,
    setIsBlurOn,
    audioInputs,
    audioOutputs,
    videoInputs,
    setAudioInputs,
    setAudioOutputs,
    setVideoInputs,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    setSelectedAudioInputId,
    setSelectedAudioOutputId,
    setSelectedVideoInputId,
    localVideoRef,
    localStreamRef,
    blurCanvasRef,
    hiddenVideoRef,
    canSelectAudioOutput,
    refreshMediaDevices,
    ensureLocalStream,
    stopMedia,
    toggleCamera,
    toggleSpeaker,
    replaceDeviceTrack,
    toggleScreenShare,
    toggleBackgroundBlur
  }
}
