import type { ChangeEvent, FormEvent } from 'react'
import { useState, lazy, Suspense, useMemo } from 'react'
import {
  IdCard,
  AtSign,
  Phone,
  Users,
  CalendarDays,
  MapPin,
  MessageSquare,
  AlignLeft,
  Save,
  Mail,
  Edit2,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AuthUser } from '../../services/api/authApi'
import type { ContactUser } from '../../types'
import type { ProfilePayload } from '../../services/api/userApi'
import type { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react'
import {
  validateProfileForm,
  PROFILE_LIMITS,
  type ProfileErrors,
} from '../../utils/profileValidation'

const EmojiPicker = lazy(() => import('emoji-picker-react'))

type AboutTabProps = {
  user: AuthUser | ContactUser
  isOwnProfile: boolean
  isEditing: boolean
  onToggleEdit: (editing: boolean) => void
  onSaveProfile?: (payload: ProfilePayload) => Promise<void>
  isSaving?: boolean
}

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function AboutTab({
  user,
  isOwnProfile,
  isEditing,
  onToggleEdit,
  onSaveProfile,
  isSaving = false,
}: AboutTabProps) {
  const { t } = useTranslation('profile')

  const initialPayload: ProfilePayload = {
    displayName: ('displayName' in user && user.displayName) || user.fullName || '',
    handle: user.handle || '',
    phone: user.phone || '',
    gender: user.gender || '',
    address: user.address || '',
    birthDate: user.birthDate ? user.birthDate.slice(0, 10) : '',
    bio: user.bio || '',
    statusMessage: user.statusMessage || '',
    statusEmoji: ('statusEmoji' in user && user.statusEmoji) || '💬',
    statusDuration: ('statusDuration' in user && user.statusDuration) || 'none',
  }

  const [form, setForm] = useState<ProfilePayload>(initialPayload)
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)

  const formValidation = useMemo(() => validateProfileForm(form, t), [form, t])
  const isFormValid = formValidation.isValid

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'handle' ? value.toLowerCase() : value,
    }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function handleEmojiClick(data: EmojiClickData) {
    setForm((prev) => ({ ...prev, statusEmoji: data.emoji }))
    setIsEmojiPickerOpen(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!onSaveProfile) return

    if (!formValidation.isValid) {
      setErrors(formValidation.errors)
      return
    }

    await onSaveProfile(form)
    onToggleEdit(false)
  }

  function getGenderLabel(gender?: string | null) {
    if (gender === 'male') return t('genderMale', { defaultValue: 'Nam' })
    if (gender === 'female') return t('genderFemale', { defaultValue: 'Nữ' })
    if (gender === 'other') return t('genderOther', { defaultValue: 'Khác' })
    if (gender === 'prefer_not_to_say') return t('genderPreferNotToSay', { defaultValue: 'Không muốn chia sẻ' })
    return t('genderUnknown', { defaultValue: 'Chưa cập nhật' })
  }

  return (
    <div className="profile-tab-content">
      {isOwnProfile && isEditing ? (
        <form className="pp-card" onSubmit={handleSubmit} style={{ padding: '24px', background: 'var(--surface, #1e293b)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
              {t('title', { defaultValue: 'Chỉnh sửa hồ sơ' })}
            </h2>
            <button
              className="profile-btn profile-btn--ghost"
              onClick={() => onToggleEdit(false)}
              type="button"
            >
              <X size={15} />
              <span>{t('collapse', { defaultValue: 'Đóng' })}</span>
            </button>
          </div>

          <div className="pp-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <label className={`pp-field${errors.displayName ? ' pp-field--error' : ''}`}>
              <span className="pp-field-label">
                <IdCard size={14} /> {t('displayNameLabel', { defaultValue: 'Tên hiển thị' })} <span style={{ color: '#ef4444' }}>*</span>
              </span>
              <input
                className="pp-input"
                maxLength={PROFILE_LIMITS.DISPLAY_NAME_MAX}
                name="displayName"
                onChange={handleChange}
                placeholder={t('displayNamePlaceholder', { defaultValue: 'Nhập tên hiển thị' })}
                required
                value={form.displayName}
              />
              {errors.displayName && <span className="pp-field-error">{errors.displayName}</span>}
            </label>

            <label className={`pp-field${errors.handle ? ' pp-field--error' : ''}`}>
              <span className="pp-field-label"><AtSign size={14} /> {t('handleLabel', { defaultValue: 'Tên định danh' })}</span>
              <input
                className="pp-input"
                maxLength={PROFILE_LIMITS.HANDLE_MAX}
                name="handle"
                onChange={handleChange}
                placeholder="username"
                value={form.handle}
              />
              {errors.handle && <span className="pp-field-error">{errors.handle}</span>}
            </label>

            <label className={`pp-field${errors.phone ? ' pp-field--error' : ''}`}>
              <span className="pp-field-label"><Phone size={14} /> {t('phoneLabel', { defaultValue: 'Số điện thoại' })}</span>
              <input
                className="pp-input"
                name="phone"
                onChange={handleChange}
                placeholder="0912345678"
                type="tel"
                value={form.phone}
              />
              {errors.phone && <span className="pp-field-error">{errors.phone}</span>}
            </label>

            <label className="pp-field">
              <span className="pp-field-label"><Users size={14} /> {t('genderLabel', { defaultValue: 'Giới tính' })}</span>
              <select
                className="pp-input pp-select"
                name="gender"
                onChange={handleChange}
                value={form.gender}
              >
                <option value="">{t('genderPlaceholder', { defaultValue: 'Chưa cập nhật' })}</option>
                <option value="male">{t('genderMale', { defaultValue: 'Nam' })}</option>
                <option value="female">{t('genderFemale', { defaultValue: 'Nữ' })}</option>
                <option value="other">{t('genderOther', { defaultValue: 'Khác' })}</option>
                <option value="prefer_not_to_say">{t('genderPreferNotToSay', { defaultValue: 'Không muốn chia sẻ' })}</option>
              </select>
            </label>

            <label className={`pp-field${errors.birthDate ? ' pp-field--error' : ''}`}>
              <span className="pp-field-label"><CalendarDays size={14} /> {t('birthDateLabel', { defaultValue: 'Ngày sinh' })}</span>
              <input
                className="pp-input"
                max={getLocalDateInputValue()}
                min="1900-01-01"
                name="birthDate"
                onChange={handleChange}
                type="date"
                value={form.birthDate}
              />
              {errors.birthDate && <span className="pp-field-error">{errors.birthDate}</span>}
            </label>

            <label className={`pp-field${errors.address ? ' pp-field--error' : ''}`}>
              <span className="pp-field-label"><MapPin size={14} /> {t('addressLabel', { defaultValue: 'Địa chỉ' })}</span>
              <input
                className="pp-input"
                maxLength={PROFILE_LIMITS.ADDRESS_MAX}
                name="address"
                onChange={handleChange}
                placeholder={t('addressPlaceholder', { defaultValue: 'Ví dụ: Hà Nội, Việt Nam' })}
                value={form.address}
              />
              {errors.address && <span className="pp-field-error">{errors.address}</span>}
            </label>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label className={`pp-field${errors.statusMessage ? ' pp-field--error' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="pp-field-label"><MessageSquare size={14} /> {t('statusLabel', { defaultValue: 'Trạng thái cá nhân' })}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {form.statusMessage ? form.statusMessage.length : 0}/{PROFILE_LIMITS.STATUS_MESSAGE_MAX}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                <button
                  className="pp-input pp-select"
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                  style={{ width: '60px', flexShrink: 0, textAlign: 'center', cursor: 'pointer' }}
                  type="button"
                >
                  {form.statusEmoji}
                </button>
                {isEmojiPickerOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: '4px' }}>
                    <Suspense fallback={<div>Loading...</div>}>
                      <EmojiPicker
                        emojiStyle={'native' as EmojiStyle}
                        onEmojiClick={handleEmojiClick}
                        theme={'dark' as Theme}
                      />
                    </Suspense>
                  </div>
                )}
                <input
                  className="pp-input"
                  maxLength={PROFILE_LIMITS.STATUS_MESSAGE_MAX}
                  name="statusMessage"
                  onChange={handleChange}
                  placeholder={t('statusPlaceholder', { defaultValue: 'Đang sẵn sàng hỗ trợ' })}
                  style={{ flexGrow: 1 }}
                  value={form.statusMessage}
                />
              </div>
              {errors.statusMessage && <span className="pp-field-error">{errors.statusMessage}</span>}
            </label>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label className={`pp-field${errors.bio ? ' pp-field--error' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="pp-field-label"><AlignLeft size={14} /> {t('bioLabel', { defaultValue: 'Giới thiệu' })}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {form.bio ? form.bio.length : 0}/{PROFILE_LIMITS.BIO_MAX}
                </span>
              </div>
              <textarea
                className="pp-input pp-textarea"
                maxLength={PROFILE_LIMITS.BIO_MAX}
                name="bio"
                onChange={handleChange}
                placeholder={t('bioPlaceholder', { defaultValue: 'Viết vài dòng giới thiệu về bản thân bạn...' })}
                rows={3}
                value={form.bio}
              />
              {errors.bio && <span className="pp-field-error">{errors.bio}</span>}
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              className="profile-btn profile-btn--ghost"
              onClick={() => onToggleEdit(false)}
              type="button"
            >
              <span>{t('collapse', { defaultValue: 'Hủy' })}</span>
            </button>
            <button
              className="profile-btn profile-btn--primary"
              disabled={!isFormValid || isSaving}
              title={!isFormValid ? t('errors.formHasErrors', { defaultValue: 'Vui lòng nhập đúng và đủ các thông tin hợp lệ!' }) : undefined}
              type="submit"
            >
              <Save size={15} />
              <span>{isSaving ? t('saving', { defaultValue: 'Đang lưu...' }) : t('saveChanges', { defaultValue: 'Lưu thay đổi' })}</span>
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
              {t('tabAbout', { defaultValue: 'Giới thiệu' })}
            </h2>
            {isOwnProfile && (
              <button
                className="profile-btn profile-btn--secondary"
                onClick={() => onToggleEdit(true)}
                type="button"
              >
                <Edit2 size={14} />
                <span>{t('editProfile', { defaultValue: 'Chỉnh sửa' })}</span>
              </button>
            )}
          </div>

          <div className="profile-info-grid">
            {user.email && (
              <div className="profile-info-card" title={user.email}>
                <div className="profile-info-card-left">
                  <div className="profile-stat-icon"><Mail size={16} /></div>
                  <div className="profile-info-card-body">
                    <div className="profile-info-sub">{t('emailLabel', { defaultValue: 'Email' })}</div>
                    <strong className="profile-info-value" style={{ wordBreak: 'break-all' }}>{user.email}</strong>
                  </div>
                </div>
              </div>
            )}

            {user.phone && user.showPhone !== false && (
              <div className="profile-info-card" title={user.phone}>
                <div className="profile-info-card-left">
                  <div className="profile-stat-icon"><Phone size={16} /></div>
                  <div className="profile-info-card-body">
                    <div className="profile-info-sub">{t('phoneLabel', { defaultValue: 'Số điện thoại' })}</div>
                    <strong className="profile-info-value">{user.phone}</strong>
                  </div>
                </div>
              </div>
            )}

            {user.gender && user.showGender !== false && (
              <div className="profile-info-card" title={getGenderLabel(user.gender)}>
                <div className="profile-info-card-left">
                  <div className="profile-stat-icon"><Users size={16} /></div>
                  <div className="profile-info-card-body">
                    <div className="profile-info-sub">{t('genderLabel', { defaultValue: 'Giới tính' })}</div>
                    <strong className="profile-info-value">{getGenderLabel(user.gender)}</strong>
                  </div>
                </div>
              </div>
            )}

            {user.birthDate && user.showBirthDate !== false && (
              <div className="profile-info-card" title={user.birthDate.slice(0, 10)}>
                <div className="profile-info-card-left">
                  <div className="profile-stat-icon"><CalendarDays size={16} /></div>
                  <div className="profile-info-card-body">
                    <div className="profile-info-sub">{t('birthDateLabel', { defaultValue: 'Ngày sinh' })}</div>
                    <strong className="profile-info-value">{user.birthDate.slice(0, 10)}</strong>
                  </div>
                </div>
              </div>
            )}

            {user.address && user.showAddress !== false && (
              <div className="profile-info-card profile-info-card--wide profile-info-card--align-top" title={user.address}>
                <div className="profile-info-card-left">
                  <div className="profile-stat-icon" style={{ marginTop: '2px' }}><MapPin size={16} /></div>
                  <div className="profile-info-card-body">
                    <div className="profile-info-sub">{t('addressLabel', { defaultValue: 'Địa chỉ' })}</div>
                    <strong className="profile-info-value">{user.address}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
