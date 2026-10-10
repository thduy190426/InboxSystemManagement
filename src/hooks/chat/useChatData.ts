import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Conversation, ContactUser, AppNotification } from '../../types'
import { fetchConversations } from '../../services/api/chatApi'
import { fetchFriends, fetchIncomingRequests } from '../../services/api/contactApi'
import { fetchNotifications } from '../../services/api/notificationApi'

export function useChatData() {
  const queryClient = useQueryClient()

  const { data: conversations = [], isLoading: isConversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => fetchConversations(),
    refetchInterval: 30000,
  })

  const setConversations = useCallback(
    (updater: React.SetStateAction<any>) => {
      queryClient.setQueryData(['conversations'], updater)
    },
    [queryClient]
  )

  const { data: archivedConversations = [] } = useQuery<Conversation[]>({
    queryKey: ['archivedConversations'],
    queryFn: () => fetchConversations({ archived: true }),
  })

  const setArchivedConversations = useCallback(
    (updater: React.SetStateAction<any>) => {
      queryClient.setQueryData(['archivedConversations'], updater)
    },
    [queryClient]
  )

  const { data: friends = [] } = useQuery<ContactUser[]>({
    queryKey: ['friends'],
    queryFn: () => fetchFriends(),
  })

  const setFriends = useCallback(
    (updater: React.SetStateAction<any>) => {
      queryClient.setQueryData(['friends'], updater)
    },
    [queryClient]
  )

  const { data: friendRequests = [] } = useQuery<ContactUser[]>({
    queryKey: ['friendRequests'],
    queryFn: () => fetchIncomingRequests(),
  })

  const setFriendRequests = useCallback(
    (updater: React.SetStateAction<any>) => {
      queryClient.setQueryData(['friendRequests'], updater)
    },
    [queryClient]
  )

  const { data: notifications = [] } = useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(),
    refetchInterval: 60000,
  })

  const setNotifications = useCallback(
    (updater: React.SetStateAction<any>) => {
      queryClient.setQueryData(['notifications'], updater)
    },
    [queryClient]
  )

  return {
    conversations,
    isConversationsLoading,
    setConversations,
    archivedConversations,
    setArchivedConversations,
    friends,
    setFriends,
    friendRequests,
    setFriendRequests,
    notifications,
    setNotifications,
  }
}
