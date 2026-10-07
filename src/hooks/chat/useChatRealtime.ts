import { useEffect } from 'react'
import { getRealtimeSocket } from '../../services/realtime/realtime'
import { fetchConversations, fetchMessagesPage, fetchConversationMembers } from '../../services/api/chatApi'
import { mergeLatestMessages } from '../../services/core/offlineQueue'
import { fetchFriends, fetchIncomingRequests } from '../../services/api/contactApi'
import { fetchNotifications } from '../../services/api/notificationApi'
import { toAppPath } from '../../services/core/appRoutes'
import type { Conversation, ConversationMember, ContactUser, AppNotification, CallSession, Message } from '../../types'
import type { CallSignalPayload } from '../../services/realtime/callRealtime'
import { MESSAGE_PAGE_LIMIT } from '../../services/core/offlineQueue'

export type UseChatRealtimeProps = {
  activeIdRef: React.MutableRefObject<string>
  currentUserIdRef: React.MutableRefObject<string | undefined>
  conversationsRef: React.MutableRefObject<Conversation[]>
  locallyDisbandedConversationIdsRef: React.MutableRefObject<Set<string>>
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>
  setMessagesByConversation: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>
  setMessagePaginationByConversation: React.Dispatch<React.SetStateAction<Record<string, { hasMore: boolean; isLoadingOlder: boolean; nextCursor: string | null }>>>
  setMembersByConversation: React.Dispatch<React.SetStateAction<Record<string, ConversationMember[]>>>
  setActiveId: (id: string) => void
  setIsDetailOpen: (isOpen: boolean) => void
  setShouldAutoScrollToLatest: (scroll: boolean) => void
  pushToast: (message: string) => void
  setFriends: React.Dispatch<React.SetStateAction<ContactUser[]>>
  setFriendRequests: React.Dispatch<React.SetStateAction<ContactUser[]>>
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>
  setActiveCall: React.Dispatch<React.SetStateAction<CallSession | null>>
  loadCallHistory: (conversationId: string) => Promise<any>
  syncDeliveredReceipts: (conversationId: string) => Promise<void>
  notifyConversationUpdate: (conversationId: string, nextConversations: Conversation[]) => void
  notifyAppNotifications: (nextNotifications: AppNotification[]) => void
  showDedupedBrowserNotification: (key: string, title: string, options?: any) => void
}

export function useChatRealtime({
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
}: UseChatRealtimeProps) {
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

      const members = await fetchConversationMembers(conversationId)

      setMembersByConversation((current) => ({
        ...current,
        [conversationId]: members,
      }))
    }

    function removeConversationLocally(conversationId: string) {
      setConversations((current: Conversation[] = []) => {
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

      if (
        conversationId === activeIdRef.current &&
        (payload.eventType === 'message:created' || payload.eventType === 'message:forwarded')
      ) {
        setShouldAutoScrollToLatest(true)
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
  }, [
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
  ])
}
