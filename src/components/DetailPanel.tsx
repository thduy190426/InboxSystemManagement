import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
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
  Trash2,
  UserCog,
  UserCheck,
  UserPlus,
  UserX,
  X,
  Tag,
  Users,
  Settings2,
  FolderOpen,
} from 'lucide-react'
import type { ContactUser, Conversation, ConversationMember, GroupJoinRequest, Message } from '../types'
import { AvatarFallback } from './AvatarFallback'
import { OnlineDurationBadge } from './OnlineDurationBadge'

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
  onToggleMuted: () => void
  onTogglePinned: () => void
  onTransferOwner: (userId: string) => Promise<void> | void
  onUpdateContactNickname: (nickname: string) => Promise<void> | void
  onUpdateGroup: (payload: { title?: string; avatar?: File | null }) => Promise<void> | void
  onUpdateMemberNickname: (userId: string, nickname: string) => Promise<void> | void
  onUpdateMemberRole: (userId: string, role: 'admin' | 'member') => Promise<void> | void
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
  onToggleMuted,
  onTogglePinned,
  onTransferOwner,
  onUpdateContactNickname,
  onUpdateGroup,
  onUpdateMemberNickname,
  onUpdateMemberRole,
}: DetailPanelProps) {
  const [groupTitle, setGroupTitle] = useState(activeConversation.name)
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null)
  const [directNickname, setDirectNickname] = useState(activeConversation.nickname || '')
  const [memberNicknames, setMemberNicknames] = useState<Record<string, string>>({})
  const [selectedFriendId, setSelectedFriendId] = useState('')
  const [showAllMembers, setShowAllMembers] = useState(false)

  const MEMBER_PREVIEW_COUNT = 0

  const isGroup = activeConversation.type === 'group'
  const currentMember = members.find((member) => member.id === currentUserId)
  const isGroupOwner = currentMember?.role === 'owner'
  const canManageGroup = currentMember?.role === 'owner' || currentMember?.role === 'admin'
  const memberIds = useMemo(() => new Set(members.map((member) => member.id)), [members])
  const addableFriends = friends.filter((friend) => !memberIds.has(friend.id))

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
    setGroupAvatar(null)
  }

  async function handleAddMember() {
    if (!selectedFriendId) {
      return
    }

    await onAddMember(selectedFriendId)
    setSelectedFriendId('')
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

  function getPinnedMessageText(message: Message) {
    if (message.text) {
      return message.text
    }

    if (message.type === 'image') {
      return 'Hình ảnh'
    }

    if (message.type === 'audio') {
      return 'Tin nhắn thoại'
    }

    if (message.type === 'file') {
      return 'Tệp đính kèm'
    }

    return 'Tin nhắn'
  }

  function getPinnedMessageAuthor(message: Message) {
    if (message.author === 'me') {
      return 'Bạn'
    }

    if (message.author === 'system') {
      return 'Hệ thống'
    }

    return message.senderName || activeConversation.name
  }

  function getRoleLabel(role: ConversationMember['role']) {
    if (role === 'owner') {
      return 'Owner'
    }

    if (role === 'admin') {
      return 'Admin'
    }

    if (role === 'moderator') {
      return 'Moderator'
    }

    return 'Thành viên'
  }

  return (
    <aside
      className={isOpen ? 'detail-panel is-open' : 'detail-panel'}
      aria-hidden={!isOpen}
      aria-label="Thông tin hội thoại"
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
        <p>{activeConversation.role}</p>
      </div>

      <div className="detail-actions">
        <button
          className={activeConversation.pinned ? 'is-active' : ''}
          disabled={Boolean(busyAction)}
          onClick={onTogglePinned}
          type="button"
          title={activeConversation.pinned ? 'Bỏ ghim' : 'Ghim'}
        >
          {activeConversation.pinned ? <PinOff size={18} /> : <Pin size={18} />}
          <span>{activeConversation.pinned ? 'Bỏ ghim' : 'Ghim'}</span>
        </button>
        <button
          className={activeConversation.muted ? 'is-active' : ''}
          disabled={Boolean(busyAction)}
          onClick={onToggleMuted}
          type="button"
          title={activeConversation.muted ? 'Bật thông báo' : 'Tắt thông báo'}
        >
          {activeConversation.muted ? <BellOff size={18} /> : <Bell size={18} />}
          <span>{activeConversation.muted ? 'Đã tắt tiếng' : 'Tắt tiếng'}</span>
        </button>
        <button
          className="is-danger"
          disabled={Boolean(busyAction)}
          onClick={onArchive}
          type="button"
          title="Lưu trữ"
        >
          <Archive size={18} />
          <span>Lưu trữ</span>
        </button>
        {activeConversation.type === 'direct' && activeConversation.contactId ? (
          <button
            className={activeConversation.blocked ? 'is-active' : 'is-danger'}
            disabled={Boolean(busyAction)}
            onClick={onToggleBlocked}
            type="button"
            title={activeConversation.blocked ? 'Bỏ chặn' : 'Chặn'}
          >
            {activeConversation.blocked ? <UserCheck size={18} /> : <UserX size={18} />}
            <span>{activeConversation.blocked ? 'Bỏ chặn' : 'Chặn'}</span>
          </button>
        ) : null}
      </div>

      {activeConversation.type === 'direct' && activeConversation.contactId ? (
        <section className="detail-section nickname-section">
          <div className="detail-section-title">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={16} /> Biệt danh
            </h3>
            <span>Riêng tư</span>
          </div>
          <form className="nickname-form" onSubmit={handleDirectNicknameSubmit}>
            <input
              aria-label="Biệt danh"
              maxLength={80}
              onChange={(event) => setDirectNickname(event.target.value)}
              placeholder="Đặt biệt danh"
              value={directNickname}
            />
            <button disabled={Boolean(busyAction)} title="Lưu biệt danh" type="submit">
              <Save size={16} />
            </button>
            <button
              disabled={Boolean(busyAction) || !directNickname.trim()}
              onClick={() => {
                setDirectNickname('')
                void onUpdateContactNickname('')
              }}
              title="Xóa biệt danh"
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
              <Users size={16} /> Nhóm chat
            </h3>
            <span>{members.length} thành viên</span>
          </div>

          <form className="group-edit-form" onSubmit={handleGroupSubmit}>
            <input
              aria-label="Tên nhóm"
              onChange={(event) => setGroupTitle(event.target.value)}
              value={groupTitle}
            />
            <label className="group-small-upload" title="Đổi avatar">
              <ImagePlus size={16} />
              <input accept="image/*" onChange={handleAvatarChange} type="file" />
            </label>
            <button
              disabled={
                Boolean(busyAction) ||
                (!groupAvatar && groupTitle.trim() === activeConversation.name)
              }
              type="submit"
            >
              Lưu
            </button>
          </form>

          <div className="group-add-row">
            <select
              aria-label="Chọn thành viên"
              onChange={(event) => setSelectedFriendId(event.target.value)}
              value={selectedFriendId}
            >
              <option value="">Thêm thành viên</option>
              {addableFriends.map((friend) => (
                <option key={friend.id} value={friend.id}>
                  {friend.fullName}
                </option>
              ))}
            </select>
            <button
              disabled={Boolean(busyAction) || !selectedFriendId}
              onClick={handleAddMember}
              title="Thêm"
              type="button"
            >
              <UserPlus size={17} />
            </button>
          </div>

          {canManageGroup ? (
            <div className="group-advanced-management">
              <div className="detail-section-title">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Settings2 size={16} /> Quản trị nâng cao
                </h3>
                <span>{joinRequests.length} yêu cầu</span>
              </div>

              <div className="group-invite-row">
                <input
                  aria-label="Link mời nhóm"
                  readOnly
                  value={
                    groupInviteToken
                      ? `${window.location.origin}/chat?join=${groupInviteToken}`
                      : 'Chưa tạo link mới!'
                  }
                />
                <button
                  disabled={Boolean(busyAction)}
                  onClick={onCopyGroupInviteLink}
                  title="Copy link mời"
                  type="button"
                >
                  <Copy size={15} />
                </button>
                <button
                  disabled={Boolean(busyAction)}
                  onClick={onResetGroupInviteLink}
                  title="Tạo link mới"
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
                        title="Duyệt"
                        type="button"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        disabled={Boolean(busyAction)}
                        onClick={() => onReviewGroupJoinRequest(joinRequest.id, 'decline')}
                        title="Từ chối"
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
            {(showAllMembers ? members : members.slice(0, MEMBER_PREVIEW_COUNT)).map((member) => (
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
                  <form
                    className="member-nickname-form"
                    onSubmit={(event) => handleMemberNicknameSubmit(event, member.id)}
                  >
                    <input
                      aria-label={`Biệt danh của ${member.fullName}`}
                      maxLength={80}
                      onChange={(event) =>
                        setMemberNicknames((current) => ({
                          ...current,
                          [member.id]: event.target.value,
                        }))
                      }
                      placeholder="Biệt danh"
                      value={memberNicknames[member.id] || ''}
                    />
                    <button
                      disabled={Boolean(busyAction)}
                      title="Lưu biệt danh"
                      type="submit"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      disabled={Boolean(busyAction) || !memberNicknames[member.id]?.trim()}
                      onClick={() => handleClearMemberNickname(member.id)}
                      title="Xóa biệt danh"
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  </form>
                  {isGroupOwner && member.id !== currentUserId ? (
                    <div className="member-role-actions">
                      {member.role === 'admin' ? (
                        <button
                          disabled={Boolean(busyAction)}
                          onClick={() => onUpdateMemberRole(member.id, 'member')}
                          title="Hạ quyền Admin"
                          type="button"
                        >
                          <Shield size={14} />
                          <span>Hạ Admin</span>
                        </button>
                      ) : member.role !== 'owner' ? (
                        <button
                          disabled={Boolean(busyAction)}
                          onClick={() => onUpdateMemberRole(member.id, 'admin')}
                          title="Nâng Admin"
                          type="button"
                        >
                          <ShieldCheck size={14} />
                          <span>Nâng Admin</span>
                        </button>
                      ) : null}
                      {member.role !== 'owner' ? (
                        <button
                          disabled={Boolean(busyAction)}
                          onClick={() => onTransferOwner(member.id)}
                          title="Chuyển Owner"
                          type="button"
                        >
                          <UserCog size={14} />
                          <span>Owner</span>
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <button
                  className="member-remove-button"
                  disabled={Boolean(busyAction)}
                  onClick={() => onRemoveMember(member.id)}
                  title="Xóa thành viên"
                  type="button"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <button
              className="group-member-toggle"
              onClick={() => setShowAllMembers((prev) => !prev)}
              type="button"
            >
              {showAllMembers
                ? 'Thu gọn danh sách'
                : `Xem tất cả ${members.length} thành viên`}
            </button>
          </div>

          <button
            className="group-leave-button"
            disabled={Boolean(busyAction)}
            onClick={onLeaveGroup}
            type="button"
          >
            <LogOut size={17} />
            <span>Rời nhóm</span>
          </button>
          {isGroupOwner ? (
            <button
              className="group-disband-button"
              disabled={Boolean(busyAction)}
              onClick={onDisbandGroup}
              type="button"
            >
              <Trash2 size={17} />
              <span>Giải tán nhóm</span>
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="detail-section pinned-messages-section">
        <div className="detail-section-title">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Pin size={16} /> Tin đã ghim
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
                <span>Chưa có tin nhắn nào được ghim.</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>


      <section className="detail-section">
        <div className="detail-section-title">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderOpen size={16} /> Tệp gần đây
          </h3>
          <span>{activeConversation.attachments.length}</span>
        </div>
        <div className="attachment-list">
          {activeConversation.attachments.map((attachment) => (
            <a
              className="attachment-row"
              download={attachment.name}
              href={attachment.url || '#'}
              key={`${attachment.name}-${attachment.url || ''}`}
              rel="noreferrer"
              target={attachment.url ? '_blank' : undefined}
            >
              <span className="attachment-icon">
                {attachment.type === 'image' ? <Image size={18} /> : <FileText size={18} />}
              </span>
              <span>
                <strong>{attachment.name}</strong>
                <small>{attachment.meta}</small>
              </span>
            </a>
          ))}
        </div>
      </section>
    </aside>
  )
}
