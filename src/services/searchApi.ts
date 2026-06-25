import { requestJson } from './apiClient'

export type GlobalSearchConversation = {
  id: string
  type: 'direct' | 'group' | 'support'
  name: string
  avatar: string | null
  lastMessage: string
  time: string
}

export type GlobalSearchMessage = {
  id: string
  conversationId: string
  conversationName: string
  senderName: string
  text: string
  type: 'text' | 'image' | 'file' | 'audio'
  time: string
}

export type GlobalSearchUser = {
  id: string
  fullName: string
  email: string
  avatarUrl: string | null
  bio: string | null
  friendshipStatus: 'none' | 'pending' | 'accepted' | 'blocked'
  contactId: string | null
}

export type GlobalSearchResponse = {
  conversations: GlobalSearchConversation[]
  messages: GlobalSearchMessage[]
  users: GlobalSearchUser[]
}

export function globalSearch(query: string) {
  return requestJson<GlobalSearchResponse>(
    `/search?q=${encodeURIComponent(query)}`,
    {},
    'Không thể tìm kiếm!',
  )
}
