import type { CallHistoryItem, Conversation, ConversationMember, Message } from '../types'
import { apiFetch } from './apiClient'

type ConversationsResponse = {
  conversations: Conversation[]
}

type MessagesResponse = {
  messages: Message[]
  hasMore?: boolean
  nextCursor?: string | null
}

type CreateMessageResponse = {
  message: Message
}

type UploadAttachmentResponse = {
  message: Message
}

type UpdateMessageResponse = {
  message: Message
}

type MarkConversationReadResponse = {
  messages: Message[]
  readMessageId: string | null
}

type MarkConversationDeliveredResponse = {
  messages: Message[]
}

type ConversationResponse = {
  conversation: Conversation
}

type ForwardMessageResponse = {
  conversation: Conversation
  message: Message
}

type TypingStatusResponse = {
  isTyping: boolean
}

type ConversationMembersResponse = {
  members: ConversationMember[]
}

type ConversationCallsResponse = {
  calls: CallHistoryItem[]
}

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await apiFetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body.message ?? 'Không thể tải dữ liệu từ máy chủ!')
  }

  return body as T
}

export async function fetchConversations(options: { archived?: boolean } = {}) {
  const path = options.archived ? '/conversations?archived=true' : '/conversations'
  const response = await request<ConversationsResponse>(path)

  return response.conversations
}

export type MessagesPage = {
  messages: Message[]
  hasMore: boolean
  nextCursor: string | null
}

export async function fetchMessagesPage(
  conversationId: string,
  options: { before?: string | null; limit?: number } = {},
) {
  const params = new URLSearchParams()

  if (options.before) {
    params.set('before', options.before)
  }

  if (options.limit) {
    params.set('limit', String(options.limit))
  }

  const query = params.toString()
  const response = await request<MessagesResponse>(
    `/conversations/${conversationId}/messages${query ? `?${query}` : ''}`,
  )

  return {
    messages: response.messages,
    hasMore: Boolean(response.hasMore),
    nextCursor: response.nextCursor ?? null,
  }
}

export async function fetchMessages(conversationId: string) {
  const response = await fetchMessagesPage(conversationId)

  return response.messages
}

export async function sendMessage(
  conversationId: string,
  text: string,
  parentMessageId?: string | null,
) {
  const response = await request<CreateMessageResponse>(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ text, parentMessageId }),
    },
  )

  return response.message
}

export async function uploadMessageAttachment(conversationId: string, file: File) {
  const formData = new FormData()
  formData.append('attachment', file)

  const response = await apiFetch(`/conversations/${conversationId}/messages/attachments`, {
    method: 'POST',
    body: formData,
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body.message ?? 'Không thể tải file lên!')
  }

  return (body as UploadAttachmentResponse).message
}

