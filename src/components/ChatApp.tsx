import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AuthUser } from '../services/authApi'
import { touchPresence } from '../services/authApi'
import { readAppRouteFromLocation, toAppPath } from '../services/appRoutes'
import {
  archiveConversation,
  addGroupMember,
  createGroupConversation,
  deleteMessage,
  disbandGroupConversation,
  fetchConversations,
  fetchConversationMembers,
  fetchMessages,
  fetchTypingStatus,
  forwardMessage,
  leaveGroupConversation,
  markConversationDelivered,
  markConversationRead,
  removeGroupMember,
  removeMessageReaction,
  sendMessage,
  toggleMessageReaction,
  toggleMessagePin,
  unarchiveConversation,
  uploadMessageAttachment,
  updateConversationSettings,
  updateGroupConversation,
  updateGroupMemberNickname,
  updateTypingStatus,
  updateMessage,
} from '../services/chatApi'
import {
  blockContact,
  fetchFriends,
  fetchIncomingRequests,
  unblockContact,
  updateContactNickname,
} from '../services/contactApi'
import { startRealtimeCall } from '../services/callRealtime'
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

type ChatAppProps = {
  currentUser: AuthUser | null
  onAccountDeleted: () => void
  onLogout: () => void
  onUserChange: (user: AuthUser) => void
}

const SIDEBAR_STATE_KEY = 'sidebar_is_open'
const COMPACT_LAYOUT_MEDIA_QUERY = '(max-width: 1024px)'

function getInitialSidebarState() {
  return localStorage.getItem(SIDEBAR_STATE_KEY) === 'true'
}

