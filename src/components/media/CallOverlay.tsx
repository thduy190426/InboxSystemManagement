import { Mic, MicOff, Phone, Volume2, VolumeX, Video, VideoOff, X, MonitorUp, Minimize2, Maximize2, PictureInPicture, Zap } from 'lucide-react'
import { memo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { CallParticipant, CallSession } from '../../types'
import { AvatarFallback } from '../ui/AvatarFallback'

export type CallOverlayProps = {
  call: CallSession
  currentUserId: string
  onClear: () => void
  onError: (message: string) => void
}


type RemotePeerState = {
  participant: CallParticipant
  stream: MediaStream
  hasVideo: boolean
  connectionState: RTCPeerConnectionState
  isAudioMuted?: boolean
}


type SinkSelectableMediaElement = HTMLMediaElement & {
  setSinkId?: (sinkId: string) => Promise<void>
}




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
  const { t } = useTranslation()
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
          {remotePeer.isAudioMuted && <div style={{ marginTop: '8px', padding: '4px 8px', borderRadius: '12px', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#fff' }}><MicOff size={14} /> {t('micOff', { defaultValue: 'Đã tắt Mic' })}</div>}
        </div>
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {remotePeer.participant.fullName}
          {remotePeer.isAudioMuted && <MicOff size={14} />}
        </span>
      )}
    </div>
  )
})


import { useCallOverlayController } from '../../hooks/media/useCallOverlayController'

