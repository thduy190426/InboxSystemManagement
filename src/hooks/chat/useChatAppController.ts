import { useModerationSettings } from '../../hooks/useModerationSettings'
import { keyManager } from '../../lib/e2ee/KeyManager'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AuthUser } from '../../services/api/authApi'
import { touchPresence } from '../../services/api/authApi'
import { readAppRouteFromLocation, toAppPath } from '../../services/core/appRoutes'
import { getBrowserNotificationPermission, registerWebPushSubscription, requestBrowserNotificationPermission, showBrowserNotification, type BrowserNotificationPermission } from '../../services/core/browserNotifications'
import { fetchConversations, fetchConversationCalls, fetchConversationMembers, fetchGroupInvite, fetchGroupJoinRequests, fetchTypingStatus, markConversationDelivered, markConversationRead, requestGroupJoin, updateTypingStatus, fetchMessagesPage } from '../../services/api/chatApi'
import { startRealtimeCall } from '../../services/realtime/callRealtime'
import { fetchNotifications, markAllNotificationsRead, markConversationNotificationsRead, markNotificationRead } from '../../services/api/notificationApi'
import { disconnectRealtimeSocket } from '../../services/realtime/realtime'
import { playAlertSound, flashDocumentTitle, playCallRing } from '../../services/core/alertNotifier'
import type { AppNotification, AppView, CallSession, CallType, ContactUser, Conversation, ConversationMember, GroupJoinRequest, Message } from '../../types'
import { useOfflineQueue } from '../../hooks/chat/useOfflineQueue'
import { useChatData } from '../../hooks/chat/useChatData'
import { useGroupManagement } from '../../hooks/chat/useGroupManagement'
import { useConversationActions } from '../../hooks/chat/useConversationActions'
import { useChatMessageActions } from '../../hooks/chat/useChatMessageActions'
import { useChatRealtime } from '../../hooks/chat/useChatRealtime'
import { getQueuedMessagesForUser, mergeQueuedMessages, mergeLatestMessages, getInitialSidebarState, getInitialInboxWidth, getInitialCompactLayoutState, MESSAGE_PAGE_LIMIT, CONVERSATION_FILTERS, SIDEBAR_STATE_KEY, INBOX_WIDTH_KEY } from '../../services/core/offlineQueue'
import type { ConfirmDialogState } from '../../components/ui/ConfirmDialog'
import type { ConversationFilter } from '../../components/panels/InboxPanel'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

type ChatAppProps = {
  currentUser: AuthUser | null
  onAccountDeleted: () => void
  onLogout: () => void
  onUserChange: (user: AuthUser) => void
  pushToast?: (text: string, tone?: 'info' | 'error') => void
}

type MessagePaginationState = {
  hasMore: boolean
  isLoadingOlder: boolean
  nextCursor: string | null
}


function readChatQueryParams() {
  const params = new URLSearchParams(window.location.search)
  const filterParam = params.get('filter') as ConversationFilter | null

  return {
    query: params.get('q')?.trim() ?? '',
    filter: filterParam && CONVERSATION_FILTERS.includes(filterParam) ? filterParam : 'all',
  }
}

function appendChatQueryParams(path: string, params: { query: string; filter: ConversationFilter }) {
  const query = new URLSearchParams()
  const keyword = params.query.trim()

  if (keyword) {
    query.set('q', keyword)
  }

  if (params.filter !== 'all') {
    query.set('filter', params.filter)
  }

  const queryString = query.toString()

  return queryString ? `${path}?${queryString}` : path
}

