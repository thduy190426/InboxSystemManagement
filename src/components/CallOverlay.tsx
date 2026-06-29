import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Video, VideoOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  acceptRealtimeCall,
  cancelRealtimeCall,
  declineRealtimeCall,
  endRealtimeCall,
  sendCallSignal,
} from '../services/callRealtime'
import type { CallSignalPayload } from '../services/callRealtime'
import { rtcPeerConfig } from '../services/rtcConfig'
import type { CallParticipant, CallSession } from '../types'
import { AvatarFallback } from './AvatarFallback'

type CallOverlayProps = {
  call: CallSession
  currentUserId: string
  onClear: () => void
  onError: (message: string) => void
}

type DeviceOption = {
  id: string
  label: string
}

type RemotePeerState = {
  participant: CallParticipant
  stream: MediaStream
  hasVideo: boolean
  connectionState: RTCPeerConnectionState
}

type PeerEntry = {
  peer: RTCPeerConnection
  stream: MediaStream
  pendingCandidates: RTCIceCandidateInit[]
  isMakingOffer: boolean
}

type SinkSelectableMediaElement = HTMLMediaElement & {
  setSinkId?: (sinkId: string) => Promise<void>
}

const FINISHED_CALL_STATUSES: CallSession['status'][] = ['declined', 'missed', 'cancelled', 'completed', 'failed']

