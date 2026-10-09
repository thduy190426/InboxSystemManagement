import {
  fetchConversations,
  fetchMessagesPage,
  searchConversationMessages,
  sendMessage,
  sendPoll,
  votePoll,
  uploadMessageAttachment,
  sendGifMessage,
  updateMessage,
  deleteMessage,
  recallMessage,
  toggleMessagePin,
  forwardMessage,
  reportMessage,
  toggleMessageReaction,
  removeMessageReaction,
  updateTypingStatus,
  type MessageSearchFilters,
} from '../../services/api/chatApi'
import type { Conversation, Message } from '../../types'
import {
  upsertQueuedMessage,
  removeQueuedMessage,
  prependOlderMessages,
  mergeLatestMessages,
  MESSAGE_PAGE_LIMIT,
  type QueuedMessage,
} from '../../services/core/offlineQueue'
import { e2eeEngine } from '../../lib/e2ee/E2EEEngine'
import type { AuthUser } from '../../services/api/authApi'
import type { GifSearchResult } from '../../services/api/gifApi'

function getAttachmentPreview(message: Message | undefined, t: any) {
  const attachment = message?.attachments?.[0]
  const attachmentType = attachment?.type

  if (attachment?.mimeType === 'image/gif') {
    return t('gifSent')
  }

  if (attachmentType === 'image') {
    return t('imageSent')
  }

  if (attachmentType === 'audio') {
    return t('audioSent')
  }

  if (attachmentType === 'video') {
    return t('videoSent')
  }

  if (attachmentType === 'file') {
    return t('fileSent')
  }

  return message?.text ?? t('noMessage')
}

interface UseChatMessageActionsProps {
  activeConversation?: Conversation
  activeId: string
  activeMessagePagination: any
  busyMessageId: string
  currentUser: AuthUser | null
  currentUserIdRef: React.MutableRefObject<string>
  isUploadingAttachment: boolean
  lastSentTypingRef: React.MutableRefObject<{ conversationId: string; isTyping: boolean } | null>
  membersByConversation: any
  messagesByConversation: any
  replyingTo: Message | null
  typingStopTimerRef: React.MutableRefObject<number | null>
  t: any
  applyModerationToText: (text: string) => { modified: string; isBlocked: boolean }
  isFileBlocked: (name: string) => boolean
  pushToast: (text: string, tone?: 'info' | 'error') => void
  setBusyMessageId: (id: string) => void
  setConversations: (updater: any) => void
  setDraft: (draft: string) => void
  setFocusedMessageId: (id: string) => void
  setIsSending: (isSending: boolean) => void
  setIsUploadingAttachment: (isUploading: boolean) => void
  setMessagesByConversation: (updater: any) => void
  setMessagePaginationByConversation: (updater: any) => void
  setReplyingTo: (updater: any) => void
  setShouldAutoScrollToLatest: (should: boolean) => void
}

