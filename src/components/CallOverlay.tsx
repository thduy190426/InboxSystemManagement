import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Video, VideoOff, X } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import {
  acceptRealtimeCall,
  cancelRealtimeCall,
  declineRealtimeCall,
  endRealtimeCall,
  markRealtimeCallMissed,
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

function attachStream(node: HTMLMediaElement | null, stream: MediaStream) {
  if (!node || node.srcObject === stream) {
    return
  }

  node.srcObject = stream
}

type RemoteAudioProps = {
  stream: MediaStream
  isSpeakerOn: boolean
  selectedAudioOutputId: string
  canSelectAudioOutput: boolean
}

const RemoteAudio = memo(function RemoteAudio({
  stream,
  isSpeakerOn,
  selectedAudioOutputId,
  canSelectAudioOutput,
}: RemoteAudioProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    attachStream(audioRef.current, stream)
  }, [stream])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isSpeakerOn
    }
  }, [isSpeakerOn])

  useEffect(() => {
    if (!canSelectAudioOutput || !audioRef.current) {
      return
    }

    const media = audioRef.current as SinkSelectableMediaElement
    media.setSinkId?.(selectedAudioOutputId || 'default').catch(() => undefined)
  }, [canSelectAudioOutput, selectedAudioOutputId])

  return <audio ref={audioRef} autoPlay hidden />
})

type RemoteVideoTileProps = {
  remotePeer: RemotePeerState
}

const RemoteVideoTile = memo(function RemoteVideoTile({ remotePeer }: RemoteVideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    attachStream(videoRef.current, remotePeer.stream)
  }, [remotePeer.stream])

  return (
    <div className="remote-video-tile">
      <video
        className={remotePeer.hasVideo ? 'remote-video' : 'remote-video is-hidden'}
        ref={videoRef}
        autoPlay
        muted
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
  )
})

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
  const finishedLocallyRef = useRef(false)
  const hasPlayedFinishToneRef = useRef(false)
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
        onError(error instanceof Error ? error.message : 'Không thể truy cập camera/micro!')
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
    if (callStatus === 'ringing' && isCaller) {
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
  const displayStatusLabel = callStatus === 'missed' ? 'Không bắt máy' : statusLabel
  const fullStatusLabel =
    networkQualityLabel && ['connecting', 'ongoing'].includes(callStatus)
      ? `${statusLabel} · ${networkQualityLabel}`
      : displayStatusLabel

  return (
    <div className={isOverlayClosing ? 'call-overlay is-exiting' : 'call-overlay'} role="dialog" aria-modal="true">
      <div
        className={[
          'call-window-shell',
          canShowVideo ? 'is-video' : '',
          dragPosition ? 'is-positioned' : '',
          overlaySize ? 'is-sized' : '',
          isDragging ? 'is-dragging' : '',
          isResizing ? 'is-resizing' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        ref={callShellRef}
        style={{
          ...(dragPosition ? { left: `${dragPosition.x}px`, top: `${dragPosition.y}px` } : {}),
          ...(overlaySize ? { width: `${overlaySize.width}px`, height: `${overlaySize.height}px` } : {}),
        }}
      >
        <section className={canShowVideo ? 'call-window is-video' : 'call-window'}>
          <header
            className="call-header"
            onPointerCancel={stopDraggingOverlay}
            onPointerDown={startDraggingOverlay}
            onPointerMove={dragOverlay}
            onPointerUp={stopDraggingOverlay}
          >
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
            <RemoteAudio
              key={`audio-${remotePeer.participant.userId}`}
              stream={remotePeer.stream}
              isSpeakerOn={isSpeakerOn}
              selectedAudioOutputId={selectedAudioOutputId}
              canSelectAudioOutput={canSelectAudioOutput}
            />
          ))}
          {canShowVideo ? (
            <>
              <div className={remotePeerList.length > 1 ? 'remote-video-grid' : 'remote-video-grid is-single'}>
                {remotePeerList.length ? (
                  remotePeerList.map((remotePeer) => (
                    <RemoteVideoTile key={remotePeer.participant.userId} remotePeer={remotePeer} />
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
          <button
            aria-label="Resize call overlay"
            className="call-resize-handle"
            onPointerCancel={stopResizingOverlay}
            onPointerDown={startResizingOverlay}
            onPointerMove={resizeOverlay}
            onPointerUp={stopResizingOverlay}
            title="Thay đổi kích thước"
            type="button"
          />
        </section>
      </div>
    </div>
  )
}
