import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AuthUser } from '../services/authApi'
import { touchPresence } from '../services/authApi'
import { readAppRouteFromLocation, toAppPath } from '../services/appRoutes'
import {
  getBrowserNotificationPermission,
  registerWebPushSubscription,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  type BrowserNotificationPermission,
} from '../services/browserNotifications'
import {
  archiveConversation,
  addGroupMember,
  createGroupConversation,
  deleteMessage,
  disbandGroupConversation,
  fetchConversations,
  fetchConversationCalls,
  fetchConversationMembers,
  fetchGroupInvite,
  fetchGroupJoinRequests,
  fetchMessagesPage,
  fetchTypingStatus,
  forwardMessage,
  hideConversation,
  leaveGroupConversation,
  markConversationDelivered,
  markConversationRead,
  recallMessage,
  removeGroupMember,
  removeMessageReaction,
  requestGroupJoin,
  resetGroupInvite,
  reviewGroupJoinRequest,
  searchConversationMessages,
  sendMessage,
  toggleMessageReaction,
  toggleMessagePin,
  transferGroupOwner,
  unarchiveConversation,
  uploadMessageAttachment,
  updateConversationSettings,
  updateGroupConversation,
  updateGroupMemberNickname,
  updateGroupMemberRole,
  updateTypingStatus,
  updateMessage,
  type MessageSearchFilters,
} from '../services/chatApi'
import {
  blockContact,
  fetchFriends,
  fetchIncomingRequests,
  unblockContact,
  updateContactNickname,
} from '../services/contactApi'
import { startRealtimeCall, type CallSignalPayload } from '../services/callRealtime'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markConversationNotificationsRead,
  markNotificationRead,
} from '../services/notificationApi'
import { disconnectRealtimeSocket, getRealtimeSocket } from '../services/realtime'
import type {
  AppNotification,
  AppView,
  CallSession,
  CallType,
  ContactUser,
  Conversation,
  ConversationMember,
  GroupJoinRequest,
  Message,
} from '../types'
import { CallOverlay } from './CallOverlay'
import { ChatPanel } from './ChatPanel'
import { ConfirmDialog, type ConfirmDialogState } from './ConfirmDialog'
import { ContactsPanel } from './ContactsPanel'
import { DetailPanel } from './DetailPanel'
import type { ConversationFilter } from './InboxPanel'
import { InboxPanel } from './InboxPanel'
import { NavRail } from './NavRail'
import { NotificationsPanel } from './NotificationsPanel'
import { ProfilePage } from './ProfilePage'
import { SettingsPage } from './SettingsPage'

type ChatAppProps = {
  currentUser: AuthUser | null
  onAccountDeleted: () => void
  onLogout: () => void
  onUserChange: (user: AuthUser) => void
  pushToast?: (text: string, tone?: 'info' | 'error') => void
}

type Toast = {
  id: string
  text: string
  tone?: 'info' | 'error'
  isHiding?: boolean
}

type MessagePaginationState = {
  hasMore: boolean
  isLoadingOlder: boolean
  nextCursor: string | null
}

const SIDEBAR_STATE_KEY = 'sidebar_is_open'
const OFFLINE_MESSAGE_QUEUE_KEY = 'offline_message_queue'
const COMPACT_LAYOUT_MEDIA_QUERY = '(max-width: 1024px)'
const MESSAGE_PAGE_LIMIT = 40

type QueuedMessage = {
  conversationId: string
  message: Message
  parentMessageId: string | null
  userId: string
  updatedAt: string
}

function mergeLatestMessages(existingMessages: Message[], incomingMessages: Message[]) {
  const incomingById = new Map(incomingMessages.map((message) => [message.id, message]))
  const existingIds = new Set(existingMessages.map((message) => message.id))
  const updatedMessages = existingMessages.map((message) => incomingById.get(message.id) ?? message)
  const newMessages = incomingMessages.filter((message) => !existingIds.has(message.id))

  return [...updatedMessages, ...newMessages]
}

function prependOlderMessages(existingMessages: Message[], olderMessages: Message[]) {
  const existingIds = new Set(existingMessages.map((message) => message.id))
  const newOlderMessages = olderMessages.filter((message) => !existingIds.has(message.id))

  return [...newOlderMessages, ...existingMessages]
}

function getInitialSidebarState() {
  return localStorage.getItem(SIDEBAR_STATE_KEY) === 'true'
}

function getInitialCompactLayoutState() {
  return typeof window !== 'undefined' && window.matchMedia(COMPACT_LAYOUT_MEDIA_QUERY).matches
}

function readOfflineMessageQueue() {
  try {
    const rawQueue = localStorage.getItem(OFFLINE_MESSAGE_QUEUE_KEY)

    if (!rawQueue) {
      return []
    }

    const queue = JSON.parse(rawQueue)

    return Array.isArray(queue) ? (queue as QueuedMessage[]) : []
  } catch {
    return []
  }
}

function writeOfflineMessageQueue(queue: QueuedMessage[]) {
  localStorage.setItem(OFFLINE_MESSAGE_QUEUE_KEY, JSON.stringify(queue))
}

function getQueuedMessagesForUser(userId: string) {
  if (!userId) {
    return []
  }

  return readOfflineMessageQueue().filter((item) => item.userId === userId)
}

function upsertQueuedMessage(item: QueuedMessage) {
  const queue = readOfflineMessageQueue()
  const nextQueue = [
    ...queue.filter((queuedItem) => queuedItem.message.id !== item.message.id),
    item,
  ]

  writeOfflineMessageQueue(nextQueue)
}

function removeQueuedMessage(messageId: string) {
  writeOfflineMessageQueue(
    readOfflineMessageQueue().filter((queuedItem) => queuedItem.message.id !== messageId),
  )
}

function mergeQueuedMessages(existingMessages: Message[], queuedMessages: Message[]) {
  const queuedById = new Map(queuedMessages.map((message) => [message.id, message]))
  const mergedMessages = existingMessages.map((message) => queuedById.get(message.id) ?? message)
  const existingIds = new Set(existingMessages.map((message) => message.id))
  const missingQueuedMessages = queuedMessages.filter((message) => !existingIds.has(message.id))

  return [...mergedMessages, ...missingQueuedMessages]
}

function getAttachmentPreview(message?: Message) {
  const attachmentType = message?.attachments?.[0]?.type

  if (attachmentType === 'image') {
    return 'Đã gửi một ảnh!'
  }

  if (attachmentType === 'audio') {
    return 'Đã gửi một tin nhắn thoại!'
  }

  if (attachmentType === 'file') {
    return 'Đã gửi một tệp!'
  }

  return message?.text ?? 'Chưa có tin nhắn!'
}

