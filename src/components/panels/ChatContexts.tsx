import { createContext, useContext } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import type { Conversation, Message, MessageReply } from '../../types'

export type MessageActionContextType = {
  startReplying: (message: Message) => void
  startForwarding: (message: Message) => void
  handleDeleteForMe: (message: Message) => void
  handleRecall: (message: Message) => void
  handleReport: (message: Message) => void
  handleTogglePin: (messageId: string) => void
  onRetryMessage: (message: Message) => void
  handleToggleReaction: (messageId: string, emoji: string) => void
  startEditing: (message: Message) => void
  cancelEditing: () => void
  setEditingText: (text: string) => void
  handleEditSubmit: (event: FormEvent<HTMLFormElement>, message: Message) => void
  onVotePoll: ((messageId: string, optionIds: string[]) => void | Promise<void>) | undefined
}

export type ChatStateContextType = {
  activeConversation: Conversation
  currentUserId: string | undefined
  members: any[]
  searchMatches: any[]
  activeSearchMessageId: string
  focusedMessageId: string
  editingMessageId: string
  busyMessageId: string
  editingText: string
  openActionMenuId: string
  openReactionPickerId: string
}

export type ChatUIContextType = {
  getDateDividerLabel: (message: Message, previousMessage?: Message) => string | null
  isSameMessageGroup: (message: Message, previousMessage?: Message) => boolean
  messageRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
  renderCallMessage: (message: Message) => React.ReactNode
  renderHighlightedText: (message: Message) => React.ReactNode
  shouldRenderMessageText: (message: Message) => boolean
  renderReplyPreview: (message: MessageReply) => React.ReactNode
  getMessageStateLabel: (message: Message) => string
  formatMessageTime: (message: Message) => string
  renderAttachments: (message: Message) => React.ReactNode
  renderReactions: (message: Message) => React.ReactNode
  isSameLocalDay: (left: Date | null, right: Date | null) => boolean
  parseMessageDate: (message?: Message) => Date | null
  setOpenActionMenuId: React.Dispatch<React.SetStateAction<string>>
  setOpenReactionPickerId: React.Dispatch<React.SetStateAction<string>>
}

export type ChatInputContextType = {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  replyingTo: Message | null
  getReplyAuthorLabel: (m: Message) => string
  getReplyText: (m: Message) => string
  onCancelReply: () => void
  isUploadingAttachment: boolean
  locationError: string
  isBlocked: boolean
  mentionSuggestions: {
    id: string
    userId: number
    fullName: string
    handle?: string | null
    nickname?: string | null
    avatarUrl: string | null
  }[]
  insertMention: (handle: string) => void
  handleAttachmentChange: (e: ChangeEvent<HTMLInputElement>) => void
  handleDraftChange: (e: ChangeEvent<HTMLInputElement>) => void
  activeConversation: Conversation
  draft: string
  isComposerEmojiOpen: boolean
  setIsGifPickerOpen: React.Dispatch<React.SetStateAction<boolean>>
  setIsComposerEmojiOpen: React.Dispatch<React.SetStateAction<boolean>>
  handleSendComposerEmoji: (data: any) => void
  isGifPickerOpen: boolean
  gifQuery: string
  setGifQuery: React.Dispatch<React.SetStateAction<string>>
  gifError: string
  isLoadingGifs: boolean
  gifResults: any[]
  handleSendGif: (gif: any) => void
  isSharingLocation: boolean
  handleShareLocation: () => void
  setIsPollModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  onUploadAttachment: (file: File) => Promise<void> | void
  attachmentError?: string
  onSpawnReaction?: (emoji: string) => void
  onSendQuickEmoji?: (emoji: string) => void
  onSendSticker?: (url: string) => void
}

export const MessageActionContext = createContext<MessageActionContextType | null>(null)
export const ChatStateContext = createContext<ChatStateContextType | null>(null)
export const ChatUIContext = createContext<ChatUIContextType | null>(null)
export const ChatInputContext = createContext<ChatInputContextType | null>(null)

export function useChatInput() {
  const ctx = useContext(ChatInputContext)
  if (!ctx) throw new Error('useChatInput must be used within ChatInputContext.Provider')
  return ctx
}

export function useMessageActions() {
  const ctx = useContext(MessageActionContext)
  if (!ctx) throw new Error('useMessageActions must be used within MessageActionContext.Provider')
  return ctx
}

export function useChatState() {
  const ctx = useContext(ChatStateContext)
  if (!ctx) throw new Error('useChatState must be used within ChatStateContext.Provider')
  return ctx
}

export function useChatUI() {
  const ctx = useContext(ChatUIContext)
  if (!ctx) throw new Error('useChatUI must be used within ChatUIContext.Provider')
  return ctx
}
