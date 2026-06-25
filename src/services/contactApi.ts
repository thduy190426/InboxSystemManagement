import type { ContactUser } from '../types'
import { requestJson } from './apiClient'

type SearchResponse = {
  users: ContactUser[]
}

type RequestsResponse = {
  requests: ContactUser[]
}

type FriendsResponse = {
  friends: ContactUser[]
}

type SuggestionsResponse = {
  suggestions: ContactUser[]
}

type ContactStatusResponse = {
  contactId: string
  friendshipStatus: ContactUser['friendshipStatus']
  message: string
}

type ContactNicknameResponse = {
  contactId: string
  nickname: string | null
  message: string
}

async function request<T>(path: string, options: RequestInit = {}) {
  return requestJson<T>(path, options, 'Không thể xử lý yêu cầu!')
}

export async function searchUsers(query: string) {
  const response = await request<SearchResponse>(
    `/contacts/search?q=${encodeURIComponent(query)}`,
  )

  return response.users
}

export async function fetchIncomingRequests() {
  const response = await request<RequestsResponse>('/contacts/requests')

  return response.requests
}

export async function fetchFriends() {
  const response = await request<FriendsResponse>('/contacts/friends')

  return response.friends
}

export async function fetchSuggestions() {
  const response = await request<SuggestionsResponse>('/contacts/suggestions')

  return response.suggestions
}

export function sendFriendRequest(userId: string) {
  return request<{ message: string }>('/contacts/request', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export function acceptFriendRequest(contactId: string) {
  return request<{ message: string; conversationId: string }>(`/contacts/${contactId}/accept`, {
    method: 'POST',
  })
}

export function declineFriendRequest(contactId: string) {
  return request<{ message: string }>(`/contacts/${contactId}/decline`, {
    method: 'POST',
  })
}

export function cancelFriendRequest(contactId: string) {
  return request<{ message: string }>(`/contacts/${contactId}/request`, {
    method: 'DELETE',
  })
}

export function blockContact(contactId: string) {
  return request<ContactStatusResponse>(`/contacts/${contactId}/block`, {
    method: 'POST',
  })
}

export function unblockContact(contactId: string) {
  return request<ContactStatusResponse>(`/contacts/${contactId}/unblock`, {
    method: 'POST',
  })
}

export function updateContactNickname(contactId: string, nickname: string) {
  return request<ContactNicknameResponse>(`/contacts/${contactId}/nickname`, {
    method: 'PATCH',
    body: JSON.stringify({ nickname }),
  })
}

export function unfriend(contactId: string) {
  return request<{ message: string }>(`/contacts/${contactId}`, {
    method: 'DELETE',
  })
}
