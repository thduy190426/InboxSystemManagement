import { useTranslation } from 'react-i18next'
import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'

import type { ConversationMember, Message } from '../../types'



import type { DetailPanelProps } from '../../components/panels/DetailPanel'

export function useDetailPanelController(props: DetailPanelProps) {
  const {
    activeConversation,
    currentUserId = '',
    friends,
    members,
    onAddMember,
    onUpdateContactNickname,
    onUpdateGroup,
    onUpdateMemberNickname,
    onClose
  } = props

  const { t } = useTranslation('panels')
  const [groupTitle, setGroupTitle] = useState(activeConversation.name)
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null)

  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null)
  const [isSwiping, setIsSwiping] = useState(false)

  function handleTouchStart(e: React.TouchEvent) {
    if (window.innerWidth <= 1180) {
      setTouchStartX(e.targetTouches[0].clientX)
      setTouchStartY(e.targetTouches[0].clientY)
      setTouchCurrentX(e.targetTouches[0].clientX)
      setIsSwiping(false)
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX !== null && touchStartY !== null) {
      const currentX = e.targetTouches[0].clientX
      const currentY = e.targetTouches[0].clientY
      const diffX = currentX - touchStartX
      const diffY = currentY - touchStartY

      if (!isSwiping) {
        if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
          setIsSwiping(true)
          setTouchCurrentX(currentX)
        } else if (Math.abs(diffY) > 10) {
          setTouchStartX(null)
          setTouchStartY(null)
        }
      } else {
        setTouchCurrentX(currentX)
      }
    }
  }

  function handleTouchEnd() {
    if (isSwiping && touchStartX !== null && touchCurrentX !== null) {
      const diffX = touchCurrentX - touchStartX
      if (diffX > 60) {
        onClose?.()
      }
    }
    setTouchStartX(null)
    setTouchStartY(null)
    setTouchCurrentX(null)
    setIsSwiping(false)
  }

  const swipeOffset = isSwiping && touchStartX !== null && touchCurrentX !== null ? Math.max(0, touchCurrentX - touchStartX) : 0
  const swipeStyle = isSwiping && window.innerWidth <= 1180
    ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' }
    : undefined
  const [directNickname, setDirectNickname] = useState(activeConversation.nickname || '')
  const [memberNicknames, setMemberNicknames] = useState<Record<string, string>>({})
  const [selectedFriendId, setSelectedFriendId] = useState('')
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false)
  const [isMembersModalClosing, setIsMembersModalClosing] = useState(false)
  const [actionMenuMemberId, setActionMenuMemberId] = useState<string | null>(null)
  const [editingNicknameId, setEditingNicknameId] = useState<string | null>(null)
  
  const [isRestrictedModalOpen, setIsRestrictedModalOpen] = useState(false)
  const [isRestrictedModalClosing, setIsRestrictedModalClosing] = useState(false)

  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false)
  const [isEditGroupModalClosing, setIsEditGroupModalClosing] = useState(false)

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [isAddMemberModalClosing, setIsAddMemberModalClosing] = useState(false)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [attachmentTab, setAttachmentTab] = useState<'image' | 'file' | 'link'>('image')

  const MEMBER_PREVIEW_COUNT = 0

  function openMembersModal() {
    setIsMembersModalClosing(false)
    setIsMembersModalOpen(true)
  }

  function closeMembersModal() {
    setIsMembersModalClosing(true)
    setTimeout(() => {
      setIsMembersModalOpen(false)
      setIsMembersModalClosing(false)
    }, 140)
  }

  function openEditGroupModal() {
    setGroupTitle(activeConversation.name)
    setGroupAvatar(null)
    setIsEditGroupModalClosing(false)
    setIsEditGroupModalOpen(true)
  }

  function closeEditGroupModal() {
    setIsEditGroupModalClosing(true)
    setTimeout(() => {
      setIsEditGroupModalOpen(false)
      setIsEditGroupModalClosing(false)
    }, 140)
  }

  function openAddMemberModal() {
    setSelectedFriendId('')
    setIsAddMemberModalClosing(false)
    setIsAddMemberModalOpen(true)
  }

  function closeAddMemberModal() {
    setIsAddMemberModalClosing(true)
    setTimeout(() => {
      setIsAddMemberModalOpen(false)
      setIsAddMemberModalClosing(false)
    }, 140)
  }

  function openRestrictedModal() {
    setIsRestrictedModalClosing(false)
    setIsRestrictedModalOpen(true)
  }

  function closeRestrictedModal() {
    setIsRestrictedModalClosing(true)
    setTimeout(() => {
      setIsRestrictedModalOpen(false)
      setIsRestrictedModalClosing(false)
    }, 140)
  }

  const isGroup = activeConversation.type === 'group'
  const currentMember = members.find((member) => member.id === currentUserId)
  const isGroupOwner = currentMember?.role === 'owner'
  const canManageGroup = currentMember?.role === 'owner' || currentMember?.role === 'admin'
  const memberIds = useMemo(() => new Set(members.map((member) => member.id)), [members])
  const addableFriends = friends.filter((friend) => !memberIds.has(friend.id))

  const validAttachments = useMemo(() => {
    return (activeConversation.attachments || []).filter((attachment) => {
      const nameLower = attachment.name.toLowerCase()
      return !nameLower.includes('gif') && !nameLower.includes('emoji') && !nameLower.includes('sticker')
    })
  }, [activeConversation.attachments])

  const imageAttachments = validAttachments.filter(a => a.type === 'image' || a.type === 'video')
  const fileAttachments = validAttachments.filter(a => a.type === 'file' || a.type === 'audio')
  const linkAttachments = validAttachments.filter(a => a.type === 'link')

  const currentTabAttachments = useMemo(() => {
    if (attachmentTab === 'image') return imageAttachments
    if (attachmentTab === 'file') return fileAttachments
    return linkAttachments
  }, [attachmentTab, imageAttachments, fileAttachments, linkAttachments])

  useEffect(() => {
    setGroupTitle(activeConversation.name)
    setGroupAvatar(null)
    setDirectNickname(activeConversation.nickname || '')
    setSelectedFriendId('')
  }, [activeConversation.id, activeConversation.name, activeConversation.nickname])

  useEffect(() => {
    setMemberNicknames(
      members.reduce<Record<string, string>>((result, member) => {
        result[member.id] = member.nickname || ''
        return result
      }, {}),
    )
  }, [members])

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    setGroupAvatar(event.target.files?.[0] ?? null)
  }

  async function handleGroupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = groupTitle.trim()

    if (!title && !groupAvatar) {
      return
    }

    await onUpdateGroup({
      title: title && title !== activeConversation.name ? title : undefined,
      avatar: groupAvatar,
    })
    closeEditGroupModal()
  }

  async function handleAddMember() {
    if (!selectedFriendId) {
      return
    }

    await onAddMember(selectedFriendId)
    closeAddMemberModal()
  }

  async function handleDirectNicknameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onUpdateContactNickname(directNickname)
  }

  async function handleMemberNicknameSubmit(
    event: FormEvent<HTMLFormElement>,
    memberId: string,
  ) {
    event.preventDefault()

    await onUpdateMemberNickname(memberId, memberNicknames[memberId] || '')
  }

  async function handleClearMemberNickname(memberId: string) {
    setMemberNicknames((current) => ({
      ...current,
      [memberId]: '',
    }))
    await onUpdateMemberNickname(memberId, '')
  }

  function getDisplayMessageText(text: string) {
    const withoutLeadingIcon = text.replace(/^\s*(📍|📌)\s*/, '')
    const normalized = withoutLeadingIcon.replace(/\s+/g, ' ').trim()

    const ipLocationMatch = normalized.match(/^Vị trí \(ước tính qua IP\):\s*(.+)$/i)
    if (ipLocationMatch) {
      return t('geoIpLocation', { url: ipLocationMatch[1] })
    }

    const currentLocationMatch = normalized.match(/^Vị trí hiện tại:\s*(.+)$/i)
    if (currentLocationMatch) {
      return t('geoCurrentLocation', { url: currentLocationMatch[1] })
    }

    const exactLocationMatch = normalized.match(/^Vị trí chính xác:\s*(.+)$/i)
    if (exactLocationMatch) {
      return t('geoExactLocation', { url: exactLocationMatch[1] })
    }

    if (normalized === 'Đã ghim một tin nhắn' || normalized === 'Pinned a message') {
      return `📌 ${t('msgPinned')}`
    }
    if (normalized === 'Đã bỏ ghim một tin nhắn' || normalized === 'Unpinned a message') {
      return `📌 ${t('msgUnpinned')}`
    }
    if (/^Đã từ chối!?$/i.test(normalized) || /^Declined!?$/i.test(normalized)) {
      return t('inboxDeclined')
    }

    return text.replace(/^\s*📍\s*/, '')
  }

  function getPinnedMessageText(message: Message) {
    if (message.text) {
      return getDisplayMessageText(message.text)
    }

    if (message.type === 'image') {
      return t('typeImage')
    }

    if (message.type === 'audio') {
      return t('typeVoice')
    }

    if (message.type === 'file') {
      return t('typeAttachment')
    }

    return t('typeMessage')
  }

  function getPinnedMessageAuthor(message: Message) {
    if (message.author === 'me') {
      return t('senderYou')
    }

    if (message.author === 'system') {
      return t('callTitle')
    }

    return message.senderName || activeConversation.name
  }

  function getRoleLabel(role: ConversationMember['role']) {
    if (role === 'owner') {
      return t('roleOwner')
    }

    if (role === 'admin') {
      return t('roleAdmin')
    }

    if (role === 'moderator') {
      return t('roleModerator')
    }

    return t('roleMember')
  }

  function getConversationRoleLabel(role: string | null | undefined) {
    const normalizedRole = String(role || '').trim().toLocaleLowerCase('vi-VN')

    if (['owner', 'chủ sở hữu', 'người sáng lập'].includes(normalizedRole)) {
      return t('roleOwner')
    }

    if (['admin', 'administrator', 'quản trị', 'quản trị viên'].includes(normalizedRole)) {
      return t('roleAdmin')
    }

    if (['moderator', 'người kiểm duyệt', 'kiểm duyệt viên'].includes(normalizedRole)) {
      return t('roleModerator')
    }

    if (['member', 'user', 'thành viên', 'người dùng'].includes(normalizedRole)) {
      return t('roleMember')
    }

    return role || t('roleMember')
  }

  return {
    MEMBER_PREVIEW_COUNT,
    actionMenuMemberId,
    addableFriends,
    attachmentTab,
    canManageGroup,
    closeAddMemberModal,
    closeEditGroupModal,
    closeMembersModal,
    closeRestrictedModal,
    currentMember,
    currentTabAttachments,
    directNickname,
    editingNicknameId,
    fileAttachments,
    getConversationRoleLabel,
    getDisplayMessageText,
    getPinnedMessageAuthor,
    getPinnedMessageText,
    getRoleLabel,
    groupAvatar,
    groupTitle,
    handleAddMember,
    handleAvatarChange,
    handleClearMemberNickname,
    handleDirectNicknameSubmit,
    handleGroupSubmit,
    handleMemberNicknameSubmit,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    imageAttachments,
    isAddMemberModalClosing,
    isAddMemberModalOpen,
    isEditGroupModalClosing,
    isEditGroupModalOpen,
    isEmojiPickerOpen,
    isGroup,
    isGroupOwner,
    isMembersModalClosing,
    isMembersModalOpen,
    isRestrictedModalClosing,
    isRestrictedModalOpen,
    isSwiping,
    linkAttachments,
    memberIds,
    memberNicknames,
    openAddMemberModal,
    openEditGroupModal,
    openMembersModal,
    openRestrictedModal,
    selectedFriendId,
    setActionMenuMemberId,
    setAttachmentTab,
    setDirectNickname,
    setEditingNicknameId,
    setGroupAvatar,
    setGroupTitle,
    setIsAddMemberModalClosing,
    setIsAddMemberModalOpen,
    setIsEditGroupModalClosing,
    setIsEditGroupModalOpen,
    setIsEmojiPickerOpen,
    setIsMembersModalClosing,
    setIsMembersModalOpen,
    setIsRestrictedModalClosing,
    setIsRestrictedModalOpen,
    setIsSwiping,
    setMemberNicknames,
    setSelectedFriendId,
    setTouchCurrentX,
    setTouchStartX,
    setTouchStartY,
    swipeOffset,
    swipeStyle,
    t,
    touchCurrentX,
    touchStartX,
    touchStartY,
    validAttachments
  }
}
