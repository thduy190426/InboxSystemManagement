import { Suspense, lazy, useRef, useState, useEffect } from 'react'
import { Reply, X, Mic, Video, Send, Loader2, MapPin, PieChart, Image, Smile, Search, Film, Square } from 'lucide-react'
import { useMediaRecording } from '../../hooks/chat/useMediaRecording'
import type { EmojiStyle, Theme } from 'emoji-picker-react'

const EmojiPicker = lazy(() => import('emoji-picker-react'))

import { useChatInput } from './ChatContexts'

export type MessageInputProps = {
  // Now decoupled using ChatInputContext!
}

export function MessageInput({}: MessageInputProps) {
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
  const [stickerPacks, setStickerPacks] = useState<import('../../services/api/stickerApi').StickerPack[]>([])

  // Use the normally imported useEffect
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

  async function sendRecordedMedia() {
    if (!recordedMediaFile) return
    if (recordedMediaFile.size === 0) {
      setRecordingError('Không thể gửi ghi âm có dung lượng 0MB!')
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
              <strong>Đang trả lời {getReplyAuthorLabel(replyingTo)}</strong>
              <small>{getReplyText(replyingTo)}</small>
            </span>
            <button onClick={onCancelReply} title="Hủy trả lời" type="button">
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
            <button onClick={clearRecordedMedia} title="Huỷ bản ghi" type="button">
              <X size={16} />
            </button>
            <button
              disabled={isUploadingAttachment}
              onClick={sendRecordedMedia}
              title="Gửi tin nhắn thoại"
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
            <button onClick={cancelMediaRecording} title="Huy ghi" type="button">
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
          <span className="composer-error">Đã chặn người dùng!</span>
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
          <label className="icon-button attachment-picker" title="Gửi ảnh">
            <Image size={20} />
            <input
              aria-label="Đính kèm file"
              accept="image/*,audio/*,video/*"
              disabled={isBlocked || isUploadingAttachment}
              multiple
              onChange={handleAttachmentChange}
              type="file"
            />
          </label>
          <label className="composer-input">
            <input
              aria-label="Nhập tin nhắn"
              disabled={isBlocked}
              onChange={handleDraftChange}
              placeholder={isBlocked ? 'Bạn đã chặn người dùng này!' : `Nhắn tin với ${activeConversation.name}`}
              value={draft}
            />
          </label>
          <span className="composer-emoji-wrap">
            <button
              className={isComposerEmojiOpen ? 'icon-button composer-extra is-active' : 'icon-button composer-extra'}
              disabled={isBlocked || isUploadingAttachment}
              onClick={() => {
                setIsGifPickerOpen(false)
                setIsComposerEmojiOpen((current) => !current)
              }}
              title="Biểu cảm"
              type="button"
            >
              <Smile size={20} />
            </button>
            {isComposerEmojiOpen ? (
              <span className="composer-emoji-picker">
                <Suspense fallback={<span className="composer-emoji-loading">Đang tải Emoji...</span>}>
                  <EmojiPicker
                    emojiStyle={'native' as EmojiStyle}
                    height={360}
                    lazyLoadEmojis
                    onEmojiClick={handleSendComposerEmoji}
                    previewConfig={{ showPreview: false }}
                    searchPlaceHolder="Tìm Emoji"
                    skinTonesDisabled
                    theme={'light' as Theme}
                    width={320}
                  />
                </Suspense>
              </span>
            ) : null}
          </span>
          <span className="composer-gif-wrap">
            <button
              className={isGifPickerOpen ? 'icon-button composer-extra is-active' : 'icon-button composer-extra'}
              disabled={isBlocked || isUploadingAttachment}
              onClick={() => {
                setIsComposerEmojiOpen(false)
                setIsGifPickerOpen((current) => !current)
              }}
              title="GIF"
              type="button"
            >
              <Film size={20} />
            </button>
            {isGifPickerOpen ? (
              <span className="composer-gif-picker">
                <label className="gif-search-field">
                  <Search size={16} />
                  <input
                    aria-label="Tìm GIF"
                    onChange={(event) => setGifQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                      }
                    }}
                    placeholder="Tìm GIF"
                    type="search"
                    value={gifQuery}
                  />
                </label>
                {gifError ? <span className="gif-picker-message">{gifError}</span> : null}
                {isLoadingGifs ? (
                  <span className="gif-picker-message">
                    <Loader2 size={16} />
                    Đang tải GIF...
                  </span>
                ) : null}
                {!isLoadingGifs && !gifError && gifResults.length === 0 ? (
                  <span className="gif-picker-message">Không có GIF phù hợp!</span>
                ) : null}
                <span className="gif-result-grid">
                  {gifResults.map((gif) => (
                    <button
                      disabled={isUploadingAttachment}
                      key={gif.id}
                      onClick={() => void handleSendGif(gif)}
                      title={gif.title}
                      type="button"
                    >
                      <img alt={gif.title} loading="lazy" src={gif.previewUrl} />
                    </button>
                  ))}
                </span>
              </span>
            ) : null}
          </span>
          <span className="composer-sticker-wrap">
            <button
              className={isStickerPickerOpen ? 'icon-button composer-extra is-active' : 'icon-button composer-extra'}
              disabled={isBlocked || isUploadingAttachment}
              onClick={() => {
                setIsComposerEmojiOpen(false)
                setIsGifPickerOpen(false)
                setIsStickerPickerOpen((current) => !current)
              }}
              title="Nhãn dán"
              type="button"
            >
              <Smile size={20} />
            </button>
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
          {recordingKind ? (
            <button
              className="icon-button composer-extra voice-record-button is-recording"
              onClick={stopMediaRecording}
              title="Dừng ghi âm"
              type="button"
            >
              <Square size={18} />
            </button>
          ) : (
            <>
              <button
                className={`icon-button composer-extra${isSharingLocation ? ' is-active' : ''}`}
                disabled={isBlocked || isUploadingAttachment || isSharingLocation}
                onClick={handleShareLocation}
                title="Chia sẻ vị trí"
                type="button"
              >
                {isSharingLocation ? <Loader2 size={20} className="spin" /> : <MapPin size={20} />}
              </button>
              <button
                className="icon-button composer-extra voice-record-button"
                disabled={isBlocked || isUploadingAttachment}
                onClick={() => startMediaRecording('audio')}
                title="Ghi âm"
                type="button"
              >
                <Mic size={20} />
              </button>
              <button
                className="icon-button composer-extra voice-record-button"
                disabled={isBlocked || isUploadingAttachment}
                onClick={() => startMediaRecording('video')}
                title="Quay video"
                type="button"
              >
                <Video size={20} />
              </button>
              <button
                className="icon-button composer-extra"
                disabled={isBlocked || isUploadingAttachment}
                onClick={() => setIsPollModalOpen(true)}
                title="Tạo bình chọn"
                type="button"
              >
                <PieChart size={20} />
              </button>
            </>
          )}
          {!draft.trim() ? (
            <button
              className={`quick-emoji-button ${isHoldingEmoji ? 'is-holding' : ''}`}
              disabled={isBlocked || isUploadingAttachment}
              type="button"
              title="Gửi nhanh"
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
              title="Gửi"
              type="submit"
            >
              <Send size={19} />
            </button>
          )}
        </div>
      </form>
  )
}
