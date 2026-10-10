import { Signal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  acceptRealtimeCall,
  cancelRealtimeCall,
  declineRealtimeCall,
  endRealtimeCall,
  markRealtimeCallMissed,
  sendCallSignal,
} from '../../services/realtime/callRealtime'
import type { CallSignalPayload } from '../../services/realtime/callRealtime'
import { rtcPeerConfig } from '../../services/realtime/rtcConfig'
import type { CallParticipant, CallSession } from '../../types'


type DeviceOption = {
  id: string
  label: string
}

type RemotePeerState = {
  participant: CallParticipant
  stream: MediaStream
  hasVideo: boolean
  connectionState: RTCPeerConnectionState
  isAudioMuted?: boolean
}

type PeerEntry = {
  peer: RTCPeerConnection
  stream: MediaStream
  pendingCandidates: RTCIceCandidateInit[]
  isMakingOffer: boolean
}
type RingbackTone = {
  context: AudioContext
  gain: GainNode
  oscillators: OscillatorNode[]
  timerId: number
}

type AudioWindow = Window & {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

const FINISHED_CALL_STATUSES: CallSession['status'][] = ['declined', 'missed', 'cancelled', 'completed', 'failed']
const OUTGOING_CALL_ANSWER_TIMEOUT_MS = 60_000
const LOCAL_FINISH_TONE_NOTES = [660, 440]
const REMOTE_FINISH_TONE_NOTES = [520, 390, 260]
const CONNECTED_TONE_NOTES = [520, 660, 880]
import type { CallOverlayProps } from '../../components/media/CallOverlay'

export function useCallOverlayController(props: CallOverlayProps) {
  const {
    call, currentUserId, onClear, onError
  } = props

  const { t } = useTranslation()
  const [callStatus, setCallStatus] = useState(call.status)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(call.type === 'video')
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isPiPMode, setIsPiPMode] = useState(false)
  const [isBlurOn, setIsBlurOn] = useState(false)
  const pipWindowRef = useRef<any>(null)
  const blurCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null)
  const segmenterRef = useRef<any>(null)
  const blurRafId = useRef<number | null>(null)
  const rawStreamRef = useRef<MediaStream | null>(null)
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
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)
  const [overlaySize, setOverlaySize] = useState<{ width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const callShellRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{
    pointerId: number
    offsetX: number
    offsetY: number
    width: number
    height: number
  } | null>(null)
  const resizeStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    left: number
    top: number
  } | null>(null)
  const ringbackToneRef = useRef<RingbackTone | null>(null)
  const customRingtoneRef = useRef<HTMLAudioElement | null>(null)
  const finishedLocallyRef = useRef(false)
  const hasPlayedFinishToneRef = useRef(false)
  const hasPlayedConnectedToneRef = useRef(false)
  const prevNetworkStatsRef = useRef<{ timestamp: number; packetsLost: number; packetsReceived: number } | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef(new Map<number, PeerEntry>())
  const currentUser = call.participants.find((participant) => participant.id === currentUserId)
  const currentUserNumericId = currentUser?.userId
  const isCaller = call.caller.id === currentUserId
  const activeParticipants = call.activeParticipants?.length ? call.activeParticipants : [call.caller]
  const joinedRemoteParticipants = activeParticipants.filter((participant) => participant.id !== currentUserId)
  const remotePeerList = Object.values(remotePeers)
  const primaryRemote = remotePeerList[0]
  const directRemoteParticipant =
    call.participants.length === 2 ? call.participants.find((p) => p.id !== currentUserId) : undefined

  let remoteName = ''
  let remoteAvatarUrl: string | null = null

  if (remotePeerList.length > 1) {
    remoteName = call.conversationName
    remoteAvatarUrl = call.conversationAvatar || null
  } else if (primaryRemote) {
    remoteName = primaryRemote.participant.fullName
    remoteAvatarUrl = primaryRemote.participant.avatarUrl || null
  } else if (directRemoteParticipant) {
    remoteName = directRemoteParticipant.fullName
    remoteAvatarUrl = directRemoteParticipant.avatarUrl || null
  } else {
    remoteName = isCaller ? call.conversationName : call.caller.fullName
    remoteAvatarUrl = isCaller ? (call.conversationAvatar || null) : (call.caller.avatarUrl || null)
  }
  const localAvatarName = currentUser?.fullName || t('you', { defaultValue: 'Bạn' })
  const localAvatarUrl = currentUser?.avatarUrl || null
  const canSelectAudioOutput =
    typeof HTMLMediaElement !== 'undefined' &&
    'setSinkId' in HTMLMediaElement.prototype

  useEffect(() => {
    refreshMediaDevices().catch(() => undefined)
    return () => {
      if (blurRafId.current) cancelAnimationFrame(blurRafId.current)
      if (segmenterRef.current) segmenterRef.current.close()
    }
  }, [])

  useEffect(() => {
    function keepOverlayInsideViewport() {
      if (!dragPosition || !callShellRef.current) {
        return
      }

      const { width, height } = callShellRef.current.getBoundingClientRect()
      setDragPosition(clampOverlayPosition(dragPosition.x, dragPosition.y, width, height))
      setOverlaySize((current) => (current ? clampOverlaySize(current.width, current.height, call.type === 'video') : current))
    }

    window.addEventListener('resize', keepOverlayInsideViewport)
    return () => window.removeEventListener('resize', keepOverlayInsideViewport)
  }, [call.type, dragPosition])

  useEffect(() => {
    setCallStatus(call.status)

    if (call.status === 'ringing' && isCaller && !localStreamRef.current) {
      ensureLocalStream().catch((error) => {
        onError(error instanceof Error ? error.message : t('errNoCamMic', { defaultValue: 'Không thể truy cập camera/micro!' }))
        finishCall('failed')
      })
    }

    if (FINISHED_CALL_STATUSES.includes(call.status)) {
      playFinishTone(finishedLocallyRef.current ? 'local' : 'remote')
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
          onError(error instanceof Error ? error.message : t('errCallConnect', { defaultValue: 'Không thể kết nối cuộc gọi!' }))
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
    if (callStatus === 'ongoing' && !hasPlayedConnectedToneRef.current) {
      hasPlayedConnectedToneRef.current = true
      playToneSequence(CONNECTED_TONE_NOTES, 0.08)
    }

    if (callStatus === 'ringing') {
      startRingbackTone()
    } else {
      stopRingbackTone()
    }

    return stopRingbackTone
  }, [callStatus, isCaller])

  useEffect(() => {
    const isWaitingForAnswerOrConnection =
      callStatus === 'ringing' || (callStatus === 'connecting' && remotePeerList.length === 0)

    if (!isCaller || !isWaitingForAnswerOrConnection) {
      return
    }

    const startedAtTime = call.startedAt ? new Date(call.startedAt).getTime() : Date.now()
    const elapsedMs = Number.isNaN(startedAtTime) ? 0 : Math.max(Date.now() - startedAtTime, 0)
    const remainingMs = Math.max(OUTGOING_CALL_ANSWER_TIMEOUT_MS - elapsedMs, 0)
    const timeoutId = window.setTimeout(() => {
      markRealtimeCallMissed(call.callId)
      finishCall('missed', 'local')
    }, remainingMs)

    return () => window.clearTimeout(timeoutId)
  }, [call.callId, call.startedAt, callStatus, isCaller, remotePeerList.length])

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
    async function replaceDeviceTrack() {
      if (!localStreamRef.current || callStatus !== 'ongoing') return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudioInputId ? { deviceId: { exact: selectedAudioInputId }, noiseSuppression: true, echoCancellation: true } : { noiseSuppression: true, echoCancellation: true },
          video: call.type === 'video' ? (selectedVideoInputId ? { deviceId: { exact: selectedVideoInputId } } : true) : false,
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
        
        peersRef.current.forEach(({ peer }) => {
          const senders = peer.getSenders()
          const audioTrack = newStream.getAudioTracks()[0]
          if (audioTrack) {
            const audioSender = senders.find(s => s.track?.kind === 'audio')
            if (audioSender) audioSender.replaceTrack(audioTrack)
          }
          const videoTrack = newStream.getVideoTracks()[0]
          if (videoTrack) {
            const videoSender = senders.find(s => s.track?.kind === 'video')
            if (videoSender) videoSender.replaceTrack(videoTrack)
          }
        })
      } catch (e) {
        console.error('Failed to replace track', e)
      }
    }
    if (!isScreenSharing) replaceDeviceTrack()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudioInputId, selectedVideoInputId])


  async function ensureLocalStream() {
    if (localStreamRef.current) {
      return localStreamRef.current
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(t('errBrowserNotSupport', { defaultValue: 'Trình duyệt không hỗ trợ gọi audio/video!' }))
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: selectedAudioInputId ? { deviceId: { exact: selectedAudioInputId }, noiseSuppression: true, echoCancellation: true } : { noiseSuppression: true, echoCancellation: true },
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


  async function updateNetworkQuality() {
    const peers = Array.from(peersRef.current.values())

    if (!peers.length) {
      return
    }

    let currentRoundTripTime = 0
    let maxJitter = 0
    let totalPacketsLost = 0
    let totalPacketsReceived = 0

    await Promise.all(
      peers.map(async ({ peer }) => {
        const stats = await peer.getStats()

        stats.forEach((report) => {
          if (
            report.type === 'candidate-pair' &&
            report.state === 'succeeded' &&
            typeof report.currentRoundTripTime === 'number'
          ) {
            currentRoundTripTime = Math.max(currentRoundTripTime, report.currentRoundTripTime)
          }

          if (report.type === 'inbound-rtp') {
            if (typeof report.packetsLost === 'number') {
              totalPacketsLost += Math.max(report.packetsLost, 0)
            }
            if (typeof report.packetsReceived === 'number') {
              totalPacketsReceived += Math.max(report.packetsReceived, 0)
            }
            if (typeof report.jitter === 'number') {
              maxJitter = Math.max(maxJitter, report.jitter)
            }
          }
        })
      }),
    )

    const now = performance.now()
    const prevStats = prevNetworkStatsRef.current

    prevNetworkStatsRef.current = {
      timestamp: now,
      packetsLost: totalPacketsLost,
      packetsReceived: totalPacketsReceived,
    }

    if (!currentRoundTripTime && !totalPacketsLost && !totalPacketsReceived) {
      setNetworkQuality('unknown')
      return
    }

    let packetLossRate = 0
    if (prevStats) {
      const lostDiff = Math.max(0, totalPacketsLost - prevStats.packetsLost)
      const receivedDiff = Math.max(0, totalPacketsReceived - prevStats.packetsReceived)
      const totalDiff = lostDiff + receivedDiff
      
      if (totalDiff > 0) {
        packetLossRate = lostDiff / totalDiff
      }
    }

    if (currentRoundTripTime > 0.35 || packetLossRate > 0.05 || maxJitter > 0.1) {
      setNetworkQuality('poor')
      return
    }

    if (currentRoundTripTime > 0.18 || packetLossRate > 0.02 || maxJitter > 0.04) {
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
        sendCallSignal(call.callId, call.conversationId, event.candidate.toJSON(), participant.userId)
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
      sendCallSignal(call.callId, call.conversationId, offer, participant.userId)
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
      onError(error instanceof Error ? error.message : t('errReceiveCall', { defaultValue: 'Không thể nhận cuộc gọi!' }))
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

      if (payload.data && 'type' in payload.data && payload.data.type) {
        const payloadData = payload.data as any
        if (payloadData.type === 'mute-state') {
          setRemotePeers((current) => {
            const peerState = current[participant.userId]
            if (!peerState) return current
            return {
              ...current,
              [participant.userId]: {
                ...peerState,
                isAudioMuted: Boolean(payloadData.isMuted),
              },
            }
          })
          return
        }

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
            entry.peer.setRemoteDescription(payload.data as RTCSessionDescriptionInit),
          ])
        } else {
          await entry.peer.setRemoteDescription(payload.data as RTCSessionDescriptionInit)
        }

        await flushPendingCandidates(entry)

        if (isOffer) {
          const answer = await entry.peer.createAnswer()
          await entry.peer.setLocalDescription(answer)
          sendCallSignal(call.callId, call.conversationId, answer, participant.userId)
        }

        return
      }

      if (entry.peer.remoteDescription) {
        await entry.peer.addIceCandidate(payload.data as RTCIceCandidateInit)
      } else {
        entry.pendingCandidates.push(payload.data as RTCIceCandidateInit)
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : t('errCallSignal', { defaultValue: 'Không thể xử lý tín hiệu gọi!' }))
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
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    setRemotePeers({})
  }

  function startRingbackTone() {
    if (call.direction === 'incoming') {
      const customRingtones: Record<string, string> = {
        // 'Trần Hoàng Duy': '/audio/TDuy.mp3',
        // 'Bảo Nghi': '/audio/BNghi.mp3',
      }
      
      const ringtonePath = customRingtones[call.caller.fullName]
      if (ringtonePath) {
        if (customRingtoneRef.current) return
        const audio = new Audio(ringtonePath)
        audio.loop = true
        audio.play().catch(() => undefined)
        customRingtoneRef.current = audio
      }
      return
    }

    if (ringbackToneRef.current || typeof AudioContext === 'undefined') {
      return
    }

    const audioWindow = window as AudioWindow
    const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext
    if (!AudioContextConstructor) {
      return
    }

    const context = new AudioContextConstructor()
    const gain = context.createGain()
    const oscillators = [context.createOscillator(), context.createOscillator()]
    const setAudible = (isAudible: boolean) => {
      gain.gain.cancelScheduledValues(context.currentTime)
      gain.gain.setTargetAtTime(isAudible ? 0.055 : 0.0001, context.currentTime, 0.025)
    }

    oscillators[0].frequency.value = 440
    oscillators[1].frequency.value = 480
    oscillators.forEach((oscillator) => {
      oscillator.type = 'sine'
      oscillator.connect(gain)
      oscillator.start()
    })
    gain.gain.value = 0.0001
    gain.connect(context.destination)

    let isAudible = false
    const pulseTone = () => {
      isAudible = !isAudible
      setAudible(isAudible)
    }

    pulseTone()
    const timerId = window.setInterval(pulseTone, 2000)
    ringbackToneRef.current = { context, gain, oscillators, timerId }

    context.resume().catch(() => undefined)
  }

  function stopRingbackTone() {
    if (customRingtoneRef.current) {
      customRingtoneRef.current.pause()
      customRingtoneRef.current.currentTime = 0
      customRingtoneRef.current = null
    }

    const ringbackTone = ringbackToneRef.current
    if (!ringbackTone) {
      return
    }

    window.clearInterval(ringbackTone.timerId)
    ringbackTone.gain.gain.setTargetAtTime(0.0001, ringbackTone.context.currentTime, 0.02)
    ringbackTone.oscillators.forEach((oscillator) => {
      oscillator.stop(ringbackTone.context.currentTime + 0.04)
    })
    window.setTimeout(() => {
      ringbackTone.context.close().catch(() => undefined)
    }, 80)
    ringbackToneRef.current = null
  }

  function playToneSequence(notes: number[], noteDuration = 0.13) {
    const audioWindow = window as AudioWindow
    const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext
    if (!AudioContextConstructor) {
      return
    }

    const context = new AudioContextConstructor()
    const gain = context.createGain()
    gain.gain.value = 0.0001
    gain.connect(context.destination)

    notes.forEach((frequency, index) => {
      const startAt = context.currentTime + index * noteDuration
      const oscillator = context.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      oscillator.connect(gain)
      gain.gain.setTargetAtTime(0.075, startAt, 0.012)
      gain.gain.setTargetAtTime(0.0001, startAt + noteDuration * 0.72, 0.018)
      oscillator.start(startAt)
      oscillator.stop(startAt + noteDuration)
    })

    context.resume().catch(() => undefined)
    window.setTimeout(() => {
      context.close().catch(() => undefined)
    }, notes.length * noteDuration * 1000 + 160)
  }

  function playFinishTone(source: 'local' | 'remote') {
    if (hasPlayedFinishToneRef.current) {
      return
    }

    hasPlayedFinishToneRef.current = true
    stopRingbackTone()
    playToneSequence(source === 'local' ? LOCAL_FINISH_TONE_NOTES : REMOTE_FINISH_TONE_NOTES)
  }

  function finishCall(status: CallSession['status'], source: 'local' | 'remote' = 'remote') {
    if (source === 'local') {
      finishedLocallyRef.current = true
    }
    playFinishTone(source)
    stopRingbackTone()
    stopMedia()
    setCallStatus(status)
    window.setTimeout(closeOverlay, 760)
  }

  function closeOverlay() {
    stopRingbackTone()
    setIsOverlayClosing(true)
    window.setTimeout(onClear, 140)
  }

  function rejectCall() {
    declineRealtimeCall(call.callId)
    finishCall('declined', 'local')
  }

  function hangUp() {
    if (callStatus === 'ringing' && isCaller) {
      cancelRealtimeCall(call.callId)
      finishCall('cancelled', 'local')
      return
    }

    endRealtimeCall(call.callId)
    finishCall('completed', 'local')
  }

  function isDesktopDragAvailable() {
    return window.matchMedia('(min-width: 769px) and (pointer: fine)').matches
  }

  function getOverlaySizeLimits(isVideoCall: boolean) {
    const padding = 12
    const minWidth = isVideoCall ? 520 : 360
    const minHeight = isVideoCall ? 480 : 380

    return {
      minWidth: Math.min(minWidth, window.innerWidth - padding * 2),
      minHeight: Math.min(minHeight, window.innerHeight - padding * 2),
      maxWidth: Math.max(280, window.innerWidth - padding * 2),
      maxHeight: Math.max(320, window.innerHeight - padding * 2),
    }
  }

  function clampOverlaySize(width: number, height: number, isVideoCall: boolean) {
    const limits = getOverlaySizeLimits(isVideoCall)

    return {
      width: Math.min(Math.max(limits.minWidth, width), limits.maxWidth),
      height: Math.min(Math.max(limits.minHeight, height), limits.maxHeight),
    }
  }

  function clampOverlayPosition(x: number, y: number, width: number, height: number) {
    const padding = 12

    return {
      x: Math.min(Math.max(padding, x), Math.max(padding, window.innerWidth - width - padding)),
      y: Math.min(Math.max(padding, y), Math.max(padding, window.innerHeight - height - padding)),
    }
  }

  function startDraggingOverlay(event: React.PointerEvent<HTMLElement>) {
    if (!isDesktopDragAvailable() || event.button !== 0 || !callShellRef.current) {
      return
    }

    const target = event.target as HTMLElement
    if (target.closest('button, select, input, textarea, a')) {
      return
    }

    const rect = callShellRef.current.getBoundingClientRect()
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    }
    setDragPosition({ x: rect.left, y: rect.top })
    setOverlaySize((current) => current || { width: rect.width, height: rect.height })
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function dragOverlay(event: React.PointerEvent<HTMLElement>) {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    setDragPosition(
      clampOverlayPosition(
        event.clientX - dragState.offsetX,
        event.clientY - dragState.offsetY,
        dragState.width,
        dragState.height,
      ),
    )
  }

  function stopDraggingOverlay(event: React.PointerEvent<HTMLElement>) {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return
    }

    dragStateRef.current = null
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function startResizingOverlay(event: React.PointerEvent<HTMLButtonElement>) {
    if (!isDesktopDragAvailable() || event.button !== 0 || !callShellRef.current) {
      return
    }

    const rect = callShellRef.current.getBoundingClientRect()
    resizeStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      left: rect.left,
      top: rect.top,
    }
    setDragPosition({ x: rect.left, y: rect.top })
    setOverlaySize({ width: rect.width, height: rect.height })
    setIsResizing(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function resizeOverlay(event: React.PointerEvent<HTMLButtonElement>) {
    const resizeState = resizeStateRef.current
    if (!resizeState || resizeState.pointerId !== event.pointerId) {
      return
    }

    const nextSize = clampOverlaySize(
      Math.min(resizeState.startWidth + event.clientX - resizeState.startX, window.innerWidth - resizeState.left - 12),
      Math.min(resizeState.startHeight + event.clientY - resizeState.startY, window.innerHeight - resizeState.top - 12),
      canShowVideo,
    )

    setOverlaySize(nextSize)
    setDragPosition(clampOverlayPosition(resizeState.left, resizeState.top, nextSize.width, nextSize.height))
  }

  function stopResizingOverlay(event: React.PointerEvent<HTMLButtonElement>) {
    if (resizeStateRef.current?.pointerId !== event.pointerId) {
      return
    }

    resizeStateRef.current = null
    setIsResizing(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function toggleMic() {
    const nextEnabled = !isMicOn
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = nextEnabled
    })
    setIsMicOn(nextEnabled)
    sendCallSignal(call.callId, call.conversationId, { type: 'mute-state', isMuted: !nextEnabled } as any)
  }

  function toggleSpeaker() {
    setIsSpeakerOn((current) => !current)
  }

  function toggleCamera() {
    const nextEnabled = !isCameraOn
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled
    })
    setIsCameraOn(nextEnabled)
  }

  async function toggleScreenShare() {
    if (isScreenSharing) {
      setIsScreenSharing(false)
      try {
        const stream = await ensureLocalStream()
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          peersRef.current.forEach(({ peer }) => {
            const sender = peer.getSenders().find(s => s.track?.kind === 'video')
            if (sender) sender.replaceTrack(videoTrack)
          })
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

      peersRef.current.forEach(({ peer }) => {
        const sender = peer.getSenders().find(s => s.track?.kind === 'video')
        if (sender) sender.replaceTrack(screenTrack)
      })

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([screenTrack])
      }
      setIsScreenSharing(true)
    } catch (error) {
      onError(t('errScreenShare', { defaultValue: 'Không thể chia sẻ màn hình' }))
    }
  }

  async function togglePiP() {
    if (!('documentPictureInPicture' in window)) {
      onError(t('pipNotSupported', { defaultValue: 'Trình duyệt không hỗ trợ Document Picture-in-Picture!' }))
      return
    }

    if (pipWindowRef.current) {
      pipWindowRef.current.close()
      return
    }

    try {
      const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
        width: 380,
        height: 500,
      })
      pipWindowRef.current = pipWindow
      setIsPiPMode(true)

      if (callShellRef.current) {
        pipWindow.document.body.append(callShellRef.current)
      }

      Array.from(document.styleSheets).forEach((styleSheet) => {
        try {
          const style = document.createElement('style')
          style.textContent = Array.from(styleSheet.cssRules).map(r => r.cssText).join('')
          pipWindow.document.head.append(style)
        } catch (e) {
          if (styleSheet.href) {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = styleSheet.href
            pipWindow.document.head.append(link)
          }
        }
      })

      pipWindow.addEventListener('pagehide', () => {
        setIsPiPMode(false)
        pipWindowRef.current = null
        if (callShellRef.current) {
          document.querySelector('.call-overlay')?.append(callShellRef.current)
        }
      })
    } catch (error) {
      onError(t('pipFailed', { defaultValue: 'Không thể mở Picture-in-Picture!' }))
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
            peersRef.current.forEach(({ peer }) => {
              const sender = peer.getSenders().find(s => s.track?.kind === 'video')
              if (sender) sender.replaceTrack(rawVideoTrack)
            })
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

      peersRef.current.forEach(({ peer }) => {
        const sender = peer.getSenders().find(s => s.track?.kind === 'video')
        if (sender) sender.replaceTrack(processedVideoTrack)
      })

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
      }

    } catch (error) {
      console.error(error)
      onError(t('blurFailed', { defaultValue: 'Không thể khởi tạo Mờ phông nền!' }))
      setIsBlurOn(false)
    }
  }

  function formatElapsed() {
    const minutes = Math.floor(elapsedSeconds / 60)
    const seconds = elapsedSeconds % 60

    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  const canShowVideo = call.type === 'video'
  const networkQualityLabel =
    networkQuality === 'good'
      ? t('netGood', { defaultValue: 'Mạng tốt' })
      : networkQuality === 'fair'
        ? t('netMedium', { defaultValue: 'Mạng trung bình' })
        : networkQuality === 'poor'
          ? t('netPoor', { defaultValue: 'Mạng kém' })
          : ''
  const statusLabel =
    callStatus === 'ringing'
      ? isCaller
        ? t('ringing', { defaultValue: 'Đang đổ chuông' })
        : t('incomingCall', { defaultValue: 'Cuộc gọi đến' })
      : callStatus === 'connecting'
        ? t('connecting', { defaultValue: 'Đang kết nối...' })
        : callStatus === 'ongoing'
          ? formatElapsed()
          : callStatus === 'declined'
            ? t('rejected', { defaultValue: 'Đã từ chối!' })
            : callStatus === 'missed'
              ? t('missedCall', { defaultValue: 'Cuộc gọi nhỡ' })
              : t('ended', { defaultValue: 'Đã kết thúc!' })
  const displayStatusLabel = callStatus === 'missed' ? t('noAnswer', { defaultValue: 'Không bắt máy' }) : statusLabel
  const fullStatusLabel =
    networkQualityLabel && ['connecting', 'ongoing'].includes(callStatus)
      ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {statusLabel} &middot;
            {networkQuality === 'poor' && <Signal size={12} color="var(--danger-color)" />}
            {networkQuality === 'fair' && <Signal size={12} color="var(--warning-color)" />}
            {networkQuality === 'good' && <Signal size={12} color="var(--success-color)" />}
            {networkQualityLabel}
          </span>
        )
      : displayStatusLabel

  const isEnded = ['declined', 'missed', 'completed', 'cancelled', 'timeout', 'left'].includes(callStatus)

  return {
    activeParticipants,
    addLocalTracks,
    audioInputs,
    audioOutputs,
    blurCanvasRef,
    blurRafId,
    callShellRef,
    callStatus,
    canSelectAudioOutput,
    canShowVideo,
    clampOverlayPosition,
    clampOverlaySize,
    closeOverlay,
    createPeer,
    currentUser,
    currentUserNumericId,
    customRingtoneRef,
    directRemoteParticipant,
    displayStatusLabel,
    dragOverlay,
    dragPosition,
    dragStateRef,
    elapsedSeconds,
    ensureLocalStream,
    findParticipantByUserId,
    finishCall,
    finishedLocallyRef,
    flushPendingCandidates,
    formatElapsed,
    fullStatusLabel,
    getOverlaySizeLimits,
    handleAccept,
    handleSignal,
    hangUp,
    hasPlayedConnectedToneRef,
    hasPlayedFinishToneRef,
    hiddenVideoRef,
    isBlurOn,
    isCaller,
    isCameraOn,
    isDesktopDragAvailable,
    isDragging,
    isEnded,
    isMicOn,
    isMinimized,
    isOverlayClosing,
    isPiPMode,
    isResizing,
    isScreenSharing,
    isSpeakerOn,
    joinedRemoteParticipants,
    localAvatarName,
    localAvatarUrl,
    localStreamRef,
    localVideoRef,
    makeOffer,
    networkQuality,
    networkQualityLabel,
    overlaySize,
    peersRef,
    pipWindowRef,
    playFinishTone,
    playToneSequence,
    prevNetworkStatsRef,
    primaryRemote,
    rawStreamRef,
    refreshMediaDevices,
    rejectCall,
    remoteAvatarUrl,
    remoteName,
    remotePeerList,
    remotePeers,
    removePeer,
    resizeOverlay,
    resizeStateRef,
    ringbackToneRef,
    segmenterRef,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    setAudioInputs,
    setAudioOutputs,
    setCallStatus,
    setDragPosition,
    setElapsedSeconds,
    setIsBlurOn,
    setIsCameraOn,
    setIsDragging,
    setIsMicOn,
    setIsMinimized,
    setIsOverlayClosing,
    setIsPiPMode,
    setIsResizing,
    setIsScreenSharing,
    setIsSpeakerOn,
    setNetworkQuality,
    setOverlaySize,
    setRemotePeers,
    setSelectedAudioInputId,
    setSelectedAudioOutputId,
    setSelectedVideoInputId,
    setVideoInputs,
    shouldCreateOfferTo,
    startDraggingOverlay,
    startPeer,
    startResizingOverlay,
    startRingbackTone,
    statusLabel,
    stopDraggingOverlay,
    stopMedia,
    stopResizingOverlay,
    stopRingbackTone,
    t,
    toggleBackgroundBlur,
    toggleCamera,
    toggleMic,
    togglePiP,
    toggleScreenShare,
    toggleSpeaker,
    updateNetworkQuality,
    upsertRemotePeer,
    videoInputs
  }
}
