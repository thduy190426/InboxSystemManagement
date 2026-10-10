import { createPortal } from 'react-dom'
import { Check, ImagePlus, Save, Shield, ShieldCheck, Tag, Trash2, UserCog, UserPlus, Users, X, MoreHorizontal } from 'lucide-react'
import { AvatarFallback } from '../../ui/AvatarFallback'
import type { ContactUser, Conversation, ConversationMember } from '../../../types'

export type MembersModalProps = {
  isMembersModalOpen: boolean
  isMembersModalClosing: boolean
  members: ConversationMember[]
  closeMembersModal: () => void
  t: any
  editingNicknameId: string | null
  handleMemberNicknameSubmit: (event: React.FormEvent<HTMLFormElement>, memberId: string) => void
  setEditingNicknameId: (id: string | null) => void
  memberNicknames: Record<string, string>
  setMemberNicknames: React.Dispatch<React.SetStateAction<Record<string, string>>>
  busyAction?: string
  handleClearMemberNickname: (id: string) => void
  getRoleLabel: (role: 'admin' | 'member' | 'moderator' | 'owner') => string
  actionMenuMemberId: string | null
  setActionMenuMemberId: React.Dispatch<React.SetStateAction<string | null>>
  isGroupOwner: boolean
  currentUserId?: string
  onUpdateMemberRole: (userId: string, role: 'admin' | 'member') => void
  onTransferOwner: (userId: string) => void
  onRemoveMember: (userId: string) => void
}

