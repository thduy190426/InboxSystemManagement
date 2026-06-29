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
  Mail,
  MapPin,
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
} from '../services/contactApi'
import { getRealtimeSocket } from '../services/realtime'
import type { ContactUser } from '../types'
import { AvatarFallback } from './AvatarFallback'

type ContactsPanelProps = {
  contactToOpen?: ContactUser | null
  onAccepted: (conversationId: string) => void
  onProfileOpened?: () => void
  pushToast: (text: string, tone?: 'info' | 'error') => void
}

function getActionLabel(user: ContactUser) {
  if (user.friendshipStatus === 'accepted') {
    return 'Bạn bè'
  }

  if (user.friendshipStatus === 'pending' && user.requestDirection === 'outgoing') {
    return 'Hủy lời mời'
  }

  if (user.friendshipStatus === 'pending' && user.requestDirection === 'incoming') {
    return 'Chấp nhận'
  }

  return 'Kết bạn'
}

function getGenderLabel(gender?: string | null) {
  if (gender === 'male') {
    return 'Nam'
  }

  if (gender === 'female') {
    return 'Nữ'
  }

  if (gender === 'other') {
    return 'Khác'
  }

  if (gender === 'prefer_not_to_say') {
    return 'Không muốn chia sẻ!'
  }

  return 'Chưa cập nhật giới tính!'
}