export function ChatApp({
  currentUser,
  onAccountDeleted,
  onLogout,
  onUserChange,
}: ChatAppProps) {
  const initialRoute = readAppRouteFromLocation()
  const [activeView, setActiveView] = useState<AppView>(initialRoute.view)
  const [activeId, setActiveId] = useState(initialRoute.conversationId ?? '')
  const [query, setQuery] = useState('')
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>('all')
  const [draft, setDraft] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [focusedMessageId, setFocusedMessageId] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(getInitialSidebarState)
  const [isCompactLayout, setIsCompactLayout] = useState(getInitialCompactLayoutState)
  const [isInboxOpen, setIsInboxOpen] = useState(
    () =>
      getInitialCompactLayoutState() &&
      initialRoute.view === 'chat' &&
      !initialRoute.conversationId,
  )
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([])
  const [friends, setFriends] = useState<ContactUser[]>([])
  const [profileContactToOpen, setProfileContactToOpen] = useState<ContactUser | null>(null)
  const [friendRequests, setFriendRequests] = useState<ContactUser[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [browserNotificationPermission, setBrowserNotificationPermission] =
    useState<BrowserNotificationPermission>(() => getBrowserNotificationPermission())
  const [membersByConversation, setMembersByConversation] = useState<Record<string, ConversationMember[]>>({})
  const [groupInviteTokensByConversation, setGroupInviteTokensByConversation] = useState<Record<string, string>>({})
  const [groupJoinRequestsByConversation, setGroupJoinRequestsByConversation] = useState<Record<string, GroupJoinRequest[]>>({})
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>(
    {},
  )
  const [messagePaginationByConversation, setMessagePaginationByConversation] = useState<
    Record<string, MessagePaginationState>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [busyMessageId, setBusyMessageId] = useState('')
  const [busyConversationAction, setBusyConversationAction] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [readSyncKey, setReadSyncKey] = useState('')
  const [pageErrorMessage, setPageErrorMessage] = useState('')
  const [typingByConversation, setTypingByConversation] = useState<Record<string, boolean>>({})
  const [activeCall, setActiveCall] = useState<CallSession | null>(null)
  const [shouldAutoScrollToLatest, setShouldAutoScrollToLatest] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const typingStopTimerRef = useRef<number | null>(null)
  const lastSentTypingRef = useRef<{ conversationId: string; isTyping: boolean } | null>(null)
  const lastAutoScrolledConversationIdRef = useRef('')
  const activeIdRef = useRef(activeId)
  const currentUserIdRef = useRef(currentUser?.id ?? '')
  const conversationsRef = useRef<Conversation[]>([])
  const locallyDisbandedConversationIdsRef = useRef(new Set<string>())
  const deliveredSyncKeysRef = useRef(new Set<string>())
  const toastTimersRef = useRef<Record<string, number>>({})
  const notifiedNotificationIdsRef = useRef(new Set<string>())
  const recentBrowserNotificationKeysRef = useRef(new Set<string>())
  const hasSyncedWebPushRef = useRef(false)
  const isFlushingOfflineQueueRef = useRef(false)
  const hasHandledGroupInviteRef = useRef(false)

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  useEffect(() => {
    if (browserNotificationPermission !== 'granted' || hasSyncedWebPushRef.current) {
      return
    }

    hasSyncedWebPushRef.current = true
    registerWebPushSubscription().catch(() => undefined)
  }, [browserNotificationPermission])

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? ''
  }, [currentUser?.id])

  useEffect(() => {
    const queuedMessages = getQueuedMessagesForUser(currentUser?.id ?? '')

    if (queuedMessages.length === 0) {
      return
    }

    setMessagesByConversation((current) => {
      const nextMessagesByConversation = { ...current }

      queuedMessages.forEach((queuedItem) => {
        nextMessagesByConversation[queuedItem.conversationId] = mergeQueuedMessages(
          nextMessagesByConversation[queuedItem.conversationId] ?? [],
          [{ ...queuedItem.message, state: 'failed' }],
        )
      })

      return nextMessagesByConversation
    })
  }, [currentUser?.id])

  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  useEffect(() => {
    if (!activeId || lastAutoScrolledConversationIdRef.current === activeId) {
      return
    }

    lastAutoScrolledConversationIdRef.current = activeId
    setShouldAutoScrollToLatest(true)
  }, [activeId])

  const loadConversations = useCallback(async () => {
    setIsLoading(true)
    setPageErrorMessage('')

    const nextConversations = await fetchConversations()

    setConversations(nextConversations)
    setIsLoading(false)

    return nextConversations
  }, [])

  const loadCallHistory = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      return []
    }

    const calls = await fetchConversationCalls(conversationId)

    return calls
  }, [])

  const dismissToast = useCallback((toastId: string) => {
    const timerId = toastTimersRef.current[toastId]

    if (timerId) {
      window.clearTimeout(timerId)
      delete toastTimersRef.current[toastId]
    }

    setToasts((current) =>
      current.map((toast) => (toast.id === toastId ? { ...toast, isHiding: true } : toast))
    )

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== toastId))
    }, 300)
  }, [])

  const pushToast = useCallback(
    (text: string, tone: Toast['tone'] = 'error') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`

      setToasts((current) => [...current, { id, text, tone }])
      toastTimersRef.current[id] = window.setTimeout(() => {
        dismissToast(id)
      }, 3200)
    },
    [dismissToast],
  )

  useEffect(() => {
    if (hasHandledGroupInviteRef.current) {
      return
    }

    const token = new URLSearchParams(window.location.search).get('join')

    if (!token) {
      return
    }

    hasHandledGroupInviteRef.current = true

    requestGroupJoin(token)
      .then((response) => {
        const nextPath = response.conversation
          ? toAppPath({ view: 'chat', conversationId: response.conversation.id })
          : toAppPath({ view: 'chat' })

        const joinedConversation = response.conversation

        if (joinedConversation) {
          setConversations((current) => {
            const withoutConversation = current.filter(
              (conversation) => conversation.id !== joinedConversation.id,
            )

            return [joinedConversation, ...withoutConversation]
          })
          setActiveId(joinedConversation.id)
        }

        window.history.replaceState(null, '', nextPath)
        pushToast(response.message || 'Đã gửi yêu cầu tham gia nhóm!', 'info')
      })
      .catch((error) => {
        window.history.replaceState(null, '', toAppPath({ view: 'chat' }))
        pushToast(getErrorMessage(error, 'Không thể mở link nhóm!'))
      })
  }, [pushToast])

  const flushOfflineMessageQueue = useCallback(async () => {
    if (isFlushingOfflineQueueRef.current || !navigator.onLine) {
      return
    }

    const queuedMessages = getQueuedMessagesForUser(currentUserIdRef.current)

    if (queuedMessages.length === 0) {
      return
    }

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
  }, [])

  useEffect(() => {
    flushOfflineMessageQueue().catch(() => undefined)

    function handleOnline() {
      flushOfflineMessageQueue()
        .then(() => {
          if (getQueuedMessagesForUser(currentUserIdRef.current).length === 0) {
            pushToast('Tin nhắn offline đã được gửi lại.', 'info')
          }
        })
        .catch(() => undefined)
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [flushOfflineMessageQueue, pushToast])

  const setErrorMessage = useCallback(
    (message: string) => {
      if (message) {
        pushToast(message)
      }
    },
    [pushToast],
  )

  function getErrorMessage(error: unknown, fallbackMessage: string) {
    return error instanceof Error ? error.message : fallbackMessage
  }

  function canNotifyConversation(conversationId: string) {
    return document.visibilityState === 'hidden' || activeIdRef.current !== conversationId
  }

  function showDedupedBrowserNotification(
    key: string,
    title: string,
    payload: { body?: string; url?: string } = {},
  ) {
    if (recentBrowserNotificationKeysRef.current.has(key)) {
      return
    }

    recentBrowserNotificationKeysRef.current.add(key)
    window.setTimeout(() => {
      recentBrowserNotificationKeysRef.current.delete(key)
    }, 4500)

    showBrowserNotification(title, {
      ...payload,
      tag: key,
    })
  }

  function notifyConversationUpdate(conversationId: string, nextConversations: Conversation[]) {
    if (!conversationId || !canNotifyConversation(conversationId)) {
      return
    }

    const conversation = nextConversations.find((item) => item.id === conversationId)

    if (!conversation || conversation.unread === 0) {
      return
    }

    showDedupedBrowserNotification(`conversation:${conversationId}`, conversation.name, {
      body: conversation.lastMessage,
      url: toAppPath({ view: 'chat', conversationId }),
    })
  }

  function notifyAppNotifications(nextNotifications: AppNotification[]) {
    nextNotifications.forEach((notification) => {
      if (notification.readAt || notifiedNotificationIdsRef.current.has(notification.id)) {
        return
      }

      notifiedNotificationIdsRef.current.add(notification.id)

      if (notification.conversationId && !canNotifyConversation(notification.conversationId)) {
        return
      }

      showDedupedBrowserNotification(`notification:${notification.id}`, notification.title, {
        body: notification.body,
        url: notification.conversationId
          ? toAppPath({ view: 'chat', conversationId: notification.conversationId })
          : toAppPath({ view: 'notifications' }),
      })
    })
  }

  const syncDeliveredReceipts = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      return
    }

    if (deliveredSyncKeysRef.current.has(conversationId)) {
      return
    }

    deliveredSyncKeysRef.current.add(conversationId)

    try {
      const response = await markConversationDelivered(conversationId)

      setMessagesByConversation((current) =>
        current[conversationId]
          ? {
            ...current,
            [conversationId]: mergeLatestMessages(current[conversationId], response.messages),
          }
          : current,
      )
    } catch {
    } finally {
      deliveredSyncKeysRef.current.delete(conversationId)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      try {
        const [nextConversations, nextFriends, nextFriendRequests, nextNotifications] = await Promise.all([
          fetchConversations(),
          fetchFriends(),
          fetchIncomingRequests(),
          fetchNotifications(),
        ])

        if (!isMounted) {
          return
        }

        setConversations(nextConversations)
        setFriends(nextFriends)
        setFriendRequests(nextFriendRequests)
        setNotifications(nextNotifications)
        nextNotifications.forEach((notification) => {
          notifiedNotificationIdsRef.current.add(notification.id)
        })
      } catch (error) {
        if (isMounted) {
          setPageErrorMessage(error instanceof Error ? error.message : 'Không thể tải hội thoại!')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadInitialData()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    touchPresence().catch(() => undefined)

    const presenceTimer = window.setInterval(() => {
      touchPresence().catch(() => undefined)
    }, 60_000)

    const conversationTimer = window.setInterval(() => {
      fetchConversations()
        .then((nextConversations) => {
          setConversations(nextConversations)
        })
        .catch(() => undefined)
    }, 30_000)

    return () => {
      window.clearInterval(presenceTimer)
      window.clearInterval(conversationTimer)
    }
  }, [])

  useEffect(() => {
    if (conversationFilter !== 'archived') {
      return
    }

    let isMounted = true

    fetchConversations({ archived: true })
      .then((nextConversations) => {
        if (isMounted) {
          setArchivedConversations(nextConversations)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setPageErrorMessage(
            error instanceof Error ? error.message : 'Không thể tải hội thoại lưu trữ!',
          )
        }
      })

    return () => {
      isMounted = false
    }
  }, [conversationFilter])

  useEffect(() => {
    const socket = getRealtimeSocket()

    if (!socket) {
      return
    }

    const realtimeSocket = socket

    async function refreshActiveConversation(conversationId: string) {
      const [nextConversations, nextMessagePage] = await Promise.all([
        fetchConversations(),
        fetchMessagesPage(conversationId, { limit: MESSAGE_PAGE_LIMIT }),
      ])

      setConversations(nextConversations)
      notifyConversationUpdate(conversationId, nextConversations)
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: mergeLatestMessages(current[conversationId] ?? [], nextMessagePage.messages),
      }))
      setMessagePaginationByConversation((current) => ({
        ...current,
        [conversationId]: {
          hasMore: current[conversationId]?.hasMore ?? nextMessagePage.hasMore,
          isLoadingOlder: false,
          nextCursor: current[conversationId]?.nextCursor ?? nextMessagePage.nextCursor,
        },
      }))

      if (nextMessagePage.messages.some((message) => message.author === 'them')) {
        syncDeliveredReceipts(conversationId).catch(() => undefined)
      }

      const nextActive = nextConversations.find((conversation) => conversation.id === conversationId)

      if (nextActive?.type === 'group') {
        const members = await fetchConversationMembers(conversationId)

        setMembersByConversation((current) => ({
          ...current,
          [conversationId]: members,
        }))
      }
    }

    function removeConversationLocally(conversationId: string) {
      setConversations((current) => {
        const nextConversations = current.filter((conversation) => conversation.id !== conversationId)
        const nextConversationId =
          activeIdRef.current === conversationId ? nextConversations[0]?.id || '' : activeIdRef.current

        if (activeIdRef.current === conversationId) {
          setActiveId(nextConversationId)
          setIsDetailOpen(false)
          window.history.replaceState(
            null,
            '',
            nextConversationId
              ? toAppPath({ view: 'chat', conversationId: nextConversationId })
              : toAppPath({ view: 'chat' }),
          )
        }

        return nextConversations
      })
      setMessagesByConversation((current) => {
        const next = { ...current }
        delete next[conversationId]
        return next
      })
      setMessagePaginationByConversation((current) => {
        const next = { ...current }
        delete next[conversationId]
        return next
      })
      setMembersByConversation((current) => {
        const next = { ...current }
        delete next[conversationId]
        return next
      })
    }

    function handleConversationChanged(payload: {
      actorUserId?: string
      conversationId?: string
      eventType?: string
    }) {
      realtimeSocket.emit('realtime:refresh-conversations')
      const conversationId = payload.conversationId || ''
      const isFromCurrentUser =
        payload.actorUserId && payload.actorUserId === currentUserIdRef.current

      if (
        conversationId &&
        !isFromCurrentUser &&
        (payload.eventType === 'message:created' || payload.eventType === 'message:forwarded')
      ) {
        syncDeliveredReceipts(conversationId).catch(() => undefined)
      }

      if (conversationId && payload.eventType === 'group:disbanded') {
        if (locallyDisbandedConversationIdsRef.current.has(conversationId)) {
          locallyDisbandedConversationIdsRef.current.delete(conversationId)
          removeConversationLocally(conversationId)
          fetchConversations().then(setConversations).catch(() => undefined)
          return
        }

        const disbandedConversation = conversationsRef.current.find(
          (conversation) => conversation.id === conversationId,
        )

        pushToast(
          disbandedConversation
            ? `Nhóm "${disbandedConversation.name}" đã bị giải tán!`
            : 'Nhóm đã bị giải tán!',
        )
        removeConversationLocally(conversationId)
        fetchConversations().then(setConversations).catch(() => undefined)
        return
      }

      if (conversationId && conversationId === activeIdRef.current) {
        refreshActiveConversation(conversationId).catch(() => undefined)
        return
      }

      fetchConversations()
        .then((nextConversations) => {
          setConversations(nextConversations)
          notifyConversationUpdate(conversationId, nextConversations)
        })
        .catch(() => undefined)
    }

    function handleContactsChanged() {
      realtimeSocket.emit('realtime:refresh-conversations')
      Promise.all([fetchFriends(), fetchIncomingRequests(), fetchConversations()])
        .then(([nextFriends, nextFriendRequests, nextConversations]) => {
          setFriends(nextFriends)
          setFriendRequests(nextFriendRequests)
          setConversations(nextConversations)
        })
        .catch(() => undefined)
    }

    function handleNotificationsChanged() {
      fetchNotifications()
        .then((nextNotifications) => {
          setNotifications(nextNotifications)
          notifyAppNotifications(nextNotifications)
        })
        .catch(() => undefined)
    }

    function toCallSession(payload: Omit<CallSession, 'direction'>, direction: CallSession['direction']) {
      return {
        ...payload,
        direction,
      }
    }

    function handleIncomingCall(payload: Omit<CallSession, 'direction'>) {
      if (payload.caller.id === currentUserIdRef.current) {
        return
      }

      setActiveCall(toCallSession(payload, 'incoming'))
      showDedupedBrowserNotification(`call:${payload.callId}`, `Cuộc gọi ${payload.type === 'video' ? 'video' : 'audio'} đến`, {
        body: payload.caller.fullName,
        url: toAppPath({ view: 'chat', conversationId: payload.conversationId }),
      })
    }

    function handleRingingCall(payload: Omit<CallSession, 'direction'>) {
      setActiveCall(toCallSession(payload, 'outgoing'))
    }

    function handleAcceptedCall(payload: Omit<CallSession, 'direction'>) {
      setActiveCall((current) =>
        current?.callId === payload.callId
          ? {
            ...current,
            ...payload,
            status: 'ongoing',
          }
          : current,
      )
    }

    function handleFinishedCall(payload: Omit<CallSession, 'direction'>) {
      setActiveCall((current) =>
        current?.callId === payload.callId
          ? {
            ...current,
            ...payload,
          }
          : current,
      )
      fetchNotifications().then(setNotifications).catch(() => undefined)
      loadCallHistory(payload.conversationId).catch(() => undefined)
    }

    function handleCallSignal(payload: Partial<CallSignalPayload>) {
      if (!payload.callId || !payload.data) {
        return
      }

      window.dispatchEvent(
        new CustomEvent(`call-signal:${payload.callId}`, {
          detail: payload,
        }),
      )
    }

    realtimeSocket.on('conversation:changed', handleConversationChanged)
    realtimeSocket.on('contacts:changed', handleContactsChanged)
    realtimeSocket.on('presence:changed', handleContactsChanged)
    realtimeSocket.on('notifications:changed', handleNotificationsChanged)
    realtimeSocket.on('call:incoming', handleIncomingCall)
    realtimeSocket.on('call:ringing', handleRingingCall)
    realtimeSocket.on('call:accepted', handleAcceptedCall)
    realtimeSocket.on('call:declined', handleFinishedCall)
    realtimeSocket.on('call:missed', handleFinishedCall)
    realtimeSocket.on('call:cancelled', handleFinishedCall)
    realtimeSocket.on('call:completed', handleFinishedCall)
    realtimeSocket.on('call:left', handleAcceptedCall)
    realtimeSocket.on('call:signal', handleCallSignal)

    return () => {
      realtimeSocket.off('conversation:changed', handleConversationChanged)
      realtimeSocket.off('contacts:changed', handleContactsChanged)
      realtimeSocket.off('presence:changed', handleContactsChanged)
      realtimeSocket.off('notifications:changed', handleNotificationsChanged)
      realtimeSocket.off('call:incoming', handleIncomingCall)
      realtimeSocket.off('call:ringing', handleRingingCall)
      realtimeSocket.off('call:accepted', handleAcceptedCall)
      realtimeSocket.off('call:declined', handleFinishedCall)
      realtimeSocket.off('call:missed', handleFinishedCall)
      realtimeSocket.off('call:cancelled', handleFinishedCall)
      realtimeSocket.off('call:completed', handleFinishedCall)
      realtimeSocket.off('call:left', handleAcceptedCall)
      realtimeSocket.off('call:signal', handleCallSignal)
    }
  }, [])

  useEffect(
    () => () => {
      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current)
      }

      if (lastSentTypingRef.current?.isTyping) {
        updateTypingStatus(lastSentTypingRef.current.conversationId, false).catch(() => undefined)
      }

      Object.values(toastTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId)
      })
    },
    [],
  )

  useEffect(() => {
    if (isCompactLayout) {
      return
    }

    localStorage.setItem(SIDEBAR_STATE_KEY, String(isSidebarOpen))
  }, [isCompactLayout, isSidebarOpen])

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_LAYOUT_MEDIA_QUERY)

    function handleChange() {
      const isCompact = mediaQuery.matches

      setIsCompactLayout(isCompact)

      if (isCompact) {
        setIsSidebarOpen(false)
      }
    }

    handleChange()
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  useEffect(() => {
    if (!isCompactLayout) {
      setIsInboxOpen(false)
      return
    }

    if (activeView !== 'chat') {
      setIsInboxOpen(false)
      return
    }

    if (!activeId) {
      setIsInboxOpen(true)
    }
  }, [activeId, activeView, isCompactLayout])

  useEffect(() => {
    function handleLocationChange() {
      const route = readAppRouteFromLocation()

      setActiveView(route.view)
      setActiveId(route.conversationId ?? '')
      setIsInboxOpen(
        isCompactLayout && route.view === 'chat' && !route.conversationId,
      )
    }

    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)

    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [isCompactLayout])

  useEffect(() => {
    if (activeView !== 'chat' || conversations.length === 0) {
      return
    }

    const hasActiveConversation = conversations.some(
      (conversation) => conversation.id === activeId,
    )
    const nextConversationId = hasActiveConversation ? activeId : conversations[0].id

    if (nextConversationId !== activeId) {
      setActiveId(nextConversationId)
    }

    const nextPath = toAppPath({ view: 'chat', conversationId: nextConversationId })

    if (window.location.pathname !== nextPath) {
      window.history.replaceState(null, '', nextPath)
    }
  }, [activeId, activeView, conversations])

  useEffect(() => {
    if (!activeId || messagePaginationByConversation[activeId]) {
      return
    }

    let isMounted = true

    async function loadMessages() {
      try {
        const messagePage = await fetchMessagesPage(activeId, { limit: MESSAGE_PAGE_LIMIT })

        if (isMounted) {
          const queuedMessages = getQueuedMessagesForUser(currentUserIdRef.current)
            .filter((queuedItem) => queuedItem.conversationId === activeId)
            .map((queuedItem) => ({ ...queuedItem.message, state: 'failed' as const }))

          setMessagesByConversation((current) => ({
            ...current,
            [activeId]: mergeQueuedMessages(messagePage.messages, queuedMessages),
          }))
          setMessagePaginationByConversation((current) => ({
            ...current,
            [activeId]: {
              hasMore: messagePage.hasMore,
              isLoadingOlder: false,
              nextCursor: messagePage.nextCursor,
            },
          }))

          if (messagePage.messages.some((message) => message.author === 'them')) {
            syncDeliveredReceipts(activeId).catch(() => undefined)
          }
        }
      } catch (error) {
        if (isMounted) {
          setPageErrorMessage(error instanceof Error ? error.message : 'Không thể tải tin nhắn!')
        }
      }
    }

    loadMessages()

    return () => {
      isMounted = false
    }
  }, [activeId, messagePaginationByConversation, syncDeliveredReceipts])

  const activeConversation = conversations.find((conversation) => conversation.id === activeId)
  const messages = activeId ? messagesByConversation[activeId] ?? [] : []
  const activeMessagePagination = activeId ? messagePaginationByConversation[activeId] : undefined
  const hasOlderMessages = Boolean(activeMessagePagination?.hasMore)
  const isLoadingOlderMessages = Boolean(activeMessagePagination?.isLoadingOlder)
  const pinnedMessages = messages.filter((message) => message.isPinned)
  const activeMembers = activeId ? membersByConversation[activeId] ?? [] : []
  const activeGroupInviteToken = activeId ? groupInviteTokensByConversation[activeId] || '' : ''
  const activeGroupJoinRequests = activeId ? groupJoinRequestsByConversation[activeId] ?? [] : []
  const activeMemberRole =
    activeMembers.find((member) => member.id === currentUser?.id)?.role || 'member'
  const canManageActiveGroup = activeMemberRole === 'owner' || activeMemberRole === 'admin'

  function getContactProfileFromConversation(conversation: Conversation): ContactUser | null {
    if (conversation.type !== 'direct') {
      return null
    }

    const friend = friends.find((item) => {
      if (conversation.contactId && item.contactId === conversation.contactId) {
        return true
      }

      return item.fullName === conversation.name || item.nickname === conversation.name
    })

    if (friend) {
      return friend
    }

    return {
      id: conversation.contactId || conversation.id,
      userId: Number(conversation.contactId || 0),
      fullName: conversation.name,
      email: '',
      phone: null,
      avatarUrl: conversation.avatar,
      bio: null,
      statusMessage: conversation.status || null,
      presence: conversation.presence,
      friendshipStatus: conversation.friendshipStatus || 'accepted',
      requestDirection: null,
      nickname: conversation.nickname,
      contactId: conversation.contactId,
      onlineSince: conversation.onlineSince,
    }
  }

  async function handleLoadOlderMessages() {
    if (!activeId || !activeMessagePagination?.hasMore || activeMessagePagination.isLoadingOlder) {
      return
    }

    try {
      setMessagePaginationByConversation((current) => ({
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

      setMessagesByConversation((current) => ({
        ...current,
        [activeId]: prependOlderMessages(current[activeId] ?? [], messagePage.messages),
      }))
      setMessagePaginationByConversation((current) => ({
        ...current,
        [activeId]: {
          hasMore: messagePage.hasMore,
          isLoadingOlder: false,
          nextCursor: messagePage.nextCursor,
        },
      }))
    } catch (error) {
      setMessagePaginationByConversation((current) => ({
        ...current,
        [activeId]: {
          ...current[activeId],
          hasMore: current[activeId]?.hasMore ?? true,
          isLoadingOlder: false,
          nextCursor: current[activeId]?.nextCursor ?? null,
        },
      }))
      pushToast(getErrorMessage(error, 'Không thể tải thêm tin nhắn cũ!'))
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

    setMessagesByConversation((current) => ({
      ...current,
      [activeConversation.id]: mergeLatestMessages(
        current[activeConversation.id] ?? [],
        messagePage.messages,
      ).sort((left, right) => Number(left.id) - Number(right.id)),
    }))
    setFocusedMessageId(messageId)
    window.setTimeout(() => setFocusedMessageId(''), 1600)
  }

  useEffect(() => {
    if (!activeConversation || activeConversation.type !== 'group') {
      return
    }

    let isMounted = true
    const conversationId = activeConversation.id

    async function loadMembers() {
      try {
        const members = await fetchConversationMembers(conversationId)

        if (isMounted) {
          setMembersByConversation((current) => ({
            ...current,
            [conversationId]: members,
          }))
        }
      } catch (error) {
        if (isMounted) {
          setPageErrorMessage(error instanceof Error ? error.message : 'Không thể tải thành viên nhóm!')
        }
      }
    }

    loadMembers()

    return () => {
      isMounted = false
    }
  }, [activeConversation?.id, activeConversation?.type])

  useEffect(() => {
    if (!activeConversation || activeConversation.type !== 'group' || !canManageActiveGroup) {
      return
    }

    let isMounted = true
    const conversationId = activeConversation.id

    async function loadAdvancedGroupManagement() {
      try {
        const [token, requests] = await Promise.all([
          fetchGroupInvite(conversationId),
          fetchGroupJoinRequests(conversationId),
        ])

        if (isMounted) {
          setGroupInviteTokensByConversation((current) => ({
            ...current,
            [conversationId]: token,
          }))
          setGroupJoinRequestsByConversation((current) => ({
            ...current,
            [conversationId]: requests,
          }))
        }
      } catch {
        if (isMounted) {
          setGroupInviteTokensByConversation((current) => {
            const next = { ...current }
            delete next[conversationId]
            return next
          })
          setGroupJoinRequestsByConversation((current) => {
            const next = { ...current }
            delete next[conversationId]
            return next
          })
        }
      }
    }

    loadAdvancedGroupManagement()

    return () => {
      isMounted = false
    }
  }, [activeConversation?.id, activeConversation?.type, canManageActiveGroup])

  useEffect(() => {
    if (!isDetailOpen || !activeId) {
      return
    }

    loadCallHistory(activeId).catch((error) => {
      pushToast(getErrorMessage(error, 'Không thể tải lịch sử cuộc gọi!'))
    })
  }, [activeId, isDetailOpen, loadCallHistory, pushToast])

  useEffect(() => {
    if (activeView !== 'chat' || !activeId) {
      return
    }

    let isMounted = true

    async function pollTypingStatus() {
      try {
        const isTyping = await fetchTypingStatus(activeId)

        if (isMounted) {
          setTypingByConversation((current) => ({
            ...current,
            [activeId]: isTyping,
          }))
        }
      } catch {

      }
    }

    pollTypingStatus()
    const timer = window.setInterval(pollTypingStatus, 1500)

    return () => {
      isMounted = false
      window.clearInterval(timer)
      setTypingByConversation((current) => ({
        ...current,
        [activeId]: false,
      }))
    }
  }, [activeId, activeView])

  useEffect(() => {
    if (activeView !== 'chat' || !activeId) {
      return
    }

    const activeConversationForRead = conversations.find(
      (conversation) => conversation.id === activeId,
    )
    const unreadCount = activeConversationForRead?.unread ?? 0
    const nextReadSyncKey = `${activeId}:${unreadCount}:${activeConversationForRead?.lastMessageAt ?? ''}`

    if (unreadCount === 0 || readSyncKey === nextReadSyncKey) {
      return
    }

    let isMounted = true

    async function syncReadState() {
      try {
        const response = await markConversationRead(activeId)

        if (!isMounted) {
          return
        }

        setMessagesByConversation((current) => ({
          ...current,
          [activeId]: mergeLatestMessages(current[activeId] ?? [], response.messages),
        }))
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === activeId
              ? {
                ...conversation,
                unread: 0,
                unreadSenders: [],
              }
              : conversation,
          ),
        )
        setReadSyncKey(nextReadSyncKey)
      } catch {

      }
    }

    syncReadState()

    return () => {
      isMounted = false
    }
  }, [activeId, activeView, conversations, readSyncKey])

  const filteredConversations = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi-VN')
    const sourceConversations =
      conversationFilter === 'archived' ? archivedConversations : conversations
    const filteredByType = sourceConversations.filter((conversation) => {
      if (conversationFilter === 'archived') {
        return true
      }

      if (conversationFilter === 'unread') {
        return conversation.unread > 0
      }

      if (conversationFilter === 'group') {
        return conversation.type === 'group'
      }

      return true
    })

    if (!keyword) {
      return filteredByType
    }

    return filteredByType.filter((conversation) =>
      `${conversation.name} ${conversation.role} ${conversation.lastMessage}`
        .toLocaleLowerCase('vi-VN')
        .includes(keyword),
    )
  }, [archivedConversations, conversationFilter, conversations, query])

  const notificationBadgeCount = notifications.filter((notification) => !notification.readAt).length

  async function handleAcceptedFriend(conversationId: string) {
    try {
      const nextConversations = await loadConversations()
      const nextConversationId = conversationId || nextConversations[0]?.id || ''

      handleSelectConversation(nextConversationId)
      setMessagesByConversation((current) => {
        const next = { ...current }
        delete next[conversationId]
        return next
      })
      setMessagePaginationByConversation((current) => {
        const next = { ...current }
        delete next[conversationId]
        return next
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tải hội thoại mới!')
    }
  }

  async function handleEnableBrowserNotifications() {
    const permission = await requestBrowserNotificationPermission()

    setBrowserNotificationPermission(permission)

    if (permission === 'granted') {
      const pushResult = await registerWebPushSubscription().catch(() => ({
        enabled: false,
        reason: 'register-failed' as const,
      }))

      showBrowserNotification('Đã bật thông báo trình duyệt', {
        body: 'Bạn sẽ nhận cảnh báo khi có tin nhắn, mention, lời mời hoặc cuộc gọi mới.',
        tag: 'browser-notifications-enabled',
        url: toAppPath({ view: 'notifications' }),
      })

      if (!pushResult.enabled && pushResult.reason === 'missing-vapid') {
        pushToast('Đã bật thông báo khi app đang mở. Muốn nhận khi đóng tab, hãy cấu hình VAPID keys cho backend.')
      }

      if (!pushResult.enabled && pushResult.reason === 'register-failed') {
        pushToast('Không thể đăng ký Web Push lúc này. Thông báo trong tab vẫn hoạt động.')
      }

      return
    }

    if (permission === 'denied') {
      pushToast('Trình duyệt đang chặn thông báo. Hãy bật lại trong cài đặt trình duyệt.')
    }
  }

  function handleChangeView(view: AppView) {
    setActiveView(view)

    if (view === 'notifications') {
      const readAt = new Date().toISOString()
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt || readAt,
        })),
      )
      markAllNotificationsRead()
        .then(() => fetchNotifications().then(setNotifications))
        .catch(() => undefined)
    }

    if (view === 'chat') {
      const conversationId = activeId || conversations[0]?.id || ''

      setActiveId(conversationId)
      window.history.pushState(null, '', toAppPath({ view: 'chat', conversationId }))
      return
    }

    window.history.pushState(null, '', toAppPath({ view }))
  }

  function handleOpenContacts() {
    setProfileContactToOpen(null)
    setActiveView('contacts')
    window.history.pushState(null, '', toAppPath({ view: 'contacts' }))
  }

  function handleOpenActiveContactProfile() {
    if (!activeConversation) {
      return
    }

    const contactProfile = getContactProfileFromConversation(activeConversation)

    if (!contactProfile) {
      return
    }

    setProfileContactToOpen(contactProfile)
    setActiveView('contacts')
    setIsInboxOpen(false)
    window.history.pushState(null, '', toAppPath({ view: 'contacts' }))
  }

  function handleSelectConversation(conversationId: string) {
    const selectedConversation = conversationsRef.current.find(
      (conversation) => conversation.id === conversationId,
    )

    if (lastSentTypingRef.current?.isTyping) {
      updateTypingStatus(lastSentTypingRef.current.conversationId, false).catch(() => undefined)
      lastSentTypingRef.current = null
    }

    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current)
      typingStopTimerRef.current = null
    }

    setActiveView('chat')
    setActiveId(conversationId)
    setIsInboxOpen(false)
    setFocusedMessageId('')
    setReplyingTo(null)
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
            ...conversation,
            unread: 0,
            unreadSenders: [],
          }
          : conversation,
      ),
    )
    if ((selectedConversation?.unread ?? 0) > 0) {
      markConversationRead(conversationId)
        .then((response) => {
          setMessagesByConversation((current) => ({
            ...current,
            [conversationId]: mergeLatestMessages(current[conversationId] ?? [], response.messages),
          }))
        })
        .catch(() => undefined)
    }
    markConversationNotificationsRead(conversationId)
      .then(() => fetchNotifications().then(setNotifications))
      .catch(() => undefined)
    window.history.pushState(null, '', toAppPath({ view: 'chat', conversationId }))
  }

  async function handleOpenNotification(notification: AppNotification) {
    try {
      await markNotificationRead(notification.id)
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
              ...item,
              readAt: item.readAt || new Date().toISOString(),
            }
            : item,
        ),
      )
    } catch {

    }

    if (notification.conversationId) {
      handleSelectConversation(notification.conversationId)
    }
  }

  function handleDraftChange(nextDraft: string) {
    setDraft(nextDraft)

    if (!activeConversation || activeConversation.blocked) {
      return
    }

    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current)
    }

    const shouldSendTyping = nextDraft.trim().length > 0
    const lastSentTyping = lastSentTypingRef.current

    if (
      shouldSendTyping &&
      (!lastSentTyping ||
        lastSentTyping.conversationId !== activeConversation.id ||
        !lastSentTyping.isTyping)
    ) {
      lastSentTypingRef.current = {
        conversationId: activeConversation.id,
        isTyping: true,
      }
      updateTypingStatus(activeConversation.id, true).catch(() => undefined)
    }

    if (!shouldSendTyping) {
      lastSentTypingRef.current = {
        conversationId: activeConversation.id,
        isTyping: false,
      }
      updateTypingStatus(activeConversation.id, false).catch(() => undefined)
      return
    }

    typingStopTimerRef.current = window.setTimeout(() => {
      lastSentTypingRef.current = {
        conversationId: activeConversation.id,
        isTyping: false,
      }
      updateTypingStatus(activeConversation.id, false).catch(() => undefined)
    }, 2000)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await sendActiveConversationMessage(draft, true)
  }

  async function sendActiveConversationMessage(
    textValue: string,
    clearDraft = false,
    retryMessage?: Message,
  ) {
    if (!activeConversation) {
      return
    }

    if (activeConversation.blocked) {
      pushToast('Bạn đã chặn người dùng này!')
      return
    }

    const text = textValue.trim()

    if (!text) {
      return
    }

    const parentMessageId = retryMessage?.replyTo?.id ?? replyingTo?.id ?? null
    const temporaryMessage: Message =
      retryMessage ?? {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        author: 'me',
        text,
        time: 'Bây giờ',
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
      updatedAt: new Date().toISOString(),
    }

    try {
      setIsSending(true)
      upsertQueuedMessage({
        ...queuedMessage,
        message: { ...temporaryMessage, state: 'sending' },
      })

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: retryMessage
          ? (current[activeConversation.id] ?? []).map((message) =>
            message.id === retryMessage.id
              ? { ...message, createdAt: message.createdAt || new Date().toISOString(), state: 'sending', time: 'Bây giờ' }
              : message,
          )
          : [...(current[activeConversation.id] ?? []), temporaryMessage],
      }))
      setShouldAutoScrollToLatest(true)

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
              ...conversation,
              lastMessage: text,
              lastMessageByMe: true,
              lastMessageIsAttachment: false,
              lastMessageAt: temporaryMessage.createdAt,
              lastTime: 'Bây giờ',
            }
            : conversation,
        ),
      )

      if (clearDraft) {
        setDraft('')
      }
      setReplyingTo(null)

      const createdMessage = await sendMessage(
        activeConversation.id,
        text,
        parentMessageId,
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

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((message) =>
          message.id === temporaryMessage.id ? createdMessage : message,
        ),
      }))
    } catch (error) {
      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((message) =>
          message.id === temporaryMessage.id ? { ...message, state: 'failed' } : message,
        ),
      }))
      upsertQueuedMessage({
        ...queuedMessage,
        message: { ...temporaryMessage, state: 'failed' },
        updatedAt: new Date().toISOString(),
      })
      pushToast(
        error instanceof Error
          ? `${error.message} Tin nhắn đã được giữ lại, bạn có thể thử gửi lại!`
          : 'Không thể gửi tin nhắn. Tin nhắn đã được giữ lại, bạn có thể thử gửi lại!',
      )
    } finally {
      setIsSending(false)
    }
  }

  async function handleSendQuickMessage(text: string) {
    await sendActiveConversationMessage(text)
  }

  async function handleRetryMessage(message: Message) {
    await sendActiveConversationMessage(message.text, false, message)
  }
  async function handleUploadAttachment(file: File) {
    if (!activeConversation || isUploadingAttachment) {
      return
    }

    if (activeConversation.blocked) {
      pushToast('Bạn đã chặn người dùng này!')
      return
    }

    try {
      setIsUploadingAttachment(true)

      const createdMessage = await uploadMessageAttachment(activeConversation.id, file)

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: [...(current[activeConversation.id] ?? []), createdMessage],
      }))

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
              ...conversation,
              lastMessage: getAttachmentPreview(createdMessage),
              lastMessageByMe: true,
              lastMessageIsAttachment: Boolean(createdMessage.attachments?.length),
              lastMessageAt: createdMessage.createdAt ?? null,
              lastTime: createdMessage.time,
              attachments: [
                ...(createdMessage.attachments ?? []),
                ...conversation.attachments,
              ],
            }
            : conversation,
        ),
      )
    } catch (error) {
      pushToast(getErrorMessage(error, 'Không thể gửi file!'))
    } finally {
      setIsUploadingAttachment(false)
    }
  }

  async function handleEditMessage(messageId: string, text: string) {
    if (!activeConversation || busyMessageId) {
      return
    }

    try {
      setBusyMessageId(messageId)

      const updatedMessage = await updateMessage(activeConversation.id, messageId, text)

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((message) =>
          message.id === messageId ? updatedMessage : message,
        ),
      }))

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id && conversation.lastMessage !== 'Chưa có tin nhắn!'
            ? {
              ...conversation,
              lastMessage:
                conversation.lastMessage ===
                  messagesByConversation[activeConversation.id]?.find(
                    (message) => message.id === messageId,
                  )?.text
                  ? text
                  : conversation.lastMessage,
            }
            : conversation,
        ),
      )
    } catch (error) {
      pushToast(getErrorMessage(error, 'Không thể sửa tin nhắn!'))
      throw error
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!activeConversation || busyMessageId) {
      return
    }

    try {
      setBusyMessageId(messageId)

      await deleteMessage(activeConversation.id, messageId)

      const nextMessages = (messagesByConversation[activeConversation.id] ?? []).filter(
        (message) => message.id !== messageId,
      )
      const nextLastMessageItem = nextMessages.at(-1)
      const nextLastMessage = getAttachmentPreview(nextLastMessageItem)
      const nextLastTime = nextLastMessageItem?.time ?? ''

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: nextMessages,
      }))
      setReplyingTo((current) => (current?.id === messageId ? null : current))

      setConversations((current) =>
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

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: mergeLatestMessages(current[activeConversation.id] ?? [], serverMessagePage.messages).filter(
          (message) => message.id !== messageId,
        ),
      }))
      setMessagePaginationByConversation((current) => ({
        ...current,
        [activeConversation.id]: {
          hasMore: current[activeConversation.id]?.hasMore ?? serverMessagePage.hasMore,
          isLoadingOlder: false,
          nextCursor: current[activeConversation.id]?.nextCursor ?? serverMessagePage.nextCursor,
        },
      }))
      setConversations(nextConversations)
    } catch (error) {
      pushToast(getErrorMessage(error, 'Không thể xóa tin nhắn!'))
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleRecallMessage(messageId: string) {
    if (!activeConversation || busyMessageId) {
      return
    }

    try {
      setBusyMessageId(messageId)

      const updatedConversation = await recallMessage(activeConversation.id, messageId)

      const nextMessages = (messagesByConversation[activeConversation.id] ?? []).filter(
        (message) => message.id !== messageId,
      )

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: nextMessages,
      }))
      setReplyingTo((current) => (current?.id === messageId ? null : current))

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id ? updatedConversation : conversation,
        ),
      )

      const [serverMessagePage, nextConversations] = await Promise.all([
        fetchMessagesPage(activeConversation.id, { limit: MESSAGE_PAGE_LIMIT }),
        fetchConversations(),
      ])

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: serverMessagePage.messages,
      }))
      setMessagePaginationByConversation((current) => ({
        ...current,
        [activeConversation.id]: {
          hasMore: serverMessagePage.hasMore,
          isLoadingOlder: false,
          nextCursor: serverMessagePage.nextCursor,
        },
      }))
      setConversations(nextConversations)
    } catch (error) {
      pushToast(getErrorMessage(error, 'Không thể thu hồi tin nhắn!'))
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleToggleMessagePin(messageId: string) {
    if (!activeConversation || busyMessageId) {
      return
    }

    try {
      setBusyMessageId(messageId)

      const updatedMessage = await toggleMessagePin(activeConversation.id, messageId)

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((message) =>
          message.id === messageId ? updatedMessage : message,
        ),
      }))
    } catch (error) {
      pushToast(getErrorMessage(error, 'Không thể cập nhật ghim tin nhắn!'))
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleForwardMessage(messageId: string, targetConversationId: string) {
    if (!activeConversation || busyMessageId) {
      return
    }

    try {
      setBusyMessageId(messageId)

      const response = await forwardMessage(activeConversation.id, messageId, targetConversationId)

      setMessagesByConversation((current) => {
        if (!current[targetConversationId]) {
          return current
        }

        return {
          ...current,
          [targetConversationId]: [...current[targetConversationId], response.message],
        }
      })

      setConversations((current) =>
        current
          .map((conversation) =>
            conversation.id === targetConversationId
              ? {
                ...conversation,
                ...response.conversation,
              }
              : conversation,
          )
          .sort((first, second) => Number(second.pinned) - Number(first.pinned)),
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể chuyển tiếp tin nhắn!')
      throw error
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleToggleMessageReaction(messageId: string, emoji: string) {
    if (!activeConversation || busyMessageId) {
      return
    }

    try {
      setBusyMessageId(messageId)
      setErrorMessage('')

      const message = await toggleMessageReaction(activeConversation.id, messageId, emoji)

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((item) =>
          item.id === messageId ? message : item,
        ),
      }))
    } catch (error) {
      pushToast(getErrorMessage(error, 'Không thể Reaction tin nhắn!'))
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleRemoveMessageReaction(messageId: string, emoji: string) {
    if (!activeConversation || busyMessageId) {
      return
    }

    try {
      setBusyMessageId(messageId)

      const message = await removeMessageReaction(activeConversation.id, messageId, emoji)

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((item) =>
          item.id === messageId ? message : item,
        ),
      }))
    } catch (error) {
      pushToast(getErrorMessage(error, 'Không thể thu hồi Reaction!'))
    } finally {
      setBusyMessageId('')
    }
  }

  async function handleTogglePinned() {
    if (!activeConversation || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction('pin')
      setErrorMessage('')

      const updatedConversation = await updateConversationSettings(activeConversation.id, {
        pinned: !activeConversation.pinned,
      })

      setConversations((current) =>
        current
          .map((conversation) =>
            conversation.id === activeConversation.id
              ? {
                ...conversation,
                pinned: updatedConversation.pinned,
              }
              : conversation,
          )
          .sort((first, second) => Number(second.pinned) - Number(first.pinned)),
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật ghim!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleToggleMuted() {
    if (!activeConversation || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction('mute')
      setErrorMessage('')

      const updatedConversation = await updateConversationSettings(activeConversation.id, {
        muted: !activeConversation.muted,
      })

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
              ...conversation,
              muted: updatedConversation.muted,
            }
            : conversation,
        ),
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật tắt tiếng!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleConfirmDialog() {
    if (!confirmDialog || isConfirming) {
      return
    }

    try {
      setIsConfirming(true)
      await confirmDialog.onConfirm()
      setConfirmDialog(null)
    } finally {
      setIsConfirming(false)
    }
  }

  async function handleArchiveConversation() {
    if (!activeConversation || busyConversationAction) {
      return
    }

    setConfirmDialog({
      title: 'Lưu trữ đoạn hội thoại?',
      description: `Hội thoại "${activeConversation.name}" sẽ được ẩn khỏi danh sách hiện tại.`,
      confirmLabel: 'Lưu trữ',
      tone: 'danger',
      onConfirm: archiveActiveConversation,
    })
  }

  async function archiveActiveConversation() {
    if (!activeConversation || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction('archive')
      setErrorMessage('')

      await archiveConversation(activeConversation.id)

      const nextConversations = conversations.filter(
        (conversation) => conversation.id !== activeConversation.id,
      )
      const nextConversationId = nextConversations[0]?.id || ''

      setConversations(nextConversations)
      setMessagesByConversation((current) => {
        const next = { ...current }
        delete next[activeConversation.id]
        return next
      })
      setMessagePaginationByConversation((current) => {
        const next = { ...current }
        delete next[activeConversation.id]
        return next
      })
      setActiveId(nextConversationId)

      if (nextConversationId) {
        window.history.replaceState(null, '', toAppPath({ view: 'chat', conversationId: nextConversationId }))
      } else {
        window.history.replaceState(null, '', toAppPath({ view: 'chat' }))
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu trữ cuộc trò chuyện!')
    } finally {
      setBusyConversationAction('')
    }
  }

  function handleDeleteConversation(conversationId: string) {
    if (busyConversationAction) {
      return
    }

    const conversation =
      conversations.find((item) => item.id === conversationId) ||
      archivedConversations.find((item) => item.id === conversationId)

    setConfirmDialog({
      title: 'Xóa hội thoại?',
      description: `Hội thoại "${conversation?.name || 'này'}" sẽ bị ẩn khỏi danh sách trò chuyện của bạn.`,
      confirmLabel: 'Xóa',
      tone: 'danger',
      onConfirm: () => deleteConversationFromInbox(conversationId),
    })
  }

  async function deleteConversationFromInbox(conversationId: string) {
    if (busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction('delete-conversation')
      setErrorMessage('')

      await hideConversation(conversationId)

      const nextConversations = conversations.filter(
        (conversation) => conversation.id !== conversationId,
      )
      const nextArchivedConversations = archivedConversations.filter(
        (conversation) => conversation.id !== conversationId,
      )
      const nextConversationId =
        activeId === conversationId ? nextConversations[0]?.id || '' : activeId

      setConversations(nextConversations)
      setArchivedConversations(nextArchivedConversations)
      setMessagesByConversation((current) => {
        const next = { ...current }
        delete next[conversationId]
        return next
      })
      setMessagePaginationByConversation((current) => {
        const next = { ...current }
        delete next[conversationId]
        return next
      })
      setMembersByConversation((current) => {
        const next = { ...current }
        delete next[conversationId]
        return next
      })

      if (activeId === conversationId) {
        setActiveId(nextConversationId)
        setIsDetailOpen(false)
        window.history.replaceState(
          null,
          '',
          nextConversationId
            ? toAppPath({ view: 'chat', conversationId: nextConversationId })
            : toAppPath({ view: 'chat' }),
        )
      }

      pushToast('Đã xóa hội thoại khỏi danh sách của bạn.', 'info')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa hội thoại!')
    } finally {
      setBusyConversationAction('')
    }
  }

  function handleRestoreConversation(conversationId: string) {
    if (busyConversationAction) {
      return
    }

    const conversation = archivedConversations.find((item) => item.id === conversationId)

    setConfirmDialog({
      title: 'Khôi phục hội thoại?',
      description: `Hội thoại "${conversation?.name || 'này'}" sẽ quay lại danh sách hộp thư.`,
      confirmLabel: 'Khôi phục',
      onConfirm: () => restoreArchivedConversation(conversationId),
    })
  }

  function handleOpenPinnedMessage(messageId: string) {
    setActiveView('chat')
    handleJumpToMessage(messageId).catch(() => {
      setFocusedMessageId('')
      window.requestAnimationFrame(() => {
        setFocusedMessageId(messageId)
      })
    })
  }

  async function restoreArchivedConversation(conversationId: string) {
    if (busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction('restore')
      setErrorMessage('')

      const restoredConversation = await unarchiveConversation(conversationId)
      const nextConversations = await fetchConversations()

      setArchivedConversations((current) =>
        current.filter((conversation) => conversation.id !== conversationId),
      )
      setConversations(nextConversations)
      setConversationFilter('all')
      handleSelectConversation(restoredConversation.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể khôi phục hội thoại!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleToggleBlocked() {
    if (!activeConversation || busyConversationAction || !activeConversation.contactId) {
      return
    }

    setConfirmDialog({
      title: activeConversation.blocked ? 'Bỏ chặn người dùng?' : 'Chặn người dùng?',
      description: activeConversation.blocked
        ? 'Bạn sẽ có thể nhận và gửi tin nhắn với người này trở lại.'
        : 'Bạn sẽ không thể nhận và gửi tin nhắn với người này cho đến khi bỏ chặn.',
      confirmLabel: activeConversation.blocked ? 'Bỏ chặn' : 'Chặn',
      tone: activeConversation.blocked ? 'default' : 'danger',
      onConfirm: toggleActiveConversationBlocked,
    })
  }

  async function toggleActiveConversationBlocked() {
    if (!activeConversation || busyConversationAction || !activeConversation.contactId) {
      return
    }

    try {
      setBusyConversationAction('block')
      setErrorMessage('')

      const response = activeConversation.blocked
        ? await unblockContact(activeConversation.contactId)
        : await blockContact(activeConversation.contactId)
      const isBlocked = response.friendshipStatus === 'blocked'

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
              ...conversation,
              blocked: isBlocked,
              friendshipStatus: response.friendshipStatus,
              status: isBlocked ? 'Đã chặn' : conversation.status,
            }
            : conversation,
        ),
      )

      if (isBlocked) {
        setDraft('')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái chặn!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleUpdateContactNickname(nickname: string) {
    if (!activeConversation || busyConversationAction || !activeConversation.contactId) {
      return
    }

    try {
      setBusyConversationAction('nickname')
      setErrorMessage('')
      const response = await updateContactNickname(activeConversation.contactId, nickname)
      const [nextConversations, nextFriends] = await Promise.all([
        fetchConversations(),
        fetchFriends(),
      ])

      setConversations(nextConversations)
      setFriends(nextFriends)
      void response
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật biệt danh!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleCreateGroup(payload: {
    title: string
    memberIds: string[]
    avatar?: File | null
  }) {
    if (isCreatingGroup) {
      return
    }

    try {
      setIsCreatingGroup(true)

      const conversation = await createGroupConversation(payload)

      setConversations((current) => [conversation, ...current])
      handleSelectConversation(conversation.id)
      setIsDetailOpen(true)
    } catch (error) {
      pushToast(getErrorMessage(error, 'Không thể tạo nhóm!'))
      throw error
    } finally {
      setIsCreatingGroup(false)
    }
  }

  async function refreshActiveGroup(conversationId: string) {
    const [nextConversations, nextMembers, nextMessagePage] = await Promise.all([
      fetchConversations(),
      fetchConversationMembers(conversationId),
      fetchMessagesPage(conversationId, { limit: MESSAGE_PAGE_LIMIT }),
    ])

    setConversations(nextConversations)
    setMembersByConversation((current) => ({
      ...current,
      [conversationId]: nextMembers,
    }))
    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: mergeLatestMessages(current[conversationId] ?? [], nextMessagePage.messages),
    }))
    setMessagePaginationByConversation((current) => ({
      ...current,
      [conversationId]: {
        hasMore: current[conversationId]?.hasMore ?? nextMessagePage.hasMore,
        isLoadingOlder: false,
        nextCursor: current[conversationId]?.nextCursor ?? nextMessagePage.nextCursor,
      },
    }))
  }

  async function handleUpdateGroup(payload: { title?: string; avatar?: File | null }) {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction('group')
      const updatedConversation = await updateGroupConversation(activeConversation.id, payload)

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
              ...conversation,
              ...updatedConversation,
            }
            : conversation,
        ),
      )
      await refreshActiveGroup(activeConversation.id)
    } catch (error) {
      pushToast(getErrorMessage(error, 'Không thể cập nhật nhóm!'))
      throw error
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleAddMember(userId: string) {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction('member')
      setErrorMessage('')
      const members = await addGroupMember(activeConversation.id, userId)

      setMembersByConversation((current) => ({
        ...current,
        [activeConversation.id]: members,
      }))
      await refreshActiveGroup(activeConversation.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể thêm thành viên!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    setConfirmDialog({
      title: 'Xoá thành viên nhóm?',
      description: 'Thành viên này sẽ không truy cập được nhóm này nữa.',
      confirmLabel: 'Xoá thành viên',
      tone: 'danger',
      onConfirm: () => removeActiveGroupMember(userId),
    })
  }

  async function removeActiveGroupMember(userId: string) {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction('member')
      setErrorMessage('')
      const members = await removeGroupMember(activeConversation.id, userId)

      setMembersByConversation((current) => ({
        ...current,
        [activeConversation.id]: members,
      }))
      await refreshActiveGroup(activeConversation.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa thành viên!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleUpdateMemberNickname(userId: string, nickname: string) {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction(`member-nickname-${userId}`)
      setErrorMessage('')
      const members = await updateGroupMemberNickname(activeConversation.id, userId, nickname)

      setMembersByConversation((current) => ({
        ...current,
        [activeConversation.id]: members,
      }))
      await refreshActiveGroup(activeConversation.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật biệt danh!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleUpdateMemberRole(userId: string, role: 'admin' | 'member') {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction(`member-role-${userId}`)
      setErrorMessage('')
      const members = await updateGroupMemberRole(activeConversation.id, userId, role)

      setMembersByConversation((current) => ({
        ...current,
        [activeConversation.id]: members,
      }))
      await refreshActiveGroup(activeConversation.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật quyền thành viên!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleTransferOwner(userId: string) {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    setConfirmDialog({
      title: 'Chuyển Owner nhóm?',
      description: 'Bạn sẽ trở thành Admin và thành viên này sẽ có toàn quyền với nhóm!',
      confirmLabel: 'Chuyển Owner',
      tone: 'danger',
      onConfirm: () => transferActiveGroupOwner(userId),
    })
  }

  async function transferActiveGroupOwner(userId: string) {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction(`owner-${userId}`)
      setErrorMessage('')
      const members = await transferGroupOwner(activeConversation.id, userId)

      setMembersByConversation((current) => ({
        ...current,
        [activeConversation.id]: members,
      }))
      await refreshActiveGroup(activeConversation.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể chuyển Owner!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleCopyGroupInviteLink() {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction('invite')
      const token = activeGroupInviteToken || await fetchGroupInvite(activeConversation.id)
      const inviteUrl = `${window.location.origin}${toAppPath({ view: 'chat' })}?join=${encodeURIComponent(token)}`

      setGroupInviteTokensByConversation((current) => ({
        ...current,
        [activeConversation.id]: token,
      }))
      await navigator.clipboard.writeText(inviteUrl)
      pushToast('Đã sao chép link mới!', 'info')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể sao chép link mới!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleResetGroupInviteLink() {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction('invite')
      const token = await resetGroupInvite(activeConversation.id)

      setGroupInviteTokensByConversation((current) => ({
        ...current,
        [activeConversation.id]: token,
      }))
      pushToast('Đã tạo link mời mới!', 'info')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tạo link mời mới!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleReviewGroupJoinRequest(requestId: string, action: 'approve' | 'decline') {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction(`join-request-${requestId}`)
      const members = await reviewGroupJoinRequest(activeConversation.id, requestId, action)
      const requests = await fetchGroupJoinRequests(activeConversation.id)

      setMembersByConversation((current) => ({
        ...current,
        [activeConversation.id]: members,
      }))
      setGroupJoinRequestsByConversation((current) => ({
        ...current,
        [activeConversation.id]: requests,
      }))
      await refreshActiveGroup(activeConversation.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể duyệt yêu cầu tham gia!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleLeaveGroup() {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    setConfirmDialog({
      title: 'Rời nhóm chat?',
      description: 'Bạn sẽ không còn thấy tin nhắn mới trong nhóm này!',
      confirmLabel: 'Rời nhóm',
      tone: 'danger',
      onConfirm: leaveActiveGroup,
    })
  }

  async function leaveActiveGroup() {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction('leave')
      setErrorMessage('')
      await leaveGroupConversation(activeConversation.id)

      const nextConversations = conversations.filter(
        (conversation) => conversation.id !== activeConversation.id,
      )
      const nextConversationId = nextConversations[0]?.id || ''

      setConversations(nextConversations)
      setMessagesByConversation((current) => {
        const next = { ...current }
        delete next[activeConversation.id]
        return next
      })
      setMessagePaginationByConversation((current) => {
        const next = { ...current }
        delete next[activeConversation.id]
        return next
      })
      setMembersByConversation((current) => {
        const next = { ...current }
        delete next[activeConversation.id]
        return next
      })
      setActiveId(nextConversationId)
      setIsDetailOpen(false)

      window.history.replaceState(
        null,
        '',
        nextConversationId
          ? toAppPath({ view: 'chat', conversationId: nextConversationId })
          : toAppPath({ view: 'chat' }),
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể rời nhóm!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleDisbandGroup() {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    setConfirmDialog({
      title: 'Giải tán nhóm chat?',
      description: 'Tất cả thành viên sẽ không còn thấy nhóm này. Hành động này không thể hoàn tác trong ứng dụng.',
      confirmLabel: 'Giải tán nhóm',
      tone: 'danger',
      onConfirm: disbandActiveGroup,
    })
  }

  async function disbandActiveGroup() {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction('disband')
      setErrorMessage('')
      locallyDisbandedConversationIdsRef.current.add(activeConversation.id)
      await disbandGroupConversation(activeConversation.id)

      const nextConversations = conversations.filter(
        (conversation) => conversation.id !== activeConversation.id,
      )
      const nextConversationId = nextConversations[0]?.id || ''

      setConversations(nextConversations)
      setMessagesByConversation((current) => {
        const next = { ...current }
        delete next[activeConversation.id]
        return next
      })
      setMessagePaginationByConversation((current) => {
        const next = { ...current }
        delete next[activeConversation.id]
        return next
      })
      setMembersByConversation((current) => {
        const next = { ...current }
        delete next[activeConversation.id]
        return next
      })
      setActiveId(nextConversationId)
      setIsDetailOpen(false)

      window.history.replaceState(
        null,
        '',
        nextConversationId
          ? toAppPath({ view: 'chat', conversationId: nextConversationId })
          : toAppPath({ view: 'chat' }),
      )
    } catch (error) {
      locallyDisbandedConversationIdsRef.current.delete(activeConversation.id)
      setErrorMessage(error instanceof Error ? error.message : 'Không thể giải tán nhóm!')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleStartCall(type: CallType) {
    if (!activeConversation || activeConversation.blocked || activeCall) {
      return
    }

    try {
      setErrorMessage('')
      const call = await startRealtimeCall(activeConversation.id, type)

      setActiveCall({
        ...call,
        direction: 'outgoing',
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể bắt đầu cuộc gọi!')
    }
  }

  function handleLogout() {
    disconnectRealtimeSocket()
    onLogout()
  }

  function renderNavRail() {
    return (
      <NavRail
        activeView={activeView}
        currentUser={currentUser}
        isOpen={!isCompactLayout && isSidebarOpen}
        notificationCount={notificationBadgeCount}
        onChangeView={handleChangeView}
        onLogout={handleLogout}
        onToggleOpen={() => {
          if (isCompactLayout) {
            setIsSidebarOpen(false)
            return
          }

          setIsSidebarOpen((current) => !current)
        }}
        onUserChange={onUserChange}
      />
    )
  }

  function renderInboxPanel() {
    return (
      <>
        {isCompactLayout && isInboxOpen ? (
          <button
            aria-label="Đóng danh sách hội thoại"
            className="inbox-backdrop"
            onClick={() => setIsInboxOpen(false)}
            type="button"
          />
        ) : null}
        <InboxPanel
          activeConversation={activeConversation}
          activeFilter={conversationFilter}
          conversations={filteredConversations}
          friends={friends}
          isCompact={isCompactLayout}
          isCreatingGroup={isCreatingGroup}
          onClosePanel={() => setIsInboxOpen(false)}
          onCreateGroup={handleCreateGroup}
          onFilterChange={setConversationFilter}
          onQueryChange={setQuery}
          onDeleteConversation={handleDeleteConversation}
          onRestoreConversation={handleRestoreConversation}
          onSelectConversation={handleSelectConversation}
          query={query}
        />
      </>
    )
  }

  function renderConfirmDialog() {
    return (
      <ConfirmDialog
        dialog={confirmDialog}
        isWorking={isConfirming}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={handleConfirmDialog}
      />
    )
  }

  function renderCallOverlay() {
    return activeCall && currentUser ? (
      <CallOverlay
        call={activeCall}
        currentUserId={currentUser.id}
        onClear={() => setActiveCall(null)}
        onError={(message) => pushToast(message)}
      />
    ) : null
  }

  function renderToasts() {
    if (toasts.length === 0) {
      return null
    }

    return (
      <div aria-live="polite" className="toast-stack" role="status">
        {toasts.map((toast) => (
          <button
            className={`toast ${toast.tone === 'info' ? 'is-info' : 'is-error'} ${toast.isHiding ? 'is-hiding' : ''
              }`}
            key={toast.id}
            onClick={() => dismissToast(toast.id)}
            type="button"
          >
            {toast.text}
          </button>
        ))}
      </div>
    )
  }

  const shellClassName = [
    'app-shell',
    !isCompactLayout && isSidebarOpen ? 'is-sidebar-open' : '',
    isDetailOpen && activeView === 'chat' ? 'is-detail-open' : '',
    isCompactLayout && activeView === 'chat' ? 'has-inbox-drawer' : '',
    isCompactLayout && activeView === 'chat' && isInboxOpen ? 'is-inbox-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (activeView === 'contacts') {
    return (
      <main className={`${shellClassName} contacts-shell`}>
        {renderNavRail()}
        <ContactsPanel
          contactToOpen={profileContactToOpen}
          onAccepted={handleAcceptedFriend}
          onProfileOpened={() => setProfileContactToOpen(null)}
          pushToast={pushToast}
        />
        {renderCallOverlay()}
        {renderConfirmDialog()}
        {renderToasts()}
      </main>
    )
  }

  if (activeView === 'profile') {
    return (
      <main className={`${shellClassName} profile-shell`}>
        {renderNavRail()}
        <ProfilePage
          currentUser={currentUser}
          onUserChange={onUserChange}
          pushToast={pushToast}
        />
        {renderCallOverlay()}
        {renderConfirmDialog()}
        {renderToasts()}
      </main>
    )
  }

  if (activeView === 'settings') {
    return (
      <main className={`${shellClassName} profile-shell settings-shell`}>
        {renderNavRail()}
        <SettingsPage
          onAccountDeleted={onAccountDeleted}
          onLogout={handleLogout}
          pushToast={pushToast}
        />
        {renderCallOverlay()}
        {renderConfirmDialog()}
        {renderToasts()}
      </main>
    )
  }

  if (activeView === 'notifications') {
    return (
      <main className={`${shellClassName} notifications-shell`}>
        {renderNavRail()}
        <NotificationsPanel
          browserNotificationPermission={browserNotificationPermission}
          conversations={conversations}
          friendRequests={friendRequests}
          notifications={notifications}
          onEnableBrowserNotifications={handleEnableBrowserNotifications}
          onOpenContacts={handleOpenContacts}
          onOpenConversation={handleSelectConversation}
          onOpenNotification={handleOpenNotification}
        />
        {renderCallOverlay()}
        {renderConfirmDialog()}
        {renderToasts()}
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className={shellClassName}>
        {renderNavRail()}
        <section className="loading-panel">Đang tải dữ liệu từ máy chủ...</section>
        {renderToasts()}
      </main>
    )
  }

  if (!activeConversation) {
    return (
      <main className={`${shellClassName} empty-chat-shell`}>
        {renderNavRail()}
        {renderInboxPanel()}
        <section className="loading-panel">
          {pageErrorMessage || 'Không có hội thoại nào trong tài khoản này!'}
        </section>
        {renderToasts()}
      </main>
    )
  }

  return (
    <main className={shellClassName}>
      {renderNavRail()}
      {renderInboxPanel()}
      <ChatPanel
        activeConversation={activeConversation}
        draft={draft}
        busyMessageId={busyMessageId}
        focusedMessageId={focusedMessageId}
        isBlocked={activeConversation.blocked}
        isDetailOpen={isDetailOpen}
        isSending={isSending}
        shouldAutoScrollToLatest={shouldAutoScrollToLatest}
        hasOlderMessages={hasOlderMessages}
        isTyping={Boolean(typingByConversation[activeConversation.id])}
        isLoadingOlderMessages={isLoadingOlderMessages}
        isUploadingAttachment={isUploadingAttachment}
        members={activeMembers}
        messages={messages}
        pinnedMessages={pinnedMessages}
        conversations={conversations}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onDeleteMessage={handleDeleteMessage}
        onRecallMessage={handleRecallMessage}
        onDraftChange={handleDraftChange}
        onEditMessage={handleEditMessage}
        onForwardMessage={handleForwardMessage}
        onToggleMessagePin={handleToggleMessagePin}
        onReplyMessage={setReplyingTo}
        onRemoveReaction={handleRemoveMessageReaction}
        onRetryMessage={handleRetryMessage}
        onLoadOlderMessages={handleLoadOlderMessages}
        onSendQuickMessage={handleSendQuickMessage}
        onAutoScrollComplete={() => setShouldAutoScrollToLatest(false)}
        onToggleReaction={handleToggleMessageReaction}
        onUploadAttachment={handleUploadAttachment}
        onSearchMessages={handleSearchMessages}
        onJumpToMessage={handleJumpToMessage}
        onToggleDetails={() => setIsDetailOpen((current) => !current)}
        onOpenContactProfile={handleOpenActiveContactProfile}
        onOpenConversationList={() => setIsInboxOpen(true)}
        onStartCall={handleStartCall}
        onSubmit={handleSubmit}
      />
      <DetailPanel
        activeConversation={activeConversation}
        busyAction={busyConversationAction}
        currentUserId={currentUser?.id}
        friends={friends}
        groupInviteToken={activeGroupInviteToken}
        joinRequests={activeGroupJoinRequests}
        isOpen={isDetailOpen}
        members={activeMembers}
        pinnedMessages={pinnedMessages}
        onAddMember={handleAddMember}
        onArchive={handleArchiveConversation}
        onCopyGroupInviteLink={handleCopyGroupInviteLink}
        onDisbandGroup={handleDisbandGroup}
        onLeaveGroup={handleLeaveGroup}
        onRemoveMember={handleRemoveMember}
        onOpenPinnedMessage={handleOpenPinnedMessage}
        onResetGroupInviteLink={handleResetGroupInviteLink}
        onReviewGroupJoinRequest={handleReviewGroupJoinRequest}
        onToggleBlocked={handleToggleBlocked}
        onToggleMuted={handleToggleMuted}
        onTogglePinned={handleTogglePinned}
        onTransferOwner={handleTransferOwner}
        onUpdateContactNickname={handleUpdateContactNickname}
        onUpdateGroup={handleUpdateGroup}
        onUpdateMemberNickname={handleUpdateMemberNickname}
        onUpdateMemberRole={handleUpdateMemberRole}
      />
      {renderCallOverlay()}
      {renderConfirmDialog()}
      {renderToasts()}
    </main>
  )
}
