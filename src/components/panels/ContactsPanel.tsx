import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  BookUser,
  CalendarDays,
  Check,
  Clock,
  Ghost,
  IdCard,
  Inbox,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  SearchX,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  fetchFriends,
  fetchIncomingRequests,
  fetchSuggestions,
  searchUsers,
  sendFriendRequest,
  unfriend,
} from '../../services/api/contactApi'
import { getRealtimeSocket } from '../../services/realtime/realtime'
import type { ContactUser } from '../../types'
import { AvatarFallback } from '../ui/AvatarFallback'
import { ConfirmDialog, type ConfirmDialogState } from '../ui/ConfirmDialog'

type ContactsPanelProps = {
  contactToOpen?: ContactUser | null
  onAccepted: (conversationId: string) => void
  onMessage: (user: ContactUser) => Promise<void> | void
  onProfileOpened?: () => void
  pushToast: (text: string, tone?: 'info' | 'error') => void
}

function getActionLabel(user: ContactUser) {
  if (user.friendshipStatus === 'accepted') return 'Bạn bè'
  if (user.friendshipStatus === 'pending' && user.requestDirection === 'outgoing') return 'Hủy lời mời'
  if (user.friendshipStatus === 'pending' && user.requestDirection === 'incoming') return 'Chấp nhận'
  return 'Kết bạn'
}

function getGenderLabel(gender?: string | null) {
  if (gender === 'male') return 'Nam'
  if (gender === 'female') return 'Nữ'
  if (gender === 'other') return 'Khác'
  if (gender === 'prefer_not_to_say') return 'Không muốn chia sẻ'
  return 'Chưa cập nhật'
}

function formatProfileDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function readContactsQuery() {
  return new URLSearchParams(window.location.search).get('q')?.trim() ?? ''
}

function updateContactsQuery(query: string) {
  if (window.location.pathname !== '/contacts') return
  const trimmedQuery = query.trim()
  const nextUrl = trimmedQuery ? `/contacts?q=${encodeURIComponent(trimmedQuery)}` : '/contacts'
  if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
    window.history.replaceState(null, '', nextUrl)
  }
}

// ─── Profile dialog ───────────────────────────────────────────────────────────

type ContactProfileProps = {
  user: ContactUser
  isClosing: boolean
  onClose: () => void
}

