import localforage from 'localforage'
import type { Conversation, Message } from '../../types'
import type { QueuedMessage } from './offlineQueue'

export const conversationsStore = localforage.createInstance({
  name: 'inbox_offline_db',
  storeName: 'conversations'
})

export const messagesStore = localforage.createInstance({
  name: 'inbox_offline_db',
  storeName: 'messages'
})

export const pendingMessagesStore = localforage.createInstance({
  name: 'inbox_offline_db',
  storeName: 'pending_messages'
})

export const authStore = localforage.createInstance({
  name: 'inbox_offline_db',
  storeName: 'auth'
})

export async function cacheConversations(conversations: Conversation[]) {
  await conversationsStore.setItem('all', conversations)
}

export async function getCachedConversations(): Promise<Conversation[]> {
  const data = await conversationsStore.getItem<Conversation[]>('all')
  return data || []
}

export async function cacheMessages(conversationId: string, messages: Message[]) {
  await messagesStore.setItem(conversationId, messages)
}

export async function getCachedMessages(conversationId: string): Promise<Message[]> {
  const data = await messagesStore.getItem<Message[]>(conversationId)
  return data || []
}

export async function savePendingMessage(message: QueuedMessage) {
  const pending = await getPendingMessages()
  pending.push(message)
  await pendingMessagesStore.setItem('queue', pending)
}

export async function getPendingMessages(): Promise<QueuedMessage[]> {
  const data = await pendingMessagesStore.getItem<QueuedMessage[]>('queue')
  return data || []
}

export async function clearPendingMessages() {
  await pendingMessagesStore.setItem('queue', [])
}

export async function removePendingMessage(messageId: string) {
  const pending = await getPendingMessages()
  await pendingMessagesStore.setItem('queue', pending.filter(m => m.message.id !== messageId))
}

export async function cacheAuthToken(token: string) {
  await authStore.setItem('refreshToken', token)
}

export async function getCachedAuthToken(): Promise<string | null> {
  return await authStore.getItem<string>('refreshToken')
}

export async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready
      // @ts-ignore
      await registration.sync.register('sync-messages')
      console.log('Background sync registered')
    } catch (err) {
      console.error('Failed to register background sync', err)
    }
  }
}
