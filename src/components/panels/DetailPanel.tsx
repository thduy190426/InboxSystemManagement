
import { lazy, Suspense } from 'react'

const EmojiPicker = lazy(() => import('emoji-picker-react'))
import {
  Archive,
  Bell,
  BellOff,
  Check,
  Copy,
  FileText,
  Image,
  ImagePlus,
  LogOut,
  Pin,
  PinOff,
  Save,
  Shield,
  ShieldCheck,
  Smile,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  X,
  Tag,
  Settings2,
  FolderOpen,
  EyeOff,
  Users,
  Link2,
} from 'lucide-react'
import type { ContactUser, Conversation, ConversationMember, GroupJoinRequest, Message } from '../../types'
import { AvatarFallback } from '../ui/AvatarFallback'
import { OnlineDurationBadge } from '../ui/OnlineDurationBadge'

export type DetailPanelProps = {
  activeConversation: Conversation
  busyAction?: string
  currentUserId?: string
  friends: ContactUser[]
  groupInviteToken?: string
  isOpen: boolean
  joinRequests?: GroupJoinRequest[]
  members: ConversationMember[]
  pinnedMessages: Message[]
  restrictedContacts?: ContactUser[]
  onAddMember: (userId: string) => Promise<void> | void
  onArchive: () => void
  onCopyGroupInviteLink: () => Promise<void> | void
  onDisbandGroup: () => Promise<void> | void
  onLeaveGroup: () => Promise<void> | void
  onRemoveMember: (userId: string) => Promise<void> | void
  onOpenPinnedMessage: (messageId: string) => void
  onResetGroupInviteLink: () => Promise<void> | void
  onReviewGroupJoinRequest: (requestId: string, action: 'approve' | 'decline') => Promise<void> | void
  onToggleBlocked: () => void
  onToggleRestricted?: () => void
  onToggleMuted: () => void
  onTogglePinned: () => void
  onTransferOwner: (userId: string) => Promise<void> | void
  onUpdateContactNickname: (nickname: string) => Promise<void> | void
  onUpdateGroup: (payload: { title?: string; avatar?: File | null }) => Promise<void> | void
  onUpdateBackground?: (payload: { backgroundImage?: File | null; removeBackground?: boolean }) => Promise<void> | void
  onUpdateMemberNickname: (userId: string, nickname: string) => Promise<void> | void
  onUpdateMemberRole: (userId: string, role: 'admin' | 'member') => Promise<void> | void
  onUpdateQuickEmoji?: (emoji: string) => Promise<void> | void
  onClose?: () => void
}


import { MembersModal, EditGroupModal, AddMemberModal, RestrictedModal } from './modals/DetailPanelModals'
import { useDetailPanelController } from '../../hooks/chat/useDetailPanelController'

