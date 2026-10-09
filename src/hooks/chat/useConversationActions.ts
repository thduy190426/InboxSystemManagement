import {
  updateConversationSettings,
  archiveConversation,
  hideConversation,
  unarchiveConversation,
  updateConversationBackground,
  updateConversationQuickEmoji,
  createGroupConversation,
  createDirectConversation,
  fetchConversations,
} from '../../services/api/chatApi'
import {
  blockContact,
  unblockContact,
  updateContactNickname,
  fetchFriends,
} from '../../services/api/contactApi'
import { toAppPath } from '../../services/core/appRoutes'
import type { Conversation, ContactUser } from '../../types'
import type { ConfirmDialogState } from '../../components/ui/ConfirmDialog'

interface UseConversationActionsProps {
  activeConversation?: Conversation
  activeId: string
  archivedConversations: Conversation[]
  busyConversationAction: string
  conversations: Conversation[]
  isCreatingGroup: boolean
  t: any
  pushToast: (text: string, tone?: 'info' | 'error') => void
  setActiveId: (id: string) => void
  setActiveView: (view: any) => void
  setArchivedConversations: (updater: any) => void
  setBusyConversationAction: (action: string) => void
  setConfirmDialog: (dialog: ConfirmDialogState | null) => void
  setConversations: (updater: any) => void
  setConversationFilter: React.Dispatch<React.SetStateAction<any>>
  setIsCreatingGroup: (isCreating: boolean) => void
  setIsDetailOpen: (isOpen: boolean) => void
  setFriends: (updater: any) => void
  setMembersByConversation: (updater: any) => void
  setMessagesByConversation: (updater: any) => void
  setMessagePaginationByConversation: (updater: any) => void
  setDraft: (draft: string) => void
  handleSelectConversation: (id: string) => void
}

