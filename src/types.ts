export type AuthScreen = 'login' | 'register' | 'forgot-password' | 'reset-password'

export type AppView = 'chat' | 'contacts' | 'notifications' | 'profile'

export type Message = {
  id: string
  author: 'me' | 'them' | 'system'
  text: string
  time: string
  type?: 'text' | 'image' | 'file' | 'audio' | 'system'
  state?: 'sending' | 'sent' | 'delivered' | 'seen' | 'failed'
  createdAt?: string
  updatedAt?: string
  readAt?: string | null
  seenAt?: string
  isEdited?: boolean
  isPinned?: boolean
  senderAvatar?: string | null
  senderName?: string | null
  replyTo?: MessageReply | null
  mentions?: MessageMention[]
  reactions?: MessageReaction[]
  attachments?: MessageAttachment[]
}

export type MessageReply = {
  id: string
  author: 'me' | 'them' | 'system'
  text: string
  type?: 'text' | 'image' | 'file' | 'audio' | 'system'
  senderName?: string | null
}

export type MessageMention = {
  id: string
  fullName: string
  avatarUrl?: string | null
}

export type AppNotification = {
  id: string
  type: 'message' | 'mention' | 'reaction' | 'contact_request' | 'call' | 'system'
  title: string
  body: string
  readAt: string | null
  createdAt: string
  time: string
  actor: {
    id: string
    fullName: string
    avatarUrl: string | null
  } | null
  conversationId: string | null
  messageId: string | null
  conversationName: string
  conversationAvatar: string | null
}

export type CallType = 'audio' | 'video'

export type CallStatus =
  | 'idle'
  | 'ringing'
  | 'connecting'
  | 'ongoing'
  | 'declined'
  | 'missed'
  | 'cancelled'
  | 'completed'
  | 'failed'

export type CallParticipant = {
  id: string
  userId: number
  fullName: string
  avatarUrl?: string | null
}

export type CallSession = {
  callId: string
  conversationId: string
  conversationName: string
  conversationAvatar?: string | null
  type: CallType
  status: CallStatus
  startedAt?: string
  direction: 'incoming' | 'outgoing'
  caller: CallParticipant
  participants: CallParticipant[]
}

export type CallHistoryItem = {
  id: string
  type: CallType
  status: Exclude<CallStatus, 'idle' | 'connecting' | 'failed'>
  direction: 'incoming' | 'outgoing'
  startedAt: string
  endedAt: string | null
  durationSeconds: number
  time: string
  durationLabel: string
  statusLabel: string
  isMissed: boolean
  caller: CallParticipant
}

export type MessageReaction = {
  emoji: string
  count: number
  reactedByMe: boolean
}

export type MessageAttachment = {
  name: string
  meta: string
  type: 'image' | 'file' | 'audio'
  url: string
  mimeType: string
  sizeBytes: number
}

export type Attachment = {
  name: string
  meta: string
  type: 'image' | 'file' | 'audio'
  url?: string
}

export type Conversation = {
  id: string
  type?: 'direct' | 'group' | 'support'
  name: string
  role: string
  status: string
  avatar: string | null
  accent: string
  lastMessage: string
  lastMessageByMe?: boolean
  lastMessageIsAttachment?: boolean
  lastTime: string
  lastMessageAt?: string | null
  unread: number
  pinned: boolean
  muted: boolean
  archived: boolean
  contactId: string | null
  nickname?: string | null
  onlineSince?: string | null
  friendshipStatus: ContactUser['friendshipStatus'] | null
  blocked: boolean
  presence: 'online' | 'away' | 'busy' | 'offline'
  unreadSenders?: UnreadSender[]
  memberCount?: number
  members?: ConversationMember[]
  messages: Message[]
  attachments: Attachment[]
}

export type UnreadSender = {
  id: string
  fullName: string
  avatarUrl: string | null
  presence: 'online' | 'away' | 'busy' | 'offline'
}

export type ConversationMember = {
  id: string
  userId: number
  fullName: string
  nickname?: string | null
  email: string
  avatarUrl: string | null
  role: 'member' | 'moderator' | 'admin' | 'owner'
  presence: 'online' | 'away' | 'busy' | 'offline'
  onlineSince?: string | null
  joinedAt: string
  createdAt?: string
  updatedAt?: string
}

export type ContactUser = {
  id: string
  userId: number
  fullName: string
  email: string
  phone: string | null
  gender?: string | null
  address?: string | null
  birthDate?: string | null
  avatarUrl: string | null
  bio: string | null
  statusMessage: string | null
  presence: 'online' | 'away' | 'busy' | 'offline'
  friendshipStatus: 'none' | 'pending' | 'accepted' | 'blocked'
  requestDirection: 'incoming' | 'outgoing' | null
  nickname?: string | null
  contactId: string | null
  lastSeenAt?: string | null
  onlineSince?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  contactCreatedAt?: string | null
  contactUpdatedAt?: string | null
}

export type AuthPageProps = {
  errorMessage?: string
  isSubmitting?: boolean
  onSubmit: (payload: Record<string, string>) => Promise<void> | void
  onSwitchMode: () => void
}
