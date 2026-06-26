import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  Bell,
  BellOff,
  FileText,
  Image,
  ImagePlus,
  LogOut,
  Pin,
  PinOff,
  Save,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from 'lucide-react'
import type { ContactUser, Conversation, ConversationMember, Message } from '../types'
import { AvatarFallback } from './AvatarFallback'
import { OnlineDurationBadge } from './OnlineDurationBadge'

type DetailPanelProps = {
  activeConversation: Conversation
  busyAction?: string
  currentUserId?: string
  friends: ContactUser[]
  isOpen: boolean
  members: ConversationMember[]
  pinnedMessages: Message[]
  onAddMember: (userId: string) => Promise<void> | void
  onArchive: () => void
  onDisbandGroup: () => Promise<void> | void
  onLeaveGroup: () => Promise<void> | void
  onRemoveMember: (userId: string) => Promise<void> | void
  onOpenPinnedMessage: (messageId: string) => void
  onToggleBlocked: () => void
  onToggleMuted: () => void
  onTogglePinned: () => void
  onUpdateContactNickname: (nickname: string) => Promise<void> | void
  onUpdateGroup: (payload: { title?: string; avatar?: File | null }) => Promise<void> | void
  onUpdateMemberNickname: (userId: string, nickname: string) => Promise<void> | void
}

export function DetailPanel({
  activeConversation,
  busyAction = '',
  currentUserId = '',
  friends,
  isOpen,
  members,
  pinnedMessages,
  onAddMember,
  onArchive,
  onDisbandGroup,
  onLeaveGroup,
  onRemoveMember,
  onOpenPinnedMessage,
  onToggleBlocked,
  onToggleMuted,
  onTogglePinned,
  onUpdateContactNickname,
  onUpdateGroup,
  onUpdateMemberNickname,
}: DetailPanelProps) {
  const [groupTitle, setGroupTitle] = useState(activeConversation.name)
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null)
  const [directNickname, setDirectNickname] = useState(activeConversation.nickname || '')
  const [memberNicknames, setMemberNicknames] = useState<Record<string, string>>({})
  const [selectedFriendId, setSelectedFriendId] = useState('')

  const isGroup = activeConversation.type === 'group'
  const isGroupOwner = members.some(
    (member) => member.id === currentUserId && member.role === 'owner',
  )
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
            <h3>Biệt danh</h3>
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
            <h3>Nhóm chat</h3>
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

          <div className="group-member-stack">
            {members.map((member) => (
              <div className="group-detail-member" key={member.id}>
                <AvatarFallback name={member.fullName} src={member.avatarUrl} />
                <div className="group-member-body">
                  <span>
                    <strong>{member.nickname || member.fullName}</strong>
                    <small>{member.nickname ? member.fullName : member.role}</small>
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
          <h3>Tin đã ghim</h3>
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
            <div className="detail-empty-state">Chưa có tin nhắn nào được ghim.</div>
          ) : null}
        </div>
      </section>


      <section className="detail-section">
        <div className="detail-section-title">
          <h3>Tệp gần đây</h3>
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
