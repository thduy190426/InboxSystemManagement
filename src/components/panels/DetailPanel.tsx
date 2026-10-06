import { useTranslation } from 'react-i18next'
import type { ChangeEvent, FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState, lazy, Suspense } from 'react'

const EmojiPicker = lazy(() => import('emoji-picker-react'))
import {
  Archive,
  Bell,
  BellOff,
  Check,
  Copy,
  FileText,
  Image,
  ImagePlus,
  LogOut,
  Pin,
  PinOff,
  Save,
  Shield,
  ShieldCheck,
  Smile,
  Trash2,
  UserCog,
  UserCheck,
  UserPlus,
  UserX,
  X,
  MoreHorizontal,
  Tag,
  Settings2,
  FolderOpen,
  EyeOff,
  Users,
} from 'lucide-react'
import type { ContactUser, Conversation, ConversationMember, GroupJoinRequest, Message } from '../../types'
import { AvatarFallback } from '../ui/AvatarFallback'
import { OnlineDurationBadge } from '../ui/OnlineDurationBadge'

type DetailPanelProps = {
  activeConversation: Conversation
  busyAction?: string
  currentUserId?: string
  friends: ContactUser[]
  groupInviteToken?: string
  isOpen: boolean
  joinRequests?: GroupJoinRequest[]
  members: ConversationMember[]
  pinnedMessages: Message[]
  restrictedContacts?: ContactUser[]
  onAddMember: (userId: string) => Promise<void> | void
  onArchive: () => void
  onCopyGroupInviteLink: () => Promise<void> | void
  onDisbandGroup: () => Promise<void> | void
  onLeaveGroup: () => Promise<void> | void
  onRemoveMember: (userId: string) => Promise<void> | void
  onOpenPinnedMessage: (messageId: string) => void
  onResetGroupInviteLink: () => Promise<void> | void
  onReviewGroupJoinRequest: (requestId: string, action: 'approve' | 'decline') => Promise<void> | void
  onToggleBlocked: () => void
  onToggleRestricted?: () => void
  onToggleMuted: () => void
  onTogglePinned: () => void
  onTransferOwner: (userId: string) => Promise<void> | void
  onUpdateContactNickname: (nickname: string) => Promise<void> | void
  onUpdateGroup: (payload: { title?: string; avatar?: File | null }) => Promise<void> | void
  onUpdateBackground?: (payload: { backgroundImage?: File | null; removeBackground?: boolean }) => Promise<void> | void
  onUpdateMemberNickname: (userId: string, nickname: string) => Promise<void> | void
  onUpdateMemberRole: (userId: string, role: 'admin' | 'member') => Promise<void> | void
  onUpdateQuickEmoji?: (emoji: string) => Promise<void> | void
  onClose?: () => void
}

