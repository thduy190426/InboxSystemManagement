import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useState } from 'react'
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
  }
}

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getGenderLabel(gender: string) {
  if (gender === 'male') return 'Nam'
  if (gender === 'female') return 'Nữ'
  if (gender === 'other') return 'Khác'
  if (gender === 'prefer_not_to_say') return 'Không muốn chia sẻ'
  return 'Chưa cập nhật'
}

function getGlobalRoleLabel(role: string) {
  if (role === 'owner') return 'Người sáng lập'
  if (role === 'admin') return 'Quản trị viên'
  if (role === 'moderator') return 'Người kiểm duyệt'
  if (role === 'user') return 'Thành viên'
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Thành viên'
}

function validateProfileForm(form: ProfilePayload) {
  const errors: ProfileErrors = {}

  if (!form.displayName.trim()) {
    errors.displayName = 'Vui lòng nhập tên hiển thị!'
  } else if (form.displayName.trim().length > 80) {
    errors.displayName = 'Tên hiển thị không được vượt quá 80 ký tự!'
  }

  if (form.handle.trim() && !/^[a-z0-9][a-z0-9._]{2,31}$/.test(form.handle.trim())) {
    errors.handle = 'Tên định danh phải có 3–32 ký tự, chỉ gồm chữ thường, số, dấu chấm hoặc gạch dưới!'
  }

  if (!form.phone.trim()) {
    errors.phone = 'Vui lòng nhập số điện thoại!'
  } else if (!/^\+?[0-9\s.-]{8,32}$/.test(form.phone.trim())) {
    errors.phone = 'Số điện thoại không hợp lệ!'
  }

  if (!form.gender) {
    errors.gender = 'Vui lòng chọn giới tính!'
  }

  if (!form.birthDate) {
    errors.birthDate = 'Vui lòng chọn ngày sinh!'
  } else if (form.birthDate > getLocalDateInputValue()) {
    errors.birthDate = 'Ngày sinh không được lớn hơn ngày hiện tại!'
  }

  if (!form.address.trim()) {
    errors.address = 'Vui lòng nhập địa chỉ!'
  } else if (form.address.trim().length > 255) {
    errors.address = 'Địa chỉ không được vượt quá 255 ký tự!'
  }

  if (!form.statusMessage.trim()) {
    errors.statusMessage = 'Vui lòng nhập trạng thái cá nhân!'
  } else if (form.statusMessage.trim().length > 120) {
    errors.statusMessage = 'Trạng thái không được vượt quá 120 ký tự!'
  }

  if (!form.bio.trim()) {
    errors.bio = 'Vui lòng nhập giới thiệu!'
  } else if (form.bio.trim().length > 255) {
    errors.bio = 'Giới thiệu không được vượt quá 255 ký tự!'
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
          pushToast(error instanceof Error ? error.message : 'Không thể tải hồ sơ!', 'error')
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
      pushToast('Đã cập nhật ảnh đại diện!', 'info')
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể cập nhật ảnh đại diện!', 'error')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasChanges) return

    const errors = validateProfileForm(form)
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors)
      pushToast('Vui lòng điền đầy đủ thông tin hồ sơ bắt buộc!', 'error')
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
      pushToast('Đã lưu hồ sơ!', 'info')
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể lưu hồ sơ!', 'error')
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
            Hồ sơ cá nhân
          </div>
          <h1 id="profile-title">Chỉnh sửa profile</h1>
        </div>
        <div className="pp-header-aside">
          {hasChanges && (
            <span className="pp-unsaved-badge">Chưa lưu</span>
          )}
        </div>
      </header>

      <div className="pp-grid">
        {/* ── Avatar card ── */}
        <ProfileSection icon={<Camera size={15} />} title="Ảnh đại diện">
          <div className="pp-avatar-card">
            <div className="pp-avatar-wrap">
              <AvatarFallback
                name={form.displayName || fullName}
                src={avatarUrl}
              />
              {currentUser?.role && (
                <div className={`pp-role-badge pp-role-badge--${currentUser.role.toLowerCase()}`}>
                  <Shield size={11} />
                  <span>{getGlobalRoleLabel(currentUser.role)}</span>
                </div>
              )}
            </div>
            <div className="pp-avatar-info">
              <strong className="pp-avatar-name">{form.displayName || fullName || 'Người dùng'}</strong>
              {form.handle && (
                <span className="pp-avatar-handle">@{form.handle}</span>
              )}
              <span className="pp-avatar-status">{form.statusMessage || 'Chưa cập nhật trạng thái'}</span>
            </div>
            <label className="pp-upload-btn">
              <Camera size={14} />
              {isUploading ? 'Đang tải...' : 'Đổi ảnh'}
              <input accept="image/*" disabled={isUploading} onChange={handleAvatarChange} type="file" />
            </label>
          </div>
        </ProfileSection>

        {/* ── Bio card ── */}
        <ProfileSection icon={<AlignLeft size={15} />} title="Giới thiệu bản thân">
          <div className="pp-bio-preview">
            <p className={isBioExpanded ? 'is-expanded' : ''}>
              {form.bio || 'Chưa có giới thiệu!'}
            </p>
            {hasLongBio && (
              <button
                className="pp-bio-toggle"
                onClick={() => setIsBioExpanded((v) => !v)}
                type="button"
              >
                {isBioExpanded ? 'Thu gọn' : 'Xem thêm'}
              </button>
            )}
          </div>
          <div className="pp-meta-chips">
            <span className="pp-chip"><Users size={12} />{getGenderLabel(form.gender)}</span>
            {form.address && <span className="pp-chip"><MapPin size={12} />{form.address}</span>}
          </div>
        </ProfileSection>

        {/* ── Form card ── */}
        <form className="pp-form-card" onSubmit={handleSubmit}>
          <ProfileSection icon={<IdCard size={15} />} title="Thông tin cơ bản">
            <div className="pp-fields">
              <ProfileField label="Họ và tên" icon={<User size={14} />}>
                <input className="pp-input" name="fullName" readOnly value={fullName} />
              </ProfileField>

              <ProfileField label="Tên hiển thị" icon={<IdCard size={14} />} error={profileErrors.displayName}>
                <input
                  className="pp-input"
                  maxLength={80}
                  name="displayName"
                  onChange={handleChange}
                  placeholder="Tên hiển thị trong chat"
                  required
                  value={form.displayName}
                />
              </ProfileField>

              <ProfileField label="Tên định danh" icon={<AtSign size={14} />} error={profileErrors.handle}>
                <div className="pp-input-prefix">
                  <span>@</span>
                  <input
                    className="pp-input"
                    maxLength={32}
                    name="handle"
                    onChange={handleChange}
                    placeholder="tên.định.danh"
                    value={form.handle}
                  />
                </div>
              </ProfileField>

              <ProfileField label="Số điện thoại" icon={<Phone size={14} />} error={profileErrors.phone}>
                <input
                  className="pp-input"
                  maxLength={32}
                  name="phone"
                  onChange={handleChange}
                  placeholder="Số điện thoại"
                  required
                  value={form.phone}
                />
              </ProfileField>

              <ProfileField label="Giới tính" icon={<Users size={14} />} error={profileErrors.gender}>
                <select
                  className={`pp-input pp-select${form.gender ? ' has-value' : ''}`}
                  name="gender"
                  onChange={handleChange}
                  required
                  value={form.gender}
                >
                  <option value="">Chưa cập nhật</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                  <option value="prefer_not_to_say">Không muốn chia sẻ</option>
                </select>
              </ProfileField>

              <ProfileField label="Ngày sinh" icon={<CalendarDays size={14} />} error={profileErrors.birthDate}>
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

          <ProfileSection icon={<MapPin size={15} />} title="Thông tin bổ sung">
            <div className="pp-fields">
              <ProfileField label="Địa chỉ" icon={<MapPin size={14} />} error={profileErrors.address} wide>
                <input
                  className="pp-input"
                  maxLength={255}
                  name="address"
                  onChange={handleChange}
                  placeholder="Địa chỉ liên hệ"
                  required
                  value={form.address}
                />
              </ProfileField>

              <ProfileField label="Trạng thái cá nhân" icon={<MessageSquare size={14} />} error={profileErrors.statusMessage} wide>
                <input
                  className="pp-input"
                  maxLength={120}
                  name="statusMessage"
                  onChange={handleChange}
                  placeholder="Ví dụ: Đang sẵn sàng hỗ trợ"
                  required
                  value={form.statusMessage}
                />
              </ProfileField>

              <ProfileField label="Giới thiệu" icon={<AlignLeft size={14} />} error={profileErrors.bio} wide>
                <textarea
                  className={`pp-input pp-textarea${form.bio ? ' has-value' : ''}`}
                  maxLength={255}
                  name="bio"
                  onChange={handleChange}
                  placeholder="Một vài dòng giới thiệu về bạn"
                  required
                  rows={4}
                  value={form.bio}
                />
              </ProfileField>
            </div>
          </ProfileSection>

          <div className="pp-form-footer">
            <button
              className="pp-save-btn"
              disabled={isSaving || !hasChanges}
              type="submit"
            >
              <Save size={15} />
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>

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