import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { AlignLeft, CalendarDays, Camera, IdCard, MapPin, MessageSquare, Phone, Save, User, Users } from 'lucide-react'
import type { AuthUser } from '../services/authApi'
import {
  fetchProfile,
  updateProfile,
  uploadAvatar,
  type ProfilePayload,
} from '../services/userApi'

type ProfilePageProps = {
  currentUser: AuthUser | null
  onUserChange: (user: AuthUser) => void
  pushToast: (text: string, tone?: 'info' | 'error') => void
}

type ProfileErrors = Partial<Record<keyof ProfilePayload, string>>

function createInitialForm(user: AuthUser | null): ProfilePayload {
  return {
    displayName: user?.displayName ?? '',
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
  if (gender === 'male') {
    return 'Nam'
  }

  if (gender === 'female') {
    return 'Nữ'
  }

  if (gender === 'other') {
    return 'Khác'
  }

  if (gender === 'prefer_not_to_say') {
    return 'Không muốn chia sẻ'
  }

  return 'Chưa cập nhật'
}

function validateProfileForm(form: ProfilePayload) {
  const errors: ProfileErrors = {}

  if (!form.displayName.trim()) {
    errors.displayName = 'Vui lòng nhập tên hiển thị!'
  } else if (form.displayName.trim().length > 80) {
    errors.displayName = 'Tên hiển thị không được vượt quá 80 ký tự!'
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

export function ProfilePage({ currentUser, onUserChange, pushToast }: ProfilePageProps) {
  const [fullName, setFullName] = useState(currentUser?.fullName ?? '')
  const [form, setForm] = useState<ProfilePayload>(() => createInitialForm(currentUser))
  const [initialForm, setInitialForm] = useState<ProfilePayload>(() => createInitialForm(currentUser))
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({})
  const [isBioExpanded, setIsBioExpanded] = useState(false)
  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm)
  const hasLongBio = form.bio.trim().length > 120

  useEffect(() => {
    let isMounted = true

    fetchProfile()
      .then((response) => {
        if (!isMounted) {
          return
        }

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

    return () => {
      isMounted = false
    }
  }, [])

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
    setProfileErrors((current) => ({
      ...current,
      [name]: '',
    }))
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

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
      event.target.value = ''
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!hasChanges) {
      return
    }

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

  const initial = form.displayName[0] || fullName[0] || 'I'

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <header className="profile-page-header">
        <div>
          <span className="section-kicker">
            <User size={14} />
            Hồ sơ cá nhân
          </span>
          <h1 id="profile-title">Chỉnh sửa profile</h1>
        </div>
      </header>

      <div className="profile-layout">
        <aside className="profile-preview">
          <div className="profile-avatar-large">
            {avatarUrl ? <img alt="" src={avatarUrl} /> : <span>{initial}</span>}
          </div>
          <label className="profile-upload-button">
            <Camera size={18} />
            {isUploading ? 'Đang tải ảnh...' : 'Đổi ảnh đại diện'}
            <input accept="image/*" disabled={isUploading} onChange={handleAvatarChange} type="file" />
          </label>
          <strong>{form.displayName || fullName || 'Người dùng Inbox'}</strong>
          <div className="profile-preview-meta">
            <span>{form.statusMessage || 'Chưa cập nhật trạng thái'}</span>
            <span>{getGenderLabel(form.gender)}</span>
          </div>
          <div className="profile-preview-bio">
            <span>Giới thiệu</span>
            <p className={isBioExpanded ? 'is-expanded' : ''}>
              {form.bio || 'Chưa có giới thiệu!'}
            </p>
            {hasLongBio ? (
              <button className="profile-preview-toggle" onClick={() => setIsBioExpanded((current) => !current)} type="button">
                {isBioExpanded ? 'Thu gọn' : 'Xem thêm'}
              </button>
            ) : null}
          </div>
        </aside>

        <form className="profile-form" onSubmit={handleSubmit}>
          <label className="profile-field">
            <span><User size={16} /> Họ và tên</span>
            <input name="fullName" readOnly value={fullName} />
          </label>

          <label className="profile-field">
            <span><IdCard size={16} /> Tên hiển thị</span>
            <input maxLength={80} name="displayName" onChange={handleChange} placeholder="Tên hiển thị trong chat" required value={form.displayName} />
            {profileErrors.displayName ? <span className="profile-field-error">{profileErrors.displayName}</span> : null}
          </label>

          <label className="profile-field">
            <span><Phone size={16} /> Số điện thoại</span>
            <input maxLength={32} name="phone" onChange={handleChange} placeholder="Số điện thoại" required value={form.phone} />
            {profileErrors.phone ? <span className="profile-field-error">{profileErrors.phone}</span> : null}
          </label>

          <label className="profile-field">
            <span><Users size={16} /> Giới tính</span>
            <select name="gender" onChange={handleChange} required value={form.gender}>
              <option value="">Chưa cập nhật</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
              <option value="prefer_not_to_say">Không muốn chia sẻ</option>
            </select>
            {profileErrors.gender ? <span className="profile-field-error">{profileErrors.gender}</span> : null}
          </label>

          <label className="profile-field">
            <span><CalendarDays size={16} /> Ngày sinh</span>
            <input max={getLocalDateInputValue()} name="birthDate" onChange={handleChange} required type="date" value={form.birthDate} />
            {profileErrors.birthDate ? <span className="profile-field-error">{profileErrors.birthDate}</span> : null}
          </label>

          <label className="profile-field profile-field-wide">
            <span><MapPin size={16} /> Địa chỉ</span>
            <input maxLength={255} name="address" onChange={handleChange} placeholder="Địa chỉ liên hệ" required value={form.address} />
            {profileErrors.address ? <span className="profile-field-error">{profileErrors.address}</span> : null}
          </label>

          <label className="profile-field">
            <span><MessageSquare size={16} /> Trạng thái cá nhân</span>
            <input maxLength={120} name="statusMessage" onChange={handleChange} placeholder="Ví dụ: Đang sẵn sàng hỗ trợ" required value={form.statusMessage} />
            {profileErrors.statusMessage ? <span className="profile-field-error">{profileErrors.statusMessage}</span> : null}
          </label>

          <label className="profile-field profile-field-wide">
            <span><AlignLeft size={16} /> Giới thiệu</span>
            <textarea maxLength={255} name="bio" onChange={handleChange} placeholder="Một vài dòng giới thiệu về bạn" required rows={5} value={form.bio} />
            {profileErrors.bio ? <span className="profile-field-error">{profileErrors.bio}</span> : null}
          </label>

          <button className="profile-save-button" disabled={isSaving || !hasChanges} type="submit">
            <Save size={18} />
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>
      </div>
    </section>
  )
}