export async function updateMessage(conversationId: string, messageId: string, text: string) {
  const response = await request<UpdateMessageResponse>(
    `/conversations/${conversationId}/messages/${messageId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ text }),
    },
  )

  return response.message
}

export async function deleteMessage(conversationId: string, messageId: string) {
  await request(`/conversations/${conversationId}/messages/${messageId}`, {
    method: 'DELETE',
  })
}

export async function recallMessage(conversationId: string, messageId: string) {
  const response = await request<ConversationResponse>(
    `/conversations/${conversationId}/messages/${messageId}/recall`,
    {
      method: 'DELETE',
    },
  )

  return response.conversation
}

export async function toggleMessagePin(conversationId: string, messageId: string) {
  const response = await request<UpdateMessageResponse>(
    `/conversations/${conversationId}/messages/${messageId}/pin`,
    {
      method: 'POST',
    },
  )

  return response.message
}

export async function forwardMessage(
  conversationId: string,
  messageId: string,
  targetConversationId: string,
) {
  return request<ForwardMessageResponse>(
    `/conversations/${conversationId}/messages/${messageId}/forward`,
    {
      method: 'POST',
      body: JSON.stringify({ targetConversationId }),
    },
  )
}

export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
) {
  const response = await request<UpdateMessageResponse>(
    `/conversations/${conversationId}/messages/${messageId}/reactions`,
    {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    },
  )

  return response.message
}

export async function removeMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
) {
  const response = await request<UpdateMessageResponse>(
    `/conversations/${conversationId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    {
      method: 'DELETE',
    },
  )

  return response.message
}

export async function markConversationRead(conversationId: string) {
  const response = await request<MarkConversationReadResponse>(
    `/conversations/${conversationId}/read`,
    {
      method: 'POST',
    },
  )

  return response
}

export async function markConversationDelivered(conversationId: string) {
  const response = await request<MarkConversationDeliveredResponse>(
    `/conversations/${conversationId}/delivered`,
    {
      method: 'POST',
    },
  )

  return response
}

export async function updateConversationSettings(
  conversationId: string,
  settings: { pinned?: boolean; muted?: boolean },
) {
  const response = await request<ConversationResponse>(`/conversations/${conversationId}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  })

  return response.conversation
}

export async function archiveConversation(conversationId: string) {
  const response = await request<ConversationResponse>(`/conversations/${conversationId}/archive`, {
    method: 'POST',
  })

  return response.conversation
}

export async function unarchiveConversation(conversationId: string) {
  const response = await request<ConversationResponse>(`/conversations/${conversationId}/unarchive`, {
    method: 'POST',
  })

  return response.conversation
}

export async function hideConversation(conversationId: string) {
  await request(`/conversations/${conversationId}`, {
    method: 'DELETE',
  })
}

export async function fetchTypingStatus(conversationId: string) {
  const response = await request<TypingStatusResponse>(`/conversations/${conversationId}/typing`)

  return response.isTyping
}

export async function updateTypingStatus(conversationId: string, isTyping: boolean) {
  const response = await request<TypingStatusResponse>(`/conversations/${conversationId}/typing`, {
    method: 'POST',
    body: JSON.stringify({ isTyping }),
  })

  return response.isTyping
}

export async function createGroupConversation(payload: {
  title: string
  memberIds: string[]
  avatar?: File | null
}) {
  const formData = new FormData()

  formData.append('title', payload.title)
  formData.append('memberIds', JSON.stringify(payload.memberIds))

  if (payload.avatar) {
    formData.append('avatar', payload.avatar)
  }

  const response = await apiFetch('/conversations/groups', {
    method: 'POST',
    body: formData,
  })
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body.message ?? 'Không thể tạo nhóm!')
  }

  return (body as ConversationResponse).conversation
}

export async function fetchConversationMembers(conversationId: string) {
  const response = await request<ConversationMembersResponse>(
    `/conversations/${conversationId}/members`,
  )

  return response.members
}

export async function fetchConversationCalls(conversationId: string) {
  const response = await request<ConversationCallsResponse>(
    `/conversations/${conversationId}/calls`,
  )

  return response.calls
}

export async function updateGroupConversation(
  conversationId: string,
  payload: { title?: string; avatar?: File | null },
) {
  const formData = new FormData()

  if (typeof payload.title === 'string') {
    formData.append('title', payload.title)
  }

  if (payload.avatar) {
    formData.append('avatar', payload.avatar)
  }

  const response = await apiFetch(`/conversations/${conversationId}/group`, {
    method: 'PATCH',
    body: formData,
  })
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body.message ?? 'Không thể cập nhật nhóm!')
  }

  return (body as ConversationResponse).conversation
}

export async function addGroupMember(conversationId: string, userId: string) {
  const response = await request<ConversationMembersResponse>(
    `/conversations/${conversationId}/members`,
    {
      method: 'POST',
      body: JSON.stringify({ userId }),
    },
  )

  return response.members
}

export async function removeGroupMember(conversationId: string, userId: string) {
  const response = await request<ConversationMembersResponse>(
    `/conversations/${conversationId}/members/${userId}`,
    {
      method: 'DELETE',
    },
  )

  return response.members
}

export async function updateGroupMemberNickname(
  conversationId: string,
  userId: string,
  nickname: string,
) {
  const response = await request<ConversationMembersResponse>(
    `/conversations/${conversationId}/members/${userId}/nickname`,
    {
      method: 'PATCH',
      body: JSON.stringify({ nickname }),
    },
  )

  return response.members
}

export async function leaveGroupConversation(conversationId: string) {
  await request(`/conversations/${conversationId}/leave`, {
    method: 'POST',
  })
}

export async function disbandGroupConversation(conversationId: string) {
  await request(`/conversations/${conversationId}/group`, {
    method: 'DELETE',
  })
}