export function CallOverlay(props: CallOverlayProps) {
  const {
    audioInputs,
    audioOutputs,
    callShellRef,
    callStatus,
    canSelectAudioOutput,
    canShowVideo,
    dragOverlay,
    dragPosition,
    fullStatusLabel,
    handleAccept,
    hangUp,
    isBlurOn,
    isCaller,
    isCameraOn,
    isDragging,
    isEnded,
    isMicOn,
    isMinimized,
    isOverlayClosing,
    isPiPMode,
    isResizing,
    isScreenSharing,
    isSpeakerOn,
    localAvatarName,
    localAvatarUrl,
    localVideoRef,
    overlaySize,
    primaryRemote,
    rejectCall,
    remoteAvatarUrl,
    remoteName,
    remotePeerList,
    resizeOverlay,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    setIsMinimized,
    setSelectedAudioInputId,
    setSelectedAudioOutputId,
    setSelectedVideoInputId,
    startDraggingOverlay,
    startResizingOverlay,
    stopDraggingOverlay,
    stopResizingOverlay,
    t,
    toggleBackgroundBlur,
    toggleCamera,
    toggleMic,
    togglePiP,
    toggleScreenShare,
    toggleSpeaker,
    videoInputs
  } = useCallOverlayController(props)



  return (
    <div className={`call-overlay ${isOverlayClosing ? 'is-exiting' : ''} ${isMinimized ? 'is-minimized' : ''}`} role="dialog" aria-modal="true">
      <div
        className={[
          'call-window-shell',
          (canShowVideo && !isEnded) ? 'is-video' : '',
          isEnded ? 'is-ended' : '',
          isMinimized ? 'is-minimized' : '',
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
          ...(overlaySize && !isEnded ? { width: `${overlaySize.width}px`, height: `${overlaySize.height}px` } : {}),
        }}
      >
        <section className={(canShowVideo && !isEnded) ? 'call-window is-video' : 'call-window'}>
          <header
            className="call-header"
            onPointerCancel={stopDraggingOverlay}
            onPointerDown={startDraggingOverlay}
            onPointerMove={dragOverlay}
            onPointerUp={stopDraggingOverlay}
          >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
            {isEnded && (
              <div className="avatar-wrap" style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                <AvatarFallback name={remoteName} src={remoteAvatarUrl} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '15px' }}>{remoteName}</strong>
              <span style={{ fontSize: '13px', opacity: 0.8 }}>{fullStatusLabel}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {canShowVideo && (
               <button onClick={togglePiP} title={isPiPMode ? t("closePip", { defaultValue: "Đóng PiP" }) : t("openPip", { defaultValue: "Mở PiP (Picture-in-Picture)" })} type="button">
                 <PictureInPicture size={18} />
               </button>
            )}
            <button onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? t("maximize", { defaultValue: "Phóng to" }) : t("minimize", { defaultValue: "Thu nhỏ" })} type="button">
              {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
            </button>
            <button onClick={hangUp} title={t("close", { defaultValue: "Đóng" })} type="button">
              <X size={18} />
            </button>
          </div>
        </header>

        {!isEnded && (<>
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
                    <AvatarFallback name={remoteName} src={remoteAvatarUrl} />
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
              <AvatarFallback name={remoteName} src={remoteAvatarUrl} />
              <strong>{remoteName}</strong>
              {remotePeerList.length > 1 ? <small>{t('participants', { defaultValue: '{{count}} người đang tham gia', count: remotePeerList.length })}</small> : null}
              {primaryRemote?.isAudioMuted && (
                <div style={{ marginTop: '12px', padding: '6px 12px', borderRadius: '20px', backgroundColor: 'var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <MicOff size={16} color="var(--danger-color)" /> {t('micOff', { defaultValue: 'Đã tắt Mic' })}
                </div>
              )}
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
                <option value="">{t('defaultMic', { defaultValue: 'Micro mặc định' })}</option>
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
              <option value="default">{t('defaultSpeaker', { defaultValue: 'Loa mặc định' })}</option>
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
                  <option value="">{t('defaultCamera', { defaultValue: 'Camera mặc định' })}</option>
                )}
              </select>
            </label>
          ) : null}
        </div>

          <footer className="call-controls">
          {callStatus === 'ringing' && !isCaller ? (
            <>
              <button className="call-control" onClick={toggleMic} title={isMicOn ? t('turnOffMic', { defaultValue: 'Tắt mic' }) : t('turnOnMic', { defaultValue: 'Bật mic' })} type="button">
                {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button className="call-control" onClick={toggleSpeaker} title={isSpeakerOn ? t('turnOffSpeaker', { defaultValue: 'Tắt loa' }) : t('turnOnSpeaker', { defaultValue: 'Bật loa' })} type="button">
                {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              {canShowVideo ? (
                <button className="call-control" onClick={toggleCamera} title={isCameraOn ? t('turnOffCam', { defaultValue: 'Tắt camera' }) : t('turnOnCam', { defaultValue: 'Bật camera' })} type="button">
                  {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
              ) : null}
              <button className="call-control is-danger" onClick={rejectCall} title={t('decline', { defaultValue: 'Từ chối' })} type="button">
                <Phone size={20} fill="currentColor" style={{ transform: 'rotate(135deg)' }} />
              </button>
              <button className="call-control is-accept" onClick={handleAccept} title={t('accept', { defaultValue: 'Nhận' })} type="button">
                <Phone size={20} fill="currentColor" />
              </button>
            </>
          ) : (
            <>
              <button className="call-control" onClick={toggleMic} title={isMicOn ? t('turnOffMic', { defaultValue: 'Tắt mic' }) : t('turnOnMic', { defaultValue: 'Bật mic' })} type="button">
                {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button className="call-control" onClick={toggleSpeaker} title={isSpeakerOn ? t('turnOffSpeaker', { defaultValue: 'Tắt loa' }) : t('turnOnSpeaker', { defaultValue: 'Bật loa' })} type="button">
                {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              {canShowVideo ? (
                <>
                  <button className="call-control" onClick={toggleCamera} title={isCameraOn ? t('turnOffCam', { defaultValue: 'Tắt camera' }) : t('turnOnCam', { defaultValue: 'Bật camera' })} type="button">
                    {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                  </button>
                  <button className={`call-control ${isBlurOn ? 'is-active' : ''}`} onClick={toggleBackgroundBlur} title={t('toggleBlur', { defaultValue: 'Làm mờ phông nền' })} type="button">
                    <Zap size={20} />
                  </button>
                  {callStatus === 'ongoing' ? (
                    isScreenSharing ? (
                      <button className="call-control is-danger" onClick={toggleScreenShare} title={t('stopShare', { defaultValue: 'Dừng chia sẻ' })} type="button" style={{ borderRadius: '24px', padding: '0 16px', gap: '8px', width: 'auto' }}>
                        <MonitorUp size={20} />
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>{t('stopShare', { defaultValue: 'Dừng chia sẻ' })}</span>
                      </button>
                    ) : (
                      <button className="call-control" onClick={toggleScreenShare} title={t('shareScreen', { defaultValue: 'Chia sẻ màn hình' })} type="button">
                        <MonitorUp size={20} />
                      </button>
                    )
                  ) : null}
                </>
              ) : null}
              <button className="call-control is-danger" onClick={hangUp} title={t('endCall', { defaultValue: 'Kết thúc' })} type="button">
                <Phone size={20} fill="currentColor" style={{ transform: 'rotate(135deg)' }} />
              </button>
            </>
          )}
          </footer>
        </>)}
          <button
            aria-label="Resize call overlay"
            className="call-resize-handle"
            onPointerCancel={stopResizingOverlay}
            onPointerDown={startResizingOverlay}
            onPointerMove={resizeOverlay}
            onPointerUp={stopResizingOverlay}
            title={t('resize', { defaultValue: 'Thay đổi kích thước' })}
            type="button"
          />
        </section>
      </div>
    </div>
  )
}