export function useConversationActions({
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
}: UseConversationActionsProps) {
  function getErrorMessage(error: unknown, fallbackMessage: string) {
    return error instanceof Error ? error.message : fallbackMessage
  }

  function setErrorMessage(message: string) {
    if (message) {
      pushToast(message)
    }
  }

  async function handleUpdateBackground(payload: { backgroundImage?: File | null; removeBackground?: boolean }) {
    if (!activeConversation || busyConversationAction) return

    try {
      setBusyConversationAction('background')
      const updatedConversation = await updateConversationBackground(activeConversation.id, payload)

      try {
        const newUrl = updatedConversation.backgroundImage || 'null'
        const oldUrl = activeConversation.backgroundImage || ''
        localStorage.setItem(`bg-override-${activeConversation.id}`, newUrl)
        localStorage.setItem(`bg-known-backend-${activeConversation.id}`, oldUrl)
      } catch (e) { }

      setTimeout(() => {
        fetchConversations().then(setConversations).catch(() => undefined)
      }, 5000)

      setConversations((current: Conversation[] = []) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? { ...conversation, ...updatedConversation }
            : conversation,
        ),
      )
    } catch (error) {
      if (error instanceof Error) {
        pushToast(error.message, 'error')
      } else {
        pushToast(t('bgUpdateErr'), 'error')
      }
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleUpdateQuickEmoji(emoji: string) {
    if (!activeConversation || busyConversationAction) return
    try {
      setBusyConversationAction('emoji')
      const updatedConversation = await updateConversationQuickEmoji(activeConversation.id, emoji)
      
      setConversations((current: Conversation[] = []) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? { ...conversation, quickEmoji: updatedConversation?.quickEmoji || emoji }
            : conversation,
        ),
      )
    } catch (error) {
      pushToast(t('emojiUpdateErr'), 'error')
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleTogglePinned() {
    if (!activeConversation || busyConversationAction) return

    try {
      setBusyConversationAction('pin')
      setErrorMessage('')

      const updatedConversation = await updateConversationSettings(activeConversation.id, {
        pinned: !activeConversation.pinned,
      })

      setConversations((current: Conversation[] = []) =>
        current
          .map((conversation) =>
            conversation.id === activeConversation.id
              ? { ...conversation, pinned: updatedConversation.pinned }
              : conversation,
          )
          .sort((first: any, second: any) => Number(second.pinned) - Number(first.pinned)),
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('pinUpdateErr')))
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleToggleMuted() {
    if (!activeConversation || busyConversationAction) return

    try {
      setBusyConversationAction('mute')
      setErrorMessage('')

      const updatedConversation = await updateConversationSettings(activeConversation.id, {
        muted: !activeConversation.muted,
      })

      setConversations((current: Conversation[] = []) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? { ...conversation, muted: updatedConversation.muted }
            : conversation,
        ),
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('muteUpdateErr')))
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleArchiveConversation() {
    if (!activeConversation || busyConversationAction) return

    setConfirmDialog({
      title: t('archiveTitle'),
      description: t('archiveDesc', { name: activeConversation.name }),
      confirmLabel: t('archiveBtn'),
      tone: 'danger',
      onConfirm: archiveActiveConversation,
    })
  }

  async function archiveActiveConversation() {
    if (!activeConversation || busyConversationAction) return

    try {
      setBusyConversationAction('archive')
      setErrorMessage('')

      await archiveConversation(activeConversation.id)

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
      setActiveId(nextConversationId)

      if (nextConversationId) {
        window.history.replaceState(null, '', toAppPath({ view: 'chat', conversationId: nextConversationId }))
      } else {
        window.history.replaceState(null, '', toAppPath({ view: 'chat' }))
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('archiveErr')))
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleTogglePinConversation(conversationId: string, pinned: boolean) {
    if (busyConversationAction) return

    try {
      if (pinned) {
        const pinnedCount = conversations.filter((c: Conversation) => c.pinned).length
        if (pinnedCount >= 3) {
          pushToast(t('pinLimitErr'), 'error')
          return
        }
      }

      setBusyConversationAction('pin-conversation')
      setErrorMessage('')

      const updatedConversation = await updateConversationSettings(conversationId, { pinned })

      setConversations((current: Conversation[] = []) => {
        const next = current.map((c: Conversation) => (c.id === conversationId ? updatedConversation : c))
        return [...next.filter((c: Conversation) => c.pinned), ...next.filter((c: Conversation) => !c.pinned)]
      })

      pushToast(pinned ? t('pinSuccess') : t('unpinSuccess'), 'info')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('pinErr')))
    } finally {
      setBusyConversationAction('')
    }
  }

  function handleDeleteConversation(conversationId: string) {
    if (busyConversationAction) return

    const conversation =
      conversations.find((item) => item.id === conversationId) ||
      archivedConversations.find((item) => item.id === conversationId)

    setConfirmDialog({
      title: t('deleteTitle'),
      description: t('deleteDesc', { name: conversation?.name || t('thisConversation') }),
      confirmLabel: t('deleteBtn'),
      tone: 'danger',
      onConfirm: () => deleteConversationFromInbox(conversationId),
    })
  }

  async function deleteConversationFromInbox(conversationId: string) {
    if (busyConversationAction) return

    try {
      setBusyConversationAction('delete-conversation')
      setErrorMessage('')

      await hideConversation(conversationId)

      const nextConversations = conversations.filter((conversation) => conversation.id !== conversationId)
      const nextArchivedConversations = archivedConversations.filter((conversation) => conversation.id !== conversationId)
      const nextConversationId = activeId === conversationId ? nextConversations[0]?.id || '' : activeId

      setConversations(nextConversations)
      setArchivedConversations(nextArchivedConversations)
      setMessagesByConversation((current: any) => {
        const next = { ...current }
        delete next[conversationId]
        return next
      })
      setMessagePaginationByConversation((current: any) => {
        const next = { ...current }
        delete next[conversationId]
        return next
      })
      setMembersByConversation((current: any) => {
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

      pushToast(t('deleteSuccess'), 'info')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('deleteErr')))
    } finally {
      setBusyConversationAction('')
    }
  }

  function handleRestoreConversation(conversationId: string) {
    if (busyConversationAction) return

    const conversation = archivedConversations.find((item) => item.id === conversationId)

    setConfirmDialog({
      title: t('unarchiveTitle'),
      description: t('unarchiveDesc', { name: conversation?.name || t('thisConversation') }),
      confirmLabel: t('unarchiveBtn'),
      onConfirm: () => restoreArchivedConversation(conversationId),
    })
  }

  async function restoreArchivedConversation(conversationId: string) {
    if (busyConversationAction) return

    try {
      setBusyConversationAction('restore')
      setErrorMessage('')

      const restoredConversation = await unarchiveConversation(conversationId)
      const nextConversations = await fetchConversations()

      setArchivedConversations((current: Conversation[] = []) =>
        current.filter((conversation) => conversation.id !== conversationId),
      )
      setConversations(nextConversations)
      setConversationFilter('all')
      handleSelectConversation(restoredConversation.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('unarchiveErr')))
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleToggleBlocked() {
    if (!activeConversation || busyConversationAction || !activeConversation.contactId) return

    setConfirmDialog({
      title: activeConversation.blocked ? t('unblockTitle') : t('blockTitle'),
      description: activeConversation.blocked ? t('unblockDesc') : t('blockDesc'),
      confirmLabel: activeConversation.blocked ? t('unblockBtn') : t('blockBtn'),
      tone: activeConversation.blocked ? 'default' : 'danger',
      onConfirm: toggleActiveConversationBlocked,
    })
  }

  async function toggleActiveConversationBlocked() {
    if (!activeConversation || busyConversationAction || !activeConversation.contactId) return

    try {
      setBusyConversationAction('block')
      setErrorMessage('')

      const response = activeConversation.blocked
        ? await unblockContact(activeConversation.contactId)
        : await blockContact(activeConversation.contactId)
      const isBlocked = response.friendshipStatus === 'blocked'

      setConversations((current: Conversation[] = []) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
              ...conversation,
              blocked: isBlocked,
              friendshipStatus: response.friendshipStatus,
              status: isBlocked ? t('statusBlocked') : conversation.status,
            }
            : conversation,
        ),
      )

      if (isBlocked) {
        setDraft('')
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, t('blockErr')))
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleUpdateContactNickname(nickname: string) {
    if (!activeConversation || busyConversationAction || !activeConversation.contactId) return

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
      setErrorMessage(getErrorMessage(error, t('nicknameErr')))
    } finally {
      setBusyConversationAction('')
    }
  }

  async function handleCreateGroup(payload: {
    title: string
    memberIds: string[]
    avatar?: File | null
  }) {
    if (isCreatingGroup) return

    try {
      setIsCreatingGroup(true)

      const conversation = await createGroupConversation(payload)

      setConversations((current: Conversation[] = []) => [conversation, ...current])
      handleSelectConversation(conversation.id)
      setIsDetailOpen(true)
    } catch (error) {
      pushToast(getErrorMessage(error, t('createGroupErr')))
      throw error
    } finally {
      setIsCreatingGroup(false)
    }
  }

  async function handleStartDirectMessage(user: Pick<ContactUser, 'id' | 'fullName' | 'friendshipStatus' | 'contactId'>) {
    const conversation = await createDirectConversation(user.id)

    setConversations((current: Conversation[] = []) => [
      conversation,
      ...current.filter((item) => item.id !== conversation.id),
    ])
    setConversationFilter('all')
    setActiveView('chat')
    handleSelectConversation(conversation.id)
    pushToast(
      conversation.friendshipStatus === 'accepted'
        ? t('dmOpened')
        : t('dmOpenedHidden'),
      'info',
    )
  }

  return {
    handleUpdateBackground,
    handleUpdateQuickEmoji,
    handleTogglePinned,
    handleToggleMuted,
    handleArchiveConversation,
    handleTogglePinConversation,
    handleDeleteConversation,
    handleRestoreConversation,
    handleToggleBlocked,
    handleUpdateContactNickname,
    handleCreateGroup,
    handleStartDirectMessage,
  }
}
