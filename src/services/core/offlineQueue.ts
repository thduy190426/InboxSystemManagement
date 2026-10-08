import type { Message } from '../../types'

export const SIDEBAR_STATE_KEY = 'sidebar_is_open'
export const INBOX_WIDTH_KEY = 'inbox_width'

export const COMPACT_LAYOUT_MEDIA_QUERY = '(max-width: 1024px)'
export const MESSAGE_PAGE_LIMIT = 40
export const CONVERSATION_FILTERS: string[] = ['all', 'unread', 'requests', 'group', 'archived']

export type QueuedMessage = {
  conversationId: string
  message: Message
  parentMessageId?: string
  userId: string
}

export function mergeLatestMessages(existingMessages: Message[], incomingMessages: Message[]) {
  const incomingById = new Map(incomingMessages.map((message) => [message.id, message]))
  const existingIds = new Set(existingMessages.map((message) => message.id))
  const updatedMessages = existingMessages.map((message) => incomingById.get(message.id) ?? message)
  const newMessages = incomingMessages.filter((message) => !existingIds.has(message.id))

  const merged = [...updatedMessages, ...newMessages]
  return merged.sort((a, b) => {
    const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime()
    const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime()
    return aTime - bTime
  })
}

export function prependOlderMessages(existingMessages: Message[], olderMessages: Message[]) {
  const existingIds = new Set(existingMessages.map((message) => message.id))
  const newOlderMessages = olderMessages.filter((message) => !existingIds.has(message.id))

  const merged = [...newOlderMessages, ...existingMessages]
  return merged.sort((a, b) => {
    const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime()
    const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime()
    return aTime - bTime
  })
}

export function getInitialSidebarState() {
  return localStorage.getItem(SIDEBAR_STATE_KEY) === 'true'
}

export function getInitialInboxWidth() {
  const saved = localStorage.getItem(INBOX_WIDTH_KEY)
  const width = saved ? parseInt(saved, 10) : 420
  return Math.max(350, Math.min(width, 600))
}

export function getInitialCompactLayoutState() {
  return typeof window !== 'undefined' && window.matchMedia(COMPACT_LAYOUT_MEDIA_QUERY).matches
}

import { savePendingMessage, getPendingMessages, removePendingMessage as removePendingIndexedDB, registerBackgroundSync } from './indexedDB'

export async function getQueuedMessagesForUser(userId: string) {
  if (!userId) {
    return []
  }

  const queue = await getPendingMessages()
  return queue.filter((item) => item.userId === userId)
}

export async function upsertQueuedMessage(item: QueuedMessage) {
  const queue = await getPendingMessages()
  const exists = queue.some((queuedItem) => queuedItem.message.id === item.message.id)
  
  if (!exists) {
    await savePendingMessage(item)
    await registerBackgroundSync()
  }
}

export async function removeQueuedMessage(messageId: string) {
  await removePendingIndexedDB(messageId)
}

export function mergeQueuedMessages(existingMessages: Message[], queuedMessages: Message[]) {
  const queuedById = new Map(queuedMessages.map((message) => [message.id, message]))
  const mergedMessages = existingMessages.map((message) => queuedById.get(message.id) ?? message)
  const existingIds = new Set(existingMessages.map((message) => message.id))
  const missingQueuedMessages = queuedMessages.filter((message) => !existingIds.has(message.id))

  return [...mergedMessages, ...missingQueuedMessages]
}
