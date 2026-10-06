import { Suspense, lazy, useRef, useState, useEffect } from 'react'
import { Reply, X, Mic, Video, Send, Loader2, MapPin, PieChart, Image, Smile, Search, Film, Square, MoreHorizontal } from 'lucide-react'
import { useMediaRecording } from '../../hooks/chat/useMediaRecording'
import type { EmojiStyle, Theme } from 'emoji-picker-react'
import { useTranslation } from 'react-i18next'

const EmojiPicker = lazy(() => import('emoji-picker-react'))

import { useChatInput } from './ChatContexts'

export type MessageInputProps = {
}

export function MessageInput({}: MessageInputProps) {
  const { t } = useTranslation('panels')
  const {
    onSubmit, replyingTo, getReplyAuthorLabel, getReplyText, onCancelReply,
    isUploadingAttachment, locationError, attachmentError, isBlocked, mentionSuggestions,
    insertMention, handleAttachmentChange, handleDraftChange, activeConversation, draft,
    isComposerEmojiOpen, setIsGifPickerOpen, setIsComposerEmojiOpen, handleSendComposerEmoji,
    isGifPickerOpen, gifQuery, setGifQuery, gifError, isLoadingGifs, gifResults, handleSendGif,
    isSharingLocation, handleShareLocation, setIsPollModalOpen, onUploadAttachment,
    onSpawnReaction, onSendQuickEmoji, onSendSticker
  } = useChatInput()
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false)
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false)
  const [stickerPacks, setStickerPacks] = useState<import('../../services/api/stickerApi').StickerPack[]>([])

  useEffect(() => {
    import('../../services/api/stickerApi').then(api => {
      api.fetchStickerPacks().then(setStickerPacks).catch(() => {})
    })
  }, [])
  const {
    recordingKind,
    recordingDuration,
    recordingError,
    recordedMediaUrl,
    recordedMediaFile,
    recordedMediaKind,
    startMediaRecording,
    stopMediaRecording,
    cancelMediaRecording,
    clearRecordedMedia,
    formatRecordingDuration,
    setRecordingError
  } = useMediaRecording()

  const quickEmoji = activeConversation.quickEmoji || '👍'
  const holdIntervalRef = useRef<number | null>(null)
  const [isHoldingEmoji, setIsHoldingEmoji] = useState(false)

  function handleQuickEmojiPointerDown(e: React.PointerEvent) {
    if (isBlocked || isUploadingAttachment) return
    e.preventDefault()
    setIsHoldingEmoji(true)
    onSpawnReaction?.(quickEmoji)
    holdIntervalRef.current = window.setInterval(() => {
      onSpawnReaction?.(quickEmoji)
    }, 150)
  }

  function handleQuickEmojiPointerUp(e: React.PointerEvent) {
    e.preventDefault()
    if (holdIntervalRef.current !== null) {
      clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
      setIsHoldingEmoji(false)
      onSendQuickEmoji?.(quickEmoji)
    }
  }

  function closeSecondaryPickers() {
    setIsGifPickerOpen(false)
    setIsStickerPickerOpen(false)
  }

  async function sendRecordedMedia() {
    if (!recordedMediaFile) return
    if (recordedMediaFile.size === 0) {
      setRecordingError(t('zeroByteRecordingErr'))
      clearRecordedMedia()
      return
    }
    await onUploadAttachment(recordedMediaFile)
    clearRecordedMedia()
  }

  return (
      <form className="composer" onSubmit={onSubmit}>
        {replyingTo ? (
          <div className="composer-reply-preview">
            <Reply size={16} />
            <span>
              <strong>{t('replyingTo', { name: getReplyAuthorLabel(replyingTo) })}</strong>
              <small>{getReplyText(replyingTo)}</small>
            </span>
            <button onClick={onCancelReply} title={t('cancelReplyTitle')} type="button">
              <X size={16} />
            </button>
          </div>
        ) : null}
        {recordedMediaUrl ? (
          <div className="voice-preview">
            {recordedMediaKind === 'video' ? <Video size={16} /> : <Mic size={16} />}
            {recordedMediaKind === 'video' ? (
              <video controls src={recordedMediaUrl} />
            ) : (
              <audio controls src={recordedMediaUrl} />
            )}
            <button onClick={clearRecordedMedia} title={t('cancelRecordingTitle')} type="button">
              <X size={16} />
            </button>
            <button
              disabled={isUploadingAttachment}
              onClick={sendRecordedMedia}
              title={t('sendVoiceTitle')}
              type="button"
            >
              <Send size={16} />
            </button>
          </div>
        ) : null}
        {recordingKind ? (
          <div className="recording-status">
            <span />
            <strong>{recordingKind === 'video' ? 'Video' : 'Audio'} {formatRecordingDuration(recordingDuration)}</strong>
            <button onClick={cancelMediaRecording} title={t('recordingCancelTitle')} type="button">
              <X size={14} />
            </button>
          </div>
        ) : null}
        {recordingError ? (
          <span className="composer-error">{recordingError}</span>
        ) : locationError ? (
          <span className="composer-error">{locationError}</span>
        ) : attachmentError ? (
          <span className="composer-error">{attachmentError}</span>
        ) : isBlocked ? (
          <span className="composer-error">{t('blockedUser')}</span>
        ) : null}
        {mentionSuggestions.length > 0 ? (
          <div className="mention-suggestions">
            {mentionSuggestions.map((member) => (
              <button
                key={member.id}
                onClick={() => insertMention(member.handle || member.nickname || member.fullName)}
                type="button"
              >
                {member.avatarUrl ? <img alt="" src={member.avatarUrl} /> : <span />}
                <strong>{member.handle ? `@${member.handle}` : member.nickname || member.fullName}</strong>
              </button>
            ))}
          </div>
        ) : null}

        <div className="composer-row">
          <label className="icon-button attachment-picker" title={t('sendImageTitle')}>
            <Image size={20} />
            <input
              aria-label={t('attachFileAria')}
              accept="image/*,audio/*,video/*"
              disabled={isBlocked || isUploadingAttachment}
              multiple
              onChange={handleAttachmentChange}
              type="file"
            />
          </label>
          <label className="composer-input">
            <input
              aria-label={t('messageInputAria')}
              disabled={isBlocked}
              onChange={handleDraftChange}
              placeholder={isBlocked ? t('blockedPlaceholder') : t('messagePlaceholder', { name: activeConversation.name })}
              value={draft}
            />
          </label>
          <span className="composer-emoji-wrap">
            <button
              className={isComposerEmojiOpen ? 'icon-button composer-extra is-active' : 'icon-button composer-extra'}
              disabled={isBlocked || isUploadingAttachment}
              onClick={() => {
                closeSecondaryPickers()
                setIsMoreActionsOpen(false)
                setIsComposerEmojiOpen((current) => !current)
              }}
              title={t('emojiTitle')}
              type="button"
            >
              <Smile size={20} />
            </button>
            {isComposerEmojiOpen ? (
              <span className="composer-emoji-picker">
                <Suspense fallback={<span className="composer-emoji-loading">{t('loadingTxtShort')}</span>}>
                  <EmojiPicker
                    emojiStyle={'native' as EmojiStyle}
                    height={360}
                    lazyLoadEmojis
                    onEmojiClick={handleSendComposerEmoji}
                    previewConfig={{ showPreview: false }}
                    searchPlaceHolder={t('emojiSearchPlaceholder')}
                    skinTonesDisabled
                    theme={'light' as Theme}
                    width={320}
                  />
                </Suspense>
              </span>
            ) : null}
          </span>
          {recordingKind ? (
            <button
              className="icon-button composer-extra voice-record-button is-recording"
              onClick={stopMediaRecording}
              title={t('stopRecordingTitle')}
              type="button"
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              className="icon-button composer-extra voice-record-button composer-primary-audio"
              disabled={isBlocked || isUploadingAttachment}
              onClick={() => startMediaRecording('audio')}
              title={t('recordAudioTitle')}
              type="button"
            >
              <Mic size={20} />
            </button>
          )}
          {!draft.trim() ? (
            <button
              className={`quick-emoji-button ${isHoldingEmoji ? 'is-holding' : ''}`}
              disabled={isBlocked || isUploadingAttachment}
              type="button"
              title={t('quickSendTitle')}
              onPointerDown={handleQuickEmojiPointerDown}
              onPointerUp={handleQuickEmojiPointerUp}
              onPointerLeave={handleQuickEmojiPointerUp}
              onContextMenu={e => e.preventDefault()}
            >
              <span className="quick-emoji-icon">{quickEmoji}</span>
            </button>
          ) : (
            <button
              className="send-button"
              disabled={isBlocked || isUploadingAttachment}
              title={t('sendTitle')}
              type="submit"
            >
              <Send size={19} />
            </button>
          )}
          {!recordingKind ? (
            <span className="composer-more-wrap">
              <button
                className={isMoreActionsOpen ? 'icon-button composer-extra is-active' : 'icon-button composer-extra'}
                disabled={isBlocked || isUploadingAttachment}
                onClick={() => {
                  setIsComposerEmojiOpen(false)
                  setIsMoreActionsOpen((current) => !current)
                }}
                title={t('moreActionsTitle')}
                type="button"
              >
                <MoreHorizontal size={20} />
              </button>
              {isMoreActionsOpen ? (
                <span className="composer-more-menu">
                  <span className="composer-more-actions">
                    <button
                      className={isGifPickerOpen ? 'is-active' : ''}
                      disabled={isBlocked || isUploadingAttachment}
                      onClick={() => {
                        setIsStickerPickerOpen(false)
                        setIsGifPickerOpen((current) => !current)
                      }}
                      type="button"
                    >
                      <Film size={17} />
                      <span>GIF</span>
                    </button>
                    <button
                      className={isStickerPickerOpen ? 'is-active' : ''}
                      disabled={isBlocked || isUploadingAttachment}
                      onClick={() => {
                        setIsGifPickerOpen(false)
                        setIsStickerPickerOpen((current) => !current)
                      }}
                      type="button"
                    >
                      <Smile size={17} />
                      <span>{t('stickerTitle')}</span>
                    </button>
                    <button
                      className={isSharingLocation ? 'is-active' : ''}
                      disabled={isBlocked || isUploadingAttachment || isSharingLocation}
                      onClick={() => {
                        closeSecondaryPickers()
                        setIsMoreActionsOpen(false)
                        handleShareLocation()
                      }}
                      type="button"
                    >
                      {isSharingLocation ? <Loader2 size={17} className="spin" /> : <MapPin size={17} />}
                      <span>{t('shareLocationTitle')}</span>
                    </button>
                    <button
                      disabled={isBlocked || isUploadingAttachment}
                      onClick={() => {
                        closeSecondaryPickers()
                        setIsMoreActionsOpen(false)
                        startMediaRecording('audio')
                      }}
                      type="button"
                    >
                      <Mic size={17} />
                      <span>{t('recordAudioTitle')}</span>
                    </button>
                    <button
                      disabled={isBlocked || isUploadingAttachment}
                      onClick={() => {
                        closeSecondaryPickers()
                        setIsMoreActionsOpen(false)
                        startMediaRecording('video')
                      }}
                      type="button"
                    >
                      <Video size={17} />
                      <span>{t('recordVideoTitle')}</span>
                    </button>
                    <button
                      disabled={isBlocked || isUploadingAttachment}
                      onClick={() => {
                        closeSecondaryPickers()
                        setIsMoreActionsOpen(false)
                        setIsPollModalOpen(true)
                      }}
                      type="button"
                    >
                      <PieChart size={17} />
                      <span>{t('createPollTitle')}</span>
                    </button>
                  </span>

                  {isGifPickerOpen ? (
                    <span className="composer-gif-picker">
                      <label className="gif-search-field">
                        <Search size={16} />
                        <input
                          aria-label={t('gifSearchAria')}
                          onChange={(event) => setGifQuery(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                            }
                          }}
                          placeholder={t('gifSearchPlaceholder')}
                          type="search"
                          value={gifQuery}
                        />
                      </label>
                      {gifError ? <span className="gif-picker-message">{gifError}</span> : null}
                      {isLoadingGifs ? (
                        <span className="gif-picker-message">
                          <Loader2 size={16} />
                          {t('gifLoading')}
                        </span>
                      ) : null}
                      {!isLoadingGifs && !gifError && gifResults.length === 0 ? (
                        <span className="gif-picker-message">{t('gifNoResults')}</span>
                      ) : null}
                      <span className="gif-result-grid">
                        {gifResults.map((gif) => (
                          <button
                            disabled={isUploadingAttachment}
                            key={gif.id}
                            onClick={() => {
                              void handleSendGif(gif)
                              setIsMoreActionsOpen(false)
                            }}
                            title={gif.title}
                            type="button"
                          >
                            <img alt={gif.title} loading="lazy" src={gif.previewUrl} />
                          </button>
                        ))}
                      </span>
                    </span>
                  ) : null}

                  {isStickerPickerOpen ? (
                    <span className="composer-sticker-picker">
                      <div className="sticker-packs-header">
                        {stickerPacks.map(pack => (
                          <img key={pack.id} src={pack.icon} alt={pack.name} className="sticker-pack-icon" title={pack.name} />
                        ))}
                      </div>
                      <div className="sticker-packs-body">
                        {stickerPacks.map(pack => (
                          <div key={pack.id} className="sticker-pack-group">
                            <div className="sticker-pack-title">{pack.name}</div>
                            <div className="sticker-grid">
                              {pack.stickers.map(sticker => (
                                <img
                                  key={sticker.id}
                                  src={sticker.url}
                                  alt=""
                                  className="sticker-item"
                                  onClick={() => {
                                    if (onSendSticker) onSendSticker(sticker.url)
                                    setIsStickerPickerOpen(false)
                                    setIsMoreActionsOpen(false)
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </span>
                  ) : null}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
      </form>
  )
}
