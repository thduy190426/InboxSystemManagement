import { useTranslation } from 'react-i18next'
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

function getActionLabel(user: ContactUser, t: any) {
  if (user.friendshipStatus === 'accepted') return t('statusFriend')
  if (user.friendshipStatus === 'pending' && user.requestDirection === 'outgoing') return t('statusCancelReq')
  if (user.friendshipStatus === 'pending' && user.requestDirection === 'incoming') return t('statusAcceptReq')
  return t('statusAddFriend')
}

function getGenderLabel(gender: string | null | undefined, t: any) {
  if (gender === 'male') return 'Nam'
  if (gender === 'female') return t('genderF')
  if (gender === 'other') return t('genderO')
  if (gender === 'prefer_not_to_say') return t('genderHidden')
  return t('genderUnset')
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

type ContactProfileProps = {
  user: ContactUser
  isClosing: boolean
  onClose: () => void
}

export function ContactProfile({ user, isClosing, onClose }: ContactProfileProps) {
  const { t } = useTranslation('panels')
  const safePresence = ['online', 'away', 'busy'].includes(user.presence) ? user.presence : 'offline'
  const presenceLabel =
    safePresence === 'online' ? t('presenceOnline')
    : safePresence === 'away' ? t('presenceAway')
    : safePresence === 'busy' ? t('presenceBusy')
    : t('presenceOffline')
  const presenceClass = `cp-presence--${safePresence}`

  return (
    <div
      className={`cp-backdrop${isClosing ? ' cp-backdrop--exiting' : ''}`}
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <section aria-modal="true" className="cp-dialog" role="dialog">
        <div className="cp-hero">
          <button className="cp-close-btn" onClick={onClose} title={t("close", { defaultValue: "Đóng" })} type="button">
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
                <small>{t('phoneLabel')}</small>
                <span>{user.phone || t('genderUnset')}</span>
              </div>
            </div>
          )}
          {user.showStatusMessage !== false && (
            <div className="cp-info-row">
              <span className="cp-info-icon"><User size={14} /></span>
              <div className="cp-info-text">
                <small>{t('statusMsgLabel')}</small>
                <span>{user.statusMessage || t('statusMsgUnset')}</span>
              </div>
            </div>
          )}
          {user.showAddress !== false && (
            <div className="cp-info-row">
              <span className="cp-info-icon"><MapPin size={14} /></span>
              <div className="cp-info-text">
                <small>{t('addressLabel')}</small>
                <span>{user.address || t('genderUnset')}</span>
              </div>
            </div>
          )}
          {user.showGender !== false && (
            <div className="cp-info-row">
              <span className="cp-info-icon"><User size={14} /></span>
              <div className="cp-info-text">
                <small>{t('genderLabel')}</small>
                <span>{getGenderLabel(user.gender, t)}</span>
              </div>
            </div>
          )}
          {user.showBirthDate !== false && (
            <div className="cp-info-row">
              <span className="cp-info-icon"><CalendarDays size={14} /></span>
              <div className="cp-info-text">
                <small>{t('birthDateLabel')}</small>
                <span>{formatProfileDate(user.birthDate) || t('genderUnset')}</span>
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
              <small>{t('friendSinceLabel')}</small>
              <span>{formatProfileDate(user.contactCreatedAt) || t('notFriendsYet')}</span>
            </div>
          </div>
        </div>

        {user.showBio !== false && (
          <div className="cp-bio">
            <small>{t('bioLabel')}</small>
            <p>{user.bio || t('bioEmpty')}</p>
          </div>
        )}
      </section>
    </div>
  )
}

type ContactCardProps = {
  user: ContactUser
  busyId: string
  onProfile: (user: ContactUser) => void
  onMessage: (user: ContactUser) => void
  action: React.ReactNode
}

function ContactCard({ user, busyId, onProfile, onMessage, action }: ContactCardProps) {
  const { t } = useTranslation('panels')
  const safePresence = ['online', 'away', 'busy'].includes(user.presence) ? user.presence : 'offline'
  return (
    <article className="cp-card">
      <div className="cp-card-avatar-wrap">
        <AvatarFallback name={user.fullName} src={user.avatarUrl} />
        <span className={`cp-presence-dot cp-presence--${safePresence}`} />
      </div>
      <div className="cp-card-info">
        <strong>{user.nickname || user.fullName}</strong>
        <span className="cp-card-handle">{getGenderLabel(user.gender, t)}</span>
        <small className="cp-card-bio">{user.address || t('addressEmptyCompact')}</small>
      </div>
      <div className="cp-card-actions">
        <button className="cp-btn cp-btn--ghost cp-btn--sm" onClick={() => onProfile(user)} type="button">
          <IdCard size={14} /> {t('profileBtn')}
        </button>
        <button
          className="cp-btn cp-btn--ghost cp-btn--sm"
          disabled={busyId === `message:${user.id}` || user.friendshipStatus === 'blocked'}
          onClick={() => onMessage(user)}
          type="button"
        >
          <MessageCircle size={14} />
          {busyId === `message:${user.id}` ? t('messageBusy') : t('messageBtn')}
        </button>
        {action}
      </div>
    </article>
  )
}

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

export function ContactsPanel({
  contactToOpen = null,
  onAccepted,
  onMessage,
  onProfileOpened,
  pushToast,
}: ContactsPanelProps) {
  const { t } = useTranslation('panels')
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
      pushToast(err instanceof Error ? err.message : t('contactsLoadErr'), 'error')
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
          .catch((err) => pushToast(err instanceof Error ? err.message : t('searchErr'), 'error'))
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
    if (keyword.length < 2) { setResults([]); setMessage(t('minSearchLen')); return }
    try {
      setIsLoading(true)
      setMessage('')
      updateContactsQuery(keyword)
      setResults(await searchUsers(keyword))
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('searchUserErr'), 'error')
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
    const isAccepting = user.friendshipStatus === 'pending' && user.requestDirection === 'incoming' && Boolean(user.contactId)
    
    if (user.friendshipStatus === 'pending' && !user.contactId) {
      pushToast(t('syncErr'), 'error')
      await loadDirectoryAndCurrentSearch()
      return
    }

    const actionKey = isCancelling ? `cancel:${user.contactId}` : isAccepting ? `accept:${user.contactId}` : `send:${user.id}`
    if (pendingContactActionsRef.current.has(actionKey)) return
    pendingContactActionsRef.current.add(actionKey)
    try {
      setBusyId(user.id)
      setMessage('')
      if (isCancelling && user.contactId) {
        await cancelFriendRequest(user.contactId)
        await loadDirectoryAndCurrentSearch()
        pushToast(t('reqCanceled'), 'info')
        return
      }
      if (isAccepting && user.contactId) {
        const res = await acceptFriendRequest(user.contactId)
        await loadDirectoryAndCurrentSearch()
        onAccepted(res.conversationId)
        return
      }
      await sendFriendRequest(user.id)
      await loadDirectoryAndCurrentSearch()
      pushToast(t('reqSent'), 'info')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('reqHandleErr'), 'error')
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
      await loadDirectoryAndCurrentSearch()
      onAccepted(res.conversationId)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('reqAcceptErr'), 'error')
    } finally { setBusyId('') }
  }

  async function handleDeclineRequest(request: ContactUser) {
    if (!request.contactId) return
    try {
      setBusyId(request.id)
      await declineFriendRequest(request.contactId)
      await loadDirectoryAndCurrentSearch()
      pushToast(t('reqRejected'), 'info')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('reqRejectErr'), 'error')
    } finally { setBusyId('') }
  }

  async function handleUnfriend(friend: ContactUser) {
    if (!friend.contactId) return
    try {
      setBusyId(friend.id)
      await unfriend(friend.contactId)
      await loadDirectoryAndCurrentSearch()
      pushToast(t('unfriended'), 'info')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('unfriendErr'), 'error')
    } finally { setBusyId('') }
  }

  async function handleMessageUser(user: ContactUser) {
    try {
      setBusyId(`message:${user.id}`)
      await onMessage(user)
      closeContactProfile()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('openChatErr'), 'error')
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
      title: t('unfriendConfirmTitle'),
      description: t('unfriendConfirm', { defaultValue: `Bạn sẽ hủy kết bạn với {{name}}. Hai bạn cần gửi lời mời lại nếu muốn kết bạn tiếp.`, name: friend.nickname || friend.fullName }),
      confirmLabel: t('unfriendConfirmBtn'),
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
          {t('contactsTitle')}
        </div>
        <h1 id="contacts-title">{t('contactsHeader')}</h1>
      </header>

      <form className="cp-search" onSubmit={handleSearch}>
        <span className="cp-search-icon"><Search size={16} /></span>
        <input
          className="cp-search-input"
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={t('searchPlaceholderContact')}
          value={query}
        />
        <button
          className="cp-btn cp-btn--primary cp-btn--sm"
          disabled={isLoading || query.trim().length < 2}
          type="submit"
        >
          {isLoading ? t('searchingBtn') : t('searchBtn')}
        </button>
      </form>

      {message && <p className="cp-search-hint">{message}</p>}

      <div className="cp-grid">
        <ContactSection
          icon={<Users size={15} />}
          title={t('friendsSection')}
          count={friends.length}
          emptyIcon={<Users size={28} strokeWidth={1.5} />}
          emptyText={t('noFriends')}
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
                  {busyId === friend.id ? t('processingBtn') : t('unfriendAction')}
                </button>
              }
            />
          ))}
        </ContactSection>

        <ContactSection
          icon={<UserPlus size={15} />}
          title={t('suggestionsSection')}
          count={suggestions.length}
          emptyIcon={<UserPlus size={28} strokeWidth={1.5} />}
          emptyText={t('noSuggestions')}
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
                  {busyId === user.id ? t('processingBtn') : getActionLabel(user, t)}
                </button>
              }
            />
          ))}
        </ContactSection>

        <ContactSection
          icon={<Search size={15} />}
          title={t('searchResultsSection')}
          count={results.length}
          emptyIcon={<SearchX size={28} strokeWidth={1.5} />}
          emptyText={t('noSearchResults')}
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
                  {busyId === user.id ? t('processingBtn') : getActionLabel(user, t)}
                </button>
              }
            />
          ))}
        </ContactSection>

        <ContactSection
          icon={<Inbox size={15} />}
          title={t('friendRequestsSection')}
          count={requests.length}
          emptyIcon={<Ghost size={28} strokeWidth={1.5} />}
          emptyText={t('noFriendRequests')}
        >
          {requests.map((request) => (
            <article className="cp-card" key={request.id}>
              <div className="cp-card-avatar-wrap">
                <AvatarFallback name={request.fullName} src={request.avatarUrl} />
              </div>
              <div className="cp-card-info">
                <strong>{request.fullName}</strong>
                <span className="cp-card-handle">{getGenderLabel(request.gender, t)}</span>
                <small className="cp-card-bio">{request.address || t('addressEmptyCompact')}</small>
              </div>
              <div className="cp-card-actions">
                <button className="cp-btn cp-btn--ghost cp-btn--sm" onClick={() => openContactProfile(request)} type="button">
                  <IdCard size={14} /> {t('profileBtn')}
                </button>
                <button className="cp-btn cp-btn--primary cp-btn--sm" disabled={busyId === request.id} onClick={() => handleAcceptRequest(request)} type="button">
                  <Check size={14} />
                  {busyId === request.id ? t('processing', { defaultValue: 'Đang xử lý...' }) : t('statusAcceptReq')}
                </button>
                <button className="cp-btn cp-btn--danger cp-btn--sm" disabled={busyId === request.id} onClick={() => handleDeclineRequest(request)} type="button">
                  <X size={14} /> {t('rejectBtn')}
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
