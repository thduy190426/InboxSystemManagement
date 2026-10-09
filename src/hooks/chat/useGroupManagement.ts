import {
  addGroupMember,
  removeGroupMember,
  updateGroupMemberNickname,
  updateGroupMemberRole,
  transferGroupOwner,
  fetchGroupInvite,
  resetGroupInvite,
  reviewGroupJoinRequest,
  fetchGroupJoinRequests,
  leaveGroupConversation,
  disbandGroupConversation,
  updateGroupConversation,
  fetchConversations,
  fetchConversationMembers,
  fetchMessagesPage,
} from '../../services/api/chatApi'
import { toAppPath } from '../../services/core/appRoutes'
import type { Conversation } from '../../types'
import type { ConfirmDialogState } from '../../components/ui/ConfirmDialog'
import { mergeLatestMessages, MESSAGE_PAGE_LIMIT } from '../../services/core/offlineQueue'

interface UseGroupManagementProps {
  activeConversation?: Conversation
  activeGroupInviteToken?: string
  busyConversationAction: string
  conversations: Conversation[]
  locallyDisbandedConversationIdsRef: React.MutableRefObject<Set<string>>
  t: any
  pushToast: (text: string, tone?: 'info' | 'error') => void
  setBusyConversationAction: (action: string) => void
  setConfirmDialog: (dialog: ConfirmDialogState | null) => void
  setConversations: (updater: any) => void
  setMembersByConversation: (updater: any) => void
  setMessagesByConversation: (updater: any) => void
  setMessagePaginationByConversation: (updater: any) => void
  setGroupInviteTokensByConversation: (updater: any) => void
  setGroupJoinRequestsByConversation: (updater: any) => void
  setActiveId: (id: string) => void
  setIsDetailOpen: (isOpen: boolean) => void
}

export function useGroupManagement({
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
}: UseGroupManagementProps) {
  function getErrorMessage(error: unknown, fallbackMessage: string) {
    return error instanceof Error ? error.message : fallbackMessage
  }

  function setErrorMessage(message: string) {
    if (message) {
      pushToast(message)
    }
  }

  async function refreshActiveGroup(conversationId: string) {
    const [nextConversations, nextMembers, nextMessagePage] = await Promise.all([
      fetchConversations(),
      fetchConversationMembers(conversationId),
      fetchMessagesPage(conversationId, { limit: MESSAGE_PAGE_LIMIT }),
    ])

    setConversations(nextConversations)
    setMembersByConversation((current: any) => ({
      ...current,
      [conversationId]: nextMembers,
    }))
    setMessagesByConversation((current: any) => ({
      ...current,
      [conversationId]: mergeLatestMessages(current[conversationId] ?? [], nextMessagePage.messages),
    }))
    setMessagePaginationByConversation((current: any) => ({
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

      setConversations((current: Conversation[] = []) =>
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
      pushToast(getErrorMessage(error, t('updateGroupErr')))
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

      setMembersByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: members,
      }))
      await refreshActiveGroup(activeConversation.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('addMemberErr')))
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    setConfirmDialog({
      title: t('removeMemberTitle'),
      description: t('removeMemberDesc'),
      confirmLabel: t('removeMemberBtn'),
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

      setMembersByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: members,
      }))
      await refreshActiveGroup(activeConversation.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('removeMemberErr')))
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

      setMembersByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: members,
      }))
      await refreshActiveGroup(activeConversation.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('nicknameErr')))
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

      setMembersByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: members,
      }))
      await refreshActiveGroup(activeConversation.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('roleUpdateErr')))
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleTransferOwner(userId: string) {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    setConfirmDialog({
      title: t('transferOwnerTitle'),
      description: t('transferOwnerDesc'),
      confirmLabel: t('transferOwnerBtn'),
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

      setMembersByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: members,
      }))
      await refreshActiveGroup(activeConversation.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('transferOwnerErr')))
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

      setGroupInviteTokensByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: token,
      }))
      await navigator.clipboard.writeText(inviteUrl)
      pushToast(t('copiedNewLink'), 'info')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('copyNewLinkErr')))
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

      setGroupInviteTokensByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: token,
      }))
      pushToast(t('createLinkSuccess'), 'info')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('createLinkErr')))
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

      setMembersByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: members,
      }))
      setGroupJoinRequestsByConversation((current: any) => ({
        ...current,
        [activeConversation.id]: requests,
      }))
      await refreshActiveGroup(activeConversation.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('approveJoinErr')))
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleLeaveGroup() {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    setConfirmDialog({
      title: t('leaveGroupTitle'),
      description: t('leaveGroupDesc'),
      confirmLabel: t('leaveGroupBtn'),
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
      setMessagesByConversation((current: any) => {
        const next = { ...current }
        delete next[activeConversation.id]
        return next
      })
      setMessagePaginationByConversation((current: any) => {
        const next = { ...current }
        delete next[activeConversation.id]
        return next
      })
      setMembersByConversation((current: any) => {
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
      setErrorMessage(getErrorMessage(error, t('leaveGroupErr')))
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleDisbandGroup() {
    if (!activeConversation || activeConversation.type !== 'group' || busyConversationAction) {
      return
    }

    setConfirmDialog({
      title: t('disbandGroupTitle'),
      description: t('disbandGroupDesc'),
      confirmLabel: t('disbandGroupBtn'),
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
      setMessagesByConversation((current: any) => {
        const next = { ...current }
        delete next[activeConversation.id]
        return next
      })
      setMessagePaginationByConversation((current: any) => {
        const next = { ...current }
        delete next[activeConversation.id]
        return next
      })
      setMembersByConversation((current: any) => {
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
      setErrorMessage(getErrorMessage(error, t('disbandGroupErr')))
    } finally {
      setBusyConversationAction('')
    }
  }

  return {
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
  }
}
