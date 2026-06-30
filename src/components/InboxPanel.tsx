import type { CSSProperties, ChangeEvent, FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Archive, ArchiveRestore, BellOff, Check, ImagePlus, Inbox, MessageCircle, MessageSquare, MessageSquareOff, Pin, Plus, Search, SearchX, Trash2, Type, UserRound, Users, X } from 'lucide-react'
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
  onDeleteConversation: (conversationId: string) => void
  onRestoreConversation: (conversationId: string) => Promise<void> | void
  onQueryChange: (query: string) => void
  onSelectConversation: (conversationId: string) => void
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function getStartOfWeek(date: Date) {
  const startOfDay = getStartOfDay(date)
  const day = startOfDay.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1

  startOfDay.setDate(startOfDay.getDate() - daysFromMonday)
  return startOfDay
}

function formatConversationLastTime(conversation: Conversation) {
  if (!conversation.lastMessageAt) {
    return conversation.lastTime
  }

  const sentAt = new Date(conversation.lastMessageAt)

  if (Number.isNaN(sentAt.getTime())) {
    return conversation.lastTime
  }

  const now = new Date()
  const sentDay = getStartOfDay(sentAt)
  const today = getStartOfDay(now)

  if (sentDay.getTime() === today.getTime()) {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(sentAt)
  }

  if (sentDay >= getStartOfWeek(now)) {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
    }).format(sentAt)
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(sentAt).replace(/-/g, '/')
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
  onDeleteConversation,
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
  const [conversationMenu, setConversationMenu] = useState<{
    conversationId: string
    x: number
    y: number
  } | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
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
    if (!conversationMenu) {
      return
    }

    function closeConversationMenu() {
      setConversationMenu(null)
    }

    window.addEventListener('click', closeConversationMenu)
    window.addEventListener('scroll', closeConversationMenu, true)
    window.addEventListener('resize', closeConversationMenu)

    return () => {
      window.removeEventListener('click', closeConversationMenu)
      window.removeEventListener('scroll', closeConversationMenu, true)
      window.removeEventListener('resize', closeConversationMenu)
    }
  }, [conversationMenu])

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

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function openConversationMenu(conversationId: string, x: number, y: number) {
    const menuWidth = 176
    const menuHeight = 48
    const safeX = Math.min(Math.max(x, 12), window.innerWidth - menuWidth - 12)
    const safeY = Math.min(Math.max(y, 12), window.innerHeight - menuHeight - 12)

    setConversationMenu({ conversationId, x: safeX, y: safeY })
  }

  function startConversationLongPress(conversationId: string, x: number, y: number) {
    clearLongPressTimer()
    longPressTimerRef.current = window.setTimeout(() => {
      openConversationMenu(conversationId, x, y)
    }, 520)
  }

  function handleDeleteConversation(conversationId: string) {
    setConversationMenu(null)
    onDeleteConversation(conversationId)
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

  function getLastNameWord(name: string) {
    const words = name.trim().split(/\s+/).filter(Boolean)

    return words.at(-1) || name
  }

  function getStripLabel(conversation: Conversation) {
    if (activeFilter === 'unread' && conversation.unreadSenders?.length) {
      return conversation.unreadSenders.length === 1
        ? getLastNameWord(conversation.unreadSenders[0].fullName)
        : `${conversation.unreadSenders.length} người gửi`
    }

    return getLastNameWord(conversation.name)
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
          <span className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={14} />
            Inbox
          </span>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Hộp thư
          </h1>
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
            <div className="global-search-state">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <SearchX size={24} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                <span>Không có kết quả phù hợp.</span>
              </div>
            </div>
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
                ? `friend-status-card is-active${conversation.unread ? ' is-unread' : ''}`
                : `friend-status-card${conversation.unread ? ' is-unread' : ''}`
            }
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            type="button"
          >
            <span className="friend-avatar-frame">
              {renderStripAvatar(conversation)}
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
          <Inbox size={16} />
          <span>Tất cả</span>
        </button>
        <button
          className={activeFilter === 'unread' ? 'is-active' : ''}
          onClick={() => onFilterChange('unread')}
          type="button"
        >
          <MessageCircle size={16} />
          <span>Chưa đọc</span>
        </button>
        <button
          className={activeFilter === 'group' ? 'is-active' : ''}
          onClick={() => onFilterChange('group')}
          type="button"
        >
          <Users size={16} />
          <span>Nhóm</span>
        </button>
        <button
          className={activeFilter === 'archived' ? 'is-active' : ''}
          onClick={() => onFilterChange('archived')}
          type="button"
        >
          <Archive size={16} />
          <span>Lưu trữ</span>
        </button>
      </div>

      <div className="conversation-list">
        {conversations.map((conversation) => (
          <button
            className={
              conversation.id === activeConversation?.id
                ? `conversation-row is-active${conversation.unread ? ' is-unread' : ''} animate-in`
                : `conversation-row${conversation.unread ? ' is-unread' : ''} animate-in`
            }
            key={conversation.id}
            onContextMenu={(event) => {
              event.preventDefault()
              openConversationMenu(conversation.id, event.clientX, event.clientY)
            }}
            onClick={() =>
              activeFilter === 'archived'
                ? onRestoreConversation(conversation.id)
                : onSelectConversation(conversation.id)
            }
            onMouseDown={(event) => {
              if (event.button !== 0) {
                return
              }

              startConversationLongPress(conversation.id, event.clientX, event.clientY)
            }}
            onMouseLeave={clearLongPressTimer}
            onMouseUp={clearLongPressTimer}
            onTouchCancel={clearLongPressTimer}
            onTouchEnd={clearLongPressTimer}
            onTouchStart={(event) => {
              const touch = event.touches[0]

              if (touch) {
                startConversationLongPress(conversation.id, touch.clientX, touch.clientY)
              }
            }}
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
                {activeFilter !== 'archived' ? (
                  <span>{formatConversationLastTime(conversation)}</span>
                ) : null}
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
            </span>
          </button>
        ))}
        {conversations.length === 0 ? (
          <div className="empty-state">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <MessageSquareOff size={32} strokeWidth={1.5} />
              <span>Không tìm thấy hội thoại phù hợp!</span>
            </div>
          </div>
        ) : null}
      </div>

      {conversationMenu ? (
        <div
          className="conversation-context-menu"
          onClick={(event) => event.stopPropagation()}
          style={{ left: conversationMenu.x, top: conversationMenu.y }}
        >
          <button
            className="is-danger"
            onClick={() => handleDeleteConversation(conversationMenu.conversationId)}
            type="button"
          >
            <Trash2 size={16} />
            <span>Xóa</span>
          </button>
        </div>
      ) : null}

      {isCreateGroupOpen ? (
        <div className={isCreateGroupClosing ? 'modal-backdrop is-exiting' : 'modal-backdrop'} role="presentation">
          <form className="group-modal" onSubmit={handleCreateGroup}>
            <div className="group-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary)', color: '#fff' }}>
                  <Users size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px' }}>Tạo nhóm</h2>
                  <p style={{ margin: 0, marginTop: '4px' }}>Đặt tên, avatar và chọn thành viên.</p>
                </div>
              </div>
              <button className="icon-button" onClick={closeCreateGroup} type="button" title="Đóng">
                <X size={18} />
              </button>
            </div>

            <label className="group-field">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Type size={16} /> Tên nhóm
              </span>
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
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} /> Thành viên
                </strong>
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
                  <div className="empty-state">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Users size={32} strokeWidth={1.5} />
                      <span>Chưa có bạn bè để tạo nhóm!</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <button
              className="group-primary-button"
              disabled={!groupTitle.trim() || selectedMemberIds.length === 0 || isCreatingGroup}
              type="submit"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {isCreatingGroup ? null : <Check size={18} />}
              {isCreatingGroup ? 'Đang tạo...' : 'Tạo nhóm'}
            </button>
          </form>
        </div>
      ) : null}
    </section>
  )
}
