import type { FormEvent, ReactNode, RefObject, MutableRefObject } from 'react'
import { Suspense, lazy } from 'react'
import { MoreHorizontal, Reply, Pencil, Copy, Pin, Trash2, Check, CheckCheck, Play, Pause, PinOff, Calendar, X, SendHorizontal, Smile, Download, Flag } from 'lucide-react'
import type { Conversation, Message, MessageReply } from '../../types'
import { OnlineDurationBadge } from '../ui/OnlineDurationBadge'
import { AvatarFallback } from '../ui/AvatarFallback'
import { PollMessage } from './PollMessage'
import type { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react'

const EmojiPicker = lazy(() => import('emoji-picker-react'))

export type MessageItemProps = {
  index: number
  message: Message
  displayMessages: Message[]
  getDateDividerLabel: (message: Message, previousMessage?: Message) => string | null
  isSameMessageGroup: (message: Message, previousMessage?: Message) => boolean
  messageRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
  searchMatches: any[]
  activeSearchMessageId: string
  focusedMessageId: string
  renderCallMessage: (message: Message) => React.ReactNode
  renderHighlightedText: (message: Message) => React.ReactNode
  shouldRenderMessageText: (message: Message) => boolean
  editingMessageId: string
  handleEditSubmit: (event: FormEvent<HTMLFormElement>, message: Message) => void
  busyMessageId: string
  setEditingText: (text: string) => void
  editingText: string
  cancelEditing: () => void
  renderReplyPreview: (message: MessageReply) => React.ReactNode
  onVotePoll: ((messageId: string, optionIds: string[]) => void | Promise<void>) | undefined
  getMessageStateLabel: (message: Message) => string
  onRetryMessage: (message: Message) => void
  startReplying: (message: Message) => void
  startForwarding: (message: Message) => void
  openActionMenuId: string
  setOpenActionMenuId: React.Dispatch<React.SetStateAction<string>>
  openReactionPickerId: string
  setOpenReactionPickerId: React.Dispatch<React.SetStateAction<string>>
  handleToggleReaction: (messageId: string, emoji: string) => void
  handleDeleteForMe: (message: Message) => void
  handleRecall: (message: Message) => void
  handleReport: (message: Message) => void
  formatMessageTime: (message: Message) => string
  activeConversation: Conversation
  currentUserId: string | undefined
  members: any[]
  renderAttachments: (message: Message) => React.ReactNode
  renderReactions: (message: Message) => React.ReactNode
  handleTogglePin: (messageId: string) => void
  isSameLocalDay: (left: Date | null, right: Date | null) => boolean
  parseMessageDate: (message?: Message) => Date | null
  startEditing: (message: Message) => void
}

export function MessageItem(props: MessageItemProps) {
  const { index, message, displayMessages, getDateDividerLabel, isSameMessageGroup, messageRefs, searchMatches, activeSearchMessageId, focusedMessageId, renderCallMessage, renderHighlightedText, shouldRenderMessageText, editingMessageId, handleEditSubmit, busyMessageId, setEditingText, editingText, cancelEditing, renderReplyPreview, onVotePoll, getMessageStateLabel, onRetryMessage, startReplying, startForwarding, openActionMenuId, setOpenActionMenuId, openReactionPickerId, setOpenReactionPickerId, handleToggleReaction, handleDeleteForMe, handleRecall, handleReport, formatMessageTime, activeConversation, currentUserId, members, renderAttachments, renderReactions, handleTogglePin, isSameLocalDay, parseMessageDate, startEditing } = props;
            const previousMessage = displayMessages[index - 1]
            const nextMessage = displayMessages[index + 1]
            const dateDividerLabel = getDateDividerLabel(message, previousMessage)
            const isGroupedWithPrevious = isSameMessageGroup(message, previousMessage)
            const isGroupedWithNext = isSameMessageGroup(message, nextMessage)
            const shouldShowAvatar = message.author === 'them' && !isGroupedWithNext
            const shouldShowSenderName = message.author === 'them' && !isGroupedWithPrevious

            const isSystem = message.author === 'system'
            let systemGroupCount = 1
            let isHiddenSystemMessage = false

            if (isSystem) {
              const isSameAsPrev =
                previousMessage?.author === 'system' &&
                previousMessage.text === message.text &&
                isSameLocalDay(parseMessageDate(message), parseMessageDate(previousMessage))

              if (isSameAsPrev) {
                isHiddenSystemMessage = true
              } else {
                for (let i = index + 1; i < displayMessages.length; i++) {
                  if (
                    displayMessages[i].author === 'system' &&
                    displayMessages[i].text === message.text &&
                    isSameLocalDay(parseMessageDate(displayMessages[i]), parseMessageDate(message))
                  ) {
                    systemGroupCount++
                  } else {
                    break
                  }
                }
              }
            }

            if (isHiddenSystemMessage) {
              return <div key={message.id} ref={(node) => { messageRefs.current[message.id] = node }} style={{ display: 'none' }} />
            }

            return (
              <div key={message.id}>
                {dateDividerLabel ? (
                  <div className="day-divider message-time-divider">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} />
                      {dateDividerLabel}
                    </span>
                  </div>
                ) : null}
                <div
                  className={[
                    message.author === 'system'
                      ? 'message-row system-message-row animate-in'
                      : message.author === 'me'
                        ? 'message-row outgoing animate-in'
                        : 'message-row animate-in',
                    isGroupedWithPrevious ? 'is-grouped-with-previous' : 'is-group-start',
                    isGroupedWithNext ? 'is-grouped-with-next' : 'is-group-end',
                    searchMatches.some((match) => match.id === message.id) ? 'is-search-match' : '',
                    activeSearchMessageId === message.id ? 'is-search-active' : '',
                    focusedMessageId === message.id ? 'is-focused-message' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  ref={(node) => {
                    messageRefs.current[message.id] = node
                  }}
                >
                  {message.author === 'system' ? (
                    message.text?.startsWith('Cuộc gọi') ? (
                      <div className="system-call-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', maxWidth: '70%', alignSelf: 'flex-start', margin: '8px 0' }}>
                        <span className="avatar-wrap message-avatar-wrap">
                          <AvatarFallback
                            className="message-avatar"
                            name={activeConversation.name}
                            src={activeConversation.avatar}
                          />
                        </span>
                        <div className="message-bubble media-only" style={{ padding: 0, background: 'transparent' }}>
                          {renderCallMessage(message)}
                        </div>
                      </div>
                    ) : (
                      <div className="system-message">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {renderHighlightedText(message)}
                          {systemGroupCount > 1 && (
                            <span style={{ 
                              fontSize: '11px', 
                              backgroundColor: 'var(--border-color)', 
                              color: 'var(--text-color)',
                              padding: '2px 6px', 
                              borderRadius: '10px', 
                              marginLeft: '4px',
                              fontWeight: 'bold'
                            }}>
                              x{systemGroupCount}
                            </span>
                          )}
                        </span>
                      </div>
                    )
                  ) : (
                    <>
                      {message.author === 'them' ? (
                        <span className={shouldShowAvatar ? 'avatar-wrap message-avatar-wrap' : 'avatar-wrap message-avatar-wrap is-hidden'}>
                          <AvatarFallback
                            className="message-avatar"
                            name={message.senderName || activeConversation.name}
                            src={message.senderAvatar || activeConversation.avatar}
                          />
                          {(activeConversation.type === 'direct'
                            ? activeConversation.presence
                            : activeConversation.members?.find(
                                (m) => m.fullName === (message.senderName || activeConversation.name)
                              )?.presence) === 'online' && (
                            <span 
                              className="presence-dot online" 
                              style={{ bottom: '-1px', right: '-1px', width: '10px', height: '10px', borderWidth: '1.5px' }} 
                            />
                          )}
                        </span>
                      ) : null}
                      <div className={`message-bubble ${(!shouldRenderMessageText(message) && message.attachments && message.attachments.length > 0) ? 'media-only' : ''}`}>
                        {shouldShowSenderName ? (
                          <span className="message-sender-name">
                            {message.senderName || activeConversation.name}
                          </span>
                        ) : null}
                        {editingMessageId === message.id ? (
                          <form
                            className="message-edit-form"
                            onSubmit={(event) => handleEditSubmit(event, message)}
                          >
                            <input
                              aria-label="Sửa tin nhắn"
                              autoFocus
                              disabled={busyMessageId === message.id}
                              onChange={(event) => setEditingText(event.target.value)}
                              value={editingText}
                            />
                            <button
                              className="message-action-button"
                              disabled={!editingText.trim() || busyMessageId === message.id}
                              title="Lưu"
                              type="submit"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              className="message-action-button"
                              disabled={busyMessageId === message.id}
                              onClick={cancelEditing}
                              title="Hủy"
                              type="button"
                            >
                              <X size={15} />
                            </button>
                          </form>
                        ) : (
                          <>
                            {message.isPinned ? (
                              <span className="message-pin-badge">
                                <Pin size={12} />
                                <span>Đã ghim</span>
                              </span>
                            ) : null}
                            {message.replyTo ? renderReplyPreview(message.replyTo) : null}
                            {message.type === 'poll' && message.poll ? (
                              <PollMessage 
                                message={message}
                                currentUserId={currentUserId || ''}
                                members={members || []}
                                onVote={onVotePoll || (() => {})}
                              />
                            ) : shouldRenderMessageText(message) ? (
                              <p>{renderHighlightedText(message)}</p>
                            ) : null}
                            {renderAttachments(message)}
                          </>
                        )}
                        <span className="message-time">
                          {formatMessageTime(message)}
                          {message.isEdited ? <span>Đã chỉnh sửa!</span> : null}
                          {message.author === 'me' ? (
                            <>
                              <CheckCheck aria-label={getMessageStateLabel(message)} size={15} />
                              <span>{getMessageStateLabel(message)}</span>
                              {message.state === 'failed' ? (
                                <button
                                  className="message-retry-button"
                                  onClick={() => onRetryMessage(message)}
                                  title="Thử gửi lại"
                                  type="button"
                                >
                                  Thử lại
                                </button>
                              ) : null}
                            </>
                          ) : null}
                        </span>
                        {renderReactions(message)}
                      </div>
                      {editingMessageId !== message.id && !['sending', 'failed'].includes(message.state ?? '') ? (
                        <span className="message-actions">
                          <button
                            className="message-more-button"
                            disabled={Boolean(busyMessageId)}
                            onClick={() => startReplying(message)}
                            title="Trả lời"
                            type="button"
                          >
                            <Reply size={17} />
                          </button>
                          <button
                            className="message-more-button"
                            disabled={Boolean(busyMessageId)}
                            onClick={() => startForwarding(message)}
                            title="Chuyển tiếp"
                            type="button"
                          >
                            <SendHorizontal size={17} />
                          </button>
                          <button
                            className="message-more-button"
                            disabled={Boolean(busyMessageId)}
                            onClick={() => {
                              setOpenActionMenuId('')
                              setOpenReactionPickerId((current) =>
                                current === message.id ? '' : message.id,
                              )
                            }}
                            title="Reaction"
                            type="button"
                          >
                            <Smile size={17} />
                          </button>
                          {openReactionPickerId === message.id ? (
                            <span
                              className={
                                message.author === 'me'
                                  ? 'reaction-picker'
                                  : 'reaction-picker reaction-picker-incoming'
                              }
                            >
                              <Suspense fallback={<span className="reaction-picker-loading">...</span>}>
                                <EmojiPicker
                                  emojiStyle={'native' as EmojiStyle}
                                  height={300}
                                  lazyLoadEmojis
                                  onEmojiClick={(emojiData) =>
                                    handleToggleReaction(message.id, emojiData.emoji)
                                  }
                                  previewConfig={{ showPreview: false }}
                                  searchPlaceHolder="Tìm Emoji"
                                  skinTonesDisabled
                                  theme={'light' as Theme}
                                  width={292}
                                />
                              </Suspense>
                            </span>
                          ) : null}
                          <button
                            className="message-more-button"
                            disabled={Boolean(busyMessageId)}
                            onClick={() => {
                              setOpenReactionPickerId('')
                              setOpenActionMenuId((current) =>
                                current === message.id ? '' : message.id,
                              )
                            }}
                            title="Tùy chọn tin nhắn"
                            type="button"
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          {openActionMenuId === message.id ? (
                            <span className="message-action-menu">
                              {message.attachments && message.attachments.some(a => a.type === 'image') && (
                                <button
                                  disabled={Boolean(busyMessageId)}
                                  onClick={() => {
                                    message.attachments?.forEach(attachment => {
                                      if (attachment.type === 'image') {
                                        const a = document.createElement('a')
                                        a.href = attachment.url
                                        a.download = attachment.name || 'image'
                                        a.target = '_blank'
                                        a.rel = 'noreferrer'
                                        a.click()
                                      }
                                    })
                                    setOpenActionMenuId('')
                                  }}
                                  type="button"
                                >
                                  <Download size={14} />
                                  <span>Tải xuống</span>
                                </button>
                              )}
                              {message.text && (
                                <button
                                  disabled={Boolean(busyMessageId)}
                                  onClick={() => {
                                    navigator.clipboard.writeText(message.text).catch(() => {})
                                    setOpenActionMenuId('')
                                  }}
                                  type="button"
                                >
                                  <Copy size={14} />
                                  <span>Sao chép</span>
                                </button>
                              )}
                              <button
                                disabled={Boolean(busyMessageId)}
                                onClick={() => handleTogglePin(message.id)}
                                type="button"
                              >
                                {message.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                                <span>{message.isPinned ? 'Bỏ ghim' : 'Ghim'}</span>
                              </button>
                              <button
                                disabled={Boolean(busyMessageId)}
                                onClick={() => startForwarding(message)}
                                type="button"
                              >
                                <SendHorizontal size={14} />
                                <span>Chuyển tiếp</span>
                              </button>
                              {message.author === 'me' ? (
                                <>
                                  <button
                                    disabled={Boolean(busyMessageId)}
                                    onClick={() => startEditing(message)}
                                    type="button"
                                  >
                                    <Pencil size={14} />
                                    <span>Sửa</span>
                                  </button>
                                  <button
                                    className="is-danger"
                                    disabled={Boolean(busyMessageId)}
                                    onClick={() => handleDeleteForMe(message)}
                                    type="button"
                                  >
                                    <Trash2 size={14} />
                                    <span>Xoá phía tôi</span>
                                  </button>
                                  <button
                                    className="is-danger"
                                    disabled={Boolean(busyMessageId)}
                                    onClick={() => handleRecall(message)}
                                    type="button"
                                  >
                                    <Trash2 size={14} />
                                    <span>Thu hồi</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    disabled={Boolean(busyMessageId)}
                                    onClick={() => handleReport(message)}
                                    type="button"
                                  >
                                    <Flag size={14} />
                                    <span>Báo cáo</span>
                                  </button>
                                <button
                                  className="is-danger"
                                  disabled={Boolean(busyMessageId)}
                                  onClick={() => handleDeleteForMe(message)}
                                  type="button"
                                >
                                  <Trash2 size={14} />
                                  <span>Xoá phía tôi</span>
                                </button>
                                </>
                              )}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
  )
}
