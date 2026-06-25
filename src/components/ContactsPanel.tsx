import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Check, Search, UserMinus, UserPlus, X } from 'lucide-react'
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
  onAccepted: (conversationId: string) => void
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

export function ContactsPanel({ onAccepted }: ContactsPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ContactUser[]>([])
  const [friends, setFriends] = useState<ContactUser[]>([])
  const [requests, setRequests] = useState<ContactUser[]>([])
  const [suggestions, setSuggestions] = useState<ContactUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')

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
    try {
      setBusyId(user.id)
      setMessage('')

      if (user.friendshipStatus === 'pending' && user.requestDirection === 'outgoing' && user.contactId) {
        await cancelFriendRequest(user.contactId)
        await loadDirectory()
        setResults((current) =>
          current.map((item) =>
            item.id === user.id
              ? { ...item, friendshipStatus: 'none', requestDirection: null, contactId: null }
              : item,
          ),
        )
        setMessage('Đã hủy lời mời kết bạn! Bạn có thể gửi lời mời kết bạn lại.')
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
      setMessage('Đã gửi lời mời kết bạn! Vui lòng chờ đối phương chấp nhận.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xử lý lời mời!')
    } finally {
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
      setMessage(error instanceof Error ? error.message : 'Không thể chấp nhận lời mời!')
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
      setMessage('Đã từ chối lời mời kết bạn.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể từ chối lời mời!')
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
      setMessage('Đã hủy kết bạn. Bạn có thể gửi lời mời kết bạn lại!')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể hủy kết bạn!')
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="contacts-panel">
      <header className="contacts-header">
        <div>
          <span className="section-kicker">Danh bạ</span>
          <h1>Danh bạ và gợi ý kết bạn</h1>
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
            <h2>Bạn bè đã kết bạn</h2>
            <span>{friends.length}</span>
          </div>

          <div className="contact-list">
            {friends.map((friend) => (
              <article className="contact-row" key={friend.id}>
                <AvatarFallback name={friend.fullName} src={friend.avatarUrl} />
                <div>
                  <strong>{friend.fullName}</strong>
                  <span>{friend.email}</span>
                  <small>{friend.statusMessage || friend.bio || 'Người dùng Inbox'}</small>
                </div>
                <button
                  disabled={busyId === friend.id}
                  onClick={() => handleUnfriend(friend)}
                  type="button"
                >
                  <UserMinus size={16} />
                  {busyId === friend.id ? 'Đang xử lý' : 'Hủy kết bạn'}
                </button>
              </article>
            ))}
            {friends.length === 0 ? (
              <div className="empty-state">Bạn chưa có người bạn nào!</div>
            ) : null}
          </div>
        </section>

        <section className="contacts-section">
          <div className="contacts-section-title">
            <h2>Gợi ý kết bạn</h2>
            <span>{suggestions.length}</span>
          </div>

          <div className="contact-list">
            {suggestions.map((user) => (
              <article className="contact-row" key={user.id}>
                <AvatarFallback name={user.fullName} src={user.avatarUrl} />
                <div>
                  <strong>{user.fullName}</strong>
                  <span>{user.email}</span>
                  <small>{user.statusMessage || user.bio || 'Người dùng Inbox'}</small>
                </div>
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
                </button>
              </article>
            ))}
            {suggestions.length === 0 ? (
              <div className="empty-state">Chưa có gợi ý kết bạn mới!</div>
            ) : null}
          </div>
        </section>

        <section className="contacts-section">
          <div className="contacts-section-title">
            <h2>Kết quả tìm kiếm</h2>
            <span>{results.length}</span>
          </div>

          <div className="contact-list">
            {results.map((user) => (
              <article className="contact-row" key={user.id}>
                <AvatarFallback name={user.fullName} src={user.avatarUrl} />
                <div>
                  <strong>{user.fullName}</strong>
                  <span>{user.email}</span>
                  <small>{user.statusMessage || user.bio || 'Người dùng Inbox'}</small>
                </div>
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
                </button>
              </article>
            ))}
            {results.length === 0 ? (
              <div className="empty-state">Chưa có kết quả tìm kiếm!</div>
            ) : null}
          </div>
        </section>

        <section className="contacts-section">
          <div className="contacts-section-title">
            <h2>Lời mời kết bạn</h2>
            <span>{requests.length}</span>
          </div>

          <div className="contact-list">
            {requests.map((request) => (
              <article className="contact-row" key={request.id}>
                <AvatarFallback name={request.fullName} src={request.avatarUrl} />
                <div>
                  <strong>{request.fullName}</strong>
                  <span>{request.email}</span>
                  <small>Muốn kết bạn với bạn</small>
                </div>
                <span className="contact-request-actions">
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
            ))}
            {requests.length === 0 ? (
              <div className="empty-state">Không có lời mời mới!</div>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  )
}