export function DetailPanel(props: DetailPanelProps) {
  const {
    MEMBER_PREVIEW_COUNT,
    actionMenuMemberId,
    addableFriends,
    attachmentTab,
    canManageGroup,
    closeAddMemberModal,
    closeEditGroupModal,
    closeMembersModal,
    closeRestrictedModal,
    currentTabAttachments,
    directNickname,
    editingNicknameId,
    fileAttachments,
    getConversationRoleLabel,
    getPinnedMessageAuthor,
    getPinnedMessageText,
    getRoleLabel,
    groupAvatar,
    groupTitle,
    handleAddMember,
    handleAvatarChange,
    handleClearMemberNickname,
    handleDirectNicknameSubmit,
    handleGroupSubmit,
    handleMemberNicknameSubmit,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    imageAttachments,
    isAddMemberModalClosing,
    isAddMemberModalOpen,
    isEditGroupModalClosing,
    isEditGroupModalOpen,
    isEmojiPickerOpen,
    isGroup,
    isGroupOwner,
    isMembersModalClosing,
    isMembersModalOpen,
    isRestrictedModalClosing,
    isRestrictedModalOpen,
    linkAttachments,
    memberNicknames,
    openAddMemberModal,
    openEditGroupModal,
    openMembersModal,
    openRestrictedModal,
    selectedFriendId,
    setActionMenuMemberId,
    setAttachmentTab,
    setDirectNickname,
    setEditingNicknameId,
    setGroupTitle,
    setIsEmojiPickerOpen,
    setMemberNicknames,
    setSelectedFriendId,
    swipeStyle,
    t,
    validAttachments
  } = useDetailPanelController(props)

  const {
    activeConversation, busyAction, currentUserId, groupInviteToken, isOpen, joinRequests, members, pinnedMessages, restrictedContacts, onArchive, onCopyGroupInviteLink, onDisbandGroup, onLeaveGroup, onRemoveMember, onOpenPinnedMessage, onResetGroupInviteLink, onReviewGroupJoinRequest, onToggleBlocked, onToggleRestricted, onToggleMuted, onTogglePinned, onTransferOwner, onUpdateContactNickname, onUpdateBackground, onUpdateMemberRole, onUpdateQuickEmoji  } = props

  return (
    <aside
      className={isOpen ? 'detail-panel is-open' : 'detail-panel'}
      aria-hidden={!isOpen}
      aria-label={t('detailHeader')}
      style={swipeStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="profile-block">
        <span className="profile-avatar-shell">
          <AvatarFallback name={activeConversation.name} src={activeConversation.avatar} />
          <OnlineDurationBadge
            onlineSince={activeConversation.onlineSince}
            presence={activeConversation.presence}
          />
        </span>
        <h2>{activeConversation.name}</h2>
        <p>{getConversationRoleLabel(activeConversation.role)}</p>
      </div>

      <div className="detail-actions">
        <button
          className={activeConversation.pinned ? 'is-active' : ''}
          disabled={Boolean(busyAction)}
          onClick={onTogglePinned}
          type="button"
          title={activeConversation.pinned ? t('unpinBtn') : t('pinBtn')}
        >
          {activeConversation.pinned ? <PinOff size={18} /> : <Pin size={18} />}
          <span>{activeConversation.pinned ? t('unpinBtn') : t('pinBtn')}</span>
        </button>
        <button
          className={activeConversation.muted ? 'is-active' : ''}
          disabled={Boolean(busyAction)}
          onClick={onToggleMuted}
          type="button"
          title={activeConversation.muted ? t('unmuteBtn') : t('muteBtn')}
        >
          {activeConversation.muted ? <BellOff size={18} /> : <Bell size={18} />}
          <span>{activeConversation.muted ? t('mutedBtn') : t('muteBtn')}</span>
        </button>
        <button
          className="is-danger"
          disabled={Boolean(busyAction)}
          onClick={onArchive}
          type="button"
          title={t('archiveBtn')}
        >
          <Archive size={18} />
          <span>{t('archiveBtn')}</span>
        </button>
        {activeConversation.type === 'direct' && activeConversation.contactId ? (
          <>
            <button
              className={activeConversation.restricted ? 'is-active' : ''}
              disabled={Boolean(busyAction)}
              onClick={() => onToggleRestricted?.()}
              type="button"
              title={activeConversation.restricted ? t('unrestrictActionBtn') : t('restrictBtn')}
            >
              <EyeOff size={18} />
              <span>{activeConversation.restricted ? t('unrestrictActionBtn') : t('restrictBtn')}</span>
            </button>
            <button
              className={activeConversation.blocked ? 'is-active' : 'is-danger'}
              disabled={Boolean(busyAction)}
              onClick={onToggleBlocked}
              type="button"
              title={activeConversation.blocked ? t('unblockBtn') : t('blockBtn')}
            >
              {activeConversation.blocked ? <UserCheck size={18} /> : <UserX size={18} />}
              <span>{activeConversation.blocked ? t('unblockBtn') : t('blockBtn')}</span>
            </button>
            <button
              disabled={Boolean(busyAction)}
              onClick={openRestrictedModal}
              type="button"
              title={t('restrictedListBtn')}
            >
              <Shield size={18} />
              <span>{t('restrictedListBtn')}</span>
            </button>
          </>
        ) : null}
      </div>

      {activeConversation.type === 'direct' && activeConversation.contactId ? (
        <section className="detail-section nickname-section">
          <div className="detail-section-title">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={16} /> {t('aliasTitle')}
            </h3>
            <span>{t('privateLabel')}</span>
          </div>
          <form className="nickname-form" onSubmit={handleDirectNicknameSubmit}>
            <input
              aria-label={t('aliasTitle')}
              maxLength={80}
              onChange={(event) => setDirectNickname(event.target.value)}
              placeholder={t('aliasPlaceholder')}
              value={directNickname}
            />
            <button disabled={Boolean(busyAction) || !directNickname.trim() || directNickname.trim() === (activeConversation.nickname || '')} title={t('saveAliasTitle')} type="submit">
              <Save size={16} />
            </button>
            <button
              disabled={Boolean(busyAction) || !directNickname.trim()}
              onClick={() => {
                setDirectNickname('')
                void onUpdateContactNickname('')
              }}
              title={t('removeAliasBtn')}
              type="button"
            >
              <X size={16} />
            </button>
          </form>
        </section>
      ) : null}

      {isGroup ? (
        <section className="detail-section group-management">
          <div className="detail-section-title">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} /> {t('groupChatTitle')}
            </h3>
            <span>{t('membersCount', { count: members.length })}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={openEditGroupModal}
              type="button"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}
            >
              <Settings2 size={16} color="var(--primary-strong)" /> {t('updateGroupInfoBtn')}
            </button>
            <button
              onClick={openAddMemberModal}
              type="button"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}
            >
              <UserPlus size={16} color="var(--primary-strong)" /> {t('addMemberTitle')}
            </button>
          </div>

          {canManageGroup ? (
            <div className="group-advanced-management">
              <div className="detail-section-title">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Settings2 size={16} /> {t('advancedAdminTitle')}
                </h3>
                <span>{t('requestsCount', { count: (joinRequests || []).length })}</span>
              </div>

              <div className="group-invite-row">
                <input
                  aria-label={t('groupInviteLinkLabel')}
                  readOnly
                  value={
                    groupInviteToken
                      ? `${window.location.origin}/chat?join=${groupInviteToken}`
                      : t('noNewLink')
                  }
                />
                <button
                  disabled={Boolean(busyAction)}
                  onClick={onCopyGroupInviteLink}
                  title={t('copyGroupLinkTitle')}
                  type="button"
                >
                  <Copy size={15} />
                </button>
                <button
                  disabled={Boolean(busyAction)}
                  onClick={onResetGroupInviteLink}
                  title={t('createNewLinkTitle')}
                  type="button"
                >
                  <ShieldCheck size={15} />
                </button>
              </div>

              {(joinRequests || []).length > 0 ? (
                <div className="group-join-request-stack">
                  {(joinRequests || []).map((joinRequest) => (
                    <div className="group-join-request" key={joinRequest.id}>
                      <AvatarFallback
                        name={joinRequest.user.fullName}
                        src={joinRequest.user.avatarUrl}
                      />
                      <span>
                        <strong>{joinRequest.user.fullName}</strong>
                        <small>{joinRequest.user.email}</small>
                      </span>
                      <button
                        disabled={Boolean(busyAction)}
                        onClick={() => onReviewGroupJoinRequest(joinRequest.id, 'approve')}
                        title={t('approveTitle')}
                        type="button"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        disabled={Boolean(busyAction)}
                        onClick={() => onReviewGroupJoinRequest(joinRequest.id, 'decline')}
                        title={t('declineTitle')}
                        type="button"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="group-member-stack">
            {members.slice(0, MEMBER_PREVIEW_COUNT).map((member) => (
              <div className="group-detail-member" key={member.id}>
                <AvatarFallback name={member.fullName} src={member.avatarUrl} />
                <div className="group-member-body">
                  <span>
                    <strong>{member.nickname || member.fullName}</strong>
                    <small>
                      {member.nickname
                        ? `${member.fullName} · ${getRoleLabel(member.role)}`
                        : getRoleLabel(member.role)}
                    </small>
                  </span>
                </div>
              </div>
            ))}
            <button
              className="group-member-toggle"
              onClick={openMembersModal}
              type="button"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--text)' }}
            >
              <Users size={16} color="var(--primary-strong)" />
              <span>{t('viewAllMembers', { count: members.length })}</span>
            </button>
          </div>

          <button
            className="group-leave-button"
            disabled={Boolean(busyAction)}
            onClick={onLeaveGroup}
            type="button"
          >
            <LogOut size={17} />
            <span>{t('leaveGroupBtn')}</span>
          </button>
          {isGroupOwner ? (
            <button
              className="group-disband-button"
              disabled={Boolean(busyAction)}
              onClick={onDisbandGroup}
              type="button"
            >
              <Trash2 size={17} />
              <span>{t('disbandGroupBtn')}</span>
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="detail-section background-section">
        <div className="detail-section-title">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ImagePlus size={16} /> {t('customizeChatTitle')}
          </h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px', marginBottom: '16px' }}>
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '8px', cursor: Boolean(busyAction) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}
          >
            <ImagePlus size={16} color="var(--primary-strong)" /> {t('changeBackgroundBtn')}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              disabled={Boolean(busyAction)}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file && onUpdateBackground) {
                  onUpdateBackground({ backgroundImage: file })
                  e.target.value = ''
                }
              }}
            />
          </label>
          <div style={{ position: 'relative' }}>
            <button
              disabled={Boolean(busyAction)}
              onClick={() => setIsEmojiPickerOpen(prev => !prev)}
              type="button"
              style={{ display: 'flex', width: '100%', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '8px', cursor: Boolean(busyAction) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}
            >
              <Smile size={16} color="var(--primary-strong)" /> {t('changeEmojiBtn')}
              <span style={{ marginLeft: 'auto', fontSize: '18px' }}>{activeConversation.quickEmoji || '👍'}</span>
            </button>
            {isEmojiPickerOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100 }}>
                <Suspense fallback={<div>{t('loadingTxtShort')}</div>}>
                  <EmojiPicker
                    onEmojiClick={(data: any) => {
                      if (onUpdateQuickEmoji) {
                        onUpdateQuickEmoji(data.emoji)
                      }
                      setIsEmojiPickerOpen(false)
                    }}
                    lazyLoadEmojis
                  />
                </Suspense>
              </div>
            )}
          </div>
          {activeConversation.backgroundImage && (
            <button
              disabled={Boolean(busyAction)}
              onClick={() => {
                if (onUpdateBackground) {
                  onUpdateBackground({ removeBackground: true })
                }
              }}
              type="button"
              style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: '8px', cursor: Boolean(busyAction) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}
            >
              <Trash2 size={16} color="#ef4444" /> {t('removeBackgroundBtn')}
            </button>
          )}
        </div>
      </section>

      <section className="detail-section pinned-messages-section">
        <div className="detail-section-title">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Pin size={16} /> {t('pinnedSectionTitle')}
          </h3>
          <span>{pinnedMessages.length}</span>
        </div>
        <div className="pinned-message-list">
          {pinnedMessages.map((message) => (
            <button
              className="pinned-message-row"
              key={message.id}
              onClick={() => onOpenPinnedMessage(message.id)}
              type="button"
            >
              <Pin size={15} />
              <span>
                <strong>{getPinnedMessageText(message)}</strong>
                <small>
                  {getPinnedMessageAuthor(message)}
                  {message.time ? ` · ${message.time}` : ''}
                </small>
              </span>
            </button>
          ))}
          {pinnedMessages.length === 0 ? (
            <div className="detail-empty-state">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <PinOff size={24} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                <span>{t('noPinnedMessages')}</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>


      <section className="detail-section">
        <div className="detail-section-title">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderOpen size={16} /> {t('recentFilesTitle')}
          </h3>
          <span>{validAttachments.length}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', padding: '0 16px 12px' }}>
          <button
            onClick={() => setAttachmentTab('image')}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: attachmentTab === 'image' ? 'var(--primary-soft)' : 'transparent',
              color: attachmentTab === 'image' ? 'var(--primary-strong)' : 'var(--muted)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {t('tabImages')} ({imageAttachments.length})
          </button>
          <button
            onClick={() => setAttachmentTab('file')}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: attachmentTab === 'file' ? 'var(--primary-soft)' : 'transparent',
              color: attachmentTab === 'file' ? 'var(--primary-strong)' : 'var(--muted)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {t('tabFiles')} ({fileAttachments.length})
          </button>
          <button
            onClick={() => setAttachmentTab('link')}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: attachmentTab === 'link' ? 'var(--primary-soft)' : 'transparent',
              color: attachmentTab === 'link' ? 'var(--primary-strong)' : 'var(--muted)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {t('tabLinks')} ({linkAttachments.length})
          </button>
        </div>

        <div className="attachment-list">
          {currentTabAttachments.map((attachment) => (
            <a
              className="attachment-row"
              download={attachment.type !== 'link' ? attachment.name : undefined}
              href={attachment.url || '#'}
              key={`${attachment.name}-${attachment.url || ''}`}
              rel="noreferrer"
              target={attachment.url ? '_blank' : undefined}
            >
              <span className={attachment.type === 'image' || attachment.type === 'video' ? 'attachment-icon attachment-thumb' : 'attachment-icon'}>
                {attachment.type === 'image' || attachment.type === 'video' ? (
                  <>
                    {attachment.url ? (
                      <img
                        alt={attachment.name}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                        src={attachment.url}
                      />
                    ) : null}
                    <Image size={18} />
                  </>
                ) : attachment.type === 'link' ? (
                  <Link2 size={18} />
                ) : (
                  <FileText size={18} />
                )}
              </span>
              <span>
                <strong>{attachment.name}</strong>
                <small>{attachment.meta}</small>
              </span>
            </a>
          ))}
          {currentTabAttachments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--subtle)', fontSize: '13px' }}>
              {t('noAttachmentsInTab')}
            </div>
          )}
        </div>
      </section>

      <MembersModal
        isMembersModalOpen={isMembersModalOpen}
        isMembersModalClosing={isMembersModalClosing}
        members={members}
        closeMembersModal={closeMembersModal}
        t={t}
        editingNicknameId={editingNicknameId}
        handleMemberNicknameSubmit={handleMemberNicknameSubmit}
        setEditingNicknameId={setEditingNicknameId}
        memberNicknames={memberNicknames}
        setMemberNicknames={setMemberNicknames}
        busyAction={busyAction}
        handleClearMemberNickname={handleClearMemberNickname}
        getRoleLabel={getRoleLabel}
        actionMenuMemberId={actionMenuMemberId}
        setActionMenuMemberId={setActionMenuMemberId}
        isGroupOwner={isGroupOwner}
        currentUserId={currentUserId}
        onUpdateMemberRole={onUpdateMemberRole}
        onTransferOwner={onTransferOwner}
        onRemoveMember={onRemoveMember}
      />

      <EditGroupModal
        isEditGroupModalOpen={isEditGroupModalOpen}
        isEditGroupModalClosing={isEditGroupModalClosing}
        handleGroupSubmit={handleGroupSubmit}
        t={t}
        closeEditGroupModal={closeEditGroupModal}
        groupTitle={groupTitle}
        setGroupTitle={setGroupTitle}
        groupAvatar={groupAvatar as any}
        handleAvatarChange={handleAvatarChange}
        busyAction={busyAction}
        activeConversationName={activeConversation.name}
      />

      <AddMemberModal
        isAddMemberModalOpen={isAddMemberModalOpen}
        isAddMemberModalClosing={isAddMemberModalClosing}
        t={t}
        closeAddMemberModal={closeAddMemberModal}
        setSelectedFriendId={setSelectedFriendId}
        selectedFriendId={selectedFriendId}
        addableFriends={addableFriends}
        busyAction={busyAction}
        handleAddMember={handleAddMember}
      />

      <RestrictedModal
        isRestrictedModalOpen={isRestrictedModalOpen}
        isRestrictedModalClosing={isRestrictedModalClosing}
        t={t}
        restrictedContacts={restrictedContacts}
        closeRestrictedModal={closeRestrictedModal}
        activeConversation={activeConversation}
        onToggleRestricted={onToggleRestricted}
      />
    </aside>
  )
}