export function DetailPanel({
  activeConversation,
  busyAction = '',
  currentUserId = '',
  friends,
  groupInviteToken = '',
  isOpen,
  joinRequests = [],
  members,
  pinnedMessages,
  restrictedContacts = [],
  onAddMember,
  onArchive,
  onCopyGroupInviteLink,
  onDisbandGroup,
  onLeaveGroup,
  onRemoveMember,
  onOpenPinnedMessage,
  onResetGroupInviteLink,
  onReviewGroupJoinRequest,
  onToggleBlocked,
  onToggleRestricted,
  onToggleMuted,
  onTogglePinned,
  onTransferOwner,
  onUpdateContactNickname,
  onUpdateGroup,
  onUpdateBackground,
  onUpdateMemberNickname,
  onUpdateMemberRole,
  onUpdateQuickEmoji,
  onClose,
}: DetailPanelProps) {
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
    const withoutLeadingIcon = text.replace(/^\s*📍\s*/, '')
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

    return withoutLeadingIcon
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

  return (
    <aside
      className={isOpen ? 'detail-panel is-open' : 'detail-panel'}
      aria-hidden={!isOpen}
      aria-label={t('detailHeader')}
      style={swipeStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="profile-block">
        <span className="profile-avatar-shell">
          <AvatarFallback name={activeConversation.name} src={activeConversation.avatar} />
          <OnlineDurationBadge
            onlineSince={activeConversation.onlineSince}
            presence={activeConversation.presence}
          />
        </span>
        <h2>{activeConversation.name}</h2>
        <p>{getConversationRoleLabel(activeConversation.role)}</p>
      </div>

      <div className="detail-actions">
        <button
          className={activeConversation.pinned ? 'is-active' : ''}
          disabled={Boolean(busyAction)}
          onClick={onTogglePinned}
          type="button"
          title={activeConversation.pinned ? t('unpinBtn') : t('pinBtn')}
        >
          {activeConversation.pinned ? <PinOff size={18} /> : <Pin size={18} />}
          <span>{activeConversation.pinned ? t('unpinBtn') : t('pinBtn')}</span>
        </button>
        <button
          className={activeConversation.muted ? 'is-active' : ''}
          disabled={Boolean(busyAction)}
          onClick={onToggleMuted}
          type="button"
          title={activeConversation.muted ? t('unmuteBtn') : t('muteBtn')}
        >
          {activeConversation.muted ? <BellOff size={18} /> : <Bell size={18} />}
          <span>{activeConversation.muted ? t('mutedBtn') : t('muteBtn')}</span>
        </button>
        <button
          className="is-danger"
          disabled={Boolean(busyAction)}
          onClick={onArchive}
          type="button"
          title={t('archiveBtn')}
        >
          <Archive size={18} />
          <span>{t('archiveBtn')}</span>
        </button>
        {activeConversation.type === 'direct' && activeConversation.contactId ? (
          <>
            <button
              className={activeConversation.restricted ? 'is-active' : ''}
              disabled={Boolean(busyAction)}
              onClick={() => onToggleRestricted?.()}
              type="button"
              title={activeConversation.restricted ? t('unrestrictActionBtn') : t('restrictBtn')}
            >
              <EyeOff size={18} />
              <span>{activeConversation.restricted ? t('unrestrictActionBtn') : t('restrictBtn')}</span>
            </button>
            <button
              className={activeConversation.blocked ? 'is-active' : 'is-danger'}
              disabled={Boolean(busyAction)}
              onClick={onToggleBlocked}
              type="button"
              title={activeConversation.blocked ? t('unblockBtn') : t('blockBtn')}
            >
              {activeConversation.blocked ? <UserCheck size={18} /> : <UserX size={18} />}
              <span>{activeConversation.blocked ? t('unblockBtn') : t('blockBtn')}</span>
            </button>
            <button
              disabled={Boolean(busyAction)}
              onClick={openRestrictedModal}
              type="button"
              title={t('restrictedListBtn')}
            >
              <Shield size={18} />
              <span>{t('restrictedListBtn')}</span>
            </button>
          </>
        ) : null}
      </div>

      {activeConversation.type === 'direct' && activeConversation.contactId ? (
        <section className="detail-section nickname-section">
          <div className="detail-section-title">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={16} /> {t('aliasTitle')}
            </h3>
            <span>{t('privateLabel')}</span>
          </div>
          <form className="nickname-form" onSubmit={handleDirectNicknameSubmit}>
            <input
              aria-label={t('aliasTitle')}
              maxLength={80}
              onChange={(event) => setDirectNickname(event.target.value)}
              placeholder={t('aliasPlaceholder')}
              value={directNickname}
            />
            <button disabled={Boolean(busyAction) || !directNickname.trim() || directNickname.trim() === (activeConversation.nickname || '')} title={t('saveAliasTitle')} type="submit">
              <Save size={16} />
            </button>
            <button
              disabled={Boolean(busyAction) || !directNickname.trim()}
              onClick={() => {
                setDirectNickname('')
                void onUpdateContactNickname('')
              }}
              title={t('removeAliasBtn')}
              type="button"
            >
              <X size={16} />
            </button>
          </form>
        </section>
      ) : null}

      {isGroup ? (
        <section className="detail-section group-management">
          <div className="detail-section-title">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} /> {t('groupChatTitle')}
            </h3>
            <span>{t('membersCount', { count: members.length })}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={openEditGroupModal}
              type="button"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}
            >
              <Settings2 size={16} color="var(--primary-strong)" /> {t('updateGroupInfoBtn')}
            </button>
            <button
              onClick={openAddMemberModal}
              type="button"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}
            >
              <UserPlus size={16} color="var(--primary-strong)" /> {t('addMemberTitle')}
            </button>
          </div>

          {canManageGroup ? (
            <div className="group-advanced-management">
              <div className="detail-section-title">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Settings2 size={16} /> {t('advancedAdminTitle')}
                </h3>
                <span>{t('requestsCount', { count: joinRequests.length })}</span>
              </div>

              <div className="group-invite-row">
                <input
                  aria-label={t('groupInviteLinkLabel')}
                  readOnly
                  value={
                    groupInviteToken
                      ? `${window.location.origin}/chat?join=${groupInviteToken}`
                      : t('noNewLink')
                  }
                />
                <button
                  disabled={Boolean(busyAction)}
                  onClick={onCopyGroupInviteLink}
                  title={t('copyGroupLinkTitle')}
                  type="button"
                >
                  <Copy size={15} />
                </button>
                <button
                  disabled={Boolean(busyAction)}
                  onClick={onResetGroupInviteLink}
                  title={t('createNewLinkTitle')}
                  type="button"
                >
                  <ShieldCheck size={15} />
                </button>
              </div>

              {joinRequests.length > 0 ? (
                <div className="group-join-request-stack">
                  {joinRequests.map((joinRequest) => (
                    <div className="group-join-request" key={joinRequest.id}>
                      <AvatarFallback
                        name={joinRequest.user.fullName}
                        src={joinRequest.user.avatarUrl}
                      />
                      <span>
                        <strong>{joinRequest.user.fullName}</strong>
                        <small>{joinRequest.user.email}</small>
                      </span>
                      <button
                        disabled={Boolean(busyAction)}
                        onClick={() => onReviewGroupJoinRequest(joinRequest.id, 'approve')}
                        title={t('approveTitle')}
                        type="button"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        disabled={Boolean(busyAction)}
                        onClick={() => onReviewGroupJoinRequest(joinRequest.id, 'decline')}
                        title={t('declineTitle')}
                        type="button"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="group-member-stack">
            {members.slice(0, MEMBER_PREVIEW_COUNT).map((member) => (
              <div className="group-detail-member" key={member.id}>
                <AvatarFallback name={member.fullName} src={member.avatarUrl} />
                <div className="group-member-body">
                  <span>
                    <strong>{member.nickname || member.fullName}</strong>
                    <small>
                      {member.nickname
                        ? `${member.fullName} · ${getRoleLabel(member.role)}`
                        : getRoleLabel(member.role)}
                    </small>
                  </span>
                </div>
              </div>
            ))}
            <button
              className="group-member-toggle"
              onClick={openMembersModal}
              type="button"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--text)' }}
            >
              <Users size={16} color="var(--primary-strong)" />
              <span>{t('viewAllMembers', { count: members.length })}</span>
            </button>
          </div>

          <button
            className="group-leave-button"
            disabled={Boolean(busyAction)}
            onClick={onLeaveGroup}
            type="button"
          >
            <LogOut size={17} />
            <span>{t('leaveGroupBtn')}</span>
          </button>
          {isGroupOwner ? (
            <button
              className="group-disband-button"
              disabled={Boolean(busyAction)}
              onClick={onDisbandGroup}
              type="button"
            >
              <Trash2 size={17} />
              <span>{t('disbandGroupBtn')}</span>
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="detail-section background-section">
        <div className="detail-section-title">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ImagePlus size={16} /> {t('customizeChatTitle')}
          </h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px', marginBottom: '16px' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '8px', cursor: Boolean(busyAction) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}
          >
            <ImagePlus size={16} color="var(--primary-strong)" /> {t('changeBackgroundBtn')}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              disabled={Boolean(busyAction)}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file && onUpdateBackground) {
                  onUpdateBackground({ backgroundImage: file })
                  e.target.value = ''
                }
              }}
            />
          </label>
          <div style={{ position: 'relative' }}>
            <button
              disabled={Boolean(busyAction)}
              onClick={() => setIsEmojiPickerOpen(prev => !prev)}
              type="button"
              style={{ display: 'flex', width: '100%', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '8px', cursor: Boolean(busyAction) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}
            >
              <Smile size={16} color="var(--primary-strong)" /> {t('changeEmojiBtn')}
              <span style={{ marginLeft: 'auto', fontSize: '18px' }}>{activeConversation.quickEmoji || '👍'}</span>
            </button>
            {isEmojiPickerOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100 }}>
                <Suspense fallback={<div>{t('loadingTxtShort')}</div>}>
                  <EmojiPicker
                    onEmojiClick={(data: any) => {
                      if (onUpdateQuickEmoji) {
                        onUpdateQuickEmoji(data.emoji)
                      }
                      setIsEmojiPickerOpen(false)
                    }}
                    lazyLoadEmojis
                  />
                </Suspense>
              </div>
            )}
          </div>
          {activeConversation.backgroundImage && (
            <button
              disabled={Boolean(busyAction)}
              onClick={() => {
                if (onUpdateBackground) {
                  onUpdateBackground({ removeBackground: true })
                }
              }}
              type="button"
              style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '8px', cursor: Boolean(busyAction) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}
            >
              <Trash2 size={16} color="#ef4444" /> {t('removeBackgroundBtn')}
            </button>
          )}
        </div>
      </section>

      <section className="detail-section pinned-messages-section">
        <div className="detail-section-title">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Pin size={16} /> {t('pinnedSectionTitle')}
          </h3>
          <span>{pinnedMessages.length}</span>
        </div>
        <div className="pinned-message-list">
          {pinnedMessages.map((message) => (
            <button
              className="pinned-message-row"
              key={message.id}
              onClick={() => onOpenPinnedMessage(message.id)}
              type="button"
            >
              <Pin size={15} />
              <span>
                <strong>{getPinnedMessageText(message)}</strong>
                <small>
                  {getPinnedMessageAuthor(message)}
                  {message.time ? ` · ${message.time}` : ''}
                </small>
              </span>
            </button>
          ))}
          {pinnedMessages.length === 0 ? (
            <div className="detail-empty-state">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <PinOff size={24} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                <span>{t('noPinnedMessages')}</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>


      <section className="detail-section">
        <div className="detail-section-title">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderOpen size={16} /> {t('recentFilesTitle')}
          </h3>
          <span>{validAttachments.length}</span>
        </div>
        <div className="attachment-list">
          {validAttachments.map((attachment) => (
            <a
              className="attachment-row"
              download={attachment.name}
              href={attachment.url || '#'}
              key={`${attachment.name}-${attachment.url || ''}`}
              rel="noreferrer"
              target={attachment.url ? '_blank' : undefined}
            >
              <span className={attachment.type === 'image' ? 'attachment-icon attachment-thumb' : 'attachment-icon'}>
                {attachment.type === 'image' ? (
                  <>
                    {attachment.url ? (
                      <img
                        alt={attachment.name}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                        src={attachment.url}
                      />
                    ) : null}
                    <Image size={18} />
                  </>
                ) : (
                  <FileText size={18} />
                )}
              </span>
              <span>
                <strong>{attachment.name}</strong>
                <small>{attachment.meta}</small>
              </span>
            </a>
          ))}
        </div>
      </section>

      {isMembersModalOpen ? createPortal(
        <div className={isMembersModalClosing ? 'modal-backdrop is-exiting' : 'modal-backdrop'} role="presentation" style={{ zIndex: 100 }}>
          <div className="group-modal" style={{ maxWidth: '440px', width: '100%' }}>
            <div className="group-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary)', color: '#fff' }}>
                  <Users size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px' }}>{t('groupMembersTitle')}</h2>
                  <p style={{ margin: 0, marginTop: '4px', color: 'var(--muted)', fontSize: '14px' }}>{t('membersCount', { count: members.length })}</p>
                </div>
              </div>
              <button className="icon-button" onClick={closeMembersModal} type="button" title={t('closeModal')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--subtle)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div className="group-member-stack" style={{ padding: '16px 24px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
              {members.map((member) => (
                <div className="group-detail-member" key={member.id} style={{ position: 'relative' }}>
                  <AvatarFallback name={member.fullName} src={member.avatarUrl} />
                  <div className="group-member-body">
                    {editingNicknameId === member.id ? (
                      <form
                        className="member-nickname-form"
                        onSubmit={(event) => {
                          handleMemberNicknameSubmit(event, member.id);
                          setEditingNicknameId(null);
                        }}
                        style={{ display: 'flex', gap: '4px', width: '100%', alignItems: 'center' }}
                      >
                        <input
                          aria-label={t('memberAliasAria', { name: member.fullName })}
                          maxLength={80}
                          onChange={(event) =>
                            setMemberNicknames((current) => ({
                              ...current,
                              [member.id]: event.target.value,
                            }))
                          }
                          placeholder={t('aliasInputPlaceholder')}
                          value={memberNicknames[member.id] || ''}
                          style={{ flex: 1, minWidth: 0, padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line-strong)', outline: 'none' }}
                          autoFocus
                        />
                        <button
                          disabled={Boolean(busyAction) || !memberNicknames[member.id]?.trim() || memberNicknames[member.id]?.trim() === (member.nickname || '')}
                          title={t('saveAliasTitle')}
                          type="submit"
                          style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', background: 'var(--primary)', color: '#fff', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
                        >
                          <Save size={14} />
                        </button>
                        <button
                          disabled={Boolean(busyAction) || !memberNicknames[member.id]?.trim()}
                          onClick={() => {
                            handleClearMemberNickname(member.id);
                            setEditingNicknameId(null);
                          }}
                          title={t('removeAliasBtn')}
                          type="button"
                          style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', background: 'var(--surface-soft)', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--line)' }}
                        >
                          <X size={14} />
                        </button>
                        <button
                          onClick={() => setEditingNicknameId(null)}
                          title={t('cancelBtn')}
                          type="button"
                          style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', background: 'var(--surface-soft)', color: 'var(--muted)', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--line)' }}
                        >
                          <X size={14} />
                        </button>
                      </form>
                    ) : (
                      <span>
                        <strong>{member.nickname || member.fullName}</strong>
                        <small>
                          {member.nickname
                            ? `${member.fullName} · ${getRoleLabel(member.role)}`
                            : getRoleLabel(member.role)}
                        </small>
                      </span>
                    )}
                  </div>
                  
                  {!editingNicknameId || editingNicknameId !== member.id ? (
                    <button
                      onClick={() => setActionMenuMemberId((prev) => prev === member.id ? null : member.id)}
                      title={t('actionsTitle')}
                      type="button"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: actionMenuMemberId === member.id ? 'var(--surface-soft)' : 'transparent', border: 'none', cursor: 'pointer', color: 'var(--subtle)' }}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  ) : null}

                  {actionMenuMemberId === member.id ? (
                    <div style={{ position: 'absolute', right: '36px', top: '10px', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '4px', zIndex: 10, boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', minWidth: '170px' }}>
                      <button
                        onClick={() => {
                          setEditingNicknameId(member.id);
                          setActionMenuMemberId(null);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
                      >
                        <Tag size={14} /> {t('changeAliasMenu')}
                      </button>

                      {isGroupOwner && member.id !== currentUserId ? (
                        <>
                          {member.role === 'admin' ? (
                            <button
                              disabled={Boolean(busyAction)}
                              onClick={() => { onUpdateMemberRole(member.id, 'member'); setActionMenuMemberId(null); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
                            >
                              <Shield size={14} /> {t('demoteAdminMenu')}
                            </button>
                          ) : member.role !== 'owner' ? (
                            <button
                              disabled={Boolean(busyAction)}
                              onClick={() => { onUpdateMemberRole(member.id, 'admin'); setActionMenuMemberId(null); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
                            >
                              <ShieldCheck size={14} /> {t('promoteAdminMenu')}
                            </button>
                          ) : null}

                          {member.role !== 'owner' ? (
                            <button
                              disabled={Boolean(busyAction)}
                              onClick={() => { onTransferOwner(member.id); setActionMenuMemberId(null); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
                            >
                              <UserCog size={14} /> {t('transferOwnerMenu')}
                            </button>
                          ) : null}
                          <div style={{ height: '1px', background: 'var(--line)', margin: '4px 0' }} />
                        </>
                      ) : null}
                      
                      <button
                        disabled={Boolean(busyAction)}
                        onClick={() => { onRemoveMember(member.id); setActionMenuMemberId(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: '#ef4444' }}
                      >
                        <Trash2 size={14} /> {t('removeMemberMenu')}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      , document.body) : null}

      {isEditGroupModalOpen ? createPortal(
        <div className={isEditGroupModalClosing ? 'modal-backdrop is-exiting' : 'modal-backdrop'} role="presentation" style={{ zIndex: 100 }}>
          <form className="group-modal" style={{ maxWidth: '400px', width: '100%' }} onSubmit={handleGroupSubmit}>
            <div className="group-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary)', color: '#fff' }}>
                  <Settings2 size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px' }}>{t('updateGroupTitle')}</h2>
                  <p style={{ margin: 0, marginTop: '4px', color: 'var(--muted)', fontSize: '14px' }}>{t('updateGroupDesc')}</p>
                </div>
              </div>
              <button className="icon-button" onClick={closeEditGroupModal} type="button" title={t('closeModal')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--subtle)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t('groupNameInputD')}</span>
                <input
                  aria-label={t('groupNameAria')}
                  onChange={(event) => setGroupTitle(event.target.value)}
                  value={groupTitle}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line-strong)', outline: 'none' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t('groupAvatarInputD')}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '50%', background: 'var(--surface-soft)', border: '1px dashed var(--line-strong)', display: 'grid', placeItems: 'center', color: 'var(--subtle)' }}>
                    {groupAvatar ? <Check size={20} color="var(--primary)" /> : <ImagePlus size={20} />}
                  </div>
                  <input accept="image/*" onChange={handleAvatarChange} type="file" style={{ fontSize: '14px' }} />
                </div>
              </label>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--surface-soft)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <button
                onClick={closeEditGroupModal}
                type="button"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fff', cursor: 'pointer', fontWeight: 600, color: 'var(--text)' }}
              >
                <X size={16} /> {t('cancelBtn')}
              </button>
              <button
                disabled={Boolean(busyAction) || (!groupAvatar && groupTitle.trim() === activeConversation.name)}
                type="submit"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                <Save size={16} /> {t('saveChangesBtn')}
              </button>
            </div>
          </form>
        </div>
      , document.body) : null}

      {isAddMemberModalOpen ? createPortal(
        <div className={isAddMemberModalClosing ? 'modal-backdrop is-exiting' : 'modal-backdrop'} role="presentation" style={{ zIndex: 100 }}>
          <div className="group-modal" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="group-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary)', color: '#fff' }}>
                  <UserPlus size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px' }}>{t('addMemberTitle')}</h2>
                  <p style={{ margin: 0, marginTop: '4px', color: 'var(--muted)', fontSize: '14px' }}>{t('addMemberDesc')}</p>
                </div>
              </div>
              <button className="icon-button" onClick={closeAddMemberModal} type="button" title={t('closeModal')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--subtle)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t('selectFriendLabel')}</span>
                <select
                  aria-label={t('selectFriendAria')}
                  onChange={(event) => setSelectedFriendId(event.target.value)}
                  value={selectedFriendId}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line-strong)', outline: 'none', background: '#fff' }}
                >
                  <option value="">{t('selectFriendPlaceholder')}</option>
                  {addableFriends.map((friend) => (
                    <option key={friend.id} value={friend.id}>
                      {friend.fullName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--surface-soft)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <button
                onClick={closeAddMemberModal}
                type="button"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fff', cursor: 'pointer', fontWeight: 600, color: 'var(--text)' }}
              >
                <X size={16} /> {t('cancelBtn')}
              </button>
              <button
                disabled={Boolean(busyAction) || !selectedFriendId}
                onClick={handleAddMember}
                type="button"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                <Check size={16} /> {t('addNowBtn')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}      {isRestrictedModalOpen ? createPortal(
        <div className={isRestrictedModalClosing ? 'modal-backdrop is-exiting' : 'modal-backdrop'} role="presentation" style={{ zIndex: 100 }}>
          <div className="group-modal" style={{ maxWidth: '440px', width: '100%' }}>
            <div className="group-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--surface-soft)', color: 'var(--text)' }}>
                  <Shield size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px' }}>{t('restrictedAccTitle')}</h2>
                  <p style={{ margin: 0, marginTop: '4px', color: 'var(--muted)', fontSize: '14px' }}>{t('restrictedAccCount', { count: restrictedContacts.length })}</p>
                </div>
              </div>
              <button className="icon-button" onClick={closeRestrictedModal} type="button" title={t('closeModal')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--subtle)' }}>
                <X size={18} />
              </button>
            </div>
            
            <div className="group-member-stack" style={{ padding: '16px 24px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
              <p style={{ fontSize: '13px', color: 'var(--subtle)', marginBottom: '16px', lineHeight: 1.5 }}>
                {t('restrictedAccDesc')}
              </p>
              {restrictedContacts.map((contact) => (
                <div className="group-detail-member" key={contact.id} style={{ position: 'relative' }}>
                  <AvatarFallback name={contact.fullName} src={contact.avatarUrl} />
                  <div className="group-member-body">
                    <span>
                      <strong>{contact.fullName}</strong>
                    </span>
                  </div>
                  <button
                    className="primary-button outline"
                    style={{ padding: '4px 12px', fontSize: '13px' }}
                    onClick={() => {
                      if (activeConversation.contactId === contact.id) {
                        onToggleRestricted?.()
                      }
                    }}
                  >
                    {t('unrestrictBtn')}
                  </button>
                </div>
              ))}
              {restrictedContacts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--subtle)' }}>
                  {t('noRestrictedAcc')}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </aside>
  )
}