export function useChatAppController({ currentUser, onLogout }: ChatAppProps) {
  const initialRoute = readAppRouteFromLocation()
  const initialChatQueryParams = readChatQueryParams()
  const { applyModerationToText, isFileBlocked } = useModerationSettings()
  const [activeView, setActiveView] = useState<AppView>(initialRoute.view)
  const [activeId, setActiveId] = useState(initialRoute.conversationId ?? '')
  const [query, setQuery] = useState(initialRoute.view === 'chat' ? initialChatQueryParams.query : '')
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>(
    initialRoute.view === 'chat' ? initialChatQueryParams.filter : 'all',
  )
  const [draft, setDraft] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [focusedMessageId, setFocusedMessageId] = useState('')

  useEffect(() => {
    keyManager.initializeKeysIfNeeded().catch(console.error)
  }, [])
  const [isSidebarOpen, setIsSidebarOpen] = useState(getInitialSidebarState)
  const [inboxWidth, setInboxWidth] = useState(getInitialInboxWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [isInboxOpen, setIsInboxOpen] = useState(
    () =>
      getInitialCompactLayoutState() &&
      initialRoute.view === 'chat' &&
      !initialRoute.conversationId,
  )
  const [isDetailOpen, setIsDetailOpen] = useState(false)
    const { t } = useTranslation('chatapp')

    const { conversations, isConversationsLoading, setConversations, archivedConversations, setArchivedConversations, friends, setFriends, friendRequests, setFriendRequests, notifications, setNotifications } = useChatData()

  const isLoading = isConversationsLoading

  const [profileContactToOpen, setProfileContactToOpen] = useState<ContactUser | null>(null)
  const [isProfileClosing, setIsProfileClosing] = useState(false)
  const [browserNotificationPermission, setBrowserNotificationPermission] =
    useState<BrowserNotificationPermission>(() => getBrowserNotificationPermission())
  const [membersByConversation, setMembersByConversation] = useState<Record<string, ConversationMember[]>>({})
  const [groupInviteTokensByConversation, setGroupInviteTokensByConversation] = useState<Record<string, string>>({})
  const [groupJoinRequestsByConversation, setGroupJoinRequestsByConversation] = useState<Record<string, GroupJoinRequest[]>>({})
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>({})
  const typingStopTimerRef = useRef<number | null>(null)
  const lastSentTypingRef = useRef<{ conversationId: string; isTyping: boolean } | null>(null)
  const lastAutoScrolledConversationIdRef = useRef('')
  const activeIdRef = useRef(activeId)
  const currentUserIdRef = useRef(currentUser?.id ?? '')
  const conversationsRef = useRef<Conversation[]>([])
  const locallyDisbandedConversationIdsRef = useRef(new Set<string>())
  const deliveredSyncKeysRef = useRef(new Set<string>())
  const notifiedNotificationIdsRef = useRef(new Set<string>())
  const recentBrowserNotificationKeysRef = useRef(new Set<string>())
  const hasSyncedWebPushRef = useRef(false)
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
    setPageErrorMessage('')

    const nextConversations = await fetchConversations()

    setConversations(nextConversations)

    return nextConversations
  }, [])

  const loadCallHistory = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      return []
    }

    const calls = await fetchConversationCalls(conversationId)

    return calls
  }, [])

  const pushToast = useCallback(
    (text: string, tone: 'info' | 'error' = 'error') => {
      if (tone === 'error') {
        toast.error(text)
      } else {
        toast.success(text)
      }
    },
    [],
  )
  useOfflineQueue({
    currentUserId: currentUser?.id,
    setMessagesByConversation,
    pushToast
  })

  const [messagePaginationByConversation, setMessagePaginationByConversation] = useState<Record<string, MessagePaginationState>>({})
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
          setConversations((current: Conversation[] = []) => {
            const withoutConversation = current.filter(
              (conversation) => conversation.id !== joinedConversation.id,
            )

            return [joinedConversation, ...withoutConversation]
          })
          setActiveId(joinedConversation.id)
        }

        window.history.replaceState(null, '', nextPath)
        pushToast(response.message || t('groupJoinReqSent'), 'info')
      })
      .catch((error) => {
        window.history.replaceState(null, '', toAppPath({ view: 'chat' }))
        pushToast(getErrorMessage(error, t('groupJoinReqErr')))
      })
  }, [pushToast])

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
    payload: { body?: string; url?: string; requireInteraction?: boolean; silent?: boolean } = {},
  ) {
    if (recentBrowserNotificationKeysRef.current.has(key)) {
      return
    }

    recentBrowserNotificationKeysRef.current.add(key)
    window.setTimeout(() => {
      recentBrowserNotificationKeysRef.current.delete(key)
    }, 4500)

    if (key.startsWith('call:')) {
      playCallRing()
      flashDocumentTitle(`(1) ${title}`)
    } else {
      playAlertSound()
      flashDocumentTitle(`(1) ${title}`)
    }

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
      requireInteraction: true,
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

  function markConversationNotificationsReadLocally(conversationId: string) {
    const readAt = new Date().toISOString()

    setNotifications((current: AppNotification[] = []) =>
      current.map((notification) =>
        notification.conversationId === conversationId && !notification.readAt
          ? {
            ...notification,
            readAt,
          }
          : notification,
      ),
    )
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
    touchPresence().catch(() => undefined)

    const presenceTimer = window.setInterval(() => {
      touchPresence().catch(() => undefined)
    }, 60_000)

    return () => {
      window.clearInterval(presenceTimer)
    }
  }, [])



  useChatRealtime({
    activeIdRef,
    currentUserIdRef,
    conversationsRef,
    locallyDisbandedConversationIdsRef,
    setConversations,
    setMessagesByConversation,
    setMessagePaginationByConversation,
    setMembersByConversation,
    setActiveId,
    setIsDetailOpen,
    setShouldAutoScrollToLatest,
    pushToast,
    setFriends,
    setFriendRequests,
    setNotifications,
    setActiveCall,
    loadCallHistory,
    syncDeliveredReceipts,
    notifyConversationUpdate,
    notifyAppNotifications,
    showDedupedBrowserNotification,
  })

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
    localStorage.setItem(INBOX_WIDTH_KEY, String(inboxWidth))
  }, [isSidebarOpen, inboxWidth])

  const handleResizerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = inboxWidth
    setIsResizing(true)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      let newWidth = startWidth + deltaX

      if (newWidth < 350) {
        newWidth = 350
      } else if (newWidth > 600) {
        newWidth = 600
      }

      setInboxWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }



  useEffect(() => {
    if (activeView !== 'chat') {
      setIsInboxOpen(false)
      return
    }

    if (!activeId) {
      setIsInboxOpen(true)
    }
  }, [activeId, activeView])

  useEffect(() => {
    function handleLocationChange() {
      const route = readAppRouteFromLocation()
      const params = readChatQueryParams()

      setActiveView(route.view)
      setActiveId(route.conversationId ?? '')
      setQuery(route.view === 'chat' ? params.query : '')
      setConversationFilter(route.view === 'chat' ? params.filter : 'all')
      setIsInboxOpen(
        route.view === 'chat' && !route.conversationId,
      )
    }

    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hashchange', handleLocationChange)

    return () => {
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hashchange', handleLocationChange)
    }
  }, [])

  useEffect(() => {
    if (activeView !== 'chat') {
      return
    }

    const nextPath = appendChatQueryParams(
      toAppPath({ view: 'chat', conversationId: activeId || undefined }),
      { filter: conversationFilter, query },
    )
    const currentPath = `${window.location.pathname}${window.location.search}`

    if (currentPath !== nextPath) {
      window.history.replaceState(null, '', nextPath)
    }
  }, [activeId, activeView, conversationFilter, query])

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

    const nextPath = appendChatQueryParams(
      toAppPath({ view: 'chat', conversationId: nextConversationId }),
      { filter: conversationFilter, query },
    )

    if (`${window.location.pathname}${window.location.search}` !== nextPath) {
      window.history.replaceState(null, '', nextPath)
    }
  }, [activeId, activeView, conversationFilter, conversations, query])

  useEffect(() => {
    if (!activeId || messagePaginationByConversation[activeId]) {
      return
    }

    let isMounted = true

    async function loadMessages() {
      try {
        const messagePage = await fetchMessagesPage(activeId, { limit: MESSAGE_PAGE_LIMIT })

        if (isMounted) {
          const queued = await getQueuedMessagesForUser(currentUserIdRef.current)
          const queuedMessages = queued
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

          if (messagePage.messages.some((message: any) => message.author === 'them')) {
            syncDeliveredReceipts(activeId).catch(() => undefined)
          }
        }
      } catch (error) {
        if (isMounted) {
          setPageErrorMessage(error instanceof Error ? error.message : t('loadMessagesErr'))
        }
      }
    }

    loadMessages()

    return () => {
      isMounted = false
    }
  }, [activeId, messagePaginationByConversation, syncDeliveredReceipts])

  let activeConversation = conversations.find((conversation) => conversation.id === activeId)
  if (activeConversation) {
    try {
      const savedOverride = localStorage.getItem(`bg-override-${activeConversation.id}`)
      const knownBackend = localStorage.getItem(`bg-known-backend-${activeConversation.id}`)
      const currentBackendBg = activeConversation.backgroundImage || ''

      if (knownBackend !== null && currentBackendBg !== knownBackend && currentBackendBg !== savedOverride) {
        localStorage.removeItem(`bg-override-${activeConversation.id}`)
        localStorage.removeItem(`bg-known-backend-${activeConversation.id}`)
      } else if (savedOverride !== null) {
        activeConversation = { ...activeConversation, backgroundImage: savedOverride === 'null' ? null : savedOverride }
      }
    } catch (e) { }
  }
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
          setPageErrorMessage(error instanceof Error ? error.message : t('loadMembersErr'))
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
      pushToast(getErrorMessage(error, t('loadCallHistoryErr')))
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
        setConversations((current: Conversation[] = []) =>
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
        markConversationNotificationsReadLocally(activeId)
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
        return conversation.unread > 0 && conversation.messageRequestStatus !== 'pending' && !conversation.restricted
      }

      if (conversationFilter === 'requests') {
        return conversation.messageRequestStatus === 'pending' || conversation.restricted
      }

      if (conversationFilter === 'group') {
        return conversation.type === 'group' && conversation.messageRequestStatus !== 'pending' && !conversation.restricted
      }

      return conversation.messageRequestStatus !== 'pending' && !conversation.restricted
    })

    const sortedByType = [
      ...filteredByType.filter((c: Conversation) => c.pinned),
      ...filteredByType.filter((c: Conversation) => !c.pinned),
    ]

    if (!keyword) {
      return sortedByType
    }

    return sortedByType.filter((conversation) =>
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
      setErrorMessage(error instanceof Error ? error.message : t('loadNewConversationErr'))
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

      showBrowserNotification(t('browserNotificationTitle'), {
        body: t('browserNotificationBody'),
        tag: 'browser-notifications-enabled',
        url: toAppPath({ view: 'notifications' }),
      })

      if (!pushResult.enabled && pushResult.reason === 'missing-vapid') {
        pushToast(t('pushMissingVapid'))
      }

      if (!pushResult.enabled && pushResult.reason === 'register-failed') {
        pushToast(t('pushRegisterFailed'))
      }

      return
    }

    if (permission === 'denied') {
      pushToast(t('browserNotificationDenied'))
    }
  }

  function handleChangeView(view: AppView) {
    setActiveView(view)

    if (view === 'notifications') {
      const readAt = new Date().toISOString()
      setNotifications((current: AppNotification[] = []) =>
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
    setIsProfileClosing(false)
  }

  function closeContactProfile() {
    setIsProfileClosing(true)
    window.setTimeout(() => {
      setProfileContactToOpen(null)
      setIsProfileClosing(false)
    }, 140)
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
    setConversations((current: Conversation[] = []) =>
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
    markConversationNotificationsReadLocally(conversationId)
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
      setNotifications((current: AppNotification[] = []) =>
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

  function handleOpenPinnedMessage(messageId: string) {
    setActiveView('chat')
    handleJumpToMessage(messageId).catch(() => {
      setFocusedMessageId('')
      window.requestAnimationFrame(() => {
        setFocusedMessageId(messageId)
      })
    })
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
      setErrorMessage(error instanceof Error ? error.message : t('startCallErr'))
    }
  }

  function handleLogout() {
    disconnectRealtimeSocket()
    onLogout()
  }


      const {
        handleUpdateGroup,
        handleAddMember,
        handleRemoveMember,
        handleUpdateMemberNickname,
        handleUpdateMemberRole,
        handleTransferOwner,
        handleCopyGroupInviteLink,
        handleResetGroupInviteLink,
        handleReviewGroupJoinRequest,
        handleLeaveGroup,
        handleDisbandGroup,
      } = useGroupManagement({
        activeConversation,
        activeGroupInviteToken,
        busyConversationAction,
        conversations,
        locallyDisbandedConversationIdsRef,
        t,
        pushToast,
        setBusyConversationAction,
        setConfirmDialog,
        setConversations,
        setMembersByConversation,
        setMessagesByConversation,
        setMessagePaginationByConversation,
        setGroupInviteTokensByConversation,
        setGroupJoinRequestsByConversation,
        setActiveId,
        setIsDetailOpen,
      });

      const {
        handleDeleteConversation,
        handleRestoreConversation,
        handleArchiveConversation,
        handleStartDirectMessage,
        handleTogglePinConversation,
        handleToggleMuted,
        handleToggleBlocked,
        handleCreateGroup,
        handleUpdateContactNickname,
        handleTogglePinned,
        handleUpdateBackground,
        handleUpdateQuickEmoji,
      } = useConversationActions({
        activeConversation,
        activeId,
        archivedConversations,
        busyConversationAction,
        conversations,
        isCreatingGroup,
        t,
        pushToast,
        setActiveId,
        setActiveView,
        setArchivedConversations,
        setBusyConversationAction,
        setConfirmDialog,
        setConversations,
        setConversationFilter,
        setIsCreatingGroup,
        setIsDetailOpen,
        setFriends,
        setMembersByConversation,
        setMessagesByConversation,
        setMessagePaginationByConversation,
        setDraft,
        handleSelectConversation,
      });

      const { handleDeleteMessage, handleRecallMessage, handleEditMessage, handleForwardMessage, handleReportMessage, handleSendGif, handleToggleMessagePin, handleRemoveMessageReaction, handleRetryMessage, handleLoadOlderMessages, handleSendQuickMessage, handleSendPoll, handleVotePoll, handleToggleMessageReaction, handleUploadAttachment, handleSearchMessages, handleJumpToMessage, handleSendSticker, sendActiveConversationMessage } = useChatMessageActions({
        activeConversation,
        activeId,
        activeMessagePagination,
        busyMessageId,
        currentUser,
        currentUserIdRef,
        isUploadingAttachment,
        lastSentTypingRef,
        membersByConversation,
        messagesByConversation,
        replyingTo,
        typingStopTimerRef,
        t,
        applyModerationToText,
        isFileBlocked,
        pushToast,
        setBusyMessageId,
        setConversations,
        setDraft,
        setFocusedMessageId,
        setIsSending,
        setIsUploadingAttachment,
        setMessagesByConversation,
        setMessagePaginationByConversation,
        setReplyingTo,
        setShouldAutoScrollToLatest,
      });

  return {
    filteredConversations,
    activeView, setActiveView, activeId, setActiveId, query, setQuery, conversationFilter, setConversationFilter,
    draft, setDraft, replyingTo, setReplyingTo, focusedMessageId, setFocusedMessageId,
    isSidebarOpen, setIsSidebarOpen, inboxWidth, setInboxWidth, isResizing, setIsResizing, isInboxOpen, setIsInboxOpen, isDetailOpen, setIsDetailOpen,
    conversations, isConversationsLoading, setConversations, archivedConversations, setArchivedConversations, friends, setFriends, friendRequests, setFriendRequests, notifications, setNotifications,
    profileContactToOpen, setProfileContactToOpen, isProfileClosing, setIsProfileClosing, browserNotificationPermission, setBrowserNotificationPermission,
    membersByConversation, groupInviteTokensByConversation, groupJoinRequestsByConversation, messagesByConversation,
    messagePaginationByConversation, isSending, isCreatingGroup, setIsCreatingGroup, isUploadingAttachment, busyMessageId, busyConversationAction, confirmDialog, setConfirmDialog, isConfirming,
    readSyncKey, pageErrorMessage, typingByConversation, activeCall, setActiveCall, shouldAutoScrollToLatest, setShouldAutoScrollToLatest,
    activeConversation, messages, activeMessagePagination, hasOlderMessages, isLoadingOlderMessages, pinnedMessages, activeMembers, activeGroupInviteToken, activeGroupJoinRequests, activeMemberRole, canManageActiveGroup,
    isLoading, notificationBadgeCount,
    handleAcceptedFriend, handleEnableBrowserNotifications, handleChangeView, handleOpenContacts, handleOpenActiveContactProfile, closeContactProfile, handleSelectConversation, handleOpenNotification, handleDraftChange, handleSubmit, handleConfirmDialog, handleOpenPinnedMessage, handleStartCall, handleLogout, handleResizerMouseDown, pushToast,
    // Returned from useGroupManagement
    handleUpdateGroup, handleAddMember, handleRemoveMember, handleUpdateMemberNickname, handleUpdateMemberRole, handleTransferOwner, handleCopyGroupInviteLink, handleResetGroupInviteLink, handleReviewGroupJoinRequest, handleLeaveGroup, handleDisbandGroup,
    // Returned from useConversationActions
    handleDeleteConversation, handleRestoreConversation, handleArchiveConversation, handleStartDirectMessage, handleTogglePinConversation, handleToggleMuted, handleToggleBlocked, handleCreateGroup, handleUpdateContactNickname, handleTogglePinned, handleUpdateBackground, handleUpdateQuickEmoji,
    // Returned from useChatMessageActions
    handleDeleteMessage, handleRecallMessage, handleEditMessage, handleForwardMessage, handleReportMessage, handleSendGif, handleToggleMessagePin, handleRemoveMessageReaction, handleRetryMessage, handleLoadOlderMessages, handleSendQuickMessage, handleSendPoll, handleVotePoll, handleToggleMessageReaction, handleUploadAttachment, handleSearchMessages, handleJumpToMessage, handleSendSticker, sendActiveConversationMessage,
    t
  }
}