export function MembersModal({
  isMembersModalOpen, isMembersModalClosing, members, closeMembersModal, t, editingNicknameId, handleMemberNicknameSubmit, setEditingNicknameId, memberNicknames, setMemberNicknames, busyAction, handleClearMemberNickname, getRoleLabel, actionMenuMemberId, setActionMenuMemberId, isGroupOwner, currentUserId, onUpdateMemberRole, onTransferOwner, onRemoveMember
}: MembersModalProps) {
  if (!isMembersModalOpen) return null

  return createPortal(
    <div className={isMembersModalClosing ? 'modal-backdrop is-exiting' : 'modal-backdrop'} role="presentation" style={{ zIndex: 100 }}>
      <div className="group-modal" style={{ maxWidth: '440px', width: '100%' }}>
        <div className="group-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary)', color: '#fff' }}>
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px' }}>{t('groupMembersTitle')}</h2>
              <p style={{ margin: 0, marginTop: '4px', color: 'var(--muted)', fontSize: '14px' }}>{t('membersCount', { count: members.length })}</p>
            </div>
          </div>
          <button className="icon-button" onClick={closeMembersModal} type="button" title={t('closeModal')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--subtle)' }}>
            <X size={18} />
          </button>
        </div>
        
        <div className="group-member-stack" style={{ padding: '16px 24px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
          {members.map((member) => (
            <div className="group-detail-member" key={member.id} style={{ position: 'relative' }}>
              <AvatarFallback name={member.fullName} src={member.avatarUrl} />
              <div className="group-member-body">
                {editingNicknameId === member.id ? (
                  <form
                    className="member-nickname-form"
                    onSubmit={(event) => {
                      handleMemberNicknameSubmit(event, member.id);
                      setEditingNicknameId(null);
                    }}
                    style={{ display: 'flex', gap: '4px', width: '100%', alignItems: 'center' }}
                  >
                    <input
                      aria-label={t('memberAliasAria', { name: member.fullName })}
                      maxLength={80}
                      onChange={(event) =>
                        setMemberNicknames((current) => ({
                          ...current,
                          [member.id]: event.target.value,
                        }))
                      }
                      placeholder={t('aliasInputPlaceholder')}
                      value={memberNicknames[member.id] || ''}
                      style={{ flex: 1, minWidth: 0, padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line-strong)', outline: 'none' }}
                      autoFocus
                    />
                    <button
                      disabled={Boolean(busyAction) || !memberNicknames[member.id]?.trim() || memberNicknames[member.id]?.trim() === (member.nickname || '')}
                      title={t('saveAliasTitle')}
                      type="submit"
                      style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', background: 'var(--primary)', color: '#fff', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
                    >
                      <Save size={14} />
                    </button>
                    <button
                      disabled={Boolean(busyAction) || !memberNicknames[member.id]?.trim()}
                      onClick={() => {
                        handleClearMemberNickname(member.id);
                        setEditingNicknameId(null);
                      }}
                      title={t('removeAliasBtn')}
                      type="button"
                      style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', background: 'var(--surface-soft)', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--line)' }}
                    >
                      <X size={14} />
                    </button>
                    <button
                      onClick={() => setEditingNicknameId(null)}
                      title={t('cancelBtn')}
                      type="button"
                      style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', background: 'var(--surface-soft)', color: 'var(--muted)', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--line)' }}
                    >
                      <X size={14} />
                    </button>
                  </form>
                ) : (
                  <span>
                    <strong>{member.nickname || member.fullName}</strong>
                    <small>
                      {member.nickname
                        ? `${member.fullName} · ${getRoleLabel(member.role)}`
                        : getRoleLabel(member.role)}
                    </small>
                  </span>
                )}
              </div>
              
              {!editingNicknameId || editingNicknameId !== member.id ? (
                <button
                  onClick={() => setActionMenuMemberId((prev) => prev === member.id ? null : member.id)}
                  title={t('actionsTitle')}
                  type="button"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: actionMenuMemberId === member.id ? 'var(--surface-soft)' : 'transparent', border: 'none', cursor: 'pointer', color: 'var(--subtle)' }}
                >
                  <MoreHorizontal size={18} />
                </button>
              ) : null}

              {actionMenuMemberId === member.id ? (
                <div style={{ position: 'absolute', right: '36px', top: '10px', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '4px', zIndex: 10, boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', minWidth: '170px' }}>
                  <button
                    onClick={() => {
                      setEditingNicknameId(member.id);
                      setActionMenuMemberId(null);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
                  >
                    <Tag size={14} /> {t('changeAliasMenu')}
                  </button>

                  {isGroupOwner && member.id !== currentUserId ? (
                    <>
                      {member.role === 'admin' ? (
                        <button
                          disabled={Boolean(busyAction)}
                          onClick={() => { onUpdateMemberRole(member.id, 'member'); setActionMenuMemberId(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
                        >
                          <Shield size={14} /> {t('demoteAdminMenu')}
                        </button>
                      ) : member.role !== 'owner' ? (
                        <button
                          disabled={Boolean(busyAction)}
                          onClick={() => { onUpdateMemberRole(member.id, 'admin'); setActionMenuMemberId(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
                        >
                          <ShieldCheck size={14} /> {t('promoteAdminMenu')}
                        </button>
                      ) : null}

                      {member.role !== 'owner' ? (
                        <button
                          disabled={Boolean(busyAction)}
                          onClick={() => { onTransferOwner(member.id); setActionMenuMemberId(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
                        >
                          <UserCog size={14} /> {t('transferOwnerMenu')}
                        </button>
                      ) : null}
                      <div style={{ height: '1px', background: 'var(--line)', margin: '4px 0' }} />
                    </>
                  ) : null}
                  
                  <button
                    disabled={Boolean(busyAction)}
                    onClick={() => { onRemoveMember(member.id); setActionMenuMemberId(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: '#ef4444' }}
                  >
                    <Trash2 size={14} /> {t('removeMemberMenu')}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

export type EditGroupModalProps = {
  isEditGroupModalOpen: boolean
  isEditGroupModalClosing: boolean
  handleGroupSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  t: any
  closeEditGroupModal: () => void
  groupTitle: string
  setGroupTitle: (title: string) => void
  groupAvatar: string | null
  handleAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  busyAction?: string
  activeConversationName: string
}

export function EditGroupModal({
  isEditGroupModalOpen, isEditGroupModalClosing, handleGroupSubmit, t, closeEditGroupModal, groupTitle, setGroupTitle, groupAvatar, handleAvatarChange, busyAction, activeConversationName
}: EditGroupModalProps) {
  if (!isEditGroupModalOpen) return null

  return createPortal(
    <div className={isEditGroupModalClosing ? 'modal-backdrop is-exiting' : 'modal-backdrop'} role="presentation" style={{ zIndex: 100 }}>
      <form className="group-modal" style={{ maxWidth: '400px', width: '100%' }} onSubmit={handleGroupSubmit}>
        <div className="group-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary)', color: '#fff' }}>
              <UserCog size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px' }}>{t('updateGroupTitle')}</h2>
              <p style={{ margin: 0, marginTop: '4px', color: 'var(--muted)', fontSize: '14px' }}>{t('updateGroupDesc')}</p>
            </div>
          </div>
          <button className="icon-button" onClick={closeEditGroupModal} type="button" title={t('closeModal')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--subtle)' }}>
            <X size={18} />
          </button>
        </div>
        
        <div style={{ padding: '24px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t('groupNameInputD')}</span>
            <input
              aria-label={t('groupNameAria')}
              onChange={(event) => setGroupTitle(event.target.value)}
              value={groupTitle}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line-strong)', outline: 'none' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t('groupAvatarInputD')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '50%', background: 'var(--surface-soft)', border: '1px dashed var(--line-strong)', display: 'grid', placeItems: 'center', color: 'var(--subtle)' }}>
                {groupAvatar ? <Check size={20} color="var(--primary)" /> : <ImagePlus size={20} />}
              </div>
              <input accept="image/*" onChange={handleAvatarChange} type="file" style={{ fontSize: '14px' }} />
            </div>
          </label>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--surface-soft)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <button
            onClick={closeEditGroupModal}
            type="button"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fff', cursor: 'pointer', fontWeight: 600, color: 'var(--text)' }}
          >
            <X size={16} /> {t('cancelBtn')}
          </button>
          <button
            disabled={Boolean(busyAction) || (!groupAvatar && groupTitle.trim() === activeConversationName)}
            type="submit"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            <Save size={16} /> {t('saveChangesBtn')}
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}

export type AddMemberModalProps = {
  isAddMemberModalOpen: boolean
  isAddMemberModalClosing: boolean
  t: any
  closeAddMemberModal: () => void
  setSelectedFriendId: (id: string) => void
  selectedFriendId: string
  addableFriends: ContactUser[]
  busyAction?: string
  handleAddMember: () => void
}

export function AddMemberModal({
  isAddMemberModalOpen, isAddMemberModalClosing, t, closeAddMemberModal, setSelectedFriendId, selectedFriendId, addableFriends, busyAction, handleAddMember
}: AddMemberModalProps) {
  if (!isAddMemberModalOpen) return null

  return createPortal(
    <div className={isAddMemberModalClosing ? 'modal-backdrop is-exiting' : 'modal-backdrop'} role="presentation" style={{ zIndex: 100 }}>
      <div className="group-modal" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="group-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary)', color: '#fff' }}>
              <UserPlus size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px' }}>{t('addMemberTitle')}</h2>
              <p style={{ margin: 0, marginTop: '4px', color: 'var(--muted)', fontSize: '14px' }}>{t('addMemberDesc')}</p>
            </div>
          </div>
          <button className="icon-button" onClick={closeAddMemberModal} type="button" title={t('closeModal')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--subtle)' }}>
            <X size={18} />
          </button>
        </div>
        
        <div style={{ padding: '24px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t('selectFriendLabel')}</span>
            <select
              aria-label={t('selectFriendAria')}
              onChange={(event) => setSelectedFriendId(event.target.value)}
              value={selectedFriendId}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line-strong)', outline: 'none', background: '#fff' }}
            >
              <option value="">{t('selectFriendPlaceholder')}</option>
              {addableFriends.map((friend) => (
                <option key={friend.id} value={friend.id}>
                  {friend.fullName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--surface-soft)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <button
            onClick={closeAddMemberModal}
            type="button"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--line)', background: '#fff', cursor: 'pointer', fontWeight: 600, color: 'var(--text)' }}
          >
            <X size={16} /> {t('cancelBtn')}
          </button>
          <button
            disabled={Boolean(busyAction) || !selectedFriendId}
            onClick={handleAddMember}
            type="button"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            <Check size={16} /> {t('addNowBtn')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export type RestrictedModalProps = {
  isRestrictedModalOpen: boolean
  isRestrictedModalClosing: boolean
  t: any
  restrictedContacts?: ContactUser[]
  closeRestrictedModal: () => void
  activeConversation: Conversation
  onToggleRestricted?: () => void
}

export function RestrictedModal({
  isRestrictedModalOpen, isRestrictedModalClosing, t, restrictedContacts, closeRestrictedModal, activeConversation, onToggleRestricted
}: RestrictedModalProps) {
  if (!isRestrictedModalOpen) return null

  return createPortal(
    <div className={isRestrictedModalClosing ? 'modal-backdrop is-exiting' : 'modal-backdrop'} role="presentation" style={{ zIndex: 100 }}>
      <div className="group-modal" style={{ maxWidth: '440px', width: '100%' }}>
        <div className="group-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--surface-soft)', color: 'var(--text)' }}>
              <Shield size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px' }}>{t('restrictedAccTitle')}</h2>
              <p style={{ margin: 0, marginTop: '4px', color: 'var(--muted)', fontSize: '14px' }}>{t('restrictedAccCount', { count: (restrictedContacts || []).length })}</p>
            </div>
          </div>
          <button className="icon-button" onClick={closeRestrictedModal} type="button" title={t('closeModal')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--subtle)' }}>
            <X size={18} />
          </button>
        </div>
        
        <div className="group-member-stack" style={{ padding: '16px 24px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
          <p style={{ fontSize: '13px', color: 'var(--subtle)', marginBottom: '16px', lineHeight: 1.5 }}>
            {t('restrictedAccDesc')}
          </p>
          {(restrictedContacts || []).map((contact) => (
            <div className="group-detail-member" key={contact.id} style={{ position: 'relative' }}>
              <AvatarFallback name={contact.fullName} src={contact.avatarUrl} />
              <div className="group-member-body">
                <span>
                  <strong>{contact.fullName}</strong>
                </span>
              </div>
              <button
                className="primary-button outline"
                style={{ padding: '4px 12px', fontSize: '13px' }}
                onClick={() => {
                  if (activeConversation.contactId === contact.id) {
                    onToggleRestricted?.()
                  }
                }}
              >
                {t('unrestrictBtn')}
              </button>
            </div>
          ))}
          {(restrictedContacts || []).length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--subtle)' }}>
              {t('noRestrictedAcc')}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
