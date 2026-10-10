import { lazy, Suspense } from 'react'
import type { AuthUser } from '../../services/api/authApi'
import { useChatAppController } from '../../hooks/chat/useChatAppController'
const AdminPage = lazy(() => import('./AdminPage').then(m => ({ default: m.AdminPage })))
const CallOverlay = lazy(() => import('../media/CallOverlay').then(m => ({ default: m.CallOverlay })))
import { ChatPanel } from '../panels/ChatPanel'
const ConfirmDialog = lazy(() => import('../ui/ConfirmDialog').then(m => ({ default: m.ConfirmDialog })))
import { ContactsPanel, ContactProfile } from '../panels/ContactsPanel'
import { DetailPanel } from '../panels/DetailPanel'
import { InboxPanel } from '../panels/InboxPanel'
import { InboxSkeleton, ChatSkeleton } from '../ui/AppSkeleton'
import { NavRail } from '../layout/NavRail'
import { NotificationsPanel } from '../panels/NotificationsPanel'
const ProfilePage = lazy(() => import('./ProfilePage').then(m => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import('./SettingsPage').then(m => ({ default: m.SettingsPage })))

type ChatAppProps = {
  currentUser: AuthUser | null
  onAccountDeleted: () => void
  onLogout: () => void
  onUserChange: (user: AuthUser) => void
  pushToast?: (text: string, tone?: 'info' | 'error') => void
}

export function ChatApp(props: ChatAppProps) {
  const ctrl = useChatAppController(props)
  
  function renderNavRail() {
    return (
      <NavRail
        activeView={ctrl.activeView}
        currentUser={props.currentUser}
        isOpen={ctrl.isSidebarOpen}
        notificationCount={ctrl.notificationBadgeCount}
        onChangeView={ctrl.handleChangeView}
        onLogout={ctrl.handleLogout}
        onToggleOpen={() => ctrl.setIsSidebarOpen((current) => !current)}
        onUserChange={props.onUserChange}
      />
    )
  }

  function renderInboxPanel() {
    return (
      <>
        <button
          aria-label={ctrl.t('closeChatList')}
          className={`inbox-backdrop ${ctrl.isInboxOpen ? 'is-active' : ''}`}
          onClick={() => ctrl.setIsInboxOpen(false)}
          type="button"
        />
        <InboxPanel
          activeConversation={ctrl.activeConversation}
          activeFilter={ctrl.conversationFilter}
          conversations={ctrl.filteredConversations}
          messagesByConversation={ctrl.messagesByConversation}
          friends={ctrl.friends}
          isCollapsed={ctrl.inboxWidth === 100}
          onResizeStart={ctrl.handleResizerMouseDown}
          isCreatingGroup={ctrl.isCreatingGroup}
          onClosePanel={() => ctrl.setIsInboxOpen(false)}
          onCreateGroup={ctrl.handleCreateGroup}
          onFilterChange={ctrl.setConversationFilter}
          onQueryChange={ctrl.setQuery}
          onDeleteConversation={ctrl.handleDeleteConversation}
          onRestoreConversation={ctrl.handleRestoreConversation}
          onSelectConversation={ctrl.handleSelectConversation}
          onStartDirectMessage={ctrl.handleStartDirectMessage}
          onTogglePinConversation={ctrl.handleTogglePinConversation}
          query={ctrl.query}
          pushToast={ctrl.pushToast}
        />
      </>
    )
  }

  function renderConfirmDialog() {
    return (
      <ConfirmDialog
        dialog={ctrl.confirmDialog}
        isWorking={ctrl.isConfirming}
        onCancel={() => ctrl.setConfirmDialog(null)}
        onConfirm={ctrl.handleConfirmDialog}
      />
    )
  }

  function renderCallOverlay() {
    return ctrl.activeCall && props.currentUser ? (
      <Suspense fallback={null}>
        <CallOverlay
          call={ctrl.activeCall}
          currentUserId={props.currentUser.id}
          onClear={() => ctrl.setActiveCall(null)}
          onError={(message) => ctrl.pushToast(message)}
        />
      </Suspense>
    ) : null
  }

  const shellClassName = [
    'app-shell',
    ctrl.isSidebarOpen ? 'is-sidebar-open' : '',
    ctrl.isDetailOpen && ctrl.activeView === 'chat' ? 'is-detail-open' : '',
    ctrl.activeView === 'chat' ? 'has-inbox-drawer' : '',
    ctrl.activeView === 'chat' && ctrl.isInboxOpen ? 'is-inbox-open' : '',
    ctrl.isResizing ? 'is-resizing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const shellStyle = {
    '--inbox-width': ctrl.inboxWidth === 100 ? '100px' : `clamp(320px, ${ctrl.inboxWidth}px, 45vw)`
  } as React.CSSProperties

  if (ctrl.activeView === 'contacts') {
    return (
      <main className={`${shellClassName} contacts-shell`} style={shellStyle}>
        {renderNavRail()}
        <ContactsPanel
          onAccepted={ctrl.handleAcceptedFriend}
          onMessage={ctrl.handleStartDirectMessage}
          pushToast={ctrl.pushToast}
        />
        {renderCallOverlay()}
        {renderConfirmDialog()}
      </main>
    )
  }

  if (ctrl.activeView === 'profile') {
    return (
      <main className={`${shellClassName} profile-shell`} style={shellStyle}>
        {renderNavRail()}
        <Suspense fallback={<div className="skeleton-loader" style={{ flex: 1, margin: '16px', borderRadius: '16px' }} />}>
          <ProfilePage
            currentUser={props.currentUser}
            onUserChange={props.onUserChange}
            pushToast={ctrl.pushToast}
          />
        </Suspense>
        {renderCallOverlay()}
        {renderConfirmDialog()}
      </main>
    )
  }

  if (ctrl.activeView === 'settings') {
    return (
      <main className={`${shellClassName} profile-shell settings-shell`} style={shellStyle}>
        {renderNavRail()}
        <Suspense fallback={<div className="skeleton-loader" style={{ flex: 1, margin: '16px', borderRadius: '16px' }} />}>
          <SettingsPage
            currentUser={props.currentUser}
            onAccountDeleted={props.onAccountDeleted}
            onLogout={ctrl.handleLogout}
            onUserChange={props.onUserChange}
            pushToast={ctrl.pushToast}
          />
        </Suspense>
        {renderCallOverlay()}
        {renderConfirmDialog()}
      </main>
    )
  }

  if (ctrl.activeView === 'admin') {
    return (
      <main className={`${shellClassName} admin-shell`} style={shellStyle}>
        {renderNavRail()}
        <Suspense fallback={<div className="skeleton-loader" style={{ flex: 1, margin: '16px', borderRadius: '16px' }} />}>
          <AdminPage
            currentUser={props.currentUser}
            pushToast={ctrl.pushToast}
          />
        </Suspense>
        {renderCallOverlay()}
        {renderConfirmDialog()}
      </main>
    )
  }

  if (ctrl.activeView === 'notifications') {
    return (
      <main className={`${shellClassName} notifications-shell`} style={shellStyle}>
        {renderNavRail()}
        <NotificationsPanel
          browserNotificationPermission={ctrl.browserNotificationPermission}
          conversations={ctrl.conversations}
          friendRequests={ctrl.friendRequests}
          notifications={ctrl.notifications}
          onEnableBrowserNotifications={ctrl.handleEnableBrowserNotifications}
          onOpenContacts={ctrl.handleOpenContacts}
          onOpenConversation={ctrl.handleSelectConversation}
          onOpenNotification={ctrl.handleOpenNotification}
        />
        {renderCallOverlay()}
        {renderConfirmDialog()}
      </main>
    )
  }

  if (ctrl.isLoading) {
    return (
      <main className={shellClassName} style={shellStyle}>
        {renderNavRail()}
        <InboxSkeleton />
        <ChatSkeleton />
      </main>
    )
  }

  if (!ctrl.activeConversation) {
    return (
      <main className={`${shellClassName} empty-chat-shell`} style={shellStyle}>
        {renderNavRail()}
        {renderInboxPanel()}
        <section className="loading-panel">
          {ctrl.pageErrorMessage || ctrl.t('noConversations')}
        </section>
      </main>
    )
  }

  return (
    <main className={shellClassName} style={shellStyle}>
      {renderNavRail()}
      {renderInboxPanel()}
      <ChatPanel
        showReadReceipts={props.currentUser?.showReadReceipts ?? true}
        activeConversation={ctrl.activeConversation}
        draft={ctrl.draft}
        busyMessageId={ctrl.busyMessageId}
        focusedMessageId={ctrl.focusedMessageId}
        isBlocked={ctrl.activeConversation.blocked}
        isDetailOpen={ctrl.isDetailOpen}
        isSending={ctrl.isSending}
        shouldAutoScrollToLatest={ctrl.shouldAutoScrollToLatest}
        hasOlderMessages={ctrl.hasOlderMessages}
        isTyping={Boolean(ctrl.typingByConversation[ctrl.activeConversation.id])}
        isLoadingOlderMessages={ctrl.isLoadingOlderMessages}
        isUploadingAttachment={ctrl.isUploadingAttachment}
        members={ctrl.activeMembers}
        messages={ctrl.messages}
        pinnedMessages={ctrl.pinnedMessages}
        conversations={ctrl.conversations}
        replyingTo={ctrl.replyingTo}
        onCancelReply={() => ctrl.setReplyingTo(null)}
        onDeleteMessage={ctrl.handleDeleteMessage}
        onRecallMessage={ctrl.handleRecallMessage}
        onDraftChange={ctrl.handleDraftChange}
        onEditMessage={ctrl.handleEditMessage}
        onForwardMessage={ctrl.handleForwardMessage}
        onReportMessage={ctrl.handleReportMessage}
        onSendGif={ctrl.handleSendGif}
        onToggleMessagePin={ctrl.handleToggleMessagePin}
        onReplyMessage={ctrl.setReplyingTo}
        onRemoveReaction={ctrl.handleRemoveMessageReaction}
        onRetryMessage={ctrl.handleRetryMessage}
        onLoadOlderMessages={ctrl.handleLoadOlderMessages}
        onSendQuickMessage={ctrl.handleSendQuickMessage}
        onSendPoll={ctrl.handleSendPoll}
        onVotePoll={ctrl.handleVotePoll}
        onAutoScrollComplete={() => ctrl.setShouldAutoScrollToLatest(false)}
        onToggleReaction={ctrl.handleToggleMessageReaction}
        onUploadAttachment={ctrl.handleUploadAttachment}
        onSearchMessages={ctrl.handleSearchMessages}
        onJumpToMessage={ctrl.handleJumpToMessage}
        onToggleDetails={() => ctrl.setIsDetailOpen((current) => !current)}
        onOpenContactProfile={ctrl.handleOpenActiveContactProfile}
        onOpenConversationList={() => ctrl.setIsInboxOpen(true)}
        onStartCall={ctrl.handleStartCall}
        onSubmit={ctrl.handleSubmit}
        onSendSticker={ctrl.handleSendSticker}
      />
      {ctrl.isDetailOpen ? (
        <button
          aria-label={ctrl.t('closeChatInfo')}
          className="detail-backdrop"
          onClick={() => ctrl.setIsDetailOpen(false)}
          type="button"
        />
      ) : null}
      <DetailPanel
        activeConversation={ctrl.activeConversation}
        busyAction={ctrl.busyConversationAction}
        currentUserId={props.currentUser?.id}
        friends={ctrl.friends}
        groupInviteToken={ctrl.activeGroupInviteToken}
        joinRequests={ctrl.activeGroupJoinRequests}
        isOpen={ctrl.isDetailOpen}
        members={ctrl.activeMembers}
        pinnedMessages={ctrl.pinnedMessages}
        onAddMember={ctrl.handleAddMember}
        onArchive={ctrl.handleArchiveConversation}
        onCopyGroupInviteLink={ctrl.handleCopyGroupInviteLink}
        onDisbandGroup={ctrl.handleDisbandGroup}
        onLeaveGroup={ctrl.handleLeaveGroup}
        onRemoveMember={ctrl.handleRemoveMember}
        onOpenPinnedMessage={ctrl.handleOpenPinnedMessage}
        onResetGroupInviteLink={ctrl.handleResetGroupInviteLink}
        onReviewGroupJoinRequest={ctrl.handleReviewGroupJoinRequest}
        onToggleBlocked={ctrl.handleToggleBlocked}
        onToggleMuted={ctrl.handleToggleMuted}
        onTogglePinned={ctrl.handleTogglePinned}
        onTransferOwner={ctrl.handleTransferOwner}
        onUpdateContactNickname={ctrl.handleUpdateContactNickname}
        onUpdateGroup={ctrl.handleUpdateGroup}
        onUpdateBackground={ctrl.handleUpdateBackground}
        onUpdateMemberNickname={ctrl.handleUpdateMemberNickname}
        onUpdateMemberRole={ctrl.handleUpdateMemberRole}
        onUpdateQuickEmoji={ctrl.handleUpdateQuickEmoji}
        onClose={() => ctrl.setIsDetailOpen(false)}
      />
      {ctrl.profileContactToOpen && (
        <ContactProfile
          user={ctrl.profileContactToOpen}
          isClosing={ctrl.isProfileClosing}
          onClose={ctrl.closeContactProfile}
        />
      )}
      {renderCallOverlay()}
      {renderConfirmDialog()}
    </main>
  )
}
