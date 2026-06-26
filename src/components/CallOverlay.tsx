import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  acceptRealtimeCall,
  cancelRealtimeCall,
  declineRealtimeCall,
  endRealtimeCall,
  sendCallSignal,
} from '../services/callRealtime'
import type { CallSession } from '../types'
import { AvatarFallback } from './AvatarFallback'

type CallOverlayProps = {
  call: CallSession
  currentUserId: string
  onClear: () => void
  onError: (message: string) => void
}

const peerConfig: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

type DeviceOption = {
  id: string
  label: string
}

export function CallOverlay({ call, currentUserId, onClear, onError }: CallOverlayProps) {
  const [callStatus, setCallStatus] = useState(call.status)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(call.type === 'video')
  const [audioInputs, setAudioInputs] = useState<DeviceOption[]>([])
  const [videoInputs, setVideoInputs] = useState<DeviceOption[]>([])
  const [selectedAudioInputId, setSelectedAudioInputId] = useState('')
  const [selectedVideoInputId, setSelectedVideoInputId] = useState('')
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor' | 'unknown'>('unknown')
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false)
  const [isOverlayClosing, setIsOverlayClosing] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const hasStartedPeerRef = useRef(false)
  const isCaller = call.caller.id === currentUserId
  const remoteName = isCaller ? call.conversationName : call.caller.fullName
  const currentParticipant = call.participants.find((participant) => participant.id === currentUserId)
  const localAvatarName = currentParticipant?.fullName || 'Bạn'
  const localAvatarUrl = currentParticipant?.avatarUrl || null
  const remoteAvatarUrl = isCaller
    ? call.conversationAvatar || null
    : call.caller.avatarUrl || call.conversationAvatar || null

  useEffect(() => {
    refreshMediaDevices().catch(() => undefined)
  }, [])

  useEffect(() => {
    setCallStatus(call.status)

    if (call.status === 'ringing' && isCaller && !localStreamRef.current) {
      ensureLocalStream().catch((error) => {
        onError(error instanceof Error ? error.message : 'Khong the truy cap camera/micro!')
        finishCall('failed')
      })
    }

    if (call.status === 'ongoing' && isCaller && !hasStartedPeerRef.current) {
      startPeer(true).catch((error) => {
        onError(error instanceof Error ? error.message : 'Không thể kết nối cuộc gọi!')
        finishCall('failed')
      })
    }

    if (['declined', 'missed', 'cancelled', 'completed', 'failed'].includes(call.status)) {
      stopMedia()
      window.setTimeout(closeOverlay, 760)
    }
  }, [call.status])

  useEffect(() => {
    if (callStatus !== 'ongoing' && callStatus !== 'connecting') {
      return
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [callStatus])

  useEffect(() => {
    if (callStatus !== 'ongoing' && callStatus !== 'connecting') {
      setNetworkQuality('unknown')
      return
    }

    const timer = window.setInterval(() => {
      updateNetworkQuality().catch(() => undefined)
    }, 2500)

    updateNetworkQuality().catch(() => undefined)

    return () => window.clearInterval(timer)
  }, [callStatus])

  useEffect(() => () => stopMedia(), [])

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }

    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current
    }
  }, [callStatus])

  async function ensureLocalStream() {
    if (localStreamRef.current) {
      return localStreamRef.current
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Trình duyệt không hỗ trợ gọi audio/video!')
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: selectedAudioInputId ? { deviceId: { exact: selectedAudioInputId } } : true,
      video:
        call.type === 'video'
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

    setAudioInputs(nextAudioInputs)
    setVideoInputs(nextVideoInputs)
    setSelectedAudioInputId((current) => current || nextAudioInputs[0]?.id || '')
    setSelectedVideoInputId((current) => current || nextVideoInputs[0]?.id || '')
  }

  async function updateNetworkQuality() {
    const peer = peerRef.current

    if (!peer) {
      return
    }

    const stats = await peer.getStats()
    let roundTripTime = 0
    let packetsLost = 0

    stats.forEach((report) => {
      if (
        report.type === 'candidate-pair' &&
        report.state === 'succeeded' &&
        typeof report.currentRoundTripTime === 'number'
      ) {
        roundTripTime = Math.max(roundTripTime, report.currentRoundTripTime)
      }

      if (report.type === 'inbound-rtp' && typeof report.packetsLost === 'number') {
        packetsLost += Math.max(report.packetsLost, 0)
      }
    })

    if (!roundTripTime && !packetsLost) {
      setNetworkQuality('unknown')
      return
    }

    if (roundTripTime > 0.35 || packetsLost > 10) {
      setNetworkQuality('poor')
      return
    }

    if (roundTripTime > 0.18 || packetsLost > 3) {
      setNetworkQuality('fair')
      return
    }

    setNetworkQuality('good')
  }

  function createPeer() {
    if (peerRef.current) {
      return peerRef.current
    }

    const peer = new RTCPeerConnection(peerConfig)
    const remoteStream = new MediaStream()

    remoteStreamRef.current = remoteStream

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }

    peer.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteStream.addTrack(track)

        if (track.kind === 'video') {
          setHasRemoteVideo(track.enabled && !track.muted)
          track.onmute = () => setHasRemoteVideo(false)
          track.onunmute = () => setHasRemoteVideo(true)
          track.onended = () => setHasRemoteVideo(false)
        }
      })
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal(call.callId, event.candidate.toJSON())
      }
    }

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        setCallStatus('ongoing')
      }

      if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) {
        setCallStatus((current) => (current === 'ongoing' ? 'completed' : current))
      }
    }

    peerRef.current = peer
    return peer
  }

  async function startPeer(shouldCreateOffer: boolean) {
    hasStartedPeerRef.current = true
    setCallStatus('connecting')
    const stream = await ensureLocalStream()
    const peer = createPeer()

    stream.getTracks().forEach((track) => {
      if (!peer.getSenders().some((sender) => sender.track === track)) {
        peer.addTrack(track, stream)
      }
    })

    if (shouldCreateOffer) {
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      sendCallSignal(call.callId, offer)
    }
  }

  async function handleAccept() {
    try {
      await startPeer(false)
      await acceptRealtimeCall(call.callId)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Không thể nhận cuộc gọi!')
      finishCall('failed')
    }
  }

  async function handleSignal(data: RTCSessionDescriptionInit | RTCIceCandidateInit) {
    try {
      const peer = createPeer()

      if ('type' in data && data.type) {
        await startPeer(false)
        await peer.setRemoteDescription(data)

        if (data.type === 'offer') {
          const answer = await peer.createAnswer()
          await peer.setLocalDescription(answer)
          sendCallSignal(call.callId, answer)
        }

        return
      }

      if (peer.remoteDescription) {
        await peer.addIceCandidate(data as RTCIceCandidateInit)
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Không thể xử lý tín hiệu gọi!')
    }
  }

  useEffect(() => {
    const eventName = `call-signal:${call.callId}`
    const handleCallSignal = ((event: CustomEvent) => {
      handleSignal(event.detail)
    }) as EventListener

    window.addEventListener(eventName, handleCallSignal)

    return () => {
      window.removeEventListener(eventName, handleCallSignal)
    }
  }, [call.callId])

  function stopMedia() {
    peerRef.current?.close()
    peerRef.current = null
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    remoteStreamRef.current = null
  }

  function finishCall(status: CallSession['status']) {
    stopMedia()
    setCallStatus(status)
    window.setTimeout(closeOverlay, 760)
  }

  function closeOverlay() {
    setIsOverlayClosing(true)
    window.setTimeout(onClear, 140)
  }

  function rejectCall() {
    declineRealtimeCall(call.callId)
    finishCall('declined')
  }

  function hangUp() {
    if (callStatus === 'ringing' && isCaller) {
      cancelRealtimeCall(call.callId)
      finishCall('cancelled')
      return
    }

    endRealtimeCall(call.callId)
    finishCall('completed')
  }

  function toggleMic() {
    const nextEnabled = !isMicOn
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = nextEnabled
    })
    setIsMicOn(nextEnabled)
  }

  function toggleCamera() {
    const nextEnabled = !isCameraOn
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled
    })
    setIsCameraOn(nextEnabled)
  }

  function formatElapsed() {
    const minutes = Math.floor(elapsedSeconds / 60)
    const seconds = elapsedSeconds % 60

    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  const canShowVideo = call.type === 'video'
  const networkQualityLabel =
    networkQuality === 'good'
      ? 'Mạng tốt'
      : networkQuality === 'fair'
        ? 'Mạng trung bình'
        : networkQuality === 'poor'
          ? 'Mạng kém'
          : ''
  const statusLabel =
    callStatus === 'ringing'
      ? isCaller
        ? 'Đang đổ chuông'
        : 'Cuộc gọi đến'
      : callStatus === 'connecting'
        ? 'Đang kết nối...'
        : callStatus === 'ongoing'
          ? formatElapsed()
          : callStatus === 'declined'
            ? 'Đã từ chối!'
            : callStatus === 'missed'
              ? 'Cuộc gọi nhỡ'
              : 'Đã kết thúc!'

  const fullStatusLabel =
    networkQualityLabel && ['connecting', 'ongoing'].includes(callStatus)
      ? `${statusLabel} · ${networkQualityLabel}`
      : statusLabel

  return (
    <div className={isOverlayClosing ? 'call-overlay is-exiting' : 'call-overlay'} role="dialog" aria-modal="true">
      <section className={canShowVideo ? 'call-window is-video' : 'call-window'}>
        <header className="call-header">
          <div>
            <strong>{remoteName}</strong>
            <span>{fullStatusLabel}</span>
          </div>
          <button onClick={hangUp} title="Đóng" type="button">
            <X size={18} />
          </button>
        </header>

        <div className="call-stage">
          {canShowVideo ? (
            <>
              <video
                className={hasRemoteVideo ? 'remote-video' : 'remote-video is-hidden'}
                ref={remoteVideoRef}
                autoPlay
                playsInline
              />
              {!hasRemoteVideo ? (
                <div className="call-video-avatar">
                  <AvatarFallback name={remoteName} src={remoteAvatarUrl} />
                  <strong>{remoteName}</strong>
                </div>
              ) : null}
              <div className="local-video-frame">
                <video
                  className={isCameraOn ? 'local-video' : 'local-video is-hidden'}
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                />
                {!isCameraOn ? (
                  <div className="local-video-avatar">
                    <AvatarFallback name={localAvatarName} src={localAvatarUrl} />
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="audio-call-avatar">
              <AvatarFallback name={remoteName} src={call.conversationAvatar || call.caller.avatarUrl || null} />
              <strong>{remoteName}</strong>
            </div>
          )}
        </div>

        <div className="call-device-panel">
          <label>
            <Mic size={15} />
            <select
              onChange={(event) => setSelectedAudioInputId(event.target.value)}
              value={selectedAudioInputId}
            >
              {audioInputs.length ? (
                audioInputs.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.label}
                  </option>
                ))
              ) : (
                <option value="">Micro mặc định</option>
              )}
            </select>
          </label>
          {canShowVideo ? (
            <label>
              <Video size={15} />
              <select
                onChange={(event) => setSelectedVideoInputId(event.target.value)}
                value={selectedVideoInputId}
              >
                {videoInputs.length ? (
                  videoInputs.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.label}
                    </option>
                  ))
                ) : (
                  <option value="">Camera mặc định</option>
                )}
              </select>
            </label>
          ) : null}
        </div>

        <footer className="call-controls">
          {callStatus === 'ringing' && !isCaller ? (
            <>
              <button className="call-control" onClick={toggleMic} title={isMicOn ? 'Tắt mic' : 'Bật mic'} type="button">
                {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              {canShowVideo ? (
                <button className="call-control" onClick={toggleCamera} title={isCameraOn ? 'Tắt camera' : 'Bật camera'} type="button">
                  {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
              ) : null}
              <button className="call-control is-danger" onClick={rejectCall} title="Từ chối" type="button">
                <PhoneOff size={20} />
              </button>
              <button className="call-control is-accept" onClick={handleAccept} title="Nhận" type="button">
                <Phone size={20} />
              </button>
            </>
          ) : (
            <>
              <button className="call-control" onClick={toggleMic} title={isMicOn ? 'Tắt mic' : 'Bật mic'} type="button">
                {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              {canShowVideo ? (
                <button className="call-control" onClick={toggleCamera} title={isCameraOn ? 'Tắt camera' : 'Bật camera'} type="button">
                  {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
              ) : null}
              <button className="call-control is-danger" onClick={hangUp} title="Kết thúc" type="button">
                <PhoneOff size={20} />
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  )
}