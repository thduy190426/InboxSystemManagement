import type { FormEvent } from 'react'
import { lazy, Suspense } from 'react'

import {
  ChevronDown,
  Info,
  Menu,
  MessageSquare,
  Phone,
  Pin,
  Video,
} from 'lucide-react'
import type { Conversation, Message } from '../../types'
import type { MessageSearchFilters } from '../../services/api/chatApi'
import { type GifSearchResult } from '../../services/api/gifApi'
import { AttachmentPreviewOverlay } from './AttachmentPreviewOverlay'
const CreatePollModal = lazy(() => import('./CreatePollModal').then(m => ({ default: m.CreatePollModal })))
import { MessageInput } from './MessageInput'
import { ChatStateContext, MessageActionContext, ChatUIContext, ChatInputContext } from './ChatContexts'
const GalleryViewer = lazy(() => import('./GalleryViewer').then(m => ({ default: m.GalleryViewer })))
const ForwardMessageModal = lazy(() => import('./ForwardMessageModal').then(m => ({ default: m.ForwardMessageModal })))
const PinnedMessagesDrawer = lazy(() => import('./PinnedMessagesDrawer').then(m => ({ default: m.PinnedMessagesDrawer })))
import { MessageSearchUi } from './MessageSearchUi'

import { MessageItem } from './MessageItem'


import { AvatarFallback } from '../ui/AvatarFallback'
const ConfirmDialog = lazy(() => import('../ui/ConfirmDialog').then(m => ({ default: m.ConfirmDialog })))
import { OnlineDurationBadge } from '../ui/OnlineDurationBadge'



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


