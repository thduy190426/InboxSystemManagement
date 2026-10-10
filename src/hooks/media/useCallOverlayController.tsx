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
import type { CallOverlayProps } from '../../components/media/CallOverlay'

import { useCallWindow } from './core/useCallWindow'
import { useCallTones } from './core/useCallTones'
import { useCallMedia } from './core/useCallMedia'

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

const FINISHED_CALL_STATUSES: CallSession['status'][] = ['declined', 'missed', 'cancelled', 'completed', 'failed']
const OUTGOING_CALL_ANSWER_TIMEOUT_MS = 60_000

export function useCallOverlayController(props: CallOverlayProps) {
  const { call, currentUserId, onClear, onError } = props
  const { t } = useTranslation()
  
  const [callStatus, setCallStatus] = useState(call.status)
  const [isMinimized, setIsMinimized] = useState(false)
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor' | 'unknown'>('unknown')
  const [remotePeers, setRemotePeers] = useState<Record<number, RemotePeerState>>({})
  const [isOverlayClosing, setIsOverlayClosing] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const callShellRef = useRef<HTMLDivElement | null>(null)
  const peersRef = useRef(new Map<number, PeerEntry>())
  const prevNetworkStatsRef = useRef<{ timestamp: number; packetsLost: number; packetsReceived: number } | null>(null)
  const finishedLocallyRef = useRef(false)

  const currentUser = call.participants.find((p) => p.id === currentUserId)
  const currentUserNumericId = currentUser?.userId
  const isCaller = call.caller.id === currentUserId
  const activeParticipants = call.activeParticipants?.length ? call.activeParticipants : [call.caller]
  const joinedRemoteParticipants = activeParticipants.filter((p) => p.id !== currentUserId)
  
  const remotePeerList = Object.values(remotePeers)
  const primaryRemote = remotePeerList[0]
  const directRemoteParticipant = call.participants.length === 2 ? call.participants.find((p) => p.id !== currentUserId) : undefined

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

  const windowHooks = useCallWindow(callShellRef, call.type === 'video')
  const tonesHooks = useCallTones()
  const mediaHooks = useCallMedia(call.type, onError, t, peersRef)

  useEffect(() => {
    mediaHooks.refreshMediaDevices().catch(() => undefined)
    return () => {
      mediaHooks.stopMedia()
    }
  }, [])

  useEffect(() => {
    setCallStatus(call.status)
    if (call.status === 'ringing' && isCaller && !mediaHooks.localStreamRef.current) {
      mediaHooks.ensureLocalStream().catch((error) => {
        onError(error instanceof Error ? error.message : t('errNoCamMic', { defaultValue: 'Không thể truy cập camera/micro!' }))
        finishCall('failed')
      })
    }
    if (FINISHED_CALL_STATUSES.includes(call.status)) {
      tonesHooks.playFinishTone(finishedLocallyRef.current ? 'local' : 'remote')
      stopAllMedia()
      window.setTimeout(closeOverlay, 760)
    }
  }, [call.status])

  useEffect(() => {
    if (call.status !== 'ongoing' || !currentUserNumericId) return
    setCallStatus('ongoing')
    joinedRemoteParticipants.forEach((participant) => {
      if (shouldCreateOfferTo(participant.userId)) {
        startPeer(participant, true).catch((error) => {
          onError(error instanceof Error ? error.message : t('errCallConnect', { defaultValue: 'Không thể kết nối cuộc gọi!' }))
        })
      }
    })
    const activeRemoteIds = new Set(joinedRemoteParticipants.map((p) => p.userId))
    peersRef.current.forEach((_, participantUserId) => {
      if (!activeRemoteIds.has(participantUserId)) {
        removePeer(participantUserId)
      }
    })
  }, [call.status, call.activeParticipants, currentUserNumericId])

  useEffect(() => {
    if (callStatus !== 'ongoing' && callStatus !== 'connecting') return
    const timer = window.setInterval(() => setElapsedSeconds((current) => current + 1), 1000)
    return () => window.clearInterval(timer)
  }, [callStatus])

  useEffect(() => {
    if (callStatus === 'ongoing' && !tonesHooks.hasPlayedConnectedToneRef.current) {
      tonesHooks.hasPlayedConnectedToneRef.current = true
      tonesHooks.playToneSequence([520, 660, 880], 0.08)
    }
    if (callStatus === 'ringing') {
      tonesHooks.startRingbackTone(isCaller ? 'outgoing' : 'incoming', call.caller.fullName)
    } else {
      tonesHooks.stopRingbackTone()
    }
    return tonesHooks.stopRingbackTone
  }, [callStatus, isCaller])

  useEffect(() => {
    const isWaitingForAnswerOrConnection = callStatus === 'ringing' || (callStatus === 'connecting' && remotePeerList.length === 0)
    if (!isCaller || !isWaitingForAnswerOrConnection) return

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

  useEffect(() => {
    if (mediaHooks.localVideoRef.current && mediaHooks.localStreamRef.current) {
      mediaHooks.localVideoRef.current.srcObject = mediaHooks.localStreamRef.current
    }
  }, [callStatus, mediaHooks.isCameraOn])

  useEffect(() => {
    if (!mediaHooks.isScreenSharing) mediaHooks.replaceDeviceTrack()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaHooks.selectedAudioInputId, mediaHooks.selectedVideoInputId])

  async function updateNetworkQuality() {
    const peers = Array.from(peersRef.current.values())
    if (!peers.length) return

    let currentRoundTripTime = 0
    let maxJitter = 0
    let totalPacketsLost = 0
    let totalPacketsReceived = 0

    await Promise.all(
      peers.map(async ({ peer }) => {
        const stats = await peer.getStats()
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded' && typeof report.currentRoundTripTime === 'number') {
            currentRoundTripTime = Math.max(currentRoundTripTime, report.currentRoundTripTime)
          }
          if (report.type === 'inbound-rtp') {
            if (typeof report.packetsLost === 'number') totalPacketsLost += Math.max(report.packetsLost, 0)
            if (typeof report.packetsReceived === 'number') totalPacketsReceived += Math.max(report.packetsReceived, 0)
            if (typeof report.jitter === 'number') maxJitter = Math.max(maxJitter, report.jitter)
          }
        })
      }),
    )

    const now = performance.now()
    const prevStats = prevNetworkStatsRef.current
    prevNetworkStatsRef.current = { timestamp: now, packetsLost: totalPacketsLost, packetsReceived: totalPacketsReceived }

    if (!currentRoundTripTime && !totalPacketsLost && !totalPacketsReceived) {
      setNetworkQuality('unknown')
      return
    }

    let packetLossRate = 0
    if (prevStats) {
      const lostDiff = Math.max(0, totalPacketsLost - prevStats.packetsLost)
      const receivedDiff = Math.max(0, totalPacketsReceived - prevStats.packetsReceived)
      const totalDiff = lostDiff + receivedDiff
      if (totalDiff > 0) packetLossRate = lostDiff / totalDiff
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
      const hasActiveVideo = nextStream.getVideoTracks().some((track) => track.readyState === 'live' && track.enabled && !track.muted)
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
    if (existing) return existing

    const peer = new RTCPeerConnection(rtcPeerConfig)
    const stream = new MediaStream()
    const entry: PeerEntry = { peer, stream, pendingCandidates: [], isMakingOffer: false }

    upsertRemotePeer(participant, { stream, connectionState: peer.connectionState })

    peer.onnegotiationneeded = () => {
      if (!shouldCreateOfferTo(participant.userId)) return
      makeOffer(participant, entry).catch((error) => {
        onError(error instanceof Error ? error.message : 'Không thể kết nối cuộc gọi!')
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
      if (peer.connectionState === 'connected') setCallStatus('ongoing')
      if (['failed', 'closed'].includes(peer.connectionState)) removePeer(participant.userId)
    }

    peersRef.current.set(participant.userId, entry)
    return entry
  }

  async function addLocalTracks(peer: RTCPeerConnection) {
    const stream = await mediaHooks.ensureLocalStream()
    stream.getTracks().forEach((track) => {
      if (!peer.getSenders().some((sender) => sender.track === track)) {
        peer.addTrack(track, stream)
      }
    })
  }

  async function flushPendingCandidates(entry: PeerEntry) {
    if (!entry.peer.remoteDescription) return
    const pendingCandidates = entry.pendingCandidates.splice(0)
    await Promise.all(pendingCandidates.map((candidate) => entry.peer.addIceCandidate(candidate)))
  }

  async function startPeer(participant: CallParticipant, shouldCreateOffer: boolean) {
    setCallStatus('connecting')
    const entry = createPeer(participant)
    await addLocalTracks(entry.peer)
    if (shouldCreateOffer) await makeOffer(participant, entry)
  }

  async function makeOffer(participant: CallParticipant, entry: PeerEntry) {
    if (entry.isMakingOffer || entry.peer.signalingState !== 'stable') return
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
      await mediaHooks.ensureLocalStream()
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
    if (!payload.data || !payload.from || payload.from.userId === currentUserNumericId) return
    if (payload.toUserId && payload.toUserId !== currentUserNumericId) return

    const participant = findParticipantByUserId(payload.from.userId)
    if (!participant) return

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
        const shouldIgnoreOffer = isOffer && (entry.isMakingOffer || entry.peer.signalingState !== 'stable') && !shouldCreateOfferTo(participant.userId)
        if (shouldIgnoreOffer) return

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
    return () => window.removeEventListener(eventName, handleCallSignal)
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

  function stopAllMedia() {
    peersRef.current.forEach((entry) => {
      entry.peer.close()
      entry.stream.getTracks().forEach((track) => track.stop())
    })
    peersRef.current.clear()
    mediaHooks.stopMedia()
    setRemotePeers({})
  }

  function finishCall(status: CallSession['status'], source: 'local' | 'remote' = 'remote') {
    if (source === 'local') finishedLocallyRef.current = true
    tonesHooks.playFinishTone(source)
    tonesHooks.stopRingbackTone()
    stopAllMedia()
    setCallStatus(status)
    window.setTimeout(closeOverlay, 760)
  }

  function closeOverlay() {
    tonesHooks.stopRingbackTone()
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

  function toggleMic() {
    const nextEnabled = !mediaHooks.isMicOn
    mediaHooks.localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = nextEnabled
    })
    mediaHooks.setIsMicOn(nextEnabled)
    sendCallSignal(call.callId, call.conversationId, { type: 'mute-state', isMuted: !nextEnabled } as any)
  }

  function formatElapsed() {
    const minutes = Math.floor(elapsedSeconds / 60)
    const seconds = elapsedSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

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
    ...windowHooks,
    ...tonesHooks,
    ...mediaHooks,
    activeParticipants,
    canShowVideo: call.type === 'video',
    callShellRef,
    callStatus,
    currentUser,
    currentUserNumericId,
    directRemoteParticipant,
    displayStatusLabel,
    elapsedSeconds,
    findParticipantByUserId,
    fullStatusLabel,
    isCaller,
    isEnded,
    isMinimized,
    isOverlayClosing,
    joinedRemoteParticipants,
    localAvatarName,
    localAvatarUrl,
    networkQuality,
    networkQualityLabel,
    peersRef,
    primaryRemote,
    remoteAvatarUrl,
    remoteName,
    remotePeerList,
    remotePeers,
    statusLabel,
    t,
    toggleMic,
    togglePiP: () => windowHooks.togglePiP(onError, t),
    closeOverlay,
    finishCall,
    handleAccept,
    hangUp,
    rejectCall,
    setIsMinimized,
    addLocalTracks,
    createPeer,
    flushPendingCandidates,
    handleSignal,
    makeOffer,
    removePeer,
    startPeer,
    upsertRemotePeer,
    shouldCreateOfferTo
  }
}
