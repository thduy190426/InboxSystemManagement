import React, { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Users,
  X,
  Type,
  FileText,
  ImagePlus,
  Trash2,
  Search,
  Check,
  Camera,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AvatarFallback } from '../../ui/AvatarFallback'
import type { ContactUser } from '../../../types'

export type CreateGroupModalProps = {
  isOpen: boolean
  isClosing?: boolean
  onClose: () => void
  friends: ContactUser[]
  isCreating: boolean
  onSubmit: (payload: {
    title: string
    description?: string
    memberIds: string[]
    avatar?: File | null
  }) => Promise<void> | void
}

export function CreateGroupModal({
  isOpen,
  isClosing = false,
  onClose,
  friends,
  isCreating,
  onSubmit,
}: CreateGroupModalProps) {
  const { t } = useTranslation('panels')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [groupTitle, setGroupTitle] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  // Reset fields when opened
  useEffect(() => {
    if (isOpen) {
      setGroupTitle('')
      setGroupDescription('')
      setGroupAvatar(null)
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
        setAvatarPreview(null)
      }
      setSelectedMemberIds([])
      setSearchTerm('')
    }
  }, [isOpen])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
    }
    if (file) {
      setGroupAvatar(file)
      setAvatarPreview(URL.createObjectURL(file))
    } else {
      setGroupAvatar(null)
      setAvatarPreview(null)
    }
  }

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
    }
    setGroupAvatar(null)
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const removeSelectedMember = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedMemberIds((prev) => prev.filter((item) => item !== id))
  }

  const filteredFriends = useMemo(() => {
    if (!searchTerm.trim()) return friends
    const query = searchTerm.toLowerCase().trim()
    return friends.filter(
      (f) =>
        f.fullName.toLowerCase().includes(query) ||
        (f.email && f.email.toLowerCase().includes(query)) ||
        (f.handle && f.handle.toLowerCase().includes(query))
    )
  }, [friends, searchTerm])

  const selectedFriends = useMemo(() => {
    return friends.filter((f) => selectedMemberIds.includes(f.id))
  }, [friends, selectedMemberIds])

  const isTitleValid = groupTitle.trim().length >= 2 && groupTitle.trim().length <= 50
  const isMembersValid = selectedMemberIds.length >= 1
  const canSubmit = isTitleValid && isMembersValid && !isCreating

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSubmit) return

    await onSubmit({
      title: groupTitle.trim(),
      description: groupDescription.trim() || undefined,
      memberIds: selectedMemberIds,
      avatar: groupAvatar,
    })
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className={isClosing ? 'modal-backdrop is-exiting' : 'modal-backdrop'}
      role="presentation"
      style={{ zIndex: 100 }}
    >
      <form
        className="group-modal"
        onSubmit={handleSubmit}
        style={{
          width: 'min(520px, 95vw)',
          maxHeight: 'min(760px, 90vh)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-lg, 0 20px 40px rgba(0, 0, 0, 0.25))',
        }}
      >
        {/* Header */}
        <div
          className="group-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-strong, #4f46e5) 100%)',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(var(--primary-rgb, 79, 70, 229), 0.3)',
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                {t('createGroupTitle')}
              </h2>
              <p style={{ margin: 0, marginTop: '2px', color: 'var(--muted)', fontSize: '13px' }}>
                {t('createGroupDesc')}
              </p>
            </div>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            type="button"
            title={t('closeBtn')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'var(--surface-soft, rgba(0,0,0,0.05))',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Group Info: Avatar & Title & Description */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {/* Avatar uploader with Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'relative',
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                border: '2px dashed var(--line-strong)',
                background: 'var(--surface-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
              title={avatarPreview ? t('changeGroupAvatar') : t('groupAvatarPlaceholder')}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Group Avatar Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--muted)' }}>
                  <ImagePlus size={22} />
                  <span style={{ fontSize: '10px', marginTop: '2px', fontWeight: 600 }}>Ảnh</span>
                </div>
              )}
              {/* Overlay on hover */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  color: '#fff',
                }}
                className="avatar-hover-overlay"
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
              >
                <Camera size={20} />
              </div>
            </div>

            <input
              ref={fileInputRef}
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
              type="file"
            />

            {avatarPreview && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger, #ef4444)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                <Trash2 size={12} /> {t('removeGroupAvatar')}
              </button>
            )}
          </div>

          {/* Title & Description inputs */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label className="group-field" style={{ gap: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                <Type size={15} color="var(--primary)" /> {t('groupNameInput')} <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
              </span>
              <input
                autoFocus
                maxLength={50}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder={t('groupNamePlaceholder')}
                value={groupTitle}
                style={{
                  height: '40px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: '1px solid var(--line-strong)',
                }}
              />
            </label>

            <label className="group-field" style={{ gap: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                <FileText size={15} color="var(--muted)" /> {t('groupDescInput')}
              </span>
              <input
                maxLength={150}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder={t('groupDescPlaceholder')}
                value={groupDescription}
                style={{
                  height: '36px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid var(--line-strong)',
                }}
              />
            </label>
          </div>
        </div>

        {/* Member Picker Section */}
        <div className="group-member-picker" style={{ gap: '8px' }}>
          <div className="group-member-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
              <Users size={16} color="var(--primary)" /> {t('membersLabel')}
            </strong>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: selectedMemberIds.length >= 1 ? 'var(--primary)' : 'var(--muted)',
                background: selectedMemberIds.length >= 1 ? 'var(--primary-subtle, rgba(99, 102, 241, 0.1))' : 'var(--surface-soft)',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {t('nSelected', { count: selectedMemberIds.length })}
            </span>
          </div>

          {/* Selected Member Chips Bar */}
          {selectedFriends.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                padding: '6px 2px',
                scrollbarWidth: 'thin',
              }}
            >
              {selectedFriends.map((friend) => (
                <div
                  key={friend.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 8px 3px 4px',
                    borderRadius: '20px',
                    background: 'var(--surface-strong)',
                    border: '1px solid var(--line-strong)',
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <AvatarFallback
                    name={friend.fullName}
                    src={friend.avatarUrl}
                    style={{ width: '22px', height: '22px', fontSize: '10px' }}
                  />
                  <span>{friend.fullName}</span>
                  <button
                    type="button"
                    onClick={(e) => removeSelectedMember(friend.id, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'var(--line-strong)',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text)',
                      padding: 0,
                    }}
                    title={t('removeSelected')}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder={t('searchFriendsPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                paddingLeft: '36px',
                paddingRight: searchTerm ? '32px' : '12px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid var(--line-strong)',
                background: 'var(--surface)',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Friends List */}
          <div
            className="group-member-list"
            style={{
              maxHeight: '230px',
              overflowY: 'auto',
              borderRadius: '8px',
              border: '1px solid var(--line)',
              padding: '4px',
            }}
          >
            {filteredFriends.map((friend) => {
              const isSelected = selectedMemberIds.includes(friend.id)
              return (
                <label
                  className="group-member-row"
                  key={friend.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--primary-subtle, rgba(99, 102, 241, 0.08))' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <input
                    checked={isSelected}
                    onChange={() => toggleMember(friend.id)}
                    type="checkbox"
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--primary)',
                      cursor: 'pointer',
                    }}
                  />
                  <AvatarFallback
                    name={friend.fullName}
                    src={friend.avatarUrl}
                    style={{ width: '38px', height: '38px' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text)' }}>
                      {friend.fullName}
                    </strong>
                    <small style={{ color: 'var(--muted)', fontSize: '12px', display: 'block' }}>
                      {friend.handle ? `@${friend.handle}` : friend.email}
                    </small>
                  </div>
                </label>
              )
            })}

            {filteredFriends.length === 0 && (
              <div
                className="empty-state"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '28px 16px',
                  color: 'var(--muted)',
                  gap: '8px',
                }}
              >
                <Users size={32} strokeWidth={1.5} />
                <span style={{ fontSize: '13px' }}>
                  {searchTerm ? t('noMatchingFriends') : t('noFriendsForGroup')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          className="group-primary-button"
          disabled={!canSubmit}
          title={
            !isTitleValid
              ? t('groupNameMinLen')
              : !isMembersValid
              ? t('groupMinMembers')
              : ''
          }
          type="submit"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            height: '44px',
            fontSize: '15px',
            fontWeight: 700,
            borderRadius: '10px',
            background: canSubmit
              ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-strong, #4f46e5) 100%)'
              : 'var(--surface-strong)',
            color: canSubmit ? '#fff' : 'var(--muted)',
            border: 'none',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            boxShadow: canSubmit ? '0 4px 14px rgba(var(--primary-rgb, 79, 70, 229), 0.35)' : 'none',
            transition: 'all 0.2s',
            marginTop: '4px',
          }}
        >
          {isCreating ? null : <Check size={18} />}
          {isCreating ? t('creatingGroupTxt') : t('createGroupBtn')}
        </button>
      </form>
    </div>,
    document.body
  )
}
