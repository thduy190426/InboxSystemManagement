import { useEffect, useRef, useCallback } from 'react'
import { getQueuedMessagesForUser, removeQueuedMessage, mergeQueuedMessages, type QueuedMessage } from '../../services/core/offlineQueue'
import { sendMessage } from '../../services/api/chatApi'
import type { Message } from '../../types'

type UseOfflineQueueProps = {
  currentUserId: string | undefined;
  setMessagesByConversation: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
  pushToast: (text: string, tone?: 'info' | 'error') => void;
}

export function useOfflineQueue({ currentUserId, setMessagesByConversation, pushToast }: UseOfflineQueueProps) {
  const isFlushingOfflineQueueRef = useRef(false)

  useEffect(() => {
    if (!currentUserId) return

    const queuedMessages = getQueuedMessagesForUser(currentUserId)
    if (queuedMessages.length === 0) return

    setMessagesByConversation((current) => {
      const nextMessagesByConversation = { ...current }
      queuedMessages.forEach((queuedItem: QueuedMessage) => {
        nextMessagesByConversation[queuedItem.conversationId] = mergeQueuedMessages(
          nextMessagesByConversation[queuedItem.conversationId] ?? [],
          [{ ...queuedItem.message, state: 'failed' }],
        )
      })
      return nextMessagesByConversation
    })
  }, [currentUserId, setMessagesByConversation])

  const flushOfflineMessageQueue = useCallback(async () => {
    if (!currentUserId) return
    if (isFlushingOfflineQueueRef.current || !navigator.onLine) {
      return
    }

    const queuedMessages = getQueuedMessagesForUser(currentUserId)
    if (queuedMessages.length === 0) return

    isFlushingOfflineQueueRef.current = true

    try {
      for (const queuedItem of queuedMessages) {
        try {
          setMessagesByConversation((current) => ({
            ...current,
            [queuedItem.conversationId]: (current[queuedItem.conversationId] ?? []).map((message) =>
              message.id === queuedItem.message.id ? { ...message, state: 'sending' } : message,
            ),
          }))

          const createdMessage = await sendMessage(
            queuedItem.conversationId,
            queuedItem.message.text,
            queuedItem.parentMessageId,
          )

          removeQueuedMessage(queuedItem.message.id)
          setMessagesByConversation((current) => ({
            ...current,
            [queuedItem.conversationId]: (current[queuedItem.conversationId] ?? []).map((message) =>
              message.id === queuedItem.message.id ? createdMessage : message,
            ),
          }))
        } catch {
          setMessagesByConversation((current) => ({
            ...current,
            [queuedItem.conversationId]: (current[queuedItem.conversationId] ?? []).map((message) =>
              message.id === queuedItem.message.id ? { ...message, state: 'failed' } : message,
            ),
          }))
          break
        }
      }
    } finally {
      isFlushingOfflineQueueRef.current = false
    }
  }, [currentUserId, setMessagesByConversation])

  useEffect(() => {
    if (!currentUserId) return
    
    flushOfflineMessageQueue().catch(() => undefined)

    function handleOnline() {
      flushOfflineMessageQueue()
        .then(() => {
          if (getQueuedMessagesForUser(currentUserId as string).length === 0) {
            pushToast('Tin nhắn offline đã được gửi lại.', 'info')
          }
        })
        .catch(() => undefined)
    }

    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [currentUserId, flushOfflineMessageQueue, pushToast])

  return { flushOfflineMessageQueue }
}
