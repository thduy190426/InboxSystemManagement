import { create } from 'zustand'
import type { Message, AppView, ConversationMember, CallSession } from '../types'
import { readAppRouteFromLocation } from '../services/core/appRoutes'

interface ChatState {
  // Navigation State
  activeView: AppView
  activeId: string
  setActiveView: (view: AppView) => void
  setActiveId: (id: string) => void

  // Draft & UI State
  drafts: Record<string, string>
  setDraft: (conversationId: string, draft: string) => void
  replyingTo: Message | null
  setReplyingTo: (msg: Message | null | ((current: Message | null) => Message | null)) => void
  focusedMessageId: string
  setFocusedMessageId: (id: string) => void

  // Realtime State
  onlineUsers: Record<string, boolean>
  setOnlineStatus: (userId: string, isOnline: boolean) => void
  typingStatuses: Record<string, boolean>
  setTypingStatus: (conversationId: string, isTyping: boolean) => void

  // Data State
  messagesByConversation: Record<string, Message[]>
  setMessagesByConversation: (updater: Record<string, Message[]> | ((current: Record<string, Message[]>) => Record<string, Message[]>)) => void
  
  messagePaginationByConversation: Record<string, { hasMore: boolean; isLoadingOlder: boolean; nextCursor: string | null }>
  setMessagePaginationByConversation: (updater: Record<string, { hasMore: boolean; isLoadingOlder: boolean; nextCursor: string | null }> | ((current: Record<string, { hasMore: boolean; isLoadingOlder: boolean; nextCursor: string | null }>) => Record<string, { hasMore: boolean; isLoadingOlder: boolean; nextCursor: string | null }>)) => void
  
  membersByConversation: Record<string, ConversationMember[]>
  setMembersByConversation: (updater: Record<string, ConversationMember[]> | ((current: Record<string, ConversationMember[]>) => Record<string, ConversationMember[]>)) => void

  activeCall: CallSession | null
  setActiveCall: (call: CallSession | null | ((current: CallSession | null) => CallSession | null)) => void
}

const initialRoute = readAppRouteFromLocation()

export const useChatStore = create<ChatState>((set) => ({
  // Navigation State
  activeView: initialRoute.view,
  activeId: initialRoute.conversationId ?? '',
  setActiveView: (view) => set({ activeView: view }),
  setActiveId: (id) => set({ activeId: id }),

  // Draft & UI State
  drafts: {},
  setDraft: (conversationId, draft) => set((state) => ({
    drafts: { ...state.drafts, [conversationId]: draft }
  })),
  replyingTo: null,
  setReplyingTo: (msg) => set((state) => ({
    replyingTo: typeof msg === 'function' ? msg(state.replyingTo) : msg
  })),
  focusedMessageId: '',
  setFocusedMessageId: (id) => set({ focusedMessageId: id }),

  // Realtime State
  onlineUsers: {},
  setOnlineStatus: (userId, isOnline) => set((state) => ({
    onlineUsers: { ...state.onlineUsers, [userId]: isOnline }
  })),
  typingStatuses: {},
  setTypingStatus: (conversationId, isTyping) => set((state) => ({
    typingStatuses: {
      ...state.typingStatuses,
      [conversationId]: isTyping
    }
  })),

  // Data State
  messagesByConversation: {},
  setMessagesByConversation: (updater) => set((state) => ({
    messagesByConversation: typeof updater === 'function' ? updater(state.messagesByConversation) : updater
  })),

  messagePaginationByConversation: {},
  setMessagePaginationByConversation: (updater) => set((state) => ({
    messagePaginationByConversation: typeof updater === 'function' ? updater(state.messagePaginationByConversation) : updater
  })),

  membersByConversation: {},
  setMembersByConversation: (updater) => set((state) => ({
    membersByConversation: typeof updater === 'function' ? updater(state.membersByConversation) : updater
  })),

  activeCall: null,
  setActiveCall: (call) => set((state) => ({
    activeCall: typeof call === 'function' ? call(state.activeCall) : call
  }))
}))
