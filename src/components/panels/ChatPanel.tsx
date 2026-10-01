import type { ChangeEvent, FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import type { EmojiClickData } from 'emoji-picker-react'

import {
  ChevronDown,
  Download,
  FileText,
  Info,
  Menu,
  MessageSquare,
  Phone,
  PhoneMissed,
  Pin,
  Play,
  Pause,
  Video,
} from 'lucide-react'
import type { Conversation, Message, MessageAttachment } from '../../types'
import type { MessageSearchFilters, MessageSearchType } from '../../services/api/chatApi'
import { fetchGifs, type GifSearchResult } from '../../services/api/gifApi'
import { AttachmentPreviewOverlay, type PendingAttachment } from './AttachmentPreviewOverlay'
const CreatePollModal = lazy(() => import('./CreatePollModal').then(m => ({ default: m.CreatePollModal })))
import { MessageInput } from './MessageInput'
import { ChatStateContext, MessageActionContext, ChatUIContext, ChatInputContext } from './ChatContexts'
const GalleryViewer = lazy(() => import('./GalleryViewer').then(m => ({ default: m.GalleryViewer })))
const ForwardMessageModal = lazy(() => import('./ForwardMessageModal').then(m => ({ default: m.ForwardMessageModal })))
const PinnedMessagesDrawer = lazy(() => import('./PinnedMessagesDrawer').then(m => ({ default: m.PinnedMessagesDrawer })))
import { MessageSearchUi } from './MessageSearchUi'

import { MessageItem } from './MessageItem'


import { AvatarFallback } from '../ui/AvatarFallback'
import type { ConfirmDialogState } from '../ui/ConfirmDialog'
const ConfirmDialog = lazy(() => import('../ui/ConfirmDialog').then(m => ({ default: m.ConfirmDialog })))
import { OnlineDurationBadge } from '../ui/OnlineDurationBadge'


const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPE_PREFIXES = ['image/', 'audio/', 'video/']

import { Virtuoso } from 'react-virtuoso'

export function parseMessageDate(message?: Message) {
  const value = message?.createdAt || message?.updatedAt

  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

export function isSameLocalDay(left: Date | null, right: Date | null) {
  if (!left || !right) {
    return false
  }

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function formatDateHeader(date: Date | null, now = new Date()) {
  if (!date) {
    return ''
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDistance = Math.round((today.getTime() - targetDay.getTime()) / 86400000)

  if (dayDistance === 0) {
    return 'Hôm nay'
  }

  if (dayDistance === 1) {
    return 'Hôm qua'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatMessageTime(message: Message) {
  if (message.time === 'Bây giờ' || message.time === 'Đang gửi...') {
    return message.time
  }

  const date = parseMessageDate(message)
  
  if (date) {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return message.time
}

type ChatPanelProps = {
  activeConversation: Conversation
  busyMessageId?: string
  draft: string
  isBlocked?: boolean
  isDetailOpen?: boolean
  isSending?: boolean
  shouldAutoScrollToLatest?: boolean
  hasOlderMessages?: boolean
  isTyping?: boolean
  isLoadingOlderMessages?: boolean
  isUploadingAttachment?: boolean
  focusedMessageId?: string
  messages: Message[]
  pinnedMessages?: Message[]
  conversations: Conversation[]
  members?: {
    id: string
    userId: number
    fullName: string
    handle?: string | null
    nickname?: string | null
    avatarUrl: string | null
  }[]
  replyingTo?: Message | null
  onCancelReply: () => void
  onDeleteMessage: (messageId: string) => Promise<void> | void
  onRecallMessage: (messageId: string) => Promise<void> | void
  onDraftChange: (draft: string) => void
  onEditMessage: (messageId: string, text: string) => Promise<void> | void
  onForwardMessage: (messageId: string, targetConversationId: string) => Promise<void> | void
  onReportMessage: (messageId: string) => Promise<void> | void
  onReplyMessage: (message: Message) => void
  onRemoveReaction: (messageId: string, emoji: string) => Promise<void> | void
  onRetryMessage: (message: Message) => Promise<void> | void
  onSendGif: (gif: GifSearchResult) => Promise<void> | void
  onSendSticker?: (url: string) => Promise<void> | void
  onLoadOlderMessages: () => Promise<void> | void
  onSendQuickMessage: (text: string) => Promise<void> | void
  onAutoScrollComplete: () => void
  onToggleMessagePin: (messageId: string) => Promise<void> | void
  onToggleReaction: (messageId: string, emoji: string) => Promise<void> | void
  onUploadAttachment: (file: File) => Promise<void> | void
  onSearchMessages: (filters: MessageSearchFilters) => Promise<Message[]>
  onJumpToMessage: (messageId: string) => Promise<void> | void
  onToggleDetails: () => void
  onOpenContactProfile: () => void
  onOpenConversationList: () => void
  onStartCall: (type: 'audio' | 'video') => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  showReadReceipts?: boolean
  currentUserId?: string
  onSendPoll?: (poll: Omit<import('../../types').MessagePoll, 'id' | 'totalVotes' | 'isClosed'>) => Promise<void> | void
  onVotePoll?: (messageId: string, optionIds: string[]) => Promise<void> | void
}

export function ChatPanel({
  activeConversation,
  busyMessageId = '',
  draft,
  isBlocked = false,
  isDetailOpen = false,
  shouldAutoScrollToLatest = false,
  hasOlderMessages = false,
  isTyping = false,
  isLoadingOlderMessages = false,
  isUploadingAttachment = false,
  focusedMessageId = '',
  messages,
  pinnedMessages = [],
  conversations,
  members = [],
  replyingTo = null,
  onCancelReply,
  onDeleteMessage,
  onRecallMessage,
  onDraftChange,
  onEditMessage,
  onForwardMessage,
  onReportMessage,
  onReplyMessage,
  onRemoveReaction,
  onRetryMessage,
  onSendGif,
  onLoadOlderMessages,
  onSendQuickMessage,
  onAutoScrollComplete,
  onToggleMessagePin,
  onToggleReaction,
  onUploadAttachment,
  onSearchMessages,
  onJumpToMessage,
  onToggleDetails,
  onOpenContactProfile,
  onOpenConversationList,
  onStartCall,
  onSubmit,
  showReadReceipts = true,
  currentUserId,
  onSendPoll,
  onVotePoll,
  onSendSticker,
}: ChatPanelProps) {
  const [editingMessageId, setEditingMessageId] = useState('')
  const [editingText, setEditingText] = useState('')
  const [openActionMenuId, setOpenActionMenuId] = useState('')
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false)
  const [pinnedSearchQuery, setPinnedSearchQuery] = useState('')
  const [isComposerEmojiOpen, setIsComposerEmojiOpen] = useState(false)
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false)
  const [gifQuery, setGifQuery] = useState('')
  const [gifResults, setGifResults] = useState<GifSearchResult[]>([])
  const [isLoadingGifs, setIsLoadingGifs] = useState(false)
  const [gifError, setGifError] = useState('')
  const [openReactionPickerId, setOpenReactionPickerId] = useState('')
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null)
  const [isForwardDialogClosing, setIsForwardDialogClosing] = useState(false)
  const [forwardQuery, setForwardQuery] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [messageSearch, setMessageSearch] = useState('')
  const [searchDateFrom, setSearchDateFrom] = useState('')
  const [searchDateTo, setSearchDateTo] = useState('')
  const [searchSenderId, setSearchSenderId] = useState('')
  const [searchType, setSearchType] = useState<MessageSearchType>('all')
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [isSearchingMessages, setIsSearchingMessages] = useState(false)
  const [isSearchFilterOpen, setIsSearchFilterOpen] = useState(false)
  const [activeSearchIndex, setActiveSearchIndex] = useState(0)
  const [optimisticHiddenMessageIds, setOptimisticHiddenMessageIds] = useState<Set<string>>(new Set())
  const [isSharingLocation, setIsSharingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState('')
  const [galleryImage, setGalleryImage] = useState<MessageAttachment | null>(null)
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
  const [isAtLatestMessage, setIsAtLatestMessage] = useState(true)
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number; rotation: number }[]>([])
  const isAtLatestMessageRef = useRef(isAtLatestMessage)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const threadRef = useRef<HTMLDivElement | null>(null)
  const threadContentRef = useRef<HTMLDivElement | null>(null)
  const threadEndRef = useRef<HTMLDivElement | null>(null)
  const mentionQuery = useMemo(() => {
    const match = draft.match(/(?:^|\s)@([\p{L}\p{N}\s._-]{0,40})$/u)

    return match ? match[1].trim().toLocaleLowerCase('vi-VN') : null
  }, [draft])
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null || activeConversation.type !== 'group') {
      return []
    }

    return members
      .filter((member) => {
        const searchable = [member.handle, member.nickname, member.fullName].filter(Boolean).join(' ')

        return !mentionQuery || searchable.toLocaleLowerCase('vi-VN').includes(mentionQuery)
      })
      .slice(0, 5)
  }, [activeConversation.type, members, mentionQuery])
  const normalizedSearch = messageSearch.trim().toLocaleLowerCase('vi-VN')
  const hasSearchFilters = Boolean(
    normalizedSearch || searchDateFrom || searchDateTo || searchSenderId || searchType !== 'all',
  )
  const searchMatches = searchResults
  const activeSearchMessageId = searchMatches[activeSearchIndex]?.id ?? ''
  const forwardTargets = useMemo(() => {
    const normalizedForwardQuery = forwardQuery.trim().toLocaleLowerCase('vi-VN')

    return conversations
      .filter((conversation) => conversation.id !== activeConversation.id && !conversation.blocked)
      .filter((conversation) =>
        normalizedForwardQuery
          ? conversation.name.toLocaleLowerCase('vi-VN').includes(normalizedForwardQuery)
          : true,
      )
  }, [activeConversation.id, conversations, forwardQuery])

  const updateLatestMessageVisibility = useCallback(() => {
    const thread = threadRef.current

    if (!thread) {
      setIsAtLatestMessage(true)
      return
    }

    const distanceFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight

    setIsAtLatestMessage(distanceFromBottom <= 80)
  }, [])

  const scrollToLatestMessage = useCallback((behavior: ScrollBehavior = 'smooth') => {
    threadEndRef.current?.scrollIntoView({
      behavior,
      block: 'end',
    })
    window.setTimeout(updateLatestMessageVisibility, behavior === 'smooth' ? 240 : 0)
  }, [updateLatestMessageVisibility])

  function isSameMessageGroup(message: Message, sibling?: Message) {
    if (!sibling || message.author === 'system' || sibling.author === 'system') {
      return false
    }

    const sameAuthor =
      message.author === sibling.author &&
      (message.author === 'me' || (message.senderName || '') === (sibling.senderName || ''))

    if (!sameAuthor) return false

    const date1 = parseMessageDate(message)
    const date2 = parseMessageDate(sibling)

    if (!date1 || !date2) return false

    const timeDiffMs = Math.abs(date1.getTime() - date2.getTime())
    const isWithinTimeWindow = timeDiffMs <= 5 * 60 * 1000 

    return isSameLocalDay(date1, date2) && isWithinTimeWindow
  }

  function getDateDividerLabel(message: Message, previousMessage?: Message) {
    const messageDate = parseMessageDate(message)
    const previousDate = parseMessageDate(previousMessage)

    if (!messageDate || isSameLocalDay(messageDate, previousDate)) {
      return ''
    }

    return formatDateHeader(messageDate)
  }

  useEffect(() => {
    setActiveSearchIndex(0)
  }, [normalizedSearch, searchDateFrom, searchDateTo, searchSenderId, searchType])

  useEffect(() => {
    if (activeSearchIndex >= searchMatches.length) {
      setActiveSearchIndex(0)
    }
  }, [activeSearchIndex, searchMatches.length])

  useEffect(() => {
    setOptimisticHiddenMessageIds(new Set())
  }, [activeConversation.id])

  const displayMessages = useMemo(() => {
    if (optimisticHiddenMessageIds.size === 0) {
      return messages
    }
    return messages.filter((m) => !optimisticHiddenMessageIds.has(m.id))
  }, [messages, optimisticHiddenMessageIds])

  useEffect(() => {
    if (!activeSearchMessageId) {
      return
    }

    messageRefs.current[activeSearchMessageId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [activeSearchMessageId])

  useEffect(() => {
    if (!focusedMessageId) {
      return
    }

    messageRefs.current[focusedMessageId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [focusedMessageId])

  useEffect(() => {
    if (!shouldAutoScrollToLatest) {
      return
    }

    scrollToLatestMessage('auto')
    onAutoScrollComplete()
  }, [onAutoScrollComplete, scrollToLatestMessage, shouldAutoScrollToLatest])

  useEffect(() => {
    isAtLatestMessageRef.current = isAtLatestMessage
  }, [isAtLatestMessage])

  useEffect(() => {
    const threadContent = threadContentRef.current
    if (!threadContent) {
      return
    }

    const observer = new ResizeObserver(() => {
      if (isAtLatestMessageRef.current) {
        scrollToLatestMessage('auto')
      }
    })

    observer.observe(threadContent)
    return () => observer.disconnect()
  }, [scrollToLatestMessage])

  useEffect(() => {
    window.requestAnimationFrame(updateLatestMessageVisibility)
  }, [activeConversation.id, messages.length, updateLatestMessageVisibility])

  useEffect(() => {
    if (!isGifPickerOpen) {
      return
    }

    let isMounted = true
    const timer = window.setTimeout(() => {
      setIsLoadingGifs(true)
      setGifError('')

      fetchGifs(gifQuery)
        .then((results) => {
          if (isMounted) {
            setGifResults(results)
          }
        })
        .catch((error) => {
          if (isMounted) {
            setGifResults([])
            setGifError(error instanceof Error ? error.message : 'Không thể tải GIF!')
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingGifs(false)
          }
        })
    }, 320)

    return () => {
      isMounted = false
      window.clearTimeout(timer)
    }
  }, [gifQuery, isGifPickerOpen])



  function handleDraftChange(event: ChangeEvent<HTMLInputElement>) {
    onDraftChange(event.target.value)
  }

  function insertMention(label: string) {
    const nextDraft = draft.replace(/(?:^|\s)@([\p{L}\p{N}\s._-]{0,40})$/u, (match) => {
      const prefix = match.startsWith(' ') ? ' ' : ''

      return `${prefix}@${label} `
    })

    onDraftChange(nextDraft)
  }

  async function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files

    if (!files || files.length === 0) {
      return
    }

    const validFiles: File[] = []
    let hasInvalidFiles = false

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (isSupportedAttachment(file)) {
        validFiles.push(file)
      } else {
        hasInvalidFiles = true
      }
    }

    if (validFiles.length === 0) {
      setAttachmentError('Chỉ hỗ trợ gửi tệp hình ảnh tối đa 2MB!')
      event.target.value = ''
      return
    }

    if (hasInvalidFiles) {
      setAttachmentError('Một số tệp bị loại bỏ do định dạng không hỗ trợ hoặc vượt quá 2MB!')
    } else {
      setAttachmentError('')
    }

    const newAttachments = validFiles.map(file => {
      const type = file.type.startsWith('image/') ? 'image' 
        : file.type.startsWith('video/') ? 'video' 
        : file.type.startsWith('audio/') ? 'audio' 
        : 'file'
      return {
        id: Math.random().toString(36).substring(7),
        file,
        url: URL.createObjectURL(file),
        type,
        size: file.size,
        viewOnce: false,
        rotation: 0
      } as PendingAttachment
    })

    setPendingAttachments(current => [...current, ...newAttachments])

    event.target.value = ''
  }

  async function handleSendPendingAttachments() {
    for (const attachment of pendingAttachments) {
      if (attachment.type === 'image' && attachment.rotation) {
        try {
          const rotatedFile = await rotateImageFile(attachment.file, attachment.rotation)
          await onUploadAttachment(rotatedFile)
        } catch (error) {
          await onUploadAttachment(attachment.file)
        }
      } else {
        await onUploadAttachment(attachment.file)
      }
    }
    setPendingAttachments([])
  }

  function rotateImageFile(file: File, rotation: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new globalThis.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject('No context')
        
        if (rotation === 90 || rotation === 270) {
          canvas.width = img.height
          canvas.height = img.width
        } else {
          canvas.width = img.width
          canvas.height = img.height
        }
        
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: file.type }))
          } else {
            reject('Canvas toBlob failed')
          }
        }, file.type)
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  function handleUpdatePendingAttachment(id: string, updates: Partial<PendingAttachment>) {
    setPendingAttachments(current => current.map(att => att.id === id ? { ...att, ...updates } : att))
  }

  function handleRemovePendingAttachment(id: string) {
    setPendingAttachments(current => current.filter(att => att.id !== id))
  }

  function isSupportedAttachment(file: File) {
    if (file.size === 0 || file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return false
    }

    return ALLOWED_ATTACHMENT_TYPE_PREFIXES.some((typePrefix) => file.type.startsWith(typePrefix))
  }

  const handleSpawnReaction = useCallback((emoji: string) => {
    const newReaction = {
      id: Math.random().toString(36).substring(7),
      emoji,
      x: (Math.random() - 0.5) * 100, // random offset
      rotation: (Math.random() - 0.5) * 45 // random rotation
    }
    setFloatingReactions(current => [...current, newReaction])
    
    // Auto cleanup after animation
    setTimeout(() => {
      setFloatingReactions(current => current.filter(r => r.id !== newReaction.id))
    }, 1500)
  }, [])

  const handleSendQuickEmoji = useCallback((emoji: string) => {
    onSendQuickMessage(emoji)
  }, [onSendQuickMessage])







  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Trình duyệt không hỗ trợ vị trí!')
      return
    }

    setIsSharingLocation(true)
    setLocationError('')

    const fetchIpLocation = async () => {
      try {
        const response = await fetch('https://get.geojs.io/v1/ip/geo.json')
        const data = await response.json()
        if (data.latitude && data.longitude) {
          const mapsUrl = `https://www.google.com/maps?q=${data.latitude},${data.longitude}`
          void onSendQuickMessage(`Vị trí (ước tính qua IP): ${mapsUrl}`)
          setIsSharingLocation(false)
        } else {
          throw new Error('No location data')
        }
      } catch (err) {
        setIsSharingLocation(false)
        setLocationError('Không thể lấy vị trí thiết bị!')
      }
    }

    const tryLowAccuracy = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsSharingLocation(false)
          const { latitude, longitude } = position.coords
          const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
          void onSendQuickMessage(`📍 Vị trí hiện tại: ${mapsUrl}`)
        },
        (error) => {
          if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
            void fetchIpLocation()
          } else {
            setIsSharingLocation(false)
            let errMsg = 'Không thể lấy vị trí!'
            if (error.code === error.PERMISSION_DENIED) errMsg = 'Bạn đã từ chối quyền truy cập vị trí!'
            setLocationError(errMsg)
          }
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      )
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsSharingLocation(false)
        const { latitude, longitude } = position.coords
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
        void onSendQuickMessage(`📍 Vị trí chính xác: ${mapsUrl}`)
      },
      (error) => {
        if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
          tryLowAccuracy()
        } else {
          setIsSharingLocation(false)
          let errMsg = 'Không thể lấy vị trí!'
          if (error.code === error.PERMISSION_DENIED) errMsg = 'Bạn đã từ chối quyền truy cập vị trí!'
          setLocationError(errMsg)
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }




  function startEditing(message: Message) {
    setEditingMessageId(message.id)
    setEditingText(message.text)
    setOpenActionMenuId('')
    setOpenReactionPickerId('')
  }

  function startReplying(message: Message) {
    onReplyMessage(message)
    setOpenActionMenuId('')
    setOpenReactionPickerId('')
  }

  function startForwarding(message: Message) {
    setIsForwardDialogClosing(false)
    setForwardingMessage(message)
    setForwardQuery('')
    setOpenActionMenuId('')
    setOpenReactionPickerId('')
  }

  function closeForwardDialog() {
    setIsForwardDialogClosing(true)
    window.setTimeout(() => {
      setForwardingMessage(null)
      setForwardQuery('')
      setIsForwardDialogClosing(false)
    }, 140)
  }

  function cancelEditing() {
    setEditingMessageId('')
    setEditingText('')
  }

  async function handleConfirmDialog() {
    if (!confirmDialog || isConfirming) {
      return
    }

    try {
      setIsConfirming(true)
      await confirmDialog.onConfirm()
      setConfirmDialog(null)
    } finally {
      setIsConfirming(false)
    }
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>, message: Message) {
    event.preventDefault()

    const text = editingText.trim()

    if (!text || text === message.text) {
      cancelEditing()
      return
    }

    setConfirmDialog({
      title: 'Cập nhật tin nhắn?',
      description: 'Nội dung tin nhắn sẽ được thay đổi và hiển thị trạng thái đã chỉnh sửa.',
      confirmLabel: 'Lưu thay đổi',
      onConfirm: () => {
        Promise.resolve(onEditMessage(message.id, text)).catch(console.error)
        cancelEditing()
      },
    })
  }

  function handleDeleteForMe(message: Message) {
    if (editingMessageId === message.id) {
      cancelEditing()
    }

    setOpenActionMenuId('')
    setOptimisticHiddenMessageIds((prev) => new Set(prev).add(message.id))

    Promise.resolve(onDeleteMessage(message.id)).catch(() => {
      setOptimisticHiddenMessageIds((prev) => {
        const next = new Set(prev)
        next.delete(message.id)
        return next
      })
    })
  }

  function handleRecall(message: Message) {
    if (editingMessageId === message.id) {
      cancelEditing()
    }

    setOpenActionMenuId('')
    setOptimisticHiddenMessageIds((prev) => new Set(prev).add(message.id))

    Promise.resolve(onRecallMessage(message.id)).catch(() => {
      setOptimisticHiddenMessageIds((prev) => {
        const next = new Set(prev)
        next.delete(message.id)
        return next
      })
    })
  }

  async function handleTogglePin(messageId: string) {
    setOpenActionMenuId('')
    const message = messages.find((m) => m.id === messageId)
    await onToggleMessagePin(messageId)
    if (message) {
      if (message.isPinned) {
        void onSendQuickMessage(`Đã bỏ ghim một tin nhắn`)
      } else {
        void onSendQuickMessage(`Đã ghim một tin nhắn`)
      }
    }
  }

  function handleReport(message: Message) {
    setConfirmDialog({
      title: 'Báo cáo tin nhắn?',
      description: 'Báo cáo sẽ được gửi đến admin để xem xét nội dung vi phạm!',
      confirmLabel: 'Gửi báo cáo',
      tone: 'danger',
      onConfirm: () => {
        setOpenActionMenuId('')
        Promise.resolve(onReportMessage(message.id)).catch(console.error)
      },
    })
  }

  async function handleForward(targetConversationId: string) {
    if (!forwardingMessage) {
      return
    }

    await onForwardMessage(forwardingMessage.id, targetConversationId)
    closeForwardDialog()
  }

  async function handleToggleReaction(messageId: string, emoji: string) {
    setOpenReactionPickerId('')
    await onToggleReaction(messageId, emoji)
  }

  async function handleReactionBadgeClick(message: Message, emoji: string, reactedByMe: boolean) {
    if (reactedByMe) {
      await onRemoveReaction(message.id, emoji)
      return
    }

    await onToggleReaction(message.id, emoji)
  }

  async function handleSendComposerEmoji(emojiData: EmojiClickData) {
    setIsComposerEmojiOpen(false)
    await onSendQuickMessage(emojiData.emoji)
  }

  async function handleSendGif(gif: GifSearchResult) {
    await onSendGif(gif)
    setIsGifPickerOpen(false)
    setGifQuery('')
  }

  function getMessageStateLabel(message: Message) {
    if (message.state === 'sending') {
      return 'Đang gửi...'
    }

    if (message.state === 'failed') {
      return 'Gửi lỗi!'
    }

    if (message.state === 'seen') {
      if (!showReadReceipts || activeConversation.restricted) {
        return 'Đã nhận!'
      }
      
      const timeToParse = message.readAt || message.seenAt
      if (timeToParse) {
        const readDate = new Date(timeToParse)
        if (!Number.isNaN(readDate.getTime())) {
          const formattedTime = readDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          return `Đã xem lúc ${formattedTime}!`
        }
      }
      
      return message.seenAt ? `Đã xem lúc ${message.seenAt}!` : 'Đã xem!'
    }

    if (message.state === 'delivered') {
      return 'Đã nhận!'
    }

    return 'Đã gửi!'
  }

  async function moveSearchResult(direction: 'next' | 'previous') {
    if (searchMatches.length === 0) {
      return
    }

    const nextIndex =
      direction === 'next'
        ? (activeSearchIndex + 1) % searchMatches.length
        : (activeSearchIndex - 1 + searchMatches.length) % searchMatches.length

    await jumpToSearchResult(nextIndex)
  }

  async function runAdvancedSearch() {
    if (!hasSearchFilters || isSearchingMessages) {
      setSearchResults([])
      return
    }

    setIsSearchingMessages(true)

    try {
      const results = await onSearchMessages({
        query: messageSearch,
        dateFrom: searchDateFrom,
        dateTo: searchDateTo,
        senderId: searchSenderId,
        type: searchType,
        limit: 50,
      })

      setSearchResults(results)
      setActiveSearchIndex(0)

      if (results[0]) {
        await onJumpToMessage(results[0].id)
      }
    } finally {
      setIsSearchingMessages(false)
    }
  }

  async function jumpToSearchResult(index: number) {
    const result = searchMatches[index]

    if (!result) {
      return
    }

    setActiveSearchIndex(index)
    await onJumpToMessage(result.id)
  }

  function linkifyText(text: string) {
    if (!text) return text
    const urlRegex = /(https?:\/\/[^\s]+)/g
    if (!urlRegex.test(text)) {
      return text
    }
    const parts = text.split(urlRegex)
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="message-link">
            {part}
          </a>
        )
      }
      return part
    })
  }

  function renderHighlightedText(message: Message) {
    if (!normalizedSearch) {
      const mentionNames = message.mentions?.flatMap((mention) => [
        mention.fullName,
        mention.handle ? mention.handle : '',
      ]).filter(Boolean) ?? []
      const pattern = mentionNames.length
        ? new RegExp(
          `(@(?:${mentionNames
            .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|')}))`,
          'giu',
        )
        : null

      if (!pattern) {
        return linkifyText(message.text)
      }

      return message.text.split(pattern).map((part, index) => {
        pattern.lastIndex = 0

        return pattern.test(part) ? (
          <mark className="mention-highlight" key={`${part}-${index}`}>
            {part}
          </mark>
        ) : (
          linkifyText(part)
        )
      })
    }

    const lowerText = message.text.toLocaleLowerCase('vi-VN')
    const matchIndex = lowerText.indexOf(normalizedSearch)

    if (matchIndex === -1) {
      return linkifyText(message.text)
    }

    const before = message.text.slice(0, matchIndex)
    const match = message.text.slice(matchIndex, matchIndex + normalizedSearch.length)
    const after = message.text.slice(matchIndex + normalizedSearch.length)

    return (
      <>
        {linkifyText(before)}
        <mark>{match}</mark>
        {linkifyText(after)}
      </>
    )
  }

  function getReplyAuthorLabel(message: Message | NonNullable<Message['replyTo']>) {
    if (message.author === 'me') {
      return 'Bạn'
    }

    return message.senderName || activeConversation.name
  }

  function getReplyText(message: Message | NonNullable<Message['replyTo']>) {
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

  function scrollToMessage(messageId: string) {
    messageRefs.current[messageId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  function renderReplyPreview(message: NonNullable<Message['replyTo']>) {
    return (
      <button
        className="message-reply-preview"
        onClick={() => scrollToMessage(message.id)}
        title="Mở tin nhắn gốc"
        type="button"
      >
        <strong>{getReplyAuthorLabel(message)}</strong>
        <span>{getReplyText(message)}</span>
      </button>
    )
  }

  function isPdfAttachment(attachment: MessageAttachment) {
    return attachment.mimeType === 'application/pdf'
  }

  function isVideoAttachment(attachment: MessageAttachment) {
    return attachment.mimeType.startsWith('video/')
  }

  function renderDownloadLink(attachment: MessageAttachment) {
    return (
      <a
        className="attachment-download-button"
        download={attachment.name}
        href={attachment.url}
        rel="noreferrer"
        target="_blank"
        title="Tải xuống"
      >
        <Download size={15} />
        <span>Tải xuống</span>
      </a>
    )
  }

  function renderCallMessage(message: Message) {
    if (!message.text) return null
    const text = message.text
    
    let title = 'Cuộc gọi'
    let subtitle = ''
    let isMissed = false
    let isVideo = false
    
    if (text.includes('video')) isVideo = true
    
    if (text.includes('Không bắt máy') || text.includes('nhỡ')) {
      title = `Đã nhỡ cuộc gọi ${isVideo ? 'video' : 'thoại'}`
      subtitle = formatMessageTime(message)
      isMissed = true
    } else if (text.includes('Thời lượng')) {
      title = `Cuộc gọi ${isVideo ? 'video' : 'thoại'}`
      const match = text.match(/Thời lượng:\s*(.+)/) || text.match(/Thời lượng\s*(.+)/)
      subtitle = match ? match[1] : formatMessageTime(message)
    } else if (text.includes('Đã hủy')) {
      title = `Đã hủy cuộc gọi ${isVideo ? 'video' : 'thoại'}`
      subtitle = formatMessageTime(message)
    }
    
    return (
      <div className={`message-call-card ${isMissed ? 'is-missed' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="call-icon">
            {isMissed ? <PhoneMissed size={20} /> : (isVideo ? <Video size={20} /> : <Phone size={20} />)}
          </div>
          <div className="call-info">
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </div>
        </div>
        <button 
          className="call-action-btn"
          onClick={() => onStartCall(isVideo ? 'video' : 'audio')}
          type="button"
        >
          Gọi lại
        </button>
      </div>
    )
  }

  function renderAttachmentPreview(attachment: MessageAttachment) {
    if (attachment.type === 'image') {
      return (
        <div className="message-image-attachment" key={attachment.url}>
          <button
            className="message-image-link"
            onClick={() => setGalleryImage(attachment)}
            title={attachment.name}
            type="button"
          >
            <img alt={attachment.name} src={attachment.url} />
          </button>
        </div>
      )
    }

    if (attachment.type === 'audio') {
      const heights = [20, 40, 60, 30, 80, 50, 90, 70, 40, 60, 30, 80, 50, 90, 70, 40, 60, 30, 20, 10]
      const safeId = `audio-${attachment.url.replace(/[^a-zA-Z0-9]/g, '')}`
      return (
        <div className="message-audio-attachment custom-audio-player" key={attachment.url}>
          <button 
            className="audio-play-btn"
            onClick={() => {
               const audio = document.getElementById(safeId) as HTMLAudioElement
               if (audio) {
                 if (audio.paused) {
                   audio.play()
                   setPlayingAudioId(attachment.url)
                 } else {
                   audio.pause()
                   setPlayingAudioId(null)
                 }
               }
            }}
            type="button"
          >
            {playingAudioId === attachment.url ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <div className="audio-waveform">
             {heights.map((h, i) => (
               <div key={i} className="waveform-bar" style={{ height: `${h}%` }}></div>
             ))}
          </div>
          <span className="audio-duration">{attachment.meta || '0:05'}</span>
          <audio 
            id={safeId} 
            src={attachment.url} 
            style={{ display: 'none' }} 
            onEnded={() => setPlayingAudioId(null)}
          />
        </div>
      )
    }

    if (isVideoAttachment(attachment)) {
      return (
        <div className="message-video-attachment" key={attachment.url}>
          <video controls preload="metadata" src={attachment.url} />
          <div className="attachment-toolbar">
            <span>{attachment.name}</span>
            {renderDownloadLink(attachment)}
          </div>
        </div>
      )
    }

    if (isPdfAttachment(attachment)) {
      return (
        <div className="message-pdf-attachment" key={attachment.url}>
          <iframe src={attachment.url} title={attachment.name} />
          <div className="attachment-toolbar">
            <span>{attachment.name}</span>
            <a href={attachment.url} rel="noreferrer" target="_blank">
              Xem PDF
            </a>
            {renderDownloadLink(attachment)}
          </div>
        </div>
      )
    }

    return (
      <div className="message-file-link" key={attachment.url}>
        <FileText size={17} />
        <span>
          <strong>{attachment.name}</strong>
          <small>{attachment.meta}</small>
        </span>
        {renderDownloadLink(attachment)}
      </div>
    )
  }

  function shouldRenderMessageText(message: Message) {
    if (!message.text) {
      return false
    }

    return !message.attachments?.some((attachment) => attachment.name === message.text)
  }

  function renderImageGallery(images: MessageAttachment[]) {
    if (images.length === 1) {
      return renderAttachmentPreview(images[0])
    }

    const gridClass = `message-image-gallery gallery-count-${images.length > 4 ? 'many' : images.length}`

    return (
      <div className={gridClass}>
        {images.map((img) => (
          <button
            key={img.url}
            className="gallery-image-link"
            onClick={() => setGalleryImage(img)}
            title={img.name}
            type="button"
          >
            <img alt={img.name} src={img.url} />
          </button>
        ))}
      </div>
    )
  }

  function renderAttachments(message: Message) {
    if (!message.attachments?.length) {
      return null
    }
    
    const isGif = (a: MessageAttachment) => a.mimeType === 'image/gif' || a.name.toLowerCase().endsWith('.gif') || a.url.toLowerCase().includes('.gif')

    const imageAttachments = message.attachments.filter((a) => a.type === 'image' && !isGif(a))
    const otherAttachments = message.attachments.filter((a) => !(a.type === 'image' && !isGif(a)))

    return (
      <div className="message-attachments">
        {imageAttachments.length > 0 && renderImageGallery(imageAttachments)}
        {otherAttachments.map((attachment) => renderAttachmentPreview(attachment))}
      </div>
    )
  }

  function renderReactions(message: Message) {
    if (!message.reactions?.length) {
      return null
    }

    return (
      <div className="message-reactions">
        {message.reactions.map((reaction) => (
          <button
            className={reaction.reactedByMe ? 'message-reaction is-mine' : 'message-reaction'}
            disabled={busyMessageId === message.id}
            key={reaction.emoji}
            onClick={() =>
              handleReactionBadgeClick(message, reaction.emoji, reaction.reactedByMe)
            }
            title={reaction.reactedByMe ? 'Thu hồi reaction' : 'reaction'}
            type="button"
          >
            <span>{reaction.emoji}</span>
            <strong>{reaction.count}</strong>
          </button>
        ))}
      </div>
    )
  }

  return (
    <ChatStateContext.Provider value={{
      activeConversation, currentUserId, members: members as any, searchMatches,
      activeSearchMessageId, focusedMessageId, editingMessageId, busyMessageId,
      editingText, openActionMenuId, openReactionPickerId
    }}>
      <MessageActionContext.Provider value={{
        startReplying, startForwarding, handleDeleteForMe, handleRecall, handleReport,
        handleTogglePin, onRetryMessage, handleToggleReaction, startEditing, cancelEditing,
        setEditingText, handleEditSubmit, onVotePoll
      }}>
        <ChatUIContext.Provider value={{
          getDateDividerLabel, isSameMessageGroup, messageRefs, renderCallMessage,
          renderHighlightedText, shouldRenderMessageText, renderReplyPreview,
          getMessageStateLabel, formatMessageTime, renderAttachments, renderReactions,
          isSameLocalDay, parseMessageDate, setOpenActionMenuId, setOpenReactionPickerId
        }}>
    <section className="chat-panel" aria-label={`Hội thoại với ${activeConversation.name}`} style={activeConversation.backgroundImage ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url("${activeConversation.backgroundImage}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}>
      <header className="chat-header">
        <div className="chat-identity">
          <button
            className="mobile-menu icon-button"
            onClick={onOpenConversationList}
            title="Mở danh sách"
            type="button"
          >
            <Menu size={20} />
          </button>
          <button
            className="chat-profile-trigger"
            disabled={activeConversation.type !== 'direct'}
            onClick={onOpenContactProfile}
            title="Xem hồ sơ liên hệ"
            type="button"
          >
            <span className="avatar-wrap compact">
              <AvatarFallback name={activeConversation.name} src={activeConversation.avatar} />
              {!activeConversation.restricted ? (
                <>
                  <span className={`presence-dot ${activeConversation.presence}`} />
                  <OnlineDurationBadge
                    compact
                    onlineSince={activeConversation.onlineSince}
                    status={activeConversation.status}
                    presence={activeConversation.presence}
                  />
                </>
              ) : null}
            </span>
            <span className="chat-profile-copy">
              <h2>{activeConversation.name}</h2>
              <p>{activeConversation.restricted ? 'Ngoại tuyến' : activeConversation.status}</p>
            </span>
          </button>
        </div>

        <MessageSearchUi
          messageSearch={messageSearch}
          setMessageSearch={setMessageSearch}
          isSearchFilterOpen={isSearchFilterOpen}
          setIsSearchFilterOpen={setIsSearchFilterOpen}
          searchDateFrom={searchDateFrom}
          setSearchDateFrom={setSearchDateFrom}
          searchDateTo={searchDateTo}
          setSearchDateTo={setSearchDateTo}
          searchSenderId={searchSenderId}
          setSearchSenderId={setSearchSenderId}
          searchType={searchType}
          setSearchType={setSearchType}
          members={members as any}
          hasSearchFilters={hasSearchFilters}
          isSearchingMessages={isSearchingMessages}
          runAdvancedSearch={runAdvancedSearch}
          searchMatchesLength={searchMatches.length}
          activeSearchIndex={activeSearchIndex}
          moveSearchResult={moveSearchResult}
          clearSearch={() => {
            setMessageSearch('')
            setSearchDateFrom('')
            setSearchDateTo('')
            setSearchSenderId('')
            setSearchType('all')
            setSearchResults([])
          }}
        />

        <div className="header-actions">
          <button
            className="icon-button"
            disabled={isBlocked || activeConversation.restricted}
            onClick={() => onStartCall('video')}
            title="Gọi video"
            type="button"
          >
            <Video size={20} />
          </button>
          <button
            className="icon-button"
            disabled={isBlocked || activeConversation.restricted}
            onClick={() => onStartCall('audio')}
            title="Gọi audio"
            type="button"
          >
            <Phone size={20} />
          </button>

          <button
            className={isDetailOpen ? 'icon-button is-active' : 'icon-button'}
            onClick={onToggleDetails}
            title="Thông tin hội thoại"
            type="button"
          >
            <Info size={20} />
          </button>
        </div>
      </header>

      {pinnedMessages.length > 0 ? (
        <div className="chat-pinned-messages" aria-label="Tin nhắn đã ghim">
          {pinnedMessages.slice(0, 3).map((message) => (
            <button
              className="chat-pinned-message"
              disabled={Boolean(busyMessageId)}
              key={message.id}
              onClick={() => onJumpToMessage(message.id)}
              title="Mở tin nhắn đã ghim"
              type="button"
            >
              <Pin size={14} />
              <span>
                <strong>{getReplyAuthorLabel(message)}</strong>
                <small>
                  {getReplyText(message)}
                  {message.pinnedBy && message.pinnedAt && (
                    <span style={{ display: 'block', color: 'var(--subtle)', fontSize: '0.85em', marginTop: '2px' }}>
                      Ghim bởi {message.pinnedBy} lúc {new Date(message.pinnedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </small>
              </span>
            </button>
          ))}
          {pinnedMessages.length > 3 ? (
            <button
              className="chat-pinned-more"
              onClick={() => setIsPinnedModalOpen(true)}
              title="Xem tất cả tin nhắn đã ghim"
              type="button"
            >
              +{pinnedMessages.length - 3}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="thread" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Virtuoso
          className="thread-virtuoso"
          data={displayMessages}
          firstItemIndex={0}
          initialTopMostItemIndex={displayMessages.length > 0 ? displayMessages.length - 1 : 0}
          followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
          alignToBottom
          startReached={onLoadOlderMessages}
          components={{
            Header: () => (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {hasOlderMessages ? (
                  <button
                    className="load-older-messages-button"
                    disabled={isLoadingOlderMessages}
                    onClick={onLoadOlderMessages}
                    type="button"
                  >
                    {isLoadingOlderMessages ? 'Đang tải tin cũ...' : 'Tải tin nhắn cũ hơn'}
                  </button>
                ) : null}

                {displayMessages.length === 0 && activeConversation.type !== 'group' ? (
                  <div className="thread-empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <MessageSquare size={48} strokeWidth={1.5} style={{ opacity: 0.2 }} />
                      <span style={{ color: 'var(--subtle)' }}>Hãy bắt đầu cuộc trò chuyện cùng với {activeConversation.name} nào!</span>
                    </div>
                  </div>
                ) : null}
              </div>
            ),
            Footer: () => (
              <div style={{ paddingBottom: '32px' }}>
                {isTyping ? (
                  <div className="typing-indicator" aria-live="polite">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <strong>{activeConversation.name} đang nhập...</strong>
                  </div>
                ) : null}
              </div>
            )
          }}
          itemContent={(index, message) => (
            <MessageItem index={index} message={message} displayMessages={displayMessages} />
          )}
        />
      </div>

      {!isAtLatestMessage ? (
        <button
          className="scroll-to-latest-button"
          onClick={() => scrollToLatestMessage('smooth')}
          title="Cuộn xuống tin nhắn mới nhất"
          type="button"
        >
          <ChevronDown size={20} />
        </button>
      ) : null}

      {pendingAttachments.length > 0 && (
        <AttachmentPreviewOverlay
          attachments={pendingAttachments}
          onClose={() => setPendingAttachments([])}
          onRemove={handleRemovePendingAttachment}
          onUpdate={handleUpdatePendingAttachment}
          onSend={handleSendPendingAttachments}
        />
      )}

      <ChatInputContext.Provider value={{
        onSubmit,
        replyingTo,
        getReplyAuthorLabel,
        getReplyText,
        onCancelReply,
        isUploadingAttachment,
        locationError,
        attachmentError,
        isBlocked,
        mentionSuggestions,
        insertMention,
        handleAttachmentChange,
        handleDraftChange,
        activeConversation,
        draft,
        isComposerEmojiOpen,
        setIsGifPickerOpen,
        setIsComposerEmojiOpen,
        handleSendComposerEmoji,
        isGifPickerOpen,
        gifQuery,
        setGifQuery,
        gifError,
        isLoadingGifs,
        gifResults,
        handleSendGif,
        isSharingLocation,
        handleShareLocation,
        setIsPollModalOpen,
        onUploadAttachment,
        onSpawnReaction: handleSpawnReaction,
        onSendQuickEmoji: handleSendQuickEmoji,
        onSendSticker
      }}>
        <MessageInput />
      </ChatInputContext.Provider>

      {floatingReactions.map(reaction => (
        <span
          key={reaction.id}
          className="floating-reaction"
          style={{
            '--end-x': `${reaction.x}px`,
            '--end-rot': `${reaction.rotation}deg`
          } as React.CSSProperties}
        >
          {reaction.emoji}
        </span>
      ))}

      {forwardingMessage && (
        <Suspense fallback={null}>
          <ForwardMessageModal
            forwardingMessage={forwardingMessage}
            isForwardDialogClosing={isForwardDialogClosing}
            closeForwardDialog={closeForwardDialog}
            getReplyText={getReplyText}
            forwardQuery={forwardQuery}
            setForwardQuery={setForwardQuery}
            forwardTargets={forwardTargets}
            handleForward={handleForward}
          />
        </Suspense>
      )}
      {galleryImage && (
        <Suspense fallback={null}>
          <GalleryViewer
            galleryImage={galleryImage}
            setGalleryImage={setGalleryImage}
            renderDownloadLink={renderDownloadLink}
          />
        </Suspense>
      )}
      {isPinnedModalOpen && (
        <Suspense fallback={null}>
          <PinnedMessagesDrawer
            isPinnedModalOpen={isPinnedModalOpen}
            setIsPinnedModalOpen={setIsPinnedModalOpen}
            pinnedMessages={pinnedMessages}
            pinnedSearchQuery={pinnedSearchQuery}
            setPinnedSearchQuery={setPinnedSearchQuery}
            getReplyText={getReplyText}
            getReplyAuthorLabel={getReplyAuthorLabel}
            handleTogglePin={handleTogglePin}
            onJumpToMessage={onJumpToMessage}
          />
        </Suspense>
      )}
      {confirmDialog && (
        <Suspense fallback={null}>
          <ConfirmDialog
            dialog={confirmDialog}
            isWorking={isConfirming}
            onCancel={() => setConfirmDialog(null)}
            onConfirm={handleConfirmDialog}
          />
        </Suspense>
      )}
      
      {isPollModalOpen && (
        <CreatePollModal 
          onClose={() => setIsPollModalOpen(false)} 
          onSubmit={(pollData) => {
            setIsPollModalOpen(false)
            if (onSendPoll) {
              void onSendPoll(pollData)
            }
          }} 
        />
      )}
          </section>
        </ChatUIContext.Provider>
      </MessageActionContext.Provider>
    </ChatStateContext.Provider>
  )
}
