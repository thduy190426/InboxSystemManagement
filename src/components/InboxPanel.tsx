import type { CSSProperties, ChangeEvent, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { ArchiveRestore, BellOff, ImagePlus, MessageSquare, Pin, Plus, Search, UserRound, X } from 'lucide-react'
import { globalSearch, type GlobalSearchResponse } from '../services/searchApi'
import type { ContactUser, Conversation } from '../types'
import { AvatarFallback } from './AvatarFallback'
import { OnlineDurationBadge } from './OnlineDurationBadge'

export type ConversationFilter = 'all' | 'unread' | 'group' | 'archived'

type InboxPanelProps = {
  activeConversation?: Conversation | null
  activeFilter: ConversationFilter
  conversations: Conversation[]
  friends: ContactUser[]
  isCompact?: boolean
  isCreatingGroup?: boolean
  query: string
  onCreateGroup: (payload: {
    title: string
    memberIds: string[]
    avatar?: File | null
  }) => Promise<void> | void
  onFilterChange: (filter: ConversationFilter) => void
  onClosePanel?: () => void
  onRestoreConversation: (conversationId: string) => Promise<void> | void
  onQueryChange: (query: string) => void
  onSelectConversation: (conversationId: string) => void
}

export function InboxPanel({
  activeConversation,
  activeFilter,
  conversations,
  friends,
  isCompact = false,
  isCreatingGroup = false,
  query,
  onCreateGroup,
  onClosePanel,
  onFilterChange,
  onRestoreConversation,
  onQueryChange,
  onSelectConversation,
}: InboxPanelProps) {
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [isCreateGroupClosing, setIsCreateGroupClosing] = useState(false)
  const [groupTitle, setGroupTitle] = useState('')
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [globalResults, setGlobalResults] = useState<GlobalSearchResponse | null>(null)
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false)
  const [isSearchingGlobally, setIsSearchingGlobally] = useState(false)
  const [globalSearchError, setGlobalSearchError] = useState('')
  const hasGlobalResults = useMemo(
    () =>
      Boolean(
        globalResults &&
          (globalResults.conversations.length > 0 ||
            globalResults.messages.length > 0 ||
            globalResults.users.length > 0),
      ),
    [globalResults],
  )

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    onQueryChange(event.target.value)
  }

  useEffect(() => {
    const keyword = query.trim()

    if (keyword.length < 2) {
      setGlobalResults(null)
      setIsGlobalSearchOpen(false)
      setGlobalSearchError('')
      return
    }

    let isMounted = true
    const timer = window.setTimeout(() => {
      setIsSearchingGlobally(true)
      setGlobalSearchError('')

      globalSearch(keyword)
        .then((results) => {
          if (!isMounted) {
            return
          }

          setGlobalResults(results)
          setIsGlobalSearchOpen(true)
        })
        .catch((error) => {
          if (!isMounted) {
            return
          }

          setGlobalSearchError(error instanceof Error ? error.message : 'Không thể tìm kiếm!')
          setGlobalResults(null)
          setIsGlobalSearchOpen(true)
        })
        .finally(() => {
          if (isMounted) {
            setIsSearchingGlobally(false)
          }
        })
    }, 280)

    return () => {
      isMounted = false
      window.clearTimeout(timer)
    }
  }, [query])

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    )
  }

  function closeCreateGroup() {
    setIsCreateGroupClosing(true)
    window.setTimeout(() => {
      setIsCreateGroupOpen(false)
      setIsCreateGroupClosing(false)
      setGroupTitle('')
      setGroupAvatar(null)
      setSelectedMemberIds([])
    }, 140)
  }

  function openConversationFromSearch(conversationId: string) {
    setIsGlobalSearchOpen(false)
    onSelectConversation(conversationId)
  }

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!groupTitle.trim() || selectedMemberIds.length === 0) {
      return
    }

    await onCreateGroup({
      title: groupTitle.trim(),
      memberIds: selectedMemberIds,
      avatar: groupAvatar,
    })
    closeCreateGroup()
  }

  const directFriends = conversations.filter(
    (conversation) => !conversation.type || conversation.type === 'direct',
  )
  const stripConversations =
    activeFilter === 'all'
      ? directFriends
      : activeFilter === 'unread'
        ? conversations.filter((conversation) => conversation.unread > 0)
        : activeFilter === 'group'
          ? conversations.filter((conversation) => conversation.type === 'group')
          : conversations

  function getStripLabel(conversation: Conversation) {
    if (activeFilter === 'unread' && conversation.unreadSenders?.length) {
      return conversation.unreadSenders.length === 1
        ? conversation.unreadSenders[0].fullName
        : `${conversation.unreadSenders.length} người gửi`
    }

    return conversation.name
  }

  function getConversationPreview(conversation: Conversation) {
    if (!conversation.lastMessageByMe) {
      return conversation.lastMessage
    }

    if (conversation.lastMessageIsAttachment) {
      return conversation.lastMessage.replace(/^Đã gửi/, 'Bạn đã gửi')
    }

    return `Bạn: ${conversation.lastMessage}`
  }

  function renderStripAvatar(conversation: Conversation) {
    const unreadSenders = conversation.unreadSenders ?? []

    if ((activeFilter === 'unread' || conversation.type === 'group') && unreadSenders.length > 0) {
      return (
        <span className="friend-avatar-stack">
          {unreadSenders.slice(0, 3).map((sender) => (
            <AvatarFallback
              className="friend-stack-avatar"
              key={sender.id}
              name={sender.fullName}
              src={sender.avatarUrl}
            />
          ))}
          {unreadSenders.length > 3 ? <span>+{unreadSenders.length - 3}</span> : null}
        </span>
      )
    }

    return (
      <>
        <AvatarFallback name={conversation.name} src={conversation.avatar} />
        <span className={`friend-presence-dot ${conversation.presence}`} />
        <OnlineDurationBadge
          compact
          onlineSince={conversation.onlineSince}
          presence={conversation.presence}
        />
      </>
    )
  }

  return (
    <section className="inbox-panel" aria-label="Danh sách hội thoại">
      <header className="panel-header">
        <div>
          <span className="section-kicker">Inbox</span>
          <h1>Hộp thư</h1>
        </div>
        <div className="panel-header-actions">
          <button
            className="icon-button"
            onClick={() => {
              setIsCreateGroupClosing(false)
              setIsCreateGroupOpen(true)
            }}
            title="Tạo nhóm"
            type="button"
          >
            <Plus size={20} />
          </button>
          {isCompact && onClosePanel ? (
            <button className="icon-button" onClick={onClosePanel} title="Đóng danh sách" type="button">
              <X size={18} />
            </button>
          ) : null}
        </div>
      </header>

      <label className="search-field">
        <Search size={18} />
        <input
          aria-label="Tìm kiếm hội thoại"
          onChange={handleQueryChange}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setIsGlobalSearchOpen(true)
            }
          }}
          placeholder="Tìm kiếm người, nhóm, nội dung..."
          type="search"
          value={query}
        />
      </label>

      {isGlobalSearchOpen ? (
        <section className="global-search-panel" aria-label="Kết quả tìm kiếm">
          <header>
            <strong>Tìm kiếm toàn hệ thống</strong>
            <button onClick={() => setIsGlobalSearchOpen(false)} title="Đóng" type="button">
              <X size={16} />
            </button>
          </header>

          {isSearchingGlobally ? <div className="global-search-state">Đang tìm...</div> : null}
          {globalSearchError ? (
            <div className="global-search-state is-error">{globalSearchError}</div>
          ) : null}
          {!isSearchingGlobally && !globalSearchError && !hasGlobalResults ? (
            <div className="global-search-state">Không có kết quả phù hợp.</div>
          ) : null}

          {globalResults?.conversations.length ? (
            <div className="global-search-section">
              <span>Hội thoại</span>
              {globalResults.conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => openConversationFromSearch(conversation.id)}
                  type="button"
                >
                  <AvatarFallback name={conversation.name} src={conversation.avatar} />
                  <span>
                    <strong>{conversation.name}</strong>
                    <small>{conversation.lastMessage || conversation.time}</small>
                  </span>
                  <MessageSquare size={16} />
                </button>
              ))}
            </div>
          ) : null}

          {globalResults?.messages.length ? (
            <div className="global-search-section">
              <span>Tin nhắn</span>
              {globalResults.messages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => openConversationFromSearch(message.conversationId)}
                  type="button"
                >
                  <MessageSquare size={18} />
                  <span>
                    <strong>{message.text || 'Tin nhắn đính kèm'}</strong>
                    <small>
                      {message.conversationName} - {message.senderName}
                      {message.time ? ` - ${message.time}` : ''}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {globalResults?.users.length ? (
            <div className="global-search-section">
              <span>Người dùng</span>
              {globalResults.users.map((user) => (
                <button
                  disabled={user.friendshipStatus !== 'accepted'}
                  key={user.id}
                  onClick={() => {
                    const directConversation = conversations.find(
                      (conversation) => conversation.contactId === user.contactId,
                    )

                    if (directConversation) {
                      openConversationFromSearch(directConversation.id)
                    }
                  }}
                  type="button"
                >
                  <AvatarFallback name={user.fullName} src={user.avatarUrl} />
                  <span>
                    <strong>{user.fullName}</strong>
                    <small>{user.email}</small>
                  </span>
                  <UserRound size={16} />
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="friend-status-strip" aria-label="Trạng thái bạn bè">
        {stripConversations.map((conversation) => (
          <button
            className={
              conversation.id === activeConversation?.id
                ? 'friend-status-card is-active'
                : 'friend-status-card'
            }
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            type="button"
          >
            <span className="friend-avatar-frame">
              {renderStripAvatar(conversation)}
              {activeFilter === 'unread' && conversation.unread ? (
                <span className="friend-unread-dot">{conversation.unread}</span>
              ) : null}
            </span>
            <span>{getStripLabel(conversation)}</span>
          </button>
        ))}
      </div>

      <div className="quick-filters" aria-label="Bộ lọc hội thoại">
        <button
          className={activeFilter === 'all' ? 'is-active' : ''}
          onClick={() => onFilterChange('all')}
          type="button"
        >
          Tất cả
        </button>
        <button
          className={activeFilter === 'unread' ? 'is-active' : ''}
          onClick={() => onFilterChange('unread')}
          type="button"
        >
          Chưa đọc
        </button>
        <button
          className={activeFilter === 'group' ? 'is-active' : ''}
          onClick={() => onFilterChange('group')}
          type="button"
        >
          Nhóm
        </button>
        <button
          className={activeFilter === 'archived' ? 'is-active' : ''}
          onClick={() => onFilterChange('archived')}
          type="button"
        >
          Lưu trữ
        </button>
      </div>

      <div className="conversation-list">
        {conversations.map((conversation) => (
          <button
            className={
              conversation.id === activeConversation?.id
                ? 'conversation-row is-active'
                : 'conversation-row'
            }
            key={conversation.id}
            onClick={() =>
              activeFilter === 'archived'
                ? onRestoreConversation(conversation.id)
                : onSelectConversation(conversation.id)
            }
            style={{ '--conversation-accent': conversation.accent } as CSSProperties}
            type="button"
          >
            <span className="avatar-wrap">
              <AvatarFallback name={conversation.name} src={conversation.avatar} />
              <span className={`presence-dot ${conversation.presence}`} />
              <OnlineDurationBadge
                compact
                onlineSince={conversation.onlineSince}
                presence={conversation.presence}
              />
            </span>
            <span className="conversation-copy">
              <span className="conversation-topline">
                <strong>{conversation.name}</strong>
                <span>{conversation.lastTime}</span>
              </span>
              <span className="conversation-preview">{getConversationPreview(conversation)}</span>
            </span>
            <span className="conversation-meta">
              {activeFilter === 'archived' ? (
                <span className="restore-chip">
                  <ArchiveRestore size={14} />
                  <span>Khôi phục</span>
                </span>
              ) : null}
              {conversation.pinned ? <Pin size={14} aria-label="Đã ghim" /> : null}
              {conversation.muted ? <BellOff size={14} aria-label="Đã tắt tiếng" /> : null}
              {conversation.unread ? (
                <span className="unread-badge">{conversation.unread}</span>
              ) : null}
            </span>
          </button>
        ))}
        {conversations.length === 0 ? (
          <div className="empty-state">Không tìm thấy hội thoại phù hợp!</div>
        ) : null}
      </div>

      {isCreateGroupOpen ? (
        <div className={isCreateGroupClosing ? 'modal-backdrop is-exiting' : 'modal-backdrop'} role="presentation">
          <form className="group-modal" onSubmit={handleCreateGroup}>
            <div className="group-modal-header">
              <div>
                <h2>Tạo nhóm</h2>
                <p>Đặt tên, avatar và chọn thành viên.</p>
              </div>
              <button className="icon-button" onClick={closeCreateGroup} type="button" title="Đóng">
                <X size={18} />
              </button>
            </div>

            <label className="group-field">
              <span>Tên nhóm</span>
              <input
                autoFocus
                onChange={(event) => setGroupTitle(event.target.value)}
                placeholder="Nhập tên nhóm"
                value={groupTitle}
              />
            </label>

            <label className="group-avatar-picker">
              <ImagePlus size={18} />
              <span>{groupAvatar ? groupAvatar.name : 'Chọn avatar nhóm'}</span>
              <input
                accept="image/*"
                onChange={(event) => setGroupAvatar(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>

            <div className="group-member-picker">
              <div className="group-member-title">
                <strong>Thành viên</strong>
                <span>{selectedMemberIds.length} đã chọn</span>
              </div>
              <div className="group-member-list">
                {friends.map((friend) => (
                  <label className="group-member-row" key={friend.id}>
                    <input
                      checked={selectedMemberIds.includes(friend.id)}
                      onChange={() => toggleMember(friend.id)}
                      type="checkbox"
                    />
                    <AvatarFallback name={friend.fullName} src={friend.avatarUrl} />
                    <span>
                      <strong>{friend.fullName}</strong>
                      <small>{friend.email}</small>
                    </span>
                  </label>
                ))}
                {friends.length === 0 ? (
                  <div className="empty-state">Chưa có bạn bè để tạo nhóm!</div>
                ) : null}
              </div>
            </div>

            <button
              className="group-primary-button"
              disabled={!groupTitle.trim() || selectedMemberIds.length === 0 || isCreatingGroup}
              type="submit"
            >
              {isCreatingGroup ? 'Đang tạo...' : 'Tạo nhóm'}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  )
}