function formatMessageTime(message: Message, t: any) {
  if (message.time === t('now') || message.time === t('sending')) {
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

export type ChatPanelProps = {
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


import { useChatPanelController } from '../../hooks/chat/useChatPanelController'

export function ChatPanel(props: ChatPanelProps) {
  const {
    activeSearchIndex,
    activeSearchMessageId,
    attachmentError,
    cancelEditing,
    closeForwardDialog,
    confirmDialog,
    displayMessages,
    editingMessageId,
    editingText,
    floatingReactions,
    forwardQuery,
    forwardTargets,
    forwardingMessage,
    galleryImage,
    getDateDividerLabel,
    getMessageStateLabel,
    getReplyAuthorLabel,
    getReplyText,
    gifError,
    gifQuery,
    gifResults,
    handleAttachmentChange,
    handleConfirmDialog,
    handleDeleteForMe,
    handleDraftChange,
    handleEditSubmit,
    handleForward,
    handleRecall,
    handleRemovePendingAttachment,
    handleReport,
    handleSendComposerEmoji,
    handleSendGif,
    handleSendPendingAttachments,
    handleSendQuickEmoji,
    handleShareLocation,
    handleSpawnReaction,
    handleTogglePin,
    handleToggleReaction,
    handleUpdatePendingAttachment,
    hasSearchFilters,
    insertMention,
    isAtLatestMessage,
    isComposerEmojiOpen,
    isConfirming,
    isForwardDialogClosing,
    isGifPickerOpen,
    isLoadingGifs,
    isPinnedModalOpen,
    isPollModalOpen,
    isSameMessageGroup,
    isSearchFilterOpen,
    isSearchingMessages,
    isSharingLocation,
    locationError,
    mentionSuggestions,
    messageRefs,
    messageSearch,
    moveSearchResult,
    openActionMenuId,
    openReactionPickerId,
    pendingAttachments,
    pinnedSearchQuery,
    renderAttachments,
    renderCallMessage,
    renderDownloadLink,
    renderHighlightedText,
    renderReactions,
    renderReplyPreview,
    runAdvancedSearch,
    scrollToLatestMessage,
    searchDateFrom,
    searchDateTo,
    searchMatches,
    searchSenderId,
    searchType,
    setConfirmDialog,
    setEditingText,
    setForwardQuery,
    setGalleryImage,
    setGifQuery,
    setIsAtLatestMessage,
    setIsComposerEmojiOpen,
    setIsGifPickerOpen,
    setIsPinnedModalOpen,
    setIsPollModalOpen,
    setIsSearchFilterOpen,
    setMessageSearch,
    setOpenActionMenuId,
    setOpenReactionPickerId,
    setPendingAttachments,
    setPinnedSearchQuery,
    setSearchDateFrom,
    setSearchDateTo,
    setSearchResults,
    setSearchSenderId,
    setSearchType,
    shouldRenderMessageText,
    startEditing,
    startForwarding,
    startReplying,
    t,
    virtuosoRef
  } = useChatPanelController(props)

  const {
    activeConversation, busyMessageId, draft, isBlocked, isDetailOpen, hasOlderMessages, isTyping, isLoadingOlderMessages, isUploadingAttachment, focusedMessageId, pinnedMessages, members, replyingTo, onCancelReply, onRetryMessage, onLoadOlderMessages, onUploadAttachment, onJumpToMessage, onToggleDetails, onOpenContactProfile, onOpenConversationList, onStartCall, onSubmit, currentUserId, onSendPoll, onVotePoll, onSendSticker
  } = props

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
          getMessageStateLabel, formatMessageTime: (msg) => formatMessageTime(msg, t), renderAttachments, renderReactions,
          isSameLocalDay, parseMessageDate, setOpenActionMenuId, setOpenReactionPickerId
        }}>
    <section className="chat-panel" aria-label={t('chatAriaLabel', { name: activeConversation.name })} style={activeConversation.backgroundImage ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url("${activeConversation.backgroundImage}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}>
      <header className="chat-header">
        <div className="chat-identity">
          <button
            className="mobile-menu icon-button"
            onClick={onOpenConversationList}
            title={t('openListTitle')}
            type="button"
          >
            <Menu size={20} />
          </button>
          <button
            className="chat-profile-trigger"
            disabled={activeConversation.type !== 'direct'}
            onClick={onOpenContactProfile}
            title={t('viewProfileTitle')}
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
              {activeConversation.restricted || (activeConversation.status && activeConversation.status !== 'Ngoại tuyến' && activeConversation.status !== 'Offline') ? (
                <p>{activeConversation.restricted ? t('statusOffline') : activeConversation.status}</p>
              ) : null}
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
            title={t('callVideoBtn')}
            type="button"
          >
            <Video size={20} />
          </button>
          <button
            className="icon-button"
            disabled={isBlocked || activeConversation.restricted}
            onClick={() => onStartCall('audio')}
            title={t('callAudioBtn')}
            type="button"
          >
            <Phone size={20} />
          </button>

          <button
            className={isDetailOpen ? 'icon-button is-active' : 'icon-button'}
            onClick={onToggleDetails}
            title={t('chatInfoBtn')}
            type="button"
          >
            <Info size={20} />
          </button>
        </div>
      </header>

      {pinnedMessages.length > 0 ? (
        <div className="chat-pinned-messages" aria-label={t('pinnedMessagesAria')}>
          {pinnedMessages.slice(0, 3).map((message) => (
            <button
              className="chat-pinned-message"
              disabled={Boolean(busyMessageId)}
              key={message.id}
              onClick={() => onJumpToMessage(message.id)}
              title={t('openPinnedMsg')}
              type="button"
            >
              <Pin size={14} />
              <span>
                <strong>{getReplyAuthorLabel(message)}</strong>
                <small>
                  {getReplyText(message)}
                  {message.pinnedBy && message.pinnedAt && (
                    <span style={{ display: 'block', color: 'var(--subtle)', fontSize: '0.85em', marginTop: '2px' }}>
                      {t('pinnedBy', { name: message.pinnedBy, time: new Date(message.pinnedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) })}
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
              title={t('viewAllPinned')}
              type="button"
            >
              +{pinnedMessages.length - 3}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="thread" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Virtuoso
          ref={virtuosoRef}
          className="thread-virtuoso"
          data={displayMessages}
          firstItemIndex={0}
          initialTopMostItemIndex={displayMessages.length > 0 ? displayMessages.length - 1 : 0}
          followOutput={(isAtBottom) => {
            const lastMessage = displayMessages[displayMessages.length - 1]
            if (lastMessage?.author === 'me') {
              return 'smooth'
            }
            return isAtBottom ? 'smooth' : false
          }}
          alignToBottom
          atBottomStateChange={(atBottom) => setIsAtLatestMessage(atBottom)}
          atBottomThreshold={100}
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
                    {isLoadingOlderMessages ? t('loadingOlderMsgs') : t('loadOlderMsgs')}
                  </button>
                ) : null}

                {displayMessages.length === 0 && activeConversation.type !== 'group' ? (
                  <div className="thread-empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <MessageSquare size={48} strokeWidth={1.5} style={{ opacity: 0.2 }} />
                      <span style={{ color: 'var(--subtle)' }}>{t('startChatSuggest', { name: activeConversation.name })}</span>
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
                    <strong>{t('typingIndicator', { name: activeConversation.name })}</strong>
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
          title={t('scrollToLatest')}
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