function ContactProfile({ user, isClosing, onClose }: ContactProfileProps) {
  const safePresence = ['online', 'away', 'busy'].includes(user.presence) ? user.presence : 'offline'
  const presenceLabel =
    safePresence === 'online' ? 'Đang trực tuyến'
    : safePresence === 'away' ? 'Tạm vắng'
    : safePresence === 'busy' ? 'Đang bận'
    : 'Ngoại tuyến'
  const presenceClass = `cp-presence--${safePresence}`

  return (
    <div
      className={`cp-backdrop${isClosing ? ' cp-backdrop--exiting' : ''}`}
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <section aria-modal="true" className="cp-dialog" role="dialog">
        <div className="cp-hero">
          <button className="cp-close-btn" onClick={onClose} title="Đóng" type="button">
            <X size={16} />
          </button>
          <div className="cp-avatar-wrap">
            <AvatarFallback className="cp-avatar" name={user.fullName} src={user.avatarUrl} />
            <span className={`cp-presence-dot ${presenceClass}`} />
          </div>
          <div className="cp-hero-text">
            <strong>{user.nickname || user.fullName}</strong>
            {user.nickname && <span className="cp-full-name">{user.fullName}</span>}
            {user.handle && <span className="cp-handle">@{user.handle}</span>}
            <span className={`cp-presence-label ${presenceClass}`}>{presenceLabel}</span>
          </div>
        </div>

        <div className="cp-info-list">
          {user.showPhone !== false && (
            <div className="cp-info-row">
              <span className="cp-info-icon"><Phone size={14} /></span>
              <div className="cp-info-text">
                <small>Số điện thoại</small>
                <span>{user.phone || 'Chưa cập nhật'}</span>
              </div>
            </div>
          )}
          {user.showStatusMessage !== false && (
            <div className="cp-info-row">
              <span className="cp-info-icon"><User size={14} /></span>
              <div className="cp-info-text">
                <small>Trạng thái</small>
                <span>{user.statusMessage || 'Chưa có trạng thái'}</span>
              </div>
            </div>
          )}
          {user.showAddress !== false && (
            <div className="cp-info-row">
              <span className="cp-info-icon"><MapPin size={14} /></span>
              <div className="cp-info-text">
                <small>Địa chỉ</small>
                <span>{user.address || 'Chưa cập nhật'}</span>
              </div>
            </div>
          )}
          {user.showGender !== false && (
            <div className="cp-info-row">
              <span className="cp-info-icon"><User size={14} /></span>
              <div className="cp-info-text">
                <small>Giới tính</small>
                <span>{getGenderLabel(user.gender)}</span>
              </div>
            </div>
          )}
          {user.showBirthDate !== false && (
            <div className="cp-info-row">
              <span className="cp-info-icon"><CalendarDays size={14} /></span>
              <div className="cp-info-text">
                <small>Ngày sinh</small>
                <span>{formatProfileDate(user.birthDate) || 'Chưa cập nhật'}</span>
              </div>
            </div>
          )}
          <div className="cp-info-row">
            <span className="cp-info-icon"><Clock size={14} /></span>
            <div className="cp-info-text">
              <small>Tham gia</small>
              <span>{formatProfileDate(user.createdAt) || '—'}</span>
            </div>
          </div>
          <div className="cp-info-row">
            <span className="cp-info-icon"><Clock size={14} /></span>
            <div className="cp-info-text">
              <small>Kết bạn từ</small>
              <span>{formatProfileDate(user.contactCreatedAt) || 'Chưa kết bạn'}</span>
            </div>
          </div>
        </div>

        {user.showBio !== false && (
          <div className="cp-bio">
            <small>Giới thiệu</small>
            <p>{user.bio || 'Người dùng này chưa thêm phần giới thiệu.'}</p>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Contact card ─────────────────────────────────────────────────────────────

type ContactCardProps = {
  user: ContactUser
  busyId: string
  onProfile: (user: ContactUser) => void
  onMessage: (user: ContactUser) => void
  action: React.ReactNode
}

function ContactCard({ user, busyId, onProfile, onMessage, action }: ContactCardProps) {
  const safePresence = ['online', 'away', 'busy'].includes(user.presence) ? user.presence : 'offline'
  const subline =
    user.showStatusMessage !== false && user.statusMessage ? user.statusMessage
    : user.showBio !== false && user.bio ? user.bio
    : null

  return (
    <article className="cp-card">
      <div className="cp-card-avatar-wrap">
        <AvatarFallback name={user.fullName} src={user.avatarUrl} />
        <span className={`cp-presence-dot cp-presence--${safePresence}`} />
      </div>
      <div className="cp-card-info">
        <strong>{user.nickname || user.fullName}</strong>
        <span className="cp-card-handle">{user.handle ? `@${user.handle}` : 'Chưa có định danh'}</span>
        {subline && <small className="cp-card-bio">{subline}</small>}
      </div>
      <div className="cp-card-actions">
        <button className="cp-btn cp-btn--ghost cp-btn--sm" onClick={() => onProfile(user)} type="button">
          <IdCard size={14} /> Hồ sơ
        </button>
        <button
          className="cp-btn cp-btn--ghost cp-btn--sm"
          disabled={busyId === `message:${user.id}` || user.friendshipStatus === 'blocked'}
          onClick={() => onMessage(user)}
          type="button"
        >
          <MessageCircle size={14} />
          {busyId === `message:${user.id}` ? 'Đang mở...' : 'Nhắn tin'}
        </button>
        {action}
      </div>
    </article>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

type SectionProps = {
  icon: React.ReactNode
  title: string
  count: number
  emptyIcon: React.ReactNode
  emptyText: string
  children: React.ReactNode
}

function ContactSection({ icon, title, count, emptyIcon, emptyText, children }: SectionProps) {
  return (
    <section className="cp-section">
      <div className="cp-section-header">
        <span className="cp-section-icon">{icon}</span>
        <h2>{title}</h2>
        <span className="cp-section-count">{count}</span>
      </div>
      <div className="cp-section-body">
        {count > 0 ? children : (
          <div className="cp-empty">
            <span className="cp-empty-icon">{emptyIcon}</span>
            <span>{emptyText}</span>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ContactsPanel({
  contactToOpen = null,
  onAccepted,
  onMessage,
  onProfileOpened,
  pushToast,
}: ContactsPanelProps) {
  const [query, setQuery] = useState(readContactsQuery)
  const [results, setResults] = useState<ContactUser[]>([])
  const [friends, setFriends] = useState<ContactUser[]>([])
  const [requests, setRequests] = useState<ContactUser[]>([])
  const [suggestions, setSuggestions] = useState<ContactUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const [selectedUser, setSelectedUser] = useState<ContactUser | null>(null)
  const [isProfileClosing, setIsProfileClosing] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const pendingContactActionsRef = useRef(new Set<string>())
  const queryRef = useRef(query)

  useEffect(() => { queryRef.current = query }, [query])

  async function loadDirectory() {
    const [nextFriends, nextRequests, nextSuggestions] = await Promise.all([
      fetchFriends(), fetchIncomingRequests(), fetchSuggestions(),
    ])
    setFriends(nextFriends)
    setRequests(nextRequests)
    setSuggestions(nextSuggestions)
  }

  async function loadDirectoryAndCurrentSearch() {
    await loadDirectory()
    const keyword = queryRef.current.trim()
    if (keyword.length >= 2) {
      const users = await searchUsers(keyword)
      setResults(users)
    }
  }

  useEffect(() => {
    loadDirectoryAndCurrentSearch().catch((err) => {
      pushToast(err instanceof Error ? err.message : 'Không thể tải danh bạ!', 'error')
    })
  }, [])

  useEffect(() => {
    function handleLocationChange() {
      const nextQuery = readContactsQuery()
      setQuery(nextQuery)
      queryRef.current = nextQuery
      if (nextQuery.length >= 2) {
        setIsLoading(true)
        setMessage('')
        searchUsers(nextQuery)
          .then(setResults)
          .catch((err) => pushToast(err instanceof Error ? err.message : 'Không thể tìm kiếm!', 'error'))
          .finally(() => setIsLoading(false))
        return
      }
      setResults([])
      setMessage('')
    }
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [pushToast])

  useEffect(() => {
    const socket = getRealtimeSocket()
    if (!socket) return
    function handleRealtimeContactsChanged() {
      loadDirectoryAndCurrentSearch().catch(() => undefined)
    }
    socket.on('contacts:changed', handleRealtimeContactsChanged)
    socket.on('presence:changed', handleRealtimeContactsChanged)
    return () => {
      socket.off('contacts:changed', handleRealtimeContactsChanged)
      socket.off('presence:changed', handleRealtimeContactsChanged)
    }
  }, [])

  useEffect(() => {
    if (!contactToOpen) return
    const allKnownUsers = [...friends, ...requests, ...suggestions, ...results]
    const latestUser = allKnownUsers.find((u) => {
      if (contactToOpen.contactId && u.contactId === contactToOpen.contactId) return true
      return u.id === contactToOpen.id || u.userId === contactToOpen.userId
    }) ?? contactToOpen
    openContactProfile(latestUser)
    onProfileOpened?.()
  }, [contactToOpen, friends, onProfileOpened, requests, results, suggestions])

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const keyword = query.trim()
    if (keyword.length < 2) { setResults([]); setMessage('Nhập ít nhất 2 ký tự để tìm kiếm!'); return }
    try {
      setIsLoading(true)
      setMessage('')
      updateContactsQuery(keyword)
      setResults(await searchUsers(keyword))
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể tìm kiếm người dùng!', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    if (!value.trim()) { updateContactsQuery(''); setResults([]); setMessage('') }
  }

  async function handleSendRequest(user: ContactUser) {
    const isCancelling = user.friendshipStatus === 'pending' && user.requestDirection === 'outgoing' && Boolean(user.contactId)
    const actionKey = isCancelling ? `cancel:${user.contactId}` : `send:${user.id}`
    if (pendingContactActionsRef.current.has(actionKey)) return
    pendingContactActionsRef.current.add(actionKey)
    try {
      setBusyId(user.id)
      setMessage('')
      if (isCancelling && user.contactId) {
        await cancelFriendRequest(user.contactId)
        await loadDirectory()
        setResults((c) => c.map((i) => i.id === user.id ? { ...i, friendshipStatus: 'none', requestDirection: null, contactId: null } : i))
        pushToast('Đã hủy lời mời kết bạn!', 'info')
        return
      }
      if (user.friendshipStatus === 'pending' && user.requestDirection === 'incoming' && user.contactId) {
        const res = await acceptFriendRequest(user.contactId)
        await loadDirectory()
        setResults((c) => c.map((i) => i.id === user.id ? { ...i, friendshipStatus: 'accepted', requestDirection: null } : i))
        onAccepted(res.conversationId)
        return
      }
      await sendFriendRequest(user.id)
      setResults((c) => c.map((i) => i.id === user.id ? { ...i, friendshipStatus: 'pending', requestDirection: 'outgoing' } : i))
      setSuggestions((c) => c.map((i) => i.id === user.id ? { ...i, friendshipStatus: 'pending', requestDirection: 'outgoing' } : i))
      pushToast('Đã gửi lời mời kết bạn!', 'info')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể xử lý lời mời!', 'error')
    } finally {
      pendingContactActionsRef.current.delete(actionKey)
      setBusyId('')
    }
  }

  async function handleAcceptRequest(request: ContactUser) {
    if (!request.contactId) return
    try {
      setBusyId(request.id)
      const res = await acceptFriendRequest(request.contactId)
      await loadDirectory()
      onAccepted(res.conversationId)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể chấp nhận lời mời!', 'error')
    } finally { setBusyId('') }
  }

  async function handleDeclineRequest(request: ContactUser) {
    if (!request.contactId) return
    try {
      setBusyId(request.id)
      await declineFriendRequest(request.contactId)
      await loadDirectory()
      setResults((c) => c.map((i) => i.id === request.id ? { ...i, friendshipStatus: 'none', requestDirection: null, contactId: null } : i))
      pushToast('Đã từ chối lời mời kết bạn.', 'info')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể từ chối lời mời!', 'error')
    } finally { setBusyId('') }
  }

  async function handleUnfriend(friend: ContactUser) {
    if (!friend.contactId) return
    try {
      setBusyId(friend.id)
      await unfriend(friend.contactId)
      await loadDirectory()
      setResults((c) => c.map((i) => i.id === friend.id ? { ...i, friendshipStatus: 'none', requestDirection: null, contactId: null } : i))
      pushToast('Đã hủy kết bạn!', 'info')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể hủy kết bạn!', 'error')
    } finally { setBusyId('') }
  }

  async function handleMessageUser(user: ContactUser) {
    try {
      setBusyId(`message:${user.id}`)
      await onMessage(user)
      closeContactProfile()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không thể mở cuộc trò chuyện!', 'error')
    } finally { setBusyId('') }
  }

  async function handleConfirmDialog() {
    if (!confirmDialog || isConfirming) return
    try {
      setIsConfirming(true)
      await confirmDialog.onConfirm()
      setConfirmDialog(null)
    } finally { setIsConfirming(false) }
  }

  function confirmUnfriend(friend: ContactUser) {
    setConfirmDialog({
      title: 'Hủy bạn bè?',
      description: `Bạn sẽ hủy kết bạn với ${friend.nickname || friend.fullName}. Hai bạn cần gửi lời mời lại nếu muốn kết bạn tiếp.`,
      confirmLabel: 'Hủy bạn bè',
      tone: 'danger',
      onConfirm: () => handleUnfriend(friend),
    })
  }

  function openContactProfile(user: ContactUser) {
    setIsProfileClosing(false)
    setSelectedUser(user)
  }

  function closeContactProfile() {
    setIsProfileClosing(true)
    window.setTimeout(() => { setSelectedUser(null); setIsProfileClosing(false) }, 140)
  }

  return (
    <section className="cp-page" aria-labelledby="contacts-title">
      <header className="cp-page-header">
        <div className="cp-page-kicker">
          <BookUser size={12} />
          Danh bạ
        </div>
        <h1 id="contacts-title">Bạn bè &amp; Gợi ý kết bạn</h1>
      </header>

      <form className="cp-search" onSubmit={handleSearch}>
        <span className="cp-search-icon"><Search size={16} /></span>
        <input
          className="cp-search-input"
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Tìm theo tên hoặc số điện thoại..."
          value={query}
        />
        <button
          className="cp-btn cp-btn--primary cp-btn--sm"
          disabled={isLoading || query.trim().length < 2}
          type="submit"
        >
          {isLoading ? 'Đang tìm...' : 'Tìm kiếm'}
        </button>
      </form>

      {message && <p className="cp-search-hint">{message}</p>}

      <div className="cp-grid">
        <ContactSection
          icon={<Users size={15} />}
          title="Bạn bè"
          count={friends.length}
          emptyIcon={<Users size={28} strokeWidth={1.5} />}
          emptyText="Chưa có người bạn nào!"
        >
          {friends.map((friend) => (
            <ContactCard
              key={friend.id}
              user={friend}
              busyId={busyId}
              onProfile={openContactProfile}
              onMessage={handleMessageUser}
              action={
                <button
                  className="cp-btn cp-btn--danger cp-btn--sm"
                  disabled={busyId === friend.id}
                  onClick={() => confirmUnfriend(friend)}
                  type="button"
                >
                  <UserMinus size={14} />
                  {busyId === friend.id ? 'Đang xử lý...' : 'Hủy bạn'}
                </button>
              }
            />
          ))}
        </ContactSection>

        <ContactSection
          icon={<UserPlus size={15} />}
          title="Gợi ý kết bạn"
          count={suggestions.length}
          emptyIcon={<UserPlus size={28} strokeWidth={1.5} />}
          emptyText="Chưa có gợi ý kết bạn mới!"
        >
          {suggestions.map((user) => (
            <ContactCard
              key={user.id}
              user={user}
              busyId={busyId}
              onProfile={openContactProfile}
              onMessage={handleMessageUser}
              action={
                <button
                  className={`cp-btn cp-btn--sm ${user.friendshipStatus === 'pending' && user.requestDirection === 'outgoing' ? 'cp-btn--ghost' : 'cp-btn--primary'}`}
                  disabled={busyId === user.id || user.friendshipStatus === 'accepted'}
                  onClick={() => handleSendRequest(user)}
                  type="button"
                >
                  {user.friendshipStatus === 'pending' && user.requestDirection === 'outgoing' ? <X size={14} /> : <UserPlus size={14} />}
                  {busyId === user.id ? 'Đang xử lý...' : getActionLabel(user)}
                </button>
              }
            />
          ))}
        </ContactSection>

        <ContactSection
          icon={<Search size={15} />}
          title="Kết quả tìm kiếm"
          count={results.length}
          emptyIcon={<SearchX size={28} strokeWidth={1.5} />}
          emptyText="Chưa có kết quả tìm kiếm!"
        >
          {results.map((user) => (
            <ContactCard
              key={user.id}
              user={user}
              busyId={busyId}
              onProfile={openContactProfile}
              onMessage={handleMessageUser}
              action={
                <button
                  className={`cp-btn cp-btn--sm ${user.friendshipStatus === 'pending' && user.requestDirection === 'outgoing' ? 'cp-btn--ghost' : 'cp-btn--primary'}`}
                  disabled={busyId === user.id || user.friendshipStatus === 'accepted'}
                  onClick={() => handleSendRequest(user)}
                  type="button"
                >
                  {user.friendshipStatus === 'pending' && user.requestDirection === 'outgoing' ? <X size={14} /> : <UserPlus size={14} />}
                  {busyId === user.id ? 'Đang xử lý...' : getActionLabel(user)}
                </button>
              }
            />
          ))}
        </ContactSection>

        <ContactSection
          icon={<Inbox size={15} />}
          title="Lời mời kết bạn"
          count={requests.length}
          emptyIcon={<Ghost size={28} strokeWidth={1.5} />}
          emptyText="Không có lời mời kết bạn mới!"
        >
          {requests.map((request) => (
            <article className="cp-card" key={request.id}>
              <div className="cp-card-avatar-wrap">
                <AvatarFallback name={request.fullName} src={request.avatarUrl} />
              </div>
              <div className="cp-card-info">
                <strong>{request.fullName}</strong>
                <span className="cp-card-handle">{request.handle ? `@${request.handle}` : 'Chưa có định danh'}</span>
                <small className="cp-card-bio">Muốn kết bạn với bạn</small>
              </div>
              <div className="cp-card-actions">
                <button className="cp-btn cp-btn--ghost cp-btn--sm" onClick={() => openContactProfile(request)} type="button">
                  <IdCard size={14} /> Hồ sơ
                </button>
                <button className="cp-btn cp-btn--primary cp-btn--sm" disabled={busyId === request.id} onClick={() => handleAcceptRequest(request)} type="button">
                  <Check size={14} />
                  {busyId === request.id ? 'Đang xử lý...' : 'Chấp nhận'}
                </button>
                <button className="cp-btn cp-btn--danger cp-btn--sm" disabled={busyId === request.id} onClick={() => handleDeclineRequest(request)} type="button">
                  <X size={14} /> Từ chối
                </button>
              </div>
            </article>
          ))}
        </ContactSection>
      </div>

      {selectedUser && (
        <ContactProfile user={selectedUser} isClosing={isProfileClosing} onClose={closeContactProfile} />
      )}

      <ConfirmDialog
        dialog={confirmDialog}
        isWorking={isConfirming}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => void handleConfirmDialog()}
      />
    </section>
  )
}