export function useChatMessageActions({
  activeConversation,
  activeId,
  activeMessagePagination,
  busyMessageId,
  currentUser,
  currentUserIdRef,
  isUploadingAttachment,
  lastSentTypingRef,
  membersByConversation,
  messagesByConversation,
  replyingTo,
  typingStopTimerRef,
  t,
  applyModerationToText,
  isFileBlocked,
  pushToast,
  setBusyMessageId,
  setConversations,
  setDraft,
  setFocusedMessageId,
  setIsSending,
  setIsUploadingAttachment,
  setMessagesByConversation,
  setMessagePaginationByConversation,
  setReplyingTo,
  setShouldAutoScrollToLatest,
}: UseChatMessageActionsProps) {
  function getErrorMessage(error: unknown, fallbackMessage: string) {
    return error instanceof Error ? error.message : fallbackMessage
  }

  function setErrorMessage(message: string) {
    if (message) {
      pushToast(message)
    }
  }

  async function handleLoadOlderMessages() {
    if (!activeId || !activeMessagePagination?.hasMore || activeMessagePagination.isLoadingOlder) {
      return
    }

    try {
      setMessagePaginationByConversation((current: any) => ({
        ...current,
        [activeId]: {
          ...current[activeId],
          hasMore: current[activeId]?.hasMore ?? true,
          isLoadingOlder: true,
          nextCursor: current[activeId]?.nextCursor ?? null,
        },
      }))

      const messagePage = await fetchMessagesPage(activeId, {
        before: activeMessagePagination.nextCursor,
        limit: MESSAGE_PAGE_LIMIT,
      })

      setMessagesByConversation((current: any) => ({
        ...current,
        [activeId]: prependOlderMessages(current[activeId] ?? [], messagePage.messages),
      }))
      setMessagePaginationByConversation((current: any) => ({
        ...current,
        [activeId]: {
          hasMore: messagePage.hasMore,
          isLoadingOlder: false,
          nextCursor: messagePage.nextCursor,
        },
      }))
    } catch (error) {
      setMessagePaginationByConversation((current: any) => ({
        ...current,
        [activeId]: {
          ...current[activeId],
          hasMore: current[activeId]?.hasMore ?? true,
          isLoadingOlder: false,
          nextCursor: current[activeId]?.nextCursor ?? null,
        },
      }))
      pushToast(getErrorMessage(error, t('loadOlderErr')))
    }
  }

  async function handleSearchMessages(filters: MessageSearchFilters) {
    if (!activeConversation) {
      return []
    }

    return searchConversationMessages(activeConversation.id, filters)
  }

  async function handleJumpToMessage(messageId: string) {
    if (!activeConversation) {
      return
    }

    const messagePage = await fetchMessagesPage(activeConversation.id, {
      around: messageId,
      limit: MESSAGE_PAGE_LIMIT,
    })

    setMessagesByConversation((current: any) => ({
      ...current,
      [activeConversation.id]: mergeLatestMessages(
        current[activeConversation.id] ?? [],
        messagePage.messages,
      ).sort((left: any, right: any) => Number(left.id) - Number(right.id)),
    }))
    setFocusedMessageId(messageId)
    window.setTimeout(() => setFocusedMessageId(''), 1600)
  }

  async function sendActiveConversationMessage(
    textValue: string,
    clearDraft = false,
    retryMessage?: Message,
  ) {
    if (!activeConversation) return

    if (activeConversation.blocked) {
      pushToast(t('blockedUser'))
      return
    }

    let text = textValue.trim()

    if (!text) return

    const { modified: moderatedText, isBlocked } = applyModerationToText(text)
    if (isBlocked) {
      pushToast(t('moderationBlocked'), 'error')
      return
    }
    text = moderatedText

    const parentMessageId = retryMessage?.replyTo?.id ?? replyingTo?.id ?? undefined
    const temporaryMessage: Message =
      retryMessage ?? {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        author: 'me',
        text,
        time: t('now'),
        createdAt: new Date().toISOString(),
        type: 'text',
        state: 'sending',
        replyTo: replyingTo
          ? {
            id: replyingTo.id,
            author: replyingTo.author,
            text: replyingTo.text,
            type: replyingTo.type,
            senderName: replyingTo.senderName,
          }
          : null,
        mentions: [],
        reactions: [],
        attachments: [],
      }
    const queuedMessage: QueuedMessage = {
      conversationId: activeConversation.id,
      message: temporaryMessage,
      parentMessageId,
      userId: currentUserIdRef.current,
    }

    try {
      setIsSending(true)
      upsertQueuedMessage({
        ...queuedMessage,
        message: { ...temporaryMessage, state: 'sending' },
      })

      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: retryMessage
          ? (current[activeConversation.id] ?? []).map((message: Message) =>
            message.id === retryMessage.id
              ? { ...message, createdAt: message.createdAt || new Date().toISOString(), state: 'sending', time: t('now') }
              : message,
          )
          : [...(current[activeConversation.id] ?? []), temporaryMessage],
      }))
      setShouldAutoScrollToLatest(true)

      setConversations((current: Conversation[] = []) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
              ...conversation,
              lastMessage: text,
              lastMessageByMe: true,
              lastMessageIsAttachment: false,
              lastMessageAt: temporaryMessage.createdAt,
              lastTime: t('now'),
            }
            : conversation,
        ),
      )

      if (clearDraft) {
        setDraft('')
      }
      setReplyingTo(null)

      let sendText = text
      let isE2ee = false
      let e2eeType: number | undefined = undefined

      if (activeConversation.type === 'secret') {
        const activeMembers = membersByConversation[activeConversation.id] || []
        const remoteUser = activeMembers.find((m: any) => String(m.userId) !== String(currentUser?.id))
        if (remoteUser) {
          const cipherResult = await e2eeEngine.encryptMessage(remoteUser.userId, text)
          sendText = cipherResult.body ?? ''
          isE2ee = true
          e2eeType = cipherResult.type
        }
      }

      const createdMessage = await sendMessage(
        activeConversation.id,
        sendText,
        parentMessageId,
        isE2ee,
        e2eeType
      )
      removeQueuedMessage(temporaryMessage.id)
      updateTypingStatus(activeConversation.id, false).catch(() => undefined)
      lastSentTypingRef.current = {
        conversationId: activeConversation.id,
        isTyping: false,
      }

      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current)
        typingStopTimerRef.current = null
      }

      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((message: Message) =>
          message.id === temporaryMessage.id ? createdMessage : message,
        ),
      }))
    } catch (error) {
      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((message: Message) =>
          message.id === temporaryMessage.id ? { ...message, state: 'failed' } : message,
        ),
      }))
      upsertQueuedMessage({
        ...queuedMessage,
        message: { ...temporaryMessage, state: 'failed' },
      })
      pushToast(
        error instanceof Error
          ? `${error.message} ${t('sendRetainedSuffix')}`
          : t('sendRetainedErr'),
      )
    } finally {
      setIsSending(false)
    }
  }

  async function handleSendQuickMessage(text: string) {
    await sendActiveConversationMessage(text)
  }

  async function handleSendPoll(pollData: Omit<import('../../types').MessagePoll, 'id' | 'totalVotes' | 'isClosed'>) {
    if (!activeConversation) return
    try {
      const createdMessage = await sendPoll(activeConversation.id, pollData, replyingTo?.id)
      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: [...(current[activeConversation.id] ?? []), createdMessage],
      }))
      setConversations((current: Conversation[] = []) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
              ...conversation,
              lastMessage: t('pollCreated'),
              lastMessageByMe: true,
              lastMessageAt: createdMessage.createdAt ?? null,
              lastTime: createdMessage.time,
            }
            : conversation,
        ),
      )
      setReplyingTo(null)
    } catch (error) {
      pushToast(error instanceof Error ? error.message : t('createPollErr'))
    }
  }

  async function handleVotePoll(messageId: string, optionIds: string[]) {
    if (!activeConversation) return
    try {
      setMessagesByConversation((current: any) => {
        const conversationMessages = current[activeConversation.id] ?? []
        return {
          ...current,
          [activeConversation.id]: conversationMessages.map((msg: Message) => {
            if (msg.id === messageId && msg.poll) {
              const updatedPoll = { ...msg.poll }
              const prevVotedOptionIds = new Set(
                updatedPoll.options
                  .filter(o => o.voterIds.includes(currentUserIdRef.current))
                  .map(o => o.id)
              )
              let voteChange = 0
              updatedPoll.options = updatedPoll.options.map(o => {
                const isSelected = optionIds.includes(o.id)
                const wasSelected = prevVotedOptionIds.has(o.id)
                const voterIds = o.voterIds.filter(id => id !== currentUserIdRef.current)
                if (isSelected) voterIds.push(currentUserIdRef.current)

                if (isSelected && !wasSelected) voteChange++
                if (!isSelected && wasSelected) voteChange--

                return { ...o, voterIds }
              })
              updatedPoll.totalVotes += voteChange
              return { ...msg, poll: updatedPoll }
            }
            return msg
          })
        }
      })

      await votePoll(activeConversation.id, messageId, optionIds)
    } catch (error) {
      pushToast(error instanceof Error ? error.message : t('votePollErr'))
    }
  }

  async function handleRetryMessage(message: Message) {
    await sendActiveConversationMessage(message.text, false, message)
  }

  async function handleUploadAttachment(file: File) {
    if (!activeConversation || isUploadingAttachment) return

    if (activeConversation.blocked) {
      pushToast(t('blockedUser'))
      return
    }

    if (isFileBlocked(file.name)) {
      pushToast(t('blockedFileErr'), 'error')
      return
    }

    try {
      setIsUploadingAttachment(true)

      let uploadFile = file
      if (file.type.startsWith('image/')) {
        const imageCompression = (await import('browser-image-compression')).default
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        }
        try {
          const compressedFile = await imageCompression(file, options)
          uploadFile = new File([compressedFile], file.name, { type: compressedFile.type })
        } catch (e) {
          console.warn('Image compression failed', e)
        }
      }

      const createdMessage = await uploadMessageAttachment(activeConversation.id, uploadFile)

      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: [...(current[activeConversation.id] ?? []), createdMessage],
      }))

      setConversations((current: Conversation[] = []) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
              ...conversation,
              lastMessage: getAttachmentPreview(createdMessage, t),
              lastMessageByMe: true,
              lastMessageIsAttachment: Boolean(createdMessage.attachments?.length),
              lastMessageAt: createdMessage.createdAt ?? null,
              lastTime: createdMessage.time,
              attachments: [
                ...(createdMessage.attachments ?? []),
                ...(conversation.attachments || []),
              ],
            }
            : conversation,
        ),
      )
    } catch (error) {
      pushToast(getErrorMessage(error, t('sendFileErr')))
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  async function handleSendGif(gif: GifSearchResult) {
    if (!activeConversation || isUploadingAttachment) return

    if (activeConversation.blocked) {
      pushToast(t('blockedUser'))
      return
    }

    try {
      setIsUploadingAttachment(true)

      const createdMessage = await sendGifMessage(activeConversation.id, {
        url: gif.url,
        title: gif.title,
        width: gif.width,
        height: gif.height,
        sizeBytes: gif.sizeBytes,
      })

      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: [...(current[activeConversation.id] ?? []), createdMessage],
      }))

      setConversations((current: Conversation[] = []) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
              ...conversation,
              lastMessage: t('gifSent'),
              lastMessageByMe: true,
              lastMessageIsAttachment: true,
              lastMessageAt: createdMessage.createdAt ?? null,
              lastTime: createdMessage.time,
              attachments: [
                ...(createdMessage.attachments ?? []),
                ...(conversation.attachments || []),
              ],
            }
            : conversation,
        ),
      )
    } catch (error) {
      pushToast(getErrorMessage(error, t('sendGifErr')))
      throw error
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  async function handleSendSticker(url: string) {
    if (!activeConversation || isUploadingAttachment) return

    if (activeConversation.blocked) {
      pushToast(t('blockedUser'))
      return
    }

    try {
      setIsUploadingAttachment(true)

      const createdMessage = await sendGifMessage(activeConversation.id, {
        url: url,
        title: 'Sticker',
      })

      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: [...(current[activeConversation.id] ?? []), createdMessage],
      }))

      setConversations((current: Conversation[] = []) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
              ...conversation,
              lastMessage: t('stickerSent'),
              lastMessageByMe: true,
              lastMessageIsAttachment: true,
              lastMessageAt: createdMessage.createdAt ?? null,
              lastTime: createdMessage.time,
              attachments: [
                ...(createdMessage.attachments ?? []),
                ...(conversation.attachments || []),
              ],
            }
            : conversation,
        ),
      )
    } catch (error) {
      pushToast(getErrorMessage(error, t('sendStickerErr')))
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  async function handleEditMessage(messageId: string, text: string) {
    if (!activeConversation || busyMessageId) return

    try {
      setBusyMessageId(messageId)

      const updatedMessage = await updateMessage(activeConversation.id, messageId, text)

      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((message: Message) =>
          message.id === messageId ? updatedMessage : message,
        ),
      }))

      setConversations((current: Conversation[] = []) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id && conversation.lastMessage !== t('noMessage')
            ? {
              ...conversation,
              lastMessage:
                conversation.lastMessage ===
                  messagesByConversation[activeConversation.id]?.find(
                    (message: Message) => message.id === messageId,
                  )?.text
                  ? text
                  : conversation.lastMessage,
            }
            : conversation,
        ),
      )
    } catch (error) {
      pushToast(getErrorMessage(error, t('editMsgErr')))
      throw error
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!activeConversation || busyMessageId) return

    try {
      setBusyMessageId(messageId)

      await deleteMessage(activeConversation.id, messageId)

      const nextMessages = (messagesByConversation[activeConversation.id] ?? []).filter(
        (message: Message) => message.id !== messageId,
      )
      const nextLastMessageItem = nextMessages.at(-1)
      const nextLastMessage = getAttachmentPreview(nextLastMessageItem, t)
      const nextLastTime = nextLastMessageItem?.time ?? ''

      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: nextMessages,
      }))
      setReplyingTo((current: any) => (current?.id === messageId ? null : current))

      setConversations((current: Conversation[] = []) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
              ...conversation,
              lastMessage: nextLastMessage,
              lastMessageByMe: nextLastMessageItem?.author === 'me',
              lastMessageIsAttachment: Boolean(nextLastMessageItem?.attachments?.length),
              lastMessageAt: nextLastMessageItem?.createdAt ?? null,
              lastTime: nextLastTime,
            }
            : conversation,
        ),
      )

      const [serverMessagePage, nextConversations] = await Promise.all([
        fetchMessagesPage(activeConversation.id, { limit: MESSAGE_PAGE_LIMIT }),
        fetchConversations(),
      ])

      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: mergeLatestMessages(current[activeConversation.id] ?? [], serverMessagePage.messages).filter(
          (message: Message) => message.id !== messageId,
        ),
      }))
      setMessagePaginationByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: {
          hasMore: current[activeConversation.id]?.hasMore ?? serverMessagePage.hasMore,
          isLoadingOlder: false,
          nextCursor: current[activeConversation.id]?.nextCursor ?? serverMessagePage.nextCursor,
        },
      }))
      setConversations(nextConversations)
    } catch (error) {
      pushToast(getErrorMessage(error, t('deleteMsgErr')))
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleRecallMessage(messageId: string) {
    if (!activeConversation || busyMessageId) return

    try {
      setBusyMessageId(messageId)

      const updatedConversation = await recallMessage(activeConversation.id, messageId)

      const nextMessages = (messagesByConversation[activeConversation.id] ?? []).filter(
        (message: Message) => message.id !== messageId,
      )

      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: nextMessages,
      }))
      setReplyingTo((current: any) => (current?.id === messageId ? null : current))

      setConversations((current: Conversation[] = []) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id ? updatedConversation : conversation,
        ),
      )

      const [serverMessagePage, nextConversations] = await Promise.all([
        fetchMessagesPage(activeConversation.id, { limit: MESSAGE_PAGE_LIMIT }),
        fetchConversations(),
      ])

      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: mergeLatestMessages(current[activeConversation.id] ?? [], serverMessagePage.messages).filter(
          (message: Message) => message.id !== messageId,
        ),
      }))
      setMessagePaginationByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: {
          hasMore: serverMessagePage.hasMore,
          isLoadingOlder: false,
          nextCursor: serverMessagePage.nextCursor,
        },
      }))
      setConversations(nextConversations)
    } catch (error) {
      pushToast(getErrorMessage(error, t('recallMsgErr')))
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleToggleMessagePin(messageId: string) {
    if (!activeConversation || busyMessageId) return

    try {
      setBusyMessageId(messageId)
      const updatedMessage = await toggleMessagePin(activeConversation.id, messageId)
      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((message: Message) =>
          message.id === messageId ? updatedMessage : message,
        ),
      }))
    } catch (error) {
      pushToast(getErrorMessage(error, t('pinMsgErr')))
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleForwardMessage(messageId: string, targetConversationId: string) {
    if (!activeConversation || busyMessageId) return

    try {
      setBusyMessageId(messageId)

      const response = await forwardMessage(activeConversation.id, messageId, targetConversationId)

      setMessagesByConversation((current: any) => {
        if (!current[targetConversationId]) {
          return current
        }

        return {
          ...current,
          [targetConversationId]: [...current[targetConversationId], response.message],
        }
      })

      setConversations((current: Conversation[] = []) =>
        current
          .map((conversation) =>
            conversation.id === targetConversationId
              ? {
                ...conversation,
                ...response.conversation,
              }
              : conversation,
          )
          .sort((first: any, second: any) => Number(second.pinned) - Number(first.pinned)),
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('forwardMsgErr'))
      throw error
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleReportMessage(messageId: string) {
    if (!activeConversation || busyMessageId) return

    try {
      setBusyMessageId(messageId)
      const message = await reportMessage(
        activeConversation.id,
        messageId,
        t('reportMsgTitle'),
      )

      pushToast(message || t('reportMsgSuccess'), 'info')
    } catch (error) {
      pushToast(getErrorMessage(error, t('reportMsgErr')))
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleToggleMessageReaction(messageId: string, emoji: string) {
    if (!activeConversation || busyMessageId) return

    try {
      setBusyMessageId(messageId)
      setErrorMessage('')

      const message = await toggleMessageReaction(activeConversation.id, messageId, emoji)

      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((item: Message) =>
          item.id === messageId ? message : item,
        ),
      }))
    } catch (error) {
      pushToast(getErrorMessage(error, t('reactMsgErr')))
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleRemoveMessageReaction(messageId: string, emoji: string) {
    if (!activeConversation || busyMessageId) return

    try {
      setBusyMessageId(messageId)

      const message = await removeMessageReaction(activeConversation.id, messageId, emoji)

      setMessagesByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((item: Message) =>
          item.id === messageId ? message : item,
        ),
      }))
    } catch (error) {
      pushToast(getErrorMessage(error, t('unreactMsgErr')))
    } finally {
      setBusyMessageId('')
    }
  }

  return {
    handleLoadOlderMessages,
    handleSearchMessages,
    handleJumpToMessage,
    sendActiveConversationMessage,
    handleSendQuickMessage,
    handleSendPoll,
    handleVotePoll,
    handleRetryMessage,
    handleUploadAttachment,
    handleSendGif,
    handleSendSticker,
    handleEditMessage,
    handleDeleteMessage,
    handleRecallMessage,
    handleToggleMessagePin,
    handleForwardMessage,
    handleReportMessage,
    handleToggleMessageReaction,
    handleRemoveMessageReaction,
  }
}