export function CallOverlay({ call, currentUserId, onClear, onError }: CallOverlayProps) {
  const [callStatus, setCallStatus] = useState(call.status)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(call.type === 'video')
  const [audioInputs, setAudioInputs] = useState<DeviceOption[]>([])
  const [audioOutputs, setAudioOutputs] = useState<DeviceOption[]>([])
  const [videoInputs, setVideoInputs] = useState<DeviceOption[]>([])
  const [selectedAudioInputId, setSelectedAudioInputId] = useState('')
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState('default')
  const [selectedVideoInputId, setSelectedVideoInputId] = useState('')
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor' | 'unknown'>('unknown')
  const [remotePeers, setRemotePeers] = useState<Record<number, RemotePeerState>>({})
  const [isOverlayClosing, setIsOverlayClosing] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteAudioRefs = useRef(new Map<number, HTMLAudioElement>())
  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef(new Map<number, PeerEntry>())
  const currentUser = call.participants.find((participant) => participant.id === currentUserId)
  const currentUserNumericId = currentUser?.userId
  const isCaller = call.caller.id === currentUserId
  const activeParticipants = call.activeParticipants?.length ? call.activeParticipants : [call.caller]
  const joinedRemoteParticipants = activeParticipants.filter((participant) => participant.id !== currentUserId)
  const remotePeerList = Object.values(remotePeers)
  const primaryRemote = remotePeerList[0]
  const remoteName =
    remotePeerList.length > 1
      ? call.conversationName
      : primaryRemote?.participant.fullName || (isCaller ? call.conversationName : call.caller.fullName)
  const localAvatarName = currentUser?.fullName || 'Bạn'
  const localAvatarUrl = currentUser?.avatarUrl || null
  const canSelectAudioOutput =
    typeof HTMLMediaElement !== 'undefined' &&
    'setSinkId' in HTMLMediaElement.prototype

  useEffect(() => {
    refreshMediaDevices().catch(() => undefined)
  }, [])

  useEffect(() => {
    setCallStatus(call.status)

    if (call.status === 'ringing' && isCaller && !localStreamRef.current) {
      ensureLocalStream().catch((error) => {
        onError(error instanceof Error ? error.message : 'Không thể truy cập camera/micro!')
        finishCall('failed')
      })
    }

    if (FINISHED_CALL_STATUSES.includes(call.status)) {
      stopMedia()
      window.setTimeout(closeOverlay, 760)
    }
  }, [call.status])

  useEffect(() => {
    if (call.status !== 'ongoing' || !currentUserNumericId) {
      return
    }

    setCallStatus('ongoing')

    joinedRemoteParticipants.forEach((participant) => {
      if (shouldCreateOfferTo(participant.userId)) {
        startPeer(participant, true).catch((error) => {
          onError(error instanceof Error ? error.message : 'Không thể kết nối cuộc gọi!')
        })
      }
    })

    const activeRemoteIds = new Set(joinedRemoteParticipants.map((participant) => participant.userId))
    peersRef.current.forEach((_, participantUserId) => {
      if (!activeRemoteIds.has(participantUserId)) {
        removePeer(participantUserId)
      }
    })
  }, [call.status, call.activeParticipants, currentUserNumericId])

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
  }, [callStatus, isCameraOn])

  useEffect(() => {
    applyAudioOutputDevice(selectedAudioOutputId).catch((error) => {
      onError(error instanceof Error ? error.message : 'Không thể chọn loa khác!')
    })
  }, [selectedAudioOutputId])

  useEffect(() => {
    remoteAudioRefs.current.forEach((audio) => {
      audio.muted = !isSpeakerOn
    })
  }, [isSpeakerOn, remotePeers])

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

  async function applyAudioOutputDevice(deviceId: string) {
    const tasks = Array.from(remoteAudioRefs.current.values()).map((media) => {
      const remoteMedia = media as SinkSelectableMediaElement
      return remoteMedia.setSinkId?.(deviceId || 'default')
    })

    await Promise.all(tasks)
  }

  async function updateNetworkQuality() {
    const peers = Array.from(peersRef.current.values())

    if (!peers.length) {
      return
    }

    let roundTripTime = 0
    let packetsLost = 0

    await Promise.all(
      peers.map(async ({ peer }) => {
        const stats = await peer.getStats()

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
      }),
    )

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

  function shouldCreateOfferTo(participantUserId: number) {
    return Boolean(currentUserNumericId && currentUserNumericId < participantUserId && !peersRef.current.has(participantUserId))
  }

  function upsertRemotePeer(participant: CallParticipant, patch: Partial<RemotePeerState>) {
    setRemotePeers((current) => {
      const existing = current[participant.userId]
      const nextStream = existing?.stream || patch.stream || new MediaStream()
      const hasActiveVideo = nextStream
        .getVideoTracks()
        .some((track) => track.readyState === 'live' && track.enabled && !track.muted)

      return {
        ...current,
        [participant.userId]: {
          participant,
          stream: nextStream,
          hasVideo: patch.hasVideo ?? (hasActiveVideo || existing?.hasVideo || false),
          connectionState: patch.connectionState ?? existing?.connectionState ?? 'new',
        },
      }
    })
  }

  function createPeer(participant: CallParticipant) {
    const existing = peersRef.current.get(participant.userId)

    if (existing) {
      return existing
    }

    const peer = new RTCPeerConnection(rtcPeerConfig)
    const stream = new MediaStream()
    const entry: PeerEntry = {
      peer,
      stream,
      pendingCandidates: [],
      isMakingOffer: false,
    }

    upsertRemotePeer(participant, { stream, connectionState: peer.connectionState })

    peer.onnegotiationneeded = () => {
      if (!shouldCreateOfferTo(participant.userId)) {
        return
      }

      makeOffer(participant, entry).catch((error) => {
        onError(error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ káº¿t ná»‘i cuá»™c gá»i!')
      })
    }

    peer.ontrack = (event) => {
      const tracks = event.streams[0]?.getTracks().length ? event.streams[0].getTracks() : [event.track]

      tracks.forEach((track) => {
        if (!stream.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
          stream.addTrack(track)
        }

        if (track.kind === 'video') {
          upsertRemotePeer(participant, { stream, hasVideo: track.readyState === 'live' })
          track.onmute = () => upsertRemotePeer(participant, { hasVideo: false })
          track.onunmute = () => upsertRemotePeer(participant, { hasVideo: true })
          track.onended = () => upsertRemotePeer(participant, { hasVideo: false })
        }
      })

      upsertRemotePeer(participant, { stream })
    }

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal(call.callId, event.candidate.toJSON(), participant.userId)
      }
    }

    peer.onconnectionstatechange = () => {
      upsertRemotePeer(participant, { connectionState: peer.connectionState })

      if (peer.connectionState === 'connected') {
        setCallStatus('ongoing')
      }

      if (['failed', 'closed'].includes(peer.connectionState)) {
        removePeer(participant.userId)
      }
    }

    peersRef.current.set(participant.userId, entry)
    return entry
  }

  async function addLocalTracks(peer: RTCPeerConnection) {
    const stream = await ensureLocalStream()

    stream.getTracks().forEach((track) => {
      if (!peer.getSenders().some((sender) => sender.track === track)) {
        peer.addTrack(track, stream)
      }
    })
  }

  async function flushPendingCandidates(entry: PeerEntry) {
    if (!entry.peer.remoteDescription) {
      return
    }

    const pendingCandidates = entry.pendingCandidates.splice(0)
    await Promise.all(pendingCandidates.map((candidate) => entry.peer.addIceCandidate(candidate)))
  }

  async function startPeer(participant: CallParticipant, shouldCreateOffer: boolean) {
    setCallStatus('connecting')
    const entry = createPeer(participant)
    await addLocalTracks(entry.peer)

    if (shouldCreateOffer) {
      await makeOffer(participant, entry)
    }
  }

  async function makeOffer(participant: CallParticipant, entry: PeerEntry) {
    if (entry.isMakingOffer || entry.peer.signalingState !== 'stable') {
      return
    }

    entry.isMakingOffer = true

    try {
      const offer = await entry.peer.createOffer()
      await entry.peer.setLocalDescription(offer)
      sendCallSignal(call.callId, offer, participant.userId)
    } finally {
      entry.isMakingOffer = false
    }
  }

  async function handleAccept() {
    try {
      await ensureLocalStream()
      await acceptRealtimeCall(call.callId)
      setCallStatus('ongoing')
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Không thể nhận cuộc gọi!')
      finishCall('failed')
    }
  }

  function findParticipantByUserId(userId: number) {
    return call.participants.find((participant) => participant.userId === userId)
  }

  async function handleSignal(payload: Partial<CallSignalPayload>) {
    if (!payload.data || !payload.from || payload.from.userId === currentUserNumericId) {
      return
    }

    if (payload.toUserId && payload.toUserId !== currentUserNumericId) {
      return
    }

    const participant = findParticipantByUserId(payload.from.userId)

    if (!participant) {
      return
    }

    try {
      const entry = createPeer(participant)

      if ('type' in payload.data && payload.data.type) {
        await addLocalTracks(entry.peer)

        const isOffer = payload.data.type === 'offer'
        const shouldIgnoreOffer =
          isOffer &&
          (entry.isMakingOffer || entry.peer.signalingState !== 'stable') &&
          !shouldCreateOfferTo(participant.userId)

        if (shouldIgnoreOffer) {
          return
        }

        if (isOffer && entry.peer.signalingState !== 'stable') {
          await Promise.all([
            entry.peer.setLocalDescription({ type: 'rollback' }),
            entry.peer.setRemoteDescription(payload.data),
          ])
        } else {
          await entry.peer.setRemoteDescription(payload.data)
        }

        await flushPendingCandidates(entry)

        if (isOffer) {
          const answer = await entry.peer.createAnswer()
          await entry.peer.setLocalDescription(answer)
          sendCallSignal(call.callId, answer, participant.userId)
        }

        return
      }

      if (entry.peer.remoteDescription) {
        await entry.peer.addIceCandidate(payload.data as RTCIceCandidateInit)
      } else {
        entry.pendingCandidates.push(payload.data as RTCIceCandidateInit)
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Không thể xử lý tín hiệu gọi!')
    }
  }

  useEffect(() => {
    const eventName = `call-signal:${call.callId}`
    const handleCallSignal = ((event: CustomEvent<Partial<CallSignalPayload>>) => {
      handleSignal(event.detail)
    }) as EventListener

    window.addEventListener(eventName, handleCallSignal)

    return () => {
      window.removeEventListener(eventName, handleCallSignal)
    }
  }, [call.callId, call.participants, currentUserNumericId])

  function removePeer(participantUserId: number) {
    const entry = peersRef.current.get(participantUserId)
    entry?.peer.close()
    entry?.stream.getTracks().forEach((track) => track.stop())
    peersRef.current.delete(participantUserId)
    remoteAudioRefs.current.delete(participantUserId)
    setRemotePeers((current) => {
      const next = { ...current }
      delete next[participantUserId]
      return next
    })
  }

  function stopMedia() {
    peersRef.current.forEach((entry) => {
      entry.peer.close()
      entry.stream.getTracks().forEach((track) => track.stop())
    })
    peersRef.current.clear()
    remoteAudioRefs.current.clear()
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    setRemotePeers({})
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

  function toggleSpeaker() {
    const nextEnabled = !isSpeakerOn

    remoteAudioRefs.current.forEach((audio) => {
      audio.muted = !nextEnabled
    })

    setIsSpeakerOn(nextEnabled)
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

        <div className={canShowVideo ? 'call-stage is-grid' : 'call-stage'}>
          {remotePeerList.map((remotePeer) => (
            <audio
              key={`audio-${remotePeer.participant.userId}`}
              ref={(node) => {
                if (node) {
                  node.srcObject = remotePeer.stream
                  node.muted = !isSpeakerOn
                  remoteAudioRefs.current.set(remotePeer.participant.userId, node)
                  applyAudioOutputDevice(selectedAudioOutputId).catch(() => undefined)
                } else {
                  remoteAudioRefs.current.delete(remotePeer.participant.userId)
                }
              }}
              autoPlay
              hidden
            />
          ))}
          {canShowVideo ? (
            <>
              <div className={remotePeerList.length > 1 ? 'remote-video-grid' : 'remote-video-grid is-single'}>
                {remotePeerList.length ? (
                  remotePeerList.map((remotePeer) => (
                    <div className="remote-video-tile" key={remotePeer.participant.userId}>
                      <video
                        className={remotePeer.hasVideo ? 'remote-video' : 'remote-video is-hidden'}
                        ref={(node) => {
                          if (node) {
                            node.srcObject = remotePeer.stream
                            node.muted = true
                          }
                        }}
                        autoPlay
                        playsInline
                      />
                      {!remotePeer.hasVideo ? (
                        <div className="call-video-avatar">
                          <AvatarFallback name={remotePeer.participant.fullName} src={remotePeer.participant.avatarUrl || null} />
                          <strong>{remotePeer.participant.fullName}</strong>
                        </div>
                      ) : (
                        <span>{remotePeer.participant.fullName}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="call-video-avatar">
                    <AvatarFallback name={remoteName} src={call.conversationAvatar || call.caller.avatarUrl || null} />
                    <strong>{remoteName}</strong>
                  </div>
                )}
              </div>
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
              {remotePeerList.length > 1 ? <small>{remotePeerList.length} người đang tham gia</small> : null}
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
          <label>
            <Volume2 size={15} />
            <select
              disabled={!canSelectAudioOutput}
              onChange={(event) => setSelectedAudioOutputId(event.target.value)}
              value={selectedAudioOutputId}
            >
              <option value="default">Loa mặc định</option>
              {audioOutputs.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.label}
                </option>
              ))}
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
              <button className="call-control" onClick={toggleSpeaker} title={isSpeakerOn ? 'Tắt loa' : 'Bật loa'} type="button">
                {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
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
              <button className="call-control" onClick={toggleSpeaker} title={isSpeakerOn ? 'Tắt loa' : 'Bật loa'} type="button">
                {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
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
