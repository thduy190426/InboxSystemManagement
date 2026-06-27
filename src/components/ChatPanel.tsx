import type { ChangeEvent, FormEvent } from 'react'
import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react'
import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Info,
  Menu,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Phone,
  Pin,
  PinOff,
  Reply,
  Search,
  Send,
  SendHorizontal,
  Smile,
  Square,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import type { Conversation, Message, MessageAttachment } from '../types'
import { AvatarFallback } from './AvatarFallback'
import { ConfirmDialog, type ConfirmDialogState } from './ConfirmDialog'
import { OnlineDurationBadge } from './OnlineDurationBadge'

const EmojiPicker = lazy(() => import('emoji-picker-react'))
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = [
  'image/',
  'audio/',
  'video/',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
]

function parseMessageDate(message?: Message) {
  const value = message?.createdAt || message?.updatedAt

  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function isSameLocalDay(left: Date | null, right: Date | null) {
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
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date)
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
  conversations: Conversation[]
  members?: {
    id: string
    fullName: string
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
  onReplyMessage: (message: Message) => void
  onRemoveReaction: (messageId: string, emoji: string) => Promise<void> | void
  onRetryMessage: (message: Message) => Promise<void> | void
  onLoadOlderMessages: () => Promise<void> | void
  onSendQuickMessage: (text: string) => Promise<void> | void
  onAutoScrollComplete: () => void
  onToggleMessagePin: (messageId: string) => Promise<void> | void
  onToggleReaction: (messageId: string, emoji: string) => Promise<void> | void
  onUploadAttachment: (file: File) => Promise<void> | void
  onToggleDetails: () => void
  onOpenConversationList: () => void
  onStartCall: (type: 'audio' | 'video') => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
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
  conversations,
  members = [],
  replyingTo = null,
  onCancelReply,
  onDeleteMessage,
  onRecallMessage,
  onDraftChange,
  onEditMessage,
  onForwardMessage,
  onReplyMessage,
  onRemoveReaction,
  onRetryMessage,
  onLoadOlderMessages,
  onSendQuickMessage,
  onAutoScrollComplete,
  onToggleMessagePin,
  onToggleReaction,
  onUploadAttachment,
  onToggleDetails,
  onOpenConversationList,
  onStartCall,
  onSubmit,
}: ChatPanelProps) {
  const [editingMessageId, setEditingMessageId] = useState('')
  const [editingText, setEditingText] = useState('')
  const [openActionMenuId, setOpenActionMenuId] = useState('')
  const [isComposerEmojiOpen, setIsComposerEmojiOpen] = useState(false)
  const [openReactionPickerId, setOpenReactionPickerId] = useState('')
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null)
  const [isForwardDialogClosing, setIsForwardDialogClosing] = useState(false)
  const [forwardQuery, setForwardQuery] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [messageSearch, setMessageSearch] = useState('')
  const [activeSearchIndex, setActiveSearchIndex] = useState(0)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [recordingError, setRecordingError] = useState('')
  const [recordedAudioUrl, setRecordedAudioUrl] = useState('')
  const [recordedAudioFile, setRecordedAudioFile] = useState<File | null>(null)
  const [galleryImage, setGalleryImage] = useState<MessageAttachment | null>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const threadEndRef = useRef<HTMLDivElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<BlobPart[]>([])
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<number | null>(null)
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
        const label = member.nickname || member.fullName

        return !mentionQuery || label.toLocaleLowerCase('vi-VN').includes(mentionQuery)
      })
      .slice(0, 5)
  }, [activeConversation.type, members, mentionQuery])
  const normalizedSearch = messageSearch.trim().toLocaleLowerCase('vi-VN')
  const searchMatches = useMemo(() => {
    if (!normalizedSearch) {
      return []
    }

    return messages.filter((message) =>
      message.text.toLocaleLowerCase('vi-VN').includes(normalizedSearch),
    )
  }, [messages, normalizedSearch])
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

  function isSameMessageGroup(message: Message, sibling?: Message) {
    if (!sibling || message.author === 'system' || sibling.author === 'system') {
      return false
    }

    const sameAuthor =
      message.author === sibling.author &&
      (message.author === 'me' || (message.senderName || '') === (sibling.senderName || ''))

    return (
      sameAuthor &&
      isSameLocalDay(parseMessageDate(message), parseMessageDate(sibling))
    )
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
  }, [normalizedSearch])

  useEffect(() => {
    if (activeSearchIndex >= searchMatches.length) {
      setActiveSearchIndex(0)
    }
  }, [activeSearchIndex, searchMatches.length])

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

    threadEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
    onAutoScrollComplete()
  }, [onAutoScrollComplete, shouldAutoScrollToLatest])

  useEffect(
    () => () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current)
      }

      recordingStreamRef.current?.getTracks().forEach((track) => track.stop())

      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl)
      }
    },
    [recordedAudioUrl],
  )

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
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!isSupportedAttachment(file)) {
      setRecordingError('File khong duoc ho tro hoac vuot qua 10MB!')
      event.target.value = ''
      return
    }

    setRecordingError('')
    await onUploadAttachment(file)
    event.target.value = ''
  }

  function isSupportedAttachment(file: File) {
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return false
    }

    return ALLOWED_ATTACHMENT_TYPES.some((type) => file.type.startsWith(type) || file.type === type)
  }

  function getSupportedAudioMimeType() {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

    return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || ''
  }

  function clearRecordedAudio() {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl)
    }

    setRecordedAudioUrl('')
    setRecordedAudioFile(null)
    setRecordingDuration(0)
  }

  async function startAudioRecording() {
    if (!navigator.mediaDevices?.getUserMedia || isBlocked) {
      setRecordingError('Trình duyệt không hỗ trợ ghi âm!')
      return
    }

    try {
      clearRecordedAudio()
      setRecordingError('')

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedAudioMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      recordingChunksRef.current = []
      recordingStreamRef.current = stream
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(recordingChunksRef.current, { type })
        const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        const file = new File([blob], `voice-message-${Date.now()}.${extension}`, { type })
        const url = URL.createObjectURL(blob)

        setRecordedAudioFile(file)
        setRecordedAudioUrl(url)
        recordingChunksRef.current = []
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null
        mediaRecorderRef.current = null
      }

      recorder.start()
      setIsRecordingAudio(true)
      setRecordingDuration(0)
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((current) => current + 1)
      }, 1000)
    } catch {
      setRecordingError('Không thể truy cập Micro!')
    }
  }

  function stopAudioRecording() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    setIsRecordingAudio(false)

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      return
    }

    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
    recordingStreamRef.current = null
  }

  function cancelAudioRecording() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }

    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
    recordingStreamRef.current = null
    mediaRecorderRef.current = null
    recordingChunksRef.current = []
    setIsRecordingAudio(false)
    clearRecordedAudio()
  }

  async function sendRecordedAudio() {
    if (!recordedAudioFile) {
      return
    }

    await onUploadAttachment(recordedAudioFile)
    clearRecordedAudio()
  }

  function formatRecordingDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
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

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>, message: Message) {
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
      onConfirm: async () => {
        try {
          await onEditMessage(message.id, text)
          cancelEditing()
        } catch {
        }
      },
    })
  }

  async function handleDeleteForMe(message: Message) {
    setConfirmDialog({
      title: 'Xoá tin nhắn?',
      description: 'Tin nhắn này sẽ bị xoá khỏi cuộc trò chuyện của bạn.',
      confirmLabel: 'Xoá tin nhắn',
      tone: 'danger',
      onConfirm: async () => {
        if (editingMessageId === message.id) {
          cancelEditing()
        }

        setOpenActionMenuId('')
        await onDeleteMessage(message.id)
      },
    })
  }

  async function handleRecall(message: Message) {
    setConfirmDialog({
      title: 'Thu hồi tin nhắn?',
      description: 'Tin nhắn này sẽ bị gỡ khỏi cuộc trò chuyện của tất cả mọi người.',
      confirmLabel: 'Thu hồi',
      tone: 'danger',
      onConfirm: async () => {
        if (editingMessageId === message.id) {
          cancelEditing()
        }

        setOpenActionMenuId('')
        await onRecallMessage(message.id)
      },
    })
  }

  async function handleTogglePin(messageId: string) {
    setOpenActionMenuId('')
    await onToggleMessagePin(messageId)
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

  function getMessageStateLabel(message: Message) {
    if (message.state === 'sending') {
      return 'Đang gửi...'
    }

    if (message.state === 'failed') {
      return 'Gửi lỗi!'
    }

    if (message.state === 'seen') {
      return message.seenAt ? `Đã xem lúc ${message.seenAt}!` : 'Đã xem!'
    }

    if (message.state === 'delivered') {
      return 'Đã nhận!'
    }

    return 'Đã gửi!'
  }

  function moveSearchResult(direction: 'next' | 'previous') {
    if (searchMatches.length === 0) {
      return
    }

    setActiveSearchIndex((current) => {
      if (direction === 'next') {
        return (current + 1) % searchMatches.length
      }

      return (current - 1 + searchMatches.length) % searchMatches.length
    })
  }

  function renderHighlightedText(message: Message) {
    if (!normalizedSearch) {
      const mentionNames = message.mentions?.map((mention) => mention.fullName) ?? []
      const pattern = mentionNames.length
        ? new RegExp(
          `(@(?:${mentionNames
            .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|')}))`,
          'giu',
        )
        : null

      if (!pattern) {
        return message.text
      }

      return message.text.split(pattern).map((part, index) => {
        pattern.lastIndex = 0

        return pattern.test(part) ? (
          <mark className="mention-highlight" key={`${part}-${index}`}>
            {part}
          </mark>
        ) : (
          part
        )
      })
    }

    const lowerText = message.text.toLocaleLowerCase('vi-VN')
    const matchIndex = lowerText.indexOf(normalizedSearch)

    if (matchIndex === -1) {
      return message.text
    }

    const before = message.text.slice(0, matchIndex)
    const match = message.text.slice(matchIndex, matchIndex + normalizedSearch.length)
    const after = message.text.slice(matchIndex + normalizedSearch.length)

    return (
      <>
        {before}
        <mark>{match}</mark>
        {after}
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
          <div className="attachment-toolbar">
            <span>{attachment.name}</span>
            {renderDownloadLink(attachment)}
          </div>
        </div>
      )
    }

    if (attachment.type === 'audio') {
      return (
        <div className="message-audio-attachment" key={attachment.url}>
          <Mic size={16} />
          <span>
            <strong>Tin nhắn thoại</strong>
            <small>{attachment.meta}</small>
          </span>
          {renderDownloadLink(attachment)}
          <audio controls preload="metadata" src={attachment.url} />
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

  function renderAttachments(message: Message) {
    if (!message.attachments?.length) {
      return null
    }
    const attachments = message.attachments

    return (
      <div className="message-attachments">
        {attachments.map((attachment) => renderAttachmentPreview(attachment))}
      </div>
    )

    /* return (
      <div className="message-attachments">
        {message.attachments.map((attachment) =>
          attachment.type === 'image' ? (
            <a
              className="message-image-link"
              href={attachment.url}
              key={attachment.url}
              rel="noreferrer"
              target="_blank"
              title={attachment.name}
            >
              <img alt={attachment.name} src={attachment.url} />
            </a>
          ) : attachment.type === 'audio' ? (
            <div className="message-audio-attachment" key={attachment.url}>
              <Mic size={16} />
              <span>
                <strong>Tin nhắn thoại</strong>
                <small>{attachment.meta}</small>
              </span>
              <audio controls preload="metadata" src={attachment.url} />
            </div>
          ) : (
            <a
              className="message-file-link"
              download={attachment.name}
              href={attachment.url}
              key={attachment.url}
            >
              <Paperclip size={16} />
              <span>
                <strong>{attachment.name}</strong>
                <small>{attachment.meta}</small>
              </span>
            </a>
          ),
        )}
      </div>
    ) */
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
            title={reaction.reactedByMe ? 'Thu hồi Reaction' : 'Reaction'}
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
    <section className="chat-panel" aria-label={`Hội thoại với ${activeConversation.name}`}>
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
          <span className="avatar-wrap compact">
            <AvatarFallback name={activeConversation.name} src={activeConversation.avatar} />
            <span className={`presence-dot ${activeConversation.presence}`} />
            <OnlineDurationBadge
              compact
              onlineSince={activeConversation.onlineSince}
              presence={activeConversation.presence}
            />
          </span>
          <div>
            <h2>{activeConversation.name}</h2>
            <p>{activeConversation.status}</p>
          </div>
        </div>

        <div className="message-search">
          <label className="message-search-field">
            <Search size={16} />
            <input
              aria-label="Tìm trong hội thoại đã nhắn"
              onChange={(event) => setMessageSearch(event.target.value)}
              placeholder="Tìm trong tin nhắn đã gửi"
              type="search"
              value={messageSearch}
            />
          </label>
          {normalizedSearch ? (
            <>
              <span className="message-search-count">
                {searchMatches.length
                  ? `${activeSearchIndex + 1}/${searchMatches.length}`
                  : '0 kết quả'}
              </span>
              <button
                className="message-search-button"
                disabled={searchMatches.length === 0}
                onClick={() => moveSearchResult('previous')}
                title="Kết quả trước"
                type="button"
              >
                <ChevronUp size={16} />
              </button>
              <button
                className="message-search-button"
                disabled={searchMatches.length === 0}
                onClick={() => moveSearchResult('next')}
                title="Kết quả tiếp theo"
                type="button"
              >
                <ChevronDown size={16} />
              </button>
              <button
                className="message-search-button"
                onClick={() => setMessageSearch('')}
                title="Xóa tìm kiếm"
                type="button"
              >
                <X size={16} />
              </button>
            </>
          ) : null}
        </div>

        <div className="header-actions">
          <button
            className="icon-button"
            disabled={isBlocked}
            onClick={() => onStartCall('audio')}
            title="Gọi audio"
            type="button"
          >
            <Phone size={20} />
          </button>
          <button
            className="icon-button"
            disabled={isBlocked}
            onClick={() => onStartCall('video')}
            title="Gọi video"
            type="button"
          >
            <Video size={20} />
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

      <div className="thread">
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

        {messages.length === 0 && activeConversation.type !== 'group' ? (
          <div className="thread-empty-state">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={48} strokeWidth={1.5} style={{ opacity: 0.2 }} />
              <span>Hãy bắt đầu cuộc trò chuyện cùng với {activeConversation.name} nào!</span>
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => {
          const previousMessage = messages[index - 1]
          const nextMessage = messages[index + 1]
          const dateDividerLabel = getDateDividerLabel(message, previousMessage)
          const isGroupedWithPrevious = isSameMessageGroup(message, previousMessage)
          const isGroupedWithNext = isSameMessageGroup(message, nextMessage)
          const shouldShowAvatar = message.author === 'them' && !isGroupedWithNext
          const shouldShowSenderName = message.author === 'them' && !isGroupedWithPrevious

          return (
            <Fragment key={message.id}>
              {dateDividerLabel ? (
                <div className="day-divider message-time-divider">
                  <span>{dateDividerLabel}</span>
                </div>
              ) : null}
              <div
                className={[
                  message.author === 'system'
                    ? 'message-row system-message-row animate-in'
                    : message.author === 'me'
                      ? 'message-row outgoing animate-in'
                      : 'message-row animate-in',
                  isGroupedWithPrevious ? 'is-grouped-with-previous' : 'is-group-start',
                  isGroupedWithNext ? 'is-grouped-with-next' : 'is-group-end',
                  searchMatches.some((match) => match.id === message.id) ? 'is-search-match' : '',
                  activeSearchMessageId === message.id ? 'is-search-active' : '',
                  focusedMessageId === message.id ? 'is-focused-message' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                ref={(node) => {
                  messageRefs.current[message.id] = node
                }}
              >
                {message.author === 'system' ? (
                  <div className="system-message">
                    <span>{renderHighlightedText(message)}</span>
                  </div>
                ) : (
                  <>
                    {message.author === 'them' ? (
                      <AvatarFallback
                        className={shouldShowAvatar ? 'message-avatar' : 'message-avatar is-hidden'}
                        name={message.senderName || activeConversation.name}
                        src={message.senderAvatar || activeConversation.avatar}
                      />
                    ) : null}
                    <div className="message-bubble">
                      {shouldShowSenderName ? (
                        <span className="message-sender-name">
                          {message.senderName || activeConversation.name}
                        </span>
                      ) : null}
                      {editingMessageId === message.id ? (
                        <form
                          className="message-edit-form"
                          onSubmit={(event) => handleEditSubmit(event, message)}
                        >
                          <input
                            aria-label="Sửa tin nhắn"
                            autoFocus
                            disabled={busyMessageId === message.id}
                            onChange={(event) => setEditingText(event.target.value)}
                            value={editingText}
                          />
                          <button
                            className="message-action-button"
                            disabled={!editingText.trim() || busyMessageId === message.id}
                            title="Lưu"
                            type="submit"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            className="message-action-button"
                            disabled={busyMessageId === message.id}
                            onClick={cancelEditing}
                            title="Hủy"
                            type="button"
                          >
                            <X size={15} />
                          </button>
                        </form>
                      ) : (
                        <>
                          {message.isPinned ? (
                            <span className="message-pin-badge">
                              <Pin size={12} />
                              <span>Đã ghim</span>
                            </span>
                          ) : null}
                          {message.replyTo ? renderReplyPreview(message.replyTo) : null}
                          {shouldRenderMessageText(message) ? <p>{renderHighlightedText(message)}</p> : null}
                          {renderAttachments(message)}
                        </>
                      )}
                      <span className="message-time">
                        {message.time}
                        {message.isEdited ? <span>Đã chỉnh sửa!</span> : null}
                        {message.author === 'me' ? (
                          <>
                            <CheckCheck aria-label={getMessageStateLabel(message)} size={15} />
                            <span>{getMessageStateLabel(message)}</span>
                            {message.state === 'failed' ? (
                              <button
                                className="message-retry-button"
                                onClick={() => onRetryMessage(message)}
                                title="Thử gửi lại"
                                type="button"
                              >
                                Thử lại
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </span>
                      {renderReactions(message)}
                    </div>
                    {editingMessageId !== message.id && !['sending', 'failed'].includes(message.state ?? '') ? (
                      <span className="message-actions">
                        <button
                          className="message-more-button"
                          disabled={Boolean(busyMessageId)}
                          onClick={() => startReplying(message)}
                          title="Trả lời"
                          type="button"
                        >
                          <Reply size={17} />
                        </button>
                        <button
                          className="message-more-button"
                          disabled={Boolean(busyMessageId)}
                          onClick={() => {
                            setOpenActionMenuId('')
                            setOpenReactionPickerId((current) =>
                              current === message.id ? '' : message.id,
                            )
                          }}
                          title="Reaction"
                          type="button"
                        >
                          <Smile size={17} />
                        </button>
                        {openReactionPickerId === message.id ? (
                          <span
                            className={
                              message.author === 'me'
                                ? 'reaction-picker'
                                : 'reaction-picker reaction-picker-incoming'
                            }
                          >
                            <Suspense fallback={<span className="reaction-picker-loading">...</span>}>
                              <EmojiPicker
                                emojiStyle={'native' as EmojiStyle}
                                height={300}
                                lazyLoadEmojis
                                onEmojiClick={(emojiData) =>
                                  handleToggleReaction(message.id, emojiData.emoji)
                                }
                                previewConfig={{ showPreview: false }}
                                searchPlaceHolder="Tìm Emoji"
                                skinTonesDisabled
                                theme={'light' as Theme}
                                width={292}
                              />
                            </Suspense>
                          </span>
                        ) : null}
                        <button
                          className="message-more-button"
                          disabled={Boolean(busyMessageId)}
                          onClick={() => {
                            setOpenReactionPickerId('')
                            setOpenActionMenuId((current) =>
                              current === message.id ? '' : message.id,
                            )
                          }}
                          title="Tùy chọn tin nhắn"
                          type="button"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {openActionMenuId === message.id ? (
                          <span className="message-action-menu">
                            <button
                              disabled={Boolean(busyMessageId)}
                              onClick={() => handleTogglePin(message.id)}
                              type="button"
                            >
                              {message.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                              <span>{message.isPinned ? 'Bỏ ghim' : 'Ghim'}</span>
                            </button>
                            <button
                              disabled={Boolean(busyMessageId)}
                              onClick={() => startForwarding(message)}
                              type="button"
                            >
                              <SendHorizontal size={14} />
                              <span>Chuyển tiếp</span>
                            </button>
                            {message.author === 'me' ? (
                              <>
                                <button
                                  disabled={Boolean(busyMessageId)}
                                  onClick={() => startEditing(message)}
                                  type="button"
                                >
                                  <Pencil size={14} />
                                  <span>Sửa</span>
                                </button>
                                <button
                                  className="is-danger"
                                  disabled={Boolean(busyMessageId)}
                                  onClick={() => handleDeleteForMe(message)}
                                  type="button"
                                >
                                  <Trash2 size={14} />
                                  <span>Xoá phía tôi</span>
                                </button>
                                <button
                                  className="is-danger"
                                  disabled={Boolean(busyMessageId)}
                                  onClick={() => handleRecall(message)}
                                  type="button"
                                >
                                  <Trash2 size={14} />
                                  <span>Thu hồi với mọi người</span>
                                </button>
                              </>
                            ) : (
                              <button
                                className="is-danger"
                                disabled={Boolean(busyMessageId)}
                                onClick={() => handleDeleteForMe(message)}
                                type="button"
                              >
                                <Trash2 size={14} />
                                <span>Xoá phía tôi</span>
                              </button>
                            )}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            </Fragment>
          )
        })}
        <div ref={threadEndRef} />
      </div>

      {isTyping ? (
        <div className="typing-indicator" aria-live="polite">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
          <strong>{activeConversation.name} đang nhập...</strong>
        </div>
      ) : null}

      <form className="composer" onSubmit={onSubmit}>
        {replyingTo ? (
          <div className="composer-reply-preview">
            <Reply size={16} />
            <span>
              <strong>Đang trả lời {getReplyAuthorLabel(replyingTo)}</strong>
              <small>{getReplyText(replyingTo)}</small>
            </span>
            <button onClick={onCancelReply} title="Hủy trả lời" type="button">
              <X size={16} />
            </button>
          </div>
        ) : null}
        <label className="icon-button attachment-picker" title="Đính kèm tài liệu">
          <Paperclip size={20} />
          <input
            aria-label="Đính kèm file"
            accept="image/*,audio/*,video/*,application/pdf,text/plain,.zip,.doc,.docx"
            disabled={isBlocked || isUploadingAttachment}
            onChange={handleAttachmentChange}
            type="file"
          />
        </label>
        <label className="composer-input">
          <input
            aria-label="Nhập tin nhắn"
            disabled={isBlocked}
            onChange={handleDraftChange}
            placeholder={isBlocked ? 'Bạn đã chặn người dùng này!' : `Nhắn tin với ${activeConversation.name}`}
            value={draft}
          />
        </label>
        <span className="composer-emoji-wrap">
          <button
            className={isComposerEmojiOpen ? 'icon-button composer-extra is-active' : 'icon-button composer-extra'}
            disabled={isBlocked || isUploadingAttachment}
            onClick={() => setIsComposerEmojiOpen((current) => !current)}
            title="Biểu cảm"
            type="button"
          >
            <Smile size={20} />
          </button>
          {isComposerEmojiOpen ? (
            <span className="composer-emoji-picker">
              <Suspense fallback={<span className="composer-emoji-loading">Đang tải Emoji...</span>}>
                <EmojiPicker
                  emojiStyle={'native' as EmojiStyle}
                  height={360}
                  lazyLoadEmojis
                  onEmojiClick={handleSendComposerEmoji}
                  previewConfig={{ showPreview: false }}
                  searchPlaceHolder="Tìm Emoji"
                  skinTonesDisabled
                  theme={'light' as Theme}
                  width={320}
                />
              </Suspense>
            </span>
          ) : null}
        </span>
        {mentionSuggestions.length > 0 ? (
          <div className="mention-suggestions">
            {mentionSuggestions.map((member) => (
              <button
                key={member.id}
                onClick={() => insertMention(member.nickname || member.fullName)}
                type="button"
              >
                {member.avatarUrl ? <img alt="" src={member.avatarUrl} /> : <span />}
                <strong>{member.nickname || member.fullName}</strong>
              </button>
            ))}
          </div>
        ) : null}
        {recordedAudioUrl ? (
          <div className="voice-preview">
            <Mic size={16} />
            <audio controls src={recordedAudioUrl} />
            <button onClick={clearRecordedAudio} title="Hủy ghi âm" type="button">
              <X size={16} />
            </button>
            <button
              disabled={isUploadingAttachment}
              onClick={sendRecordedAudio}
              title="Gửi tin nhắn thoại"
              type="button"
            >
              <Send size={16} />
            </button>
          </div>
        ) : null}
        {isRecordingAudio ? (
          <button
            className="icon-button composer-extra voice-record-button is-recording"
            onClick={stopAudioRecording}
            title="Dừng ghi âm"
            type="button"
          >
            <Square size={18} />
          </button>
        ) : (
          <button
            className="icon-button composer-extra voice-record-button"
            disabled={isBlocked || isUploadingAttachment}
            onClick={startAudioRecording}
            title="Ghi âm"
            type="button"
          >
            <Mic size={20} />
          </button>
        )}
        {isRecordingAudio ? (
          <div className="recording-status">
            <span />
            <strong>{formatRecordingDuration(recordingDuration)}</strong>
            <button onClick={cancelAudioRecording} title="Hủy ghi âm" type="button">
              <X size={14} />
            </button>
          </div>
        ) : null}
        {recordingError ? (
          <span className="composer-error">{recordingError}</span>
        ) : isBlocked ? (
          <span className="composer-error">Đã chặn người dùng!</span>
        ) : null}
        <button
          className="send-button"
          disabled={isBlocked || !draft.trim() || isUploadingAttachment}
          title="Gửi"
          type="submit"
        >
          <Send size={19} />
        </button>
      </form>

      {forwardingMessage ? (
        <div className={isForwardDialogClosing ? 'forward-dialog-backdrop is-exiting' : 'forward-dialog-backdrop'} role="presentation">
          <section aria-modal="true" className="forward-dialog" role="dialog">
            <header>
              <div>
                <strong>Chuyển tiếp tin nhắn</strong>
                <span>{getReplyText(forwardingMessage)}</span>
              </div>
              <button
                onClick={closeForwardDialog}
                title="Đóng"
                type="button"
              >
                <X size={17} />
              </button>
            </header>
            <label className="forward-search">
              <Search size={16} />
              <input
                autoFocus
                onChange={(event) => setForwardQuery(event.target.value)}
                placeholder="Tìm hội thoại"
                value={forwardQuery}
              />
            </label>
            <div className="forward-targets">
              {forwardTargets.map((conversation) => (
                <button
                  disabled={Boolean(busyMessageId)}
                  key={conversation.id}
                  onClick={() => handleForward(conversation.id)}
                  type="button"
                >
                  <AvatarFallback name={conversation.name} src={conversation.avatar} />
                  <span>
                    <strong>{conversation.name}</strong>
                    <small>{conversation.lastMessage}</small>
                  </span>
                  <SendHorizontal size={16} />
                </button>
              ))}
              {forwardTargets.length === 0 ? (
                <p>Không có hội thoại phù hợp!</p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
      {galleryImage ? (
        <div className="attachment-gallery-backdrop" role="presentation">
          <section aria-modal="true" className="attachment-gallery" role="dialog">
            <header>
              <strong>{galleryImage.name}</strong>
              <span>
                {galleryImage.meta} · {galleryImage.mimeType}
              </span>
              <button onClick={() => setGalleryImage(null)} title="Dong" type="button">
                <X size={18} />
              </button>
            </header>
            <img alt={galleryImage.name} src={galleryImage.url} />
            <footer>{renderDownloadLink(galleryImage)}</footer>
          </section>
        </div>
      ) : null}
      <ConfirmDialog
        dialog={confirmDialog}
        isWorking={isConfirming}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={handleConfirmDialog}
      />
    </section>
  )
}
