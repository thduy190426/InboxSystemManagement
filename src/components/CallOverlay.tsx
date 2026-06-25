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

export function CallOverlay({ call, currentUserId, onClear, onError }: CallOverlayProps) {
  const [callStatus, setCallStatus] = useState(call.status)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(call.type === 'video')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const hasStartedPeerRef = useRef(false)
  const isCaller = call.caller.id === currentUserId
  const remoteName = isCaller ? call.conversationName : call.caller.fullName

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
      window.setTimeout(onClear, 900)
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
      audio: true,
      video: call.type === 'video',
    })

    localStreamRef.current = stream

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
    }

    return stream
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
      event.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track))
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
    window.setTimeout(onClear, 900)
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
  const statusLabel =
    callStatus === 'ringing'
      ? isCaller
        ? 'Đang đổ chuông'
        : 'Cuộc gọi đến'
      : callStatus === 'connecting'
        ? 'Đang kết nối'
        : callStatus === 'ongoing'
          ? formatElapsed()
          : callStatus === 'declined'
            ? 'Đã từ chối'
            : callStatus === 'missed'
              ? 'Cuộc gọi nhỡ'
              : 'Đã kết thúc'

  return (
    <div className="call-overlay" role="dialog" aria-modal="true">
      <section className={canShowVideo ? 'call-window is-video' : 'call-window'}>
        <header className="call-header">
          <div>
            <strong>{remoteName}</strong>
            <span>{statusLabel}</span>
          </div>
          <button onClick={hangUp} title="Đóng" type="button">
            <X size={18} />
          </button>
        </header>

        <div className="call-stage">
          {canShowVideo ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline />
              <video
                className="local-video"
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
              />
            </>
          ) : (
            <div className="audio-call-avatar">
              <AvatarFallback name={remoteName} src={call.conversationAvatar || call.caller.avatarUrl || null} />
              <strong>{remoteName}</strong>
            </div>
          )}
        </div>

        <footer className="call-controls">
          {callStatus === 'ringing' && !isCaller ? (
            <>
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