function formatProfileDate(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function ContactsPanel({
  contactToOpen = null,
  onAccepted,
  onProfileOpened,
  pushToast,
}: ContactsPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ContactUser[]>([])
  const [friends, setFriends] = useState<ContactUser[]>([])
  const [requests, setRequests] = useState<ContactUser[]>([])
  const [suggestions, setSuggestions] = useState<ContactUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const [selectedUser, setSelectedUser] = useState<ContactUser | null>(null)
  const [isProfileClosing, setIsProfileClosing] = useState(false)
  const pendingContactActionsRef = useRef(new Set<string>())

  async function loadDirectory() {
    const [nextFriends, nextRequests, nextSuggestions] = await Promise.all([
      fetchFriends(),
      fetchIncomingRequests(),
      fetchSuggestions(),
    ])

    setFriends(nextFriends)
    setRequests(nextRequests)
    setSuggestions(nextSuggestions)
  }


  useEffect(() => {
    loadDirectory().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Không thể tải danh bạ!')
    })
  }, [])

  useEffect(() => {
    const socket = getRealtimeSocket()

    if (!socket) {
      return
    }

    function handleRealtimeContactsChanged() {
      loadDirectory().catch(() => undefined)
    }

    socket.on('contacts:changed', handleRealtimeContactsChanged)
    socket.on('presence:changed', handleRealtimeContactsChanged)

    return () => {
      socket.off('contacts:changed', handleRealtimeContactsChanged)
      socket.off('presence:changed', handleRealtimeContactsChanged)
    }
  }, [])

  useEffect(() => {
    if (!contactToOpen) {
      return
    }

    const allKnownUsers = [...friends, ...requests, ...suggestions, ...results]
    const latestUser =
      allKnownUsers.find((user) => {
        if (contactToOpen.contactId && user.contactId === contactToOpen.contactId) {
          return true
        }

        return user.id === contactToOpen.id || user.userId === contactToOpen.userId
      }) ?? contactToOpen

    openContactProfile(latestUser)
    onProfileOpened?.()
  }, [contactToOpen, friends, onProfileOpened, requests, results, suggestions])

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const keyword = query.trim()

    if (keyword.length < 2) {
      setResults([])
      setMessage('Nhập ít nhất 2 ký tự để tìm kiếm!')
      return
    }

    try {
      setIsLoading(true)
      setMessage('')
      const users = await searchUsers(keyword)
      setResults(users)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tìm kiếm người dùng!')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendRequest(user: ContactUser) {
    const isCancellingRequest =
      user.friendshipStatus === 'pending' && user.requestDirection === 'outgoing' && Boolean(user.contactId)
    const actionKey = isCancellingRequest ? `cancel:${user.contactId}` : `send:${user.id}`

    if (pendingContactActionsRef.current.has(actionKey)) {
      return
    }

    pendingContactActionsRef.current.add(actionKey)

    try {
      setBusyId(user.id)
      setMessage('')

      if (isCancellingRequest && user.contactId) {
        await cancelFriendRequest(user.contactId)
        await loadDirectory()
        setResults((current) =>
          current.map((item) =>
            item.id === user.id
              ? { ...item, friendshipStatus: 'none', requestDirection: null, contactId: null }
              : item,
          ),
        )
        pushToast('Đã hủy lời mời kết bạn! Bạn có thể gửi lời mời kết bạn lại.', 'info')
        return
      }

      if (user.friendshipStatus === 'pending' && user.requestDirection === 'incoming' && user.contactId) {
        const response = await acceptFriendRequest(user.contactId)
        await loadDirectory()
        setResults((current) =>
          current.map((item) =>
            item.id === user.id
              ? { ...item, friendshipStatus: 'accepted', requestDirection: null }
              : item,
          ),
        )
        onAccepted(response.conversationId)
        return
      }

      await sendFriendRequest(user.id)
      setResults((current) =>
        current.map((item) =>
          item.id === user.id
            ? { ...item, friendshipStatus: 'pending', requestDirection: 'outgoing' }
            : item,
        ),
      )
      setSuggestions((current) =>
        current.map((item) =>
          item.id === user.id
            ? { ...item, friendshipStatus: 'pending', requestDirection: 'outgoing' }
            : item,
        ),
      )
      pushToast('Đã gửi lời mời kết bạn! Vui lòng chờ đối phương chấp nhận.', 'info')
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể xử lý lời mời!', 'error')
    } finally {
      pendingContactActionsRef.current.delete(actionKey)
      setBusyId('')
    }
  }

  async function handleAcceptRequest(request: ContactUser) {
    if (!request.contactId) {
      return
    }

    try {
      setBusyId(request.id)
      setMessage('')
      const response = await acceptFriendRequest(request.contactId)
      await loadDirectory()
      onAccepted(response.conversationId)
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể chấp nhận lời mời!', 'error')
    } finally {
      setBusyId('')
    }
  }

  async function handleDeclineRequest(request: ContactUser) {
    if (!request.contactId) {
      return
    }

    try {
      setBusyId(request.id)
      setMessage('')
      await declineFriendRequest(request.contactId)
      await loadDirectory()
      setResults((current) =>
        current.map((item) =>
          item.id === request.id
            ? { ...item, friendshipStatus: 'none', requestDirection: null, contactId: null }
            : item,
        ),
      )
      pushToast('Đã từ chối lời mời kết bạn.', 'info')
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể từ chối lời mời!', 'error')
    } finally {
      setBusyId('')
    }
  }

  async function handleUnfriend(friend: ContactUser) {
    if (!friend.contactId) {
      return
    }

    try {
      setBusyId(friend.id)
      setMessage('')
      await unfriend(friend.contactId)
      await loadDirectory()
      setResults((current) =>
        current.map((item) =>
          item.id === friend.id
            ? { ...item, friendshipStatus: 'none', requestDirection: null, contactId: null }
            : item,
        ),
      )
      pushToast('Đã hủy kết bạn. Bạn có thể gửi lời mời kết bạn lại!', 'info')
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể hủy kết bạn!', 'error')
    } finally {
      setBusyId('')
    }
  }

  function openContactProfile(user: ContactUser) {
    setIsProfileClosing(false)
    setSelectedUser(user)
  }

  function closeContactProfile() {
    setIsProfileClosing(true)
    window.setTimeout(() => {
      setSelectedUser(null)
      setIsProfileClosing(false)
    }, 140)
  }

  function renderContactProfile(user: ContactUser) {
    const safePresence = ['online', 'away', 'busy'].includes(user.presence)
      ? user.presence
      : 'offline'
    const presenceLabel =
      safePresence === 'online'
        ? 'Đang trực tuyến'
        : safePresence === 'away'
          ? 'Tạm vắng'
          : safePresence === 'busy'
            ? 'Đang bận'
            : 'Ngoại tuyến'

    return (
      <div className={isProfileClosing ? 'contact-profile-backdrop is-exiting' : 'contact-profile-backdrop'} role="presentation">
        <section aria-modal="true" className="contact-profile-dialog" role="dialog">
          <header className="contact-profile-header">
            <div className="contact-profile-identity">
              <span className="avatar-wrap">
                <AvatarFallback
                  className="contact-profile-avatar"
                  name={user.fullName}
                  src={user.avatarUrl}
                />
                <span className={`presence-dot ${safePresence}`} />
              </span>
              <div>
                <strong>{user.nickname || user.fullName}</strong>
                <span>{user.fullName}</span>
                <small>{presenceLabel}</small>
              </div>
            </div>
            <button onClick={closeContactProfile} title="Đóng hồ sơ" type="button">
              <X size={18} />
            </button>
          </header>

          <div className="contact-profile-summary">
            <div>
              <Mail size={16} />
              <span>
                <strong>Email</strong>
                {user.email}
              </span>
            </div>
            <div>
              <Phone size={16} />
              <span>
                <strong>Số điện thoại</strong>
                {user.phone || 'Chưa có số điện thoại!'}
              </span>
            </div>
            <div>
              <User size={16} />
              <span>
                <strong>Trạng thái</strong>
                {user.statusMessage || 'Chưa có trạng thái cá nhân!'}
              </span>
            </div>
            <div>
              <MapPin size={16} />
              <span>
                <strong>Địa chỉ</strong>
                {user.address || 'Chưa có địa chỉ!'}
              </span>
            </div>
            <div>
              <User size={16} />
              <span>
                <strong>Giới tính</strong>
                {getGenderLabel(user.gender)}
              </span>
            </div>
            <div>
              <CalendarDays size={16} />
              <span>
                <strong>Ngày sinh</strong>
                {formatProfileDate(user.birthDate) || 'Chưa có ngày sinh!'}
              </span>
            </div>
            <div>
              <Clock size={16} />
              <span>
                <strong>Tham gia</strong>
                {formatProfileDate(user.createdAt) || 'Chưa có thông tin ngày tham gia!'}
              </span>
            </div>
            <div>
              <Clock size={16} />
              <span>
                <strong>Kết nối</strong>
                {formatProfileDate(user.contactCreatedAt) || 'Chưa kết bạn!'}
              </span>
            </div>
          </div>

          <div className="contact-profile-bio">
            <strong>Giới thiệu</strong>
            <p>{user.bio || 'Người dùng này chưa thêm phần giới thiệu!'}</p>
          </div>
        </section>
      </div>
    )
  }

  function renderContactRow(user: ContactUser, action: React.ReactNode) {
    return (
      <article className="contact-row animate-in" key={user.id}>
        <AvatarFallback name={user.fullName} src={user.avatarUrl} />
        <div>
          <strong>{user.nickname || user.fullName}</strong>
          <span>{user.email}</span>
          <small>{user.statusMessage || user.bio || 'Người dùng Inbox'}</small>
        </div>
        <span className="contact-row-actions">
          <button
            className="contact-secondary-button"
            onClick={() => openContactProfile(user)}
            type="button"
          >
            <IdCard size={16} />
            Xem hồ sơ
          </button>
          {action}
        </span>
      </article>
    )
  }

  return (
    <section className="contacts-panel">
      <header className="contacts-header">
        <div>
          <span className="section-kicker" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookUser size={14} />
            Danh bạ
          </span>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Danh bạ và gợi ý kết bạn
          </h1>
        </div>
      </header>

      <form className="contacts-search" onSubmit={handleSearch}>
        <Search size={18} />
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm theo tên, email hoặc số điện thoại"
          value={query}
        />
        <button disabled={isLoading} type="submit">
          Tìm
        </button>
      </form>

      {message ? <p className="contacts-message">{message}</p> : null}

      <div className="contacts-grid">
        <section className="contacts-section">
          <div className="contacts-section-title">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} />
              Bạn bè đã kết bạn
            </h2>
            <span>{friends.length}</span>
          </div>

          <div className="contact-list">
            {friends.length > 0 ? (
              friends.map((friend) =>
                renderContactRow(
                  friend,
                  <button
                    disabled={busyId === friend.id}
                    onClick={() => handleUnfriend(friend)}
                    type="button"
                  >
                    <UserMinus size={16} />
                    {busyId === friend.id ? 'Đang xử lý' : 'Hủy kết bạn'}
                  </button>,
                ),
              )
            ) : (
              <div className="empty-state">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Users size={32} strokeWidth={1.5} />
                  <span>Bạn chưa có người bạn nào!</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="contacts-section">
          <div className="contacts-section-title">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} />
              Gợi ý kết bạn
            </h2>
            <span>{suggestions.length}</span>
          </div>

          <div className="contact-list">
            {suggestions.length > 0 ? (
              suggestions.map((user) =>
                renderContactRow(
                  user,
                  <button
                    disabled={busyId === user.id || user.friendshipStatus === 'accepted'}
                    onClick={() => handleSendRequest(user)}
                    type="button"
                  >
                    {user.friendshipStatus === 'pending' && user.requestDirection === 'outgoing' ? (
                      <X size={16} />
                    ) : (
                      <UserPlus size={16} />
                    )}
                    {busyId === user.id ? 'Đang xử lý' : getActionLabel(user)}
                  </button>,
                ),
              )
            ) : (
              <div className="empty-state">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={32} strokeWidth={1.5} />
                  <span>Chưa có gợi ý kết bạn mới!</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="contacts-section">
          <div className="contacts-section-title">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={18} />
              Kết quả tìm kiếm
            </h2>
            <span>{results.length}</span>
          </div>

          <div className="contact-list">
            {results.length > 0 ? (
              results.map((user) =>
                renderContactRow(
                  user,
                  <button
                    disabled={busyId === user.id || user.friendshipStatus === 'accepted'}
                    onClick={() => handleSendRequest(user)}
                    type="button"
                  >
                    {user.friendshipStatus === 'pending' && user.requestDirection === 'outgoing' ? (
                      <X size={16} />
                    ) : (
                      <UserPlus size={16} />
                    )}
                    {busyId === user.id ? 'Đang xử lý' : getActionLabel(user)}
                  </button>,
                ),
              )
            ) : (
              <div className="empty-state">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <SearchX size={32} strokeWidth={1.5} />
                  <span>Chưa có kết quả tìm kiếm!</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="contacts-section">
          <div className="contacts-section-title">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Inbox size={18} />
              Lời mời kết bạn
            </h2>
            <span>{requests.length}</span>
          </div>

          <div className="contact-list">
            {requests.length > 0 ? (
              requests.map((request) => (
                <article className="contact-row animate-in" key={request.id}>
                  <AvatarFallback name={request.fullName} src={request.avatarUrl} />
                  <div>
                    <strong>{request.fullName}</strong>
                    <span>{request.email}</span>
                    <small>Muốn kết bạn với bạn</small>
                  </div>
                  <span className="contact-request-actions">
                    <button
                      className="contact-secondary-button"
                      onClick={() => openContactProfile(request)}
                      type="button"
                    >
                      <IdCard size={16} />
                      Xem hồ sơ
                    </button>
                    <button
                      disabled={busyId === request.id}
                      onClick={() => handleAcceptRequest(request)}
                      type="button"
                    >
                      <Check size={16} />
                      {busyId === request.id ? 'Đang xử lý' : 'Chấp nhận'}
                    </button>
                    <button
                      className="contact-secondary-button"
                      disabled={busyId === request.id}
                      onClick={() => handleDeclineRequest(request)}
                      type="button"
                    >
                      <X size={16} />
                      Từ chối
                    </button>
                  </span>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Ghost size={32} strokeWidth={1.5} />
                  <span>Không có lời mời kết bạn mới!</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      {selectedUser ? renderContactProfile(selectedUser) : null}
    </section>
  )
}
