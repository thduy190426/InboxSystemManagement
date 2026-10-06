import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useState, lazy, Suspense } from 'react'
import {
  AlignLeft, AtSign, CalendarDays, Camera, IdCard, MapPin,
  MessageSquare, Phone, Save, Shield, User, Users,
} from 'lucide-react'
import type { AuthUser } from '../../services/api/authApi'
import {
  fetchProfile,
  updateProfile,
  uploadAvatar,
  type ProfilePayload,
} from '../../services/api/userApi'
import { AvatarCropper } from '../ui/AvatarCropper'
import { AvatarFallback } from '../ui/AvatarFallback'
import { useTranslation } from 'react-i18next'
import type { EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react'
const EmojiPicker = lazy(() => import('emoji-picker-react'))

type ProfilePageProps = {
  currentUser: AuthUser | null
  onUserChange: (user: AuthUser) => void
  pushToast: (text: string, tone?: 'info' | 'error') => void
}

type ProfileErrors = Partial<Record<keyof ProfilePayload, string>>

function createInitialForm(user: AuthUser | null): ProfilePayload {
  return {
    displayName: user?.displayName ?? '',
    handle: user?.handle ?? '',
    phone: user?.phone ?? '',
    gender: user?.gender ?? '',
    address: user?.address ?? '',
    birthDate: user?.birthDate ? user.birthDate.slice(0, 10) : '',
    bio: user?.bio ?? '',
    statusMessage: user?.statusMessage ?? '',
    statusEmoji: user?.statusEmoji ?? '💬',
    statusDuration: user?.statusDuration ?? 'none',
  }
}

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getGenderLabel(gender: string, t: (key: string) => string) {
  if (gender === 'male') return t('genderMale')
  if (gender === 'female') return t('genderFemale')
  if (gender === 'other') return t('genderOther')
  if (gender === 'prefer_not_to_say') return t('genderPreferNotToSay')
  return t('genderUnknown')
}

function getGlobalRoleLabel(role: string, t: (key: string) => string) {
  if (role === 'owner') return t('roleOwner')
  if (role === 'admin') return t('roleAdmin')
  if (role === 'moderator') return t('roleModerator')
  if (role === 'user') return t('roleUser')
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : t('roleUser')
}

function validateProfileForm(form: ProfilePayload, t: (key: string) => string) {
  const errors: ProfileErrors = {}

  if (!form.displayName.trim()) {
    errors.displayName = t('errors.displayNameRequired')
  } else if (form.displayName.trim().length > 80) {
    errors.displayName = t('errors.displayNameMax')
  }

  if (form.handle.trim() && !/^[a-z0-9][a-z0-9._]{2,31}$/.test(form.handle.trim())) {
    errors.handle = t('errors.handleInvalid')
  }

  if (!form.phone.trim()) {
    errors.phone = t('errors.phoneRequired')
  } else if (!/^\+?[0-9\s.-]{8,32}$/.test(form.phone.trim())) {
    errors.phone = t('errors.phoneInvalid')
  }

  if (!form.gender) {
    errors.gender = t('errors.genderRequired')
  }

  if (!form.birthDate) {
    errors.birthDate = t('errors.birthDateRequired')
  } else if (form.birthDate > getLocalDateInputValue()) {
    errors.birthDate = t('errors.birthDateMax')
  }

  if (!form.address.trim()) {
    errors.address = t('errors.addressRequired')
  } else if (form.address.trim().length > 255) {
    errors.address = t('errors.addressMax')
  }

  if (!form.statusMessage.trim()) {
    errors.statusMessage = t('errors.statusMessageRequired')
  } else if (form.statusMessage.trim().length > 120) {
    errors.statusMessage = t('errors.statusMessageMax')
  }

  if (!form.bio.trim()) {
    errors.bio = t('errors.bioRequired')
  } else if (form.bio.trim().length > 255) {
    errors.bio = t('errors.bioMax')
  }

  return errors
}

type ProfileSectionProps = {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

function ProfileSection({ icon, title, children }: ProfileSectionProps) {
  return (
    <section className="pp-section">
      <div className="pp-section-header">
        <span className="pp-section-icon">{icon}</span>
        <h2>{title}</h2>
      </div>
      <div className="pp-section-body">
        {children}
      </div>
    </section>
  )
}

type ProfileFieldProps = {
  label: string
  icon: React.ReactNode
  error?: string
  wide?: boolean
  children: React.ReactNode
}

function ProfileField({ label, icon, error, wide, children }: ProfileFieldProps) {
  return (
    <label className={`pp-field${wide ? ' pp-field--wide' : ''}${error ? ' pp-field--error' : ''}`}>
      <span className="pp-field-label">
        {icon}
        {label}
      </span>
      {children}
      {error && <span className="pp-field-error">{error}</span>}
    </label>
  )
}

export function ProfilePage({ currentUser, onUserChange, pushToast }: ProfilePageProps) {
  const [fullName, setFullName] = useState(currentUser?.fullName ?? '')
  const [form, setForm] = useState<ProfilePayload>(() => createInitialForm(currentUser))
  const [initialForm, setInitialForm] = useState<ProfilePayload>(() => createInitialForm(currentUser))
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({})
  const [isBioExpanded, setIsBioExpanded] = useState(false)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const { t } = useTranslation('profile')

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setForm(prev => ({ ...prev, statusEmoji: emojiData.emoji }))
    setIsEmojiPickerOpen(false)
  }

  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm)
  const hasLongBio = form.bio.trim().length > 120

  useEffect(() => {
    let isMounted = true

    fetchProfile()
      .then((response) => {
        if (!isMounted) return
        onUserChange(response.user)
        const nextForm = createInitialForm(response.user)
        setFullName(response.user.fullName)
        setForm(nextForm)
        setInitialForm(nextForm)
        setAvatarUrl(response.user.avatarUrl ?? '')
      })
      .catch((error) => {
        if (isMounted) {
          pushToast(error instanceof Error ? error.message : t('profileLoadFailed'), 'error')
        }
      })

    return () => { isMounted = false }
  }, [])

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: name === 'handle' ? value.toLocaleLowerCase('en-US') : value,
    }))
    setProfileErrors((current) => ({ ...current, [name]: '' }))
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type === 'image/gif') {
      try {
        setIsUploading(true)
        const response = await uploadAvatar(file)
        onUserChange(response.user)
        setAvatarUrl(response.user.avatarUrl ?? '')
        pushToast(t('avatarUpdated'), 'info')
      } catch (error) {
        pushToast(error instanceof Error ? error.message : t('avatarUpdateFailed'), 'error')
      } finally {
        setIsUploading(false)
      }
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setCropImageSrc(reader.result?.toString() || null)
    })
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  async function handleCroppedImage(croppedBlob: Blob) {
    setCropImageSrc(null)
    const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' })
    try {
      setIsUploading(true)
      const response = await uploadAvatar(file)
      onUserChange(response.user)
      setAvatarUrl(response.user.avatarUrl ?? '')
      pushToast(t('avatarUpdated'), 'info')
    } catch (error) {
      pushToast(error instanceof Error ? error.message : t('avatarUpdateFailed'), 'error')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasChanges) return

    const errors = validateProfileForm(form, t)
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors)
      pushToast(t('errors.fillRequired'), 'error')
      return
    }

    try {
      setIsSaving(true)
      setProfileErrors({})
      const response = await updateProfile(form)
      onUserChange(response.user)
      const nextForm = createInitialForm(response.user)
      setFullName(response.user.fullName)
      setForm(nextForm)
      setInitialForm(nextForm)
      pushToast(t('profileSaved'), 'info')
    } catch (error) {
      pushToast(error instanceof Error ? error.message : t('profileSaveFailed'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="pp-page" aria-labelledby="profile-title">
      <header className="pp-page-header">
        <div>
          <div className="pp-page-kicker">
            <User size={12} />
            {t('kicker')}
          </div>
          <h1 id="profile-title">{t('title')}</h1>
        </div>
        <div className="pp-header-aside">
          {hasChanges && (
            <span className="pp-unsaved-badge">{t('unsaved')}</span>
          )}
        </div>
      </header>

      <form className="pp-form-wrapper" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="pp-grid">
          <ProfileSection icon={<Camera size={15} />} title={t('avatarSection')}>
          <div className="pp-avatar-card">
            <div className="pp-avatar-wrap">
              <AvatarFallback
                name={form.displayName || fullName}
                src={avatarUrl}
              />
              {currentUser?.role && (
                <div className={`pp-role-badge pp-role-badge--${currentUser.role.toLowerCase()}`}>
                  <Shield size={11} />
                  <span>{getGlobalRoleLabel(currentUser.role, t)}</span>
                </div>
              )}
            </div>
            <div className="pp-avatar-info">
              <strong className="pp-avatar-name">{form.displayName || fullName || t('defaultUser')}</strong>
              {form.handle && (
                <span className="pp-avatar-handle">@{form.handle}</span>
              )}
              <span className="pp-avatar-status">
                {form.statusEmoji} {form.statusMessage || t('statusNotUpdated')}
              </span>
            </div>
            <label className="pp-upload-btn">
              <Camera size={14} />
              {isUploading ? t('uploading') : t('changeAvatar')}
              <input accept="image/*" disabled={isUploading} onChange={handleAvatarChange} type="file" />
            </label>
          </div>
        </ProfileSection>

        <ProfileSection icon={<AlignLeft size={15} />} title={t('bioSection')}>
          <div className="pp-bio-preview">
            <p className={isBioExpanded ? 'is-expanded' : ''}>
              {form.bio || t('bioEmpty')}
            </p>
            {hasLongBio && (
              <button
                className="pp-bio-toggle"
                onClick={() => setIsBioExpanded((v) => !v)}
                type="button"
              >
                {isBioExpanded ? t('collapse') : t('seeMore')}
              </button>
            )}
          </div>
          <div className="pp-meta-chips">
            <span className="pp-chip"><Users size={12} />{getGenderLabel(form.gender, t)}</span>
            {form.address && <span className="pp-chip"><MapPin size={12} />{form.address}</span>}
          </div>
        </ProfileSection>

        <ProfileSection icon={<IdCard size={15} />} title={t('basicInfoSection')}>
            <div className="pp-fields">

              <ProfileField label={t('displayNameLabel')} icon={<IdCard size={14} />} error={profileErrors.displayName}>
                <input
                  className="pp-input"
                  maxLength={80}
                  name="displayName"
                  onChange={handleChange}
                  placeholder={t('displayNamePlaceholder')}
                  required
                  value={form.displayName}
                />
              </ProfileField>

              <ProfileField label={t('handleLabel')} icon={<AtSign size={14} />} error={profileErrors.handle}>
                <div className="pp-input-prefix">
                  <span>@</span>
                  <input
                    className="pp-input"
                    maxLength={32}
                    name="handle"
                    onChange={handleChange}
                    placeholder={t('handlePlaceholder')}
                    value={form.handle}
                  />
                </div>
              </ProfileField>

              <ProfileField label={t('phoneLabel')} icon={<Phone size={14} />} error={profileErrors.phone}>
                <input
                  className="pp-input"
                  maxLength={32}
                  name="phone"
                  onChange={handleChange}
                  placeholder={t('phonePlaceholder')}
                  required
                  value={form.phone}
                />
              </ProfileField>

              <ProfileField label={t('genderLabel')} icon={<Users size={14} />} error={profileErrors.gender}>
                <select
                  className={`pp-input pp-select${form.gender ? ' has-value' : ''}`}
                  name="gender"
                  onChange={handleChange}
                  required
                  value={form.gender}
                >
                  <option value="">{t('genderPlaceholder')}</option>
                  <option value="male">{t('genderMale')}</option>
                  <option value="female">{t('genderFemale')}</option>
                  <option value="other">{t('genderOther')}</option>
                  <option value="prefer_not_to_say">{t('genderPreferNotToSay')}</option>
                </select>
              </ProfileField>

              <ProfileField label={t('birthDateLabel')} icon={<CalendarDays size={14} />} error={profileErrors.birthDate}>
                <input
                  className="pp-input"
                  max={getLocalDateInputValue()}
                  name="birthDate"
                  onChange={handleChange}
                  required
                  type="date"
                  value={form.birthDate}
                />
              </ProfileField>
            </div>
          </ProfileSection>

          <ProfileSection icon={<MapPin size={15} />} title={t('additionalInfoSection')}>
            <div className="pp-fields">
              <ProfileField label={t('addressLabel')} icon={<MapPin size={14} />} error={profileErrors.address} wide>
                <input
                  className="pp-input"
                  maxLength={255}
                  name="address"
                  onChange={handleChange}
                  placeholder={t('addressPlaceholder')}
                  required
                  value={form.address}
                />
              </ProfileField>

              <ProfileField label={t('statusLabel')} icon={<MessageSquare size={14} />} error={profileErrors.statusMessage} wide>
                <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                  <button
                    className="pp-input pp-select"
                    onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                    style={{ width: '60px', flexShrink: 0, padding: '0 4px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface)' }}
                    type="button"
                  >
                    {form.statusEmoji}
                  </button>
                  {isEmojiPickerOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: '4px' }}>
                      <Suspense fallback={<div style={{ padding: '20px', background: 'var(--surface)', color: 'var(--text)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>{t('loading', { defaultValue: 'Đang tải...' })}</div>}>
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
                    maxLength={120}
                    name="statusMessage"
                    onChange={handleChange}
                    placeholder={t('statusPlaceholder')}
                    required
                    style={{ flexGrow: 1 }}
                    value={form.statusMessage}
                  />
                </div>
              </ProfileField>

              <ProfileField label={t('statusDurationLabel')} icon={<CalendarDays size={14} />} wide>
                <select
                  className={`pp-input pp-select${form.statusDuration ? ' has-value' : ''}`}
                  name="statusDuration"
                  onChange={handleChange}
                  value={form.statusDuration}
                >
                  <option value="none">{t('durationNone')}</option>
                  <option value="1h">{t('duration1h')}</option>
                  <option value="4h">{t('duration4h')}</option>
                  <option value="today">{t('durationToday')}</option>
                  <option value="week">{t('durationWeek')}</option>
                </select>
              </ProfileField>

              <ProfileField label={t('bioLabel')} icon={<AlignLeft size={14} />} error={profileErrors.bio} wide>
                <textarea
                  className={`pp-input pp-textarea${form.bio ? ' has-value' : ''}`}
                  maxLength={255}
                  name="bio"
                  onChange={handleChange}
                  placeholder={t('bioPlaceholder')}
                  required
                  rows={4}
                  value={form.bio}
                />
              </ProfileField>
            </div>
          </ProfileSection>
        </div>

        <div className="pp-form-footer" style={{ marginTop: '24px' }}>
          <button
            className="pp-save-btn"
            disabled={isSaving || !hasChanges}
            type="submit"
          >
            <Save size={15} />
            {isSaving ? t('saving') : t('saveChanges')}
          </button>
        </div>
      </form>

      {cropImageSrc && (
        <AvatarCropper
          imageSrc={cropImageSrc}
          onCropped={handleCroppedImage}
          onCancel={() => setCropImageSrc(null)}
        />
      )}
    </section>
  )
}