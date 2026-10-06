import { useChatState, useMessageActions, useChatUI } from './ChatContexts'

import { Suspense, lazy } from 'react'
import { MoreHorizontal, Reply, Pencil, Copy, Pin, Trash2, Check, CheckCheck, PinOff, Calendar, X, SendHorizontal, Smile, Download, Flag } from 'lucide-react'
import type { Message } from '../../types'
import { AvatarFallback } from '../ui/AvatarFallback'
import type { EmojiStyle, Theme } from 'emoji-picker-react'
import { PollMessage } from './PollMessage'
import { useTranslation } from 'react-i18next'
const EmojiPicker = lazy(() => import('emoji-picker-react'))

export type MessageItemProps = {
  index: number
  message: Message
  displayMessages: Message[]
}

export function MessageItem(props: MessageItemProps) {
  const { t } = useTranslation('panels')
  const { index, message, displayMessages } = props;
  const { 
    currentUserId, editingMessageId, busyMessageId, editingText, 
    openActionMenuId, openReactionPickerId, searchMatches, 
    activeSearchMessageId, focusedMessageId, activeConversation, members 
  } = useChatState()
  
  const { 
    startReplying, startForwarding, handleDeleteForMe, handleRecall, handleReport, 
    handleTogglePin, onRetryMessage, handleToggleReaction, startEditing, cancelEditing, 
    setEditingText, handleEditSubmit, onVotePoll 
  } = useMessageActions()
  
  const { 
    getDateDividerLabel, isSameMessageGroup, messageRefs, renderCallMessage, 
    renderHighlightedText, shouldRenderMessageText, renderReplyPreview, 
    getMessageStateLabel, formatMessageTime, renderAttachments, renderReactions, 
    isSameLocalDay, parseMessageDate, setOpenActionMenuId, setOpenReactionPickerId 
  } = useChatUI()
            const previousMessage = displayMessages[index - 1]
            const nextMessage = displayMessages[index + 1]
            const dateDividerLabel = getDateDividerLabel(message, previousMessage)
            const isCallMsg = (msg: Message | undefined) => msg?.author === 'system' && Boolean(msg.text?.startsWith('Cuộc gọi') || msg.text?.includes('cuộc gọi'))
            const getEffectiveAuthor = (msg: Message | undefined) => {
              if (!msg) return undefined
              if (isCallMsg(msg)) {
                const text = msg.text || ''
                const isMyCall = (msg as any).senderId 
                  ? (msg as any).senderId === currentUserId 
                  : (text.includes('hủy') || text.includes('Không bắt máy') || text.includes('gọi đi'))
                return isMyCall ? 'me' : 'them'
              }
              return msg.author
            }
            
            const effectiveAuthor = getEffectiveAuthor(message)
            const prevEffectiveAuthor = getEffectiveAuthor(previousMessage)
            const nextEffectiveAuthor = getEffectiveAuthor(nextMessage)

            const isGroupedWithPrevious = isSameMessageGroup(message, previousMessage) && effectiveAuthor === prevEffectiveAuthor
            const isGroupedWithNext = isSameMessageGroup(message, nextMessage) && effectiveAuthor === nextEffectiveAuthor
            const shouldShowAvatar = effectiveAuthor === 'them' && !isGroupedWithNext
            const shouldShowSenderName = effectiveAuthor === 'them' && !isGroupedWithPrevious
            const isNearBottom = index >= displayMessages.length - 4;

            const isSystem = effectiveAuthor === 'system'
            let systemGroupCount = 1
            let isHiddenSystemMessage = false

            if (isSystem) {
              const isSameAsPrev =
                prevEffectiveAuthor === 'system' &&
                previousMessage?.text === message.text &&
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
              <div key={message.id} style={{ marginTop: isGroupedWithPrevious ? '2px' : '16px', display: 'flex', flexDirection: 'column' }}>
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
                    effectiveAuthor === 'system'
                      ? 'message-row system-message-row animate-in'
                      : effectiveAuthor === 'me'
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
                  {effectiveAuthor === 'system' ? (
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
                  ) : (
                    <>
                      {effectiveAuthor === 'them' ? (
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
                      <div 
                        className={`message-bubble ${(!shouldRenderMessageText(message) && message.attachments && message.attachments.length > 0) || isCallMsg(message) ? 'media-only' : ''}`}
                        style={isCallMsg(message) ? { padding: 0, background: 'transparent' } : undefined}
                      >
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
                              aria-label={t('editMessageAria')}
                              autoFocus
                              disabled={busyMessageId === message.id}
                              onChange={(event) => setEditingText(event.target.value)}
                              value={editingText}
                            />
                            <button
                              className="message-action-button"
                              disabled={!editingText.trim() || busyMessageId === message.id}
                              title={t('saveMessageAria')}
                              type="submit"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              className="message-action-button"
                              disabled={busyMessageId === message.id}
                              onClick={cancelEditing}
                              title={t('cancelTitle')}
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
                                <span>{t('pinnedLabel')}</span>
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
                            ) : isCallMsg(message) ? (
                              renderCallMessage(message)
                            ) : shouldRenderMessageText(message) ? (
                              <p>{renderHighlightedText(message)}</p>
                            ) : null}
                            {renderAttachments(message)}
                          </>
                        )}
                        <span className="message-time">
                          {formatMessageTime(message)}
                          {message.isEdited ? <span>{t('editedLabel')}</span> : null}
                          {effectiveAuthor === 'me' ? (
                            <>
                              <CheckCheck aria-label={getMessageStateLabel(message)} size={15} />
                              <span>{getMessageStateLabel(message)}</span>
                              {message.state === 'failed' ? (
                                <button
                                  className="message-retry-button"
                                  onClick={() => onRetryMessage(message)}
                                  title={t('retryTitle')}
                                  type="button"
                                >
                                  {t('retryBtn')}
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
                            title={t('replyTitle')}
                            type="button"
                          >
                            <Reply size={17} />
                          </button>
                          <button
                            className="message-more-button"
                            disabled={Boolean(busyMessageId)}
                            onClick={() => startForwarding(message)}
                            title={t('forwardTitle')}
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
                              className={[
                                'reaction-picker',
                                message.author !== 'me' ? 'reaction-picker-incoming' : '',
                                isNearBottom ? 'open-upwards' : ''
                              ].filter(Boolean).join(' ')}
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
                                  searchPlaceHolder={t('emojiSearchPlaceholder')}
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
                            title={t('messageOptionsTitle')}
                            type="button"
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          {openActionMenuId === message.id ? (
                            <span className={`message-action-menu ${isNearBottom ? 'open-upwards' : ''}`}>
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
                                  <span>{t('downloadBtn')}</span>
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
                                  <span>{t('copyBtn')}</span>
                                </button>
                              )}
                              <button
                                disabled={Boolean(busyMessageId)}
                                onClick={() => handleTogglePin(message.id)}
                                type="button"
                              >
                                {message.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                                <span>{message.isPinned ? t('unpinBtn') : t('pinBtn')}</span>
                              </button>
                              <button
                                disabled={Boolean(busyMessageId)}
                                onClick={() => startForwarding(message)}
                                type="button"
                              >
                                <SendHorizontal size={14} />
                                <span>{t('forwardTitle')}</span>
                              </button>
                              {effectiveAuthor === 'me' ? (
                                <>
                                  <button
                                    disabled={Boolean(busyMessageId)}
                                    onClick={() => startEditing(message)}
                                    type="button"
                                  >
                                    <Pencil size={14} />
                                    <span>{t('editBtn')}</span>
                                  </button>
                                  <button
                                    className="is-danger"
                                    disabled={Boolean(busyMessageId)}
                                    onClick={() => handleDeleteForMe(message)}
                                    type="button"
                                  >
                                    <Trash2 size={14} />
                                    <span>{t('deleteForMeBtn')}</span>
                                  </button>
                                  <button
                                    className="is-danger"
                                    disabled={Boolean(busyMessageId)}
                                    onClick={() => handleRecall(message)}
                                    type="button"
                                  >
                                    <Trash2 size={14} />
                                    <span>{t('recallBtn')}</span>
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
                                    <span>{t('reportBtn')}</span>
                                  </button>
                                <button
                                  className="is-danger"
                                  disabled={Boolean(busyMessageId)}
                                  onClick={() => handleDeleteForMe(message)}
                                  type="button"
                                >
                                  <Trash2 size={14} />
                                  <span>{t('deleteForMeBtn')}</span>
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