function getInitialCompactLayoutState() {
  return typeof window !== 'undefined' && window.matchMedia(COMPACT_LAYOUT_MEDIA_QUERY).matches
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
  const [friendRequests, setFriendRequests] = useState<ContactUser[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [membersByConversation, setMembersByConversation] = useState<Record<string, ConversationMember[]>>({})
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>(
    {},
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [busyMessageId, setBusyMessageId] = useState('')
  const [busyConversationAction, setBusyConversationAction] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [readSyncKey, setReadSyncKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [typingByConversation, setTypingByConversation] = useState<Record<string, boolean>>({})
  const [activeCall, setActiveCall] = useState<CallSession | null>(null)
  const typingStopTimerRef = useRef<number | null>(null)
  const lastSentTypingRef = useRef<{ conversationId: string; isTyping: boolean } | null>(null)
  const activeIdRef = useRef(activeId)
  const currentUserIdRef = useRef(currentUser?.id ?? '')
  const conversationsRef = useRef<Conversation[]>([])
  const locallyDisbandedConversationIdsRef = useRef(new Set<string>())
  const deliveredSyncKeysRef = useRef(new Set<string>())

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? ''
  }, [currentUser?.id])

  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  const loadConversations = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    const nextConversations = await fetchConversations()

    setConversations(nextConversations)
    setIsLoading(false)

    return nextConversations
  }, [])

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
              [conversationId]: response.messages,
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
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Không thể tải hội thoại.')
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
          setErrorMessage(error instanceof Error ? error.message : 'Không thể tải hội thoại lưu trữ!')
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
      const [nextConversations, nextMessages] = await Promise.all([
        fetchConversations(),
        fetchMessages(conversationId),
      ])

      setConversations(nextConversations)
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: nextMessages,
      }))

      if (nextMessages.some((message) => message.author === 'them')) {
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

        window.alert(
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
        .then(setConversations)
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
      fetchNotifications().then(setNotifications).catch(() => undefined)
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
    }

    function handleCallSignal(payload: { callId?: string; data?: RTCSessionDescriptionInit | RTCIceCandidateInit }) {
      if (!payload.callId || !payload.data) {
        return
      }

      window.dispatchEvent(
        new CustomEvent(`call-signal:${payload.callId}`, {
          detail: payload.data,
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
    },
    [],
  )

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(isSidebarOpen))
  }, [isSidebarOpen])

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_LAYOUT_MEDIA_QUERY)

    function handleChange() {
      setIsCompactLayout(mediaQuery.matches)
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
    if (!activeId || messagesByConversation[activeId]) {
      return
    }

    let isMounted = true

    async function loadMessages() {
      try {
        const messages = await fetchMessages(activeId)

        if (isMounted) {
          setMessagesByConversation((current) => ({
            ...current,
            [activeId]: messages,
          }))

          if (messages.some((message) => message.author === 'them')) {
            syncDeliveredReceipts(activeId).catch(() => undefined)
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Không thể tải tin nhắn!')
        }
      }
    }

    loadMessages()

    return () => {
      isMounted = false
    }
  }, [activeId, messagesByConversation, syncDeliveredReceipts])

  const activeConversation = conversations.find((conversation) => conversation.id === activeId)
  const messages = activeId ? messagesByConversation[activeId] ?? [] : []
  const pinnedMessages = messages.filter((message) => message.isPinned)
  const activeMembers = activeId ? membersByConversation[activeId] ?? [] : []

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
          setErrorMessage(error instanceof Error ? error.message : 'Không thể tải thành viên nhóm!')
        }
      }
    }

    loadMembers()

    return () => {
      isMounted = false
    }
  }, [activeConversation?.id, activeConversation?.type])

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
    if (activeView !== 'chat' || !activeId || messages.length === 0) {
      return
    }

    const hasIncomingMessage = messages.some((message) => message.author === 'them')
    const nextReadSyncKey = `${activeId}:${messages.at(-1)?.id ?? ''}`

    if (!hasIncomingMessage || readSyncKey === nextReadSyncKey) {
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
          [activeId]: response.messages,
        }))
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === activeId
              ? {
                  ...conversation,
                  unread: 0,
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
  }, [activeId, activeView, messages, readSyncKey])

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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tải hội thoại mới!')
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
    setActiveView('contacts')
    window.history.pushState(null, '', toAppPath({ view: 'contacts' }))
  }

  function handleSelectConversation(conversationId: string) {
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

  async function sendActiveConversationMessage(textValue: string, clearDraft = false) {
    if (!activeConversation || isSending) {
      return
    }

    if (activeConversation.blocked) {
      setErrorMessage('Bạn đã chặn người dùng này!')
      return
    }

    const text = textValue.trim()

    if (!text) {
      return
    }

    try {
      setIsSending(true)
      setErrorMessage('')

      const createdMessage = await sendMessage(activeConversation.id, text, replyingTo?.id ?? null)
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
        [activeConversation.id]: [...(current[activeConversation.id] ?? []), createdMessage],
      }))

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                lastMessage: text,
                lastTime: 'Bây giờ',
              }
            : conversation,
        ),
      )

      if (clearDraft) {
        setDraft('')
      }
      setReplyingTo(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể gửi tin nhắn!')
    } finally {
      setIsSending(false)
    }
  }

  async function handleSendQuickMessage(text: string) {
    await sendActiveConversationMessage(text)
  }
  async function handleUploadAttachment(file: File) {
    if (!activeConversation || isUploadingAttachment) {
      return
    }

    if (activeConversation.blocked) {
      setErrorMessage('Bạn đã chặn người dùng này!')
      return
    }

    try {
      setIsUploadingAttachment(true)
      setErrorMessage('')

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
                lastMessage: createdMessage.text,
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
      setErrorMessage(error instanceof Error ? error.message : 'Không thể gửi file!')
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
      setErrorMessage('')

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
      setErrorMessage(error instanceof Error ? error.message : 'Không thể sửa tin nhắn!')
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
      setErrorMessage('')

      await deleteMessage(activeConversation.id, messageId)

      const nextMessages = (messagesByConversation[activeConversation.id] ?? []).filter(
        (message) => message.id !== messageId,
      )
      const nextLastMessage = nextMessages.at(-1)?.text ?? 'Chưa có tin nhắn!'
      const nextLastTime = nextMessages.at(-1)?.time ?? ''

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
                lastTime: nextLastTime,
              }
            : conversation,
        ),
      )

      const [serverMessages, nextConversations] = await Promise.all([
        fetchMessages(activeConversation.id),
        fetchConversations(),
      ])

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: serverMessages,
      }))
      setConversations(nextConversations)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa tin nhắn!')
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
      setErrorMessage('')

      const updatedMessage = await toggleMessagePin(activeConversation.id, messageId)

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((message) =>
          message.id === messageId ? updatedMessage : message,
        ),
      }))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật ghim tin nhắn!')
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
      setErrorMessage('')

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
      setErrorMessage(error instanceof Error ? error.message : 'Không thể Reaction tin nhắn!')
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
      setErrorMessage('')

      const message = await removeMessageReaction(activeConversation.id, messageId, emoji)

      setMessagesByConversation((current) => ({
        ...current,
        [activeConversation.id]: (current[activeConversation.id] ?? []).map((item) =>
          item.id === messageId ? message : item,
        ),
      }))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể thu hồi Reaction!')
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
    setFocusedMessageId('')
    window.requestAnimationFrame(() => {
      setFocusedMessageId(messageId)
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
      setErrorMessage('')

      const conversation = await createGroupConversation(payload)

      setConversations((current) => [conversation, ...current])
      handleSelectConversation(conversation.id)
      setIsDetailOpen(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tạo nhóm!')
      throw error
    } finally {
      setIsCreatingGroup(false)
    }
  }

  async function refreshActiveGroup(conversationId: string) {
    const [nextConversations, nextMembers, nextMessages] = await Promise.all([
      fetchConversations(),
      fetchConversationMembers(conversationId),
      fetchMessages(conversationId),
    ])

    setConversations(nextConversations)
    setMembersByConversation((current) => ({
      ...current,
      [conversationId]: nextMembers,
    }))
    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: nextMessages,
    }))
  }

  async function handleUpdateGroup(payload: { title?: string; avatar?: File | null }) {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    try {
      setBusyConversationAction('group')
      setErrorMessage('')
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
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật nhóm!')
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

  async function handleLeaveGroup() {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    setConfirmDialog({
      title: 'Rời nhóm chat?',
      description: 'Bạn sẽ không còn thấy tin nhắn mới trong nhóm này.',
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
        isOpen={isSidebarOpen}
        notificationCount={notificationBadgeCount}
        onChangeView={handleChangeView}
        onLogout={handleLogout}
        onToggleOpen={() => setIsSidebarOpen((current) => !current)}
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
        onError={setErrorMessage}
      />
    ) : null
  }

  const shellClassName = [
    'app-shell',
    isSidebarOpen ? 'is-sidebar-open' : '',
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
        <ContactsPanel onAccepted={handleAcceptedFriend} />
        {renderCallOverlay()}
        {renderConfirmDialog()}
      </main>
    )
  }

  if (activeView === 'profile') {
    return (
      <main className={`${shellClassName} profile-shell`}>
        {renderNavRail()}
        <ProfilePage
          currentUser={currentUser}
          onAccountDeleted={onAccountDeleted}
          onUserChange={onUserChange}
        />
        {renderCallOverlay()}
        {renderConfirmDialog()}
      </main>
    )
  }

  if (activeView === 'notifications') {
    return (
      <main className={`${shellClassName} notifications-shell`}>
        {renderNavRail()}
        <NotificationsPanel
          conversations={conversations}
          friendRequests={friendRequests}
          notifications={notifications}
          onOpenContacts={handleOpenContacts}
          onOpenConversation={handleSelectConversation}
          onOpenNotification={handleOpenNotification}
        />
        {renderCallOverlay()}
        {renderConfirmDialog()}
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className={shellClassName}>
        {renderNavRail()}
        <section className="loading-panel">Đang tải dữ liệu từ máy chủ...</section>
      </main>
    )
  }

  if (!activeConversation) {
    return (
      <main className={`${shellClassName} empty-chat-shell`}>
        {renderNavRail()}
        {renderInboxPanel()}
        <section className="loading-panel">
          {errorMessage || 'Không có hội thoại nào trong tài khoản này!'}
        </section>
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
        errorMessage={errorMessage}
        busyMessageId={busyMessageId}
        focusedMessageId={focusedMessageId}
        isBlocked={activeConversation.blocked}
        isDetailOpen={isDetailOpen}
        isSending={isSending}
        isTyping={Boolean(typingByConversation[activeConversation.id])}
        isUploadingAttachment={isUploadingAttachment}
        members={activeMembers}
        messages={messages}
        conversations={conversations}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onDeleteMessage={handleDeleteMessage}
        onDraftChange={handleDraftChange}
        onEditMessage={handleEditMessage}
        onForwardMessage={handleForwardMessage}
        onToggleMessagePin={handleToggleMessagePin}
        onReplyMessage={setReplyingTo}
        onRemoveReaction={handleRemoveMessageReaction}
        onSendQuickMessage={handleSendQuickMessage}
        onToggleReaction={handleToggleMessageReaction}
        onUploadAttachment={handleUploadAttachment}
        onToggleDetails={() => setIsDetailOpen((current) => !current)}
        onOpenConversationList={() => setIsInboxOpen(true)}
        onStartCall={handleStartCall}
        onSubmit={handleSubmit}
      />
      <DetailPanel
        activeConversation={activeConversation}
        busyAction={busyConversationAction}
        currentUserId={currentUser?.id}
        friends={friends}
        isOpen={isDetailOpen}
        members={activeMembers}
        pinnedMessages={pinnedMessages}
        onAddMember={handleAddMember}
        onArchive={handleArchiveConversation}
        onDisbandGroup={handleDisbandGroup}
        onLeaveGroup={handleLeaveGroup}
        onRemoveMember={handleRemoveMember}
        onOpenPinnedMessage={handleOpenPinnedMessage}
        onToggleBlocked={handleToggleBlocked}
        onToggleMuted={handleToggleMuted}
        onTogglePinned={handleTogglePinned}
        onUpdateContactNickname={handleUpdateContactNickname}
        onUpdateGroup={handleUpdateGroup}
        onUpdateMemberNickname={handleUpdateMemberNickname}
      />
      {renderCallOverlay()}
      {renderConfirmDialog()}
    </main>
  )
}
