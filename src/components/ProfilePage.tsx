import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { AlertTriangle, AlignLeft, CalendarDays, Camera, IdCard, KeyRound, MapPin, MessageSquare, Phone, Save, Trash2, User, Users } from 'lucide-react'
import type { AuthUser } from '../services/authApi'
import {
  changePassword,
  deleteAccount,
  fetchProfile,
  updateProfile,
  uploadAvatar,
  type ChangePasswordPayload,
  type DeleteAccountPayload,
  type ProfilePayload,
} from '../services/userApi'
import { ConfirmDialog, type ConfirmDialogState } from './ConfirmDialog'

type ProfilePageProps = {
  currentUser: AuthUser | null
  onAccountDeleted: () => void
  onUserChange: (user: AuthUser) => void
  pushToast: (text: string, tone?: 'info' | 'error') => void
}

const initialPasswordForm: ChangePasswordPayload = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
}

const initialDeleteForm: DeleteAccountPayload = {
  password: '',
  confirmationText: '',
}

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
    return 'Không muốn chia sẻ!'
  }

  return 'Chưa cập nhật!'
}

function validatePasswordForm(form: ChangePasswordPayload) {
  const errors: Partial<Record<keyof ChangePasswordPayload, string>> = {}
  const requirements = [
    form.newPassword.length >= 8 || 'ít nhất 8 ký tự!',
    form.newPassword.length <= 72 || 'không quá 72 ký tự!',
    !/\s/.test(form.newPassword) || 'không chứa khoảng trắng!',
    /[a-z]/.test(form.newPassword) || 'có chữ thường!',
    /[A-Z]/.test(form.newPassword) || 'có chữ hoa!',
    /[0-9]/.test(form.newPassword) || 'có chữ số!',
    /[^A-Za-z0-9]/.test(form.newPassword) || 'có ký tự đặc biệt!',
  ].filter((requirement): requirement is string => typeof requirement === 'string')

  if (!form.currentPassword) {
    errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại!'
  }

  if (!form.newPassword) {
    errors.newPassword = 'Vui lòng nhập mật khẩu mới!'
  } else if (requirements.length) {
    errors.newPassword = `Mật khẩu mới cần ${requirements.join(', ')}!`
  } else if (form.currentPassword && form.currentPassword === form.newPassword) {
    errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại!'
  }

  if (!form.confirmNewPassword) {
    errors.confirmNewPassword = 'Vui lòng nhập lại mật khẩu mới!'
  } else if (form.newPassword && form.confirmNewPassword !== form.newPassword) {
    errors.confirmNewPassword = 'Mật khẩu mới xác nhận không khớp!'
  }

  return errors
}

function validateDeleteForm(form: DeleteAccountPayload) {
  const errors: Partial<Record<keyof DeleteAccountPayload, string>> = {}

  if (!form.password) {
    errors.password = 'Vui lòng nhập mật khẩu hiện tại!'
  }

  if (form.confirmationText.trim() !== 'XOA TAI KHOAN') {
    errors.confirmationText = 'Vui lòng nhập chính xác XOA TAI KHOAN!'
  }

  return errors
}

export function ProfilePage({
  currentUser,
  onAccountDeleted,
  onUserChange,
  pushToast,
}: ProfilePageProps) {
  const [fullName, setFullName] = useState(currentUser?.fullName ?? '')
  const [form, setForm] = useState<ProfilePayload>(() => createInitialForm(currentUser))
  const [initialForm, setInitialForm] = useState<ProfilePayload>(() =>
    createInitialForm(currentUser),
  )
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [passwordForm, setPasswordForm] =
    useState<ChangePasswordPayload>(initialPasswordForm)
  const [deleteForm, setDeleteForm] = useState<DeleteAccountPayload>(initialDeleteForm)
  const [passwordErrors, setPasswordErrors] = useState<
    Partial<Record<keyof ChangePasswordPayload, string>>
  >({})
  const [deleteErrors, setDeleteErrors] = useState<
    Partial<Record<keyof DeleteAccountPayload, string>>
  >({})
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

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handlePasswordFieldChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target

    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }))
    setPasswordErrors((current) => ({
      ...current,
      [name]: '',
    }))
  }

  function handleDeleteFieldChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target

    setDeleteForm((current) => ({
      ...current,
      [name]: value,
    }))
    setDeleteErrors((current) => ({
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

    try {
      setIsSaving(true)
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

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validatePasswordForm(passwordForm)

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      pushToast('Vui lòng kiểm tra lại thông tin đổi mật khẩu!', 'error')
      return
    }

    try {
      setIsChangingPassword(true)
      setPasswordErrors({})
      const response = await changePassword(passwordForm)
      setPasswordForm(initialPasswordForm)
      pushToast(response.message || 'Đã đổi mật khẩu!', 'info')
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể đổi mật khẩu!', 'error')
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function handleDeleteAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateDeleteForm(deleteForm)

    if (Object.keys(errors).length > 0) {
      setDeleteErrors(errors)
      pushToast('Vui lòng hoàn tất bước xác nhận trước khi xoá tài khoản!', 'error')
      return
    }

    setConfirmDialog({
      title: 'Xoá tài khoản?',
      description: 'Tài khoản sẽ bị vô hiệu hóa, thông tin hồ sơ sẽ bị xóa và bạn sẽ đăng xuất khỏi mọi phiên.',
      confirmLabel: 'Xóa tài khoản',
      tone: 'danger',
      onConfirm: deleteCurrentAccount,
    })
  }

  async function deleteCurrentAccount() {
    try {
      setIsDeletingAccount(true)
      setDeleteErrors({})
      await deleteAccount(deleteForm)
      onAccountDeleted()
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Không thể xóa tài khoản!', 'error')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  async function handleConfirmDeleteAccount() {
    if (!confirmDialog || isDeletingAccount) {
      return
    }

    await confirmDialog.onConfirm()
    setConfirmDialog(null)
  }

  const initial = form.displayName[0] || fullName[0] || 'I'

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <header className="profile-page-header">
        <div>
          <span className="section-kicker">Hồ sơ cá nhân</span>
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
            <input
              accept="image/*"
              disabled={isUploading}
              onChange={handleAvatarChange}
              type="file"
            />
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
              <button
                className="profile-preview-toggle"
                onClick={() => setIsBioExpanded((current) => !current)}
                type="button"
              >
                {isBioExpanded ? 'Thu gọn' : 'Xem thêm'}
              </button>
            ) : null}
          </div>
        </aside>

        <form className="profile-form" onSubmit={handleSubmit}>
          <label className="profile-field">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={16} /> Họ và tên</span>
            <input name="fullName" readOnly value={fullName} />
          </label>

          <label className="profile-field">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><IdCard size={16} /> Tên hiển thị</span>
            <input
              maxLength={80}
              name="displayName"
              onChange={handleChange}
              placeholder="Tên hiển thị trong chat"
              value={form.displayName}
            />
          </label>

          <label className="profile-field">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={16} /> Số điện thoại</span>
            <input
              maxLength={32}
              name="phone"
              onChange={handleChange}
              placeholder="Số điện thoại"
              value={form.phone}
            />
          </label>

          <label className="profile-field">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={16} /> Giới tính</span>
            <select name="gender" onChange={handleChange} value={form.gender}>
              <option value="">Chưa cập nhật</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
              <option value="prefer_not_to_say">Không muốn chia sẻ</option>
            </select>
          </label>

          <label className="profile-field">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={16} /> Ngày sinh</span>
            <input
              max={getLocalDateInputValue()}
              name="birthDate"
              onChange={handleChange}
              type="date"
              value={form.birthDate}
            />
          </label>

          <label className="profile-field profile-field-wide">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} /> Địa chỉ</span>
            <input
              maxLength={255}
              name="address"
              onChange={handleChange}
              placeholder="Địa chỉ liên hệ"
              value={form.address}
            />
          </label>

          <label className="profile-field">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MessageSquare size={16} /> Trạng thái cá nhân</span>
            <input
              maxLength={120}
              name="statusMessage"
              onChange={handleChange}
              placeholder="Ví dụ: Đang sẵn sàng hỗ trợ"
              value={form.statusMessage}
            />
          </label>

          <label className="profile-field profile-field-wide">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><AlignLeft size={16} /> Giới thiệu</span>
            <textarea
              maxLength={255}
              name="bio"
              onChange={handleChange}
              placeholder="Một vài dòng giới thiệu về bạn"
              rows={5}
              value={form.bio}
            />
          </label>

          <button
            className="profile-save-button"
            disabled={isSaving || !hasChanges}
            type="submit"
          >
            <Save size={18} />
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>

        <form className="profile-form profile-password-form" onSubmit={handlePasswordSubmit}>
          <div className="profile-form-heading">
            <KeyRound size={18} />
            <div>
              <h2>Đổi mật khẩu</h2>
              <p>Nhập mật khẩu hiện tại để xác nhận thay đổi.</p>
            </div>
          </div>

          <label className="profile-field">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><KeyRound size={16} /> Mật khẩu hiện tại</span>
            <input
              autoComplete="current-password"
              name="currentPassword"
              onChange={handlePasswordFieldChange}
              placeholder="Nhập mật khẩu hiện tại"
              type="password"
              value={passwordForm.currentPassword}
            />
            {passwordErrors.currentPassword ? (
              <span className="profile-field-error">{passwordErrors.currentPassword}</span>
            ) : null}
          </label>

          <label className="profile-field">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><KeyRound size={16} /> Mật khẩu mới</span>
            <input
              autoComplete="new-password"
              maxLength={72}
              minLength={8}
              name="newPassword"
              onChange={handlePasswordFieldChange}
              placeholder="Tối thiểu 8 ký tự"
              type="password"
              value={passwordForm.newPassword}
            />
            {passwordErrors.newPassword ? (
              <span className="profile-field-error">{passwordErrors.newPassword}</span>
            ) : null}
          </label>

          <label className="profile-field">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><KeyRound size={16} /> Xác nhận mật khẩu mới</span>
            <input
              autoComplete="new-password"
              maxLength={72}
              minLength={8}
              name="confirmNewPassword"
              onChange={handlePasswordFieldChange}
              placeholder="Nhập lại mật khẩu mới"
              type="password"
              value={passwordForm.confirmNewPassword}
            />
            {passwordErrors.confirmNewPassword ? (
              <span className="profile-field-error">{passwordErrors.confirmNewPassword}</span>
            ) : null}
          </label>

          <button
            className="profile-save-button"
            disabled={isChangingPassword}
            type="submit"
          >
            <KeyRound size={18} />
            {isChangingPassword ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
          </button>
        </form>

        <form
          className="profile-form profile-danger-form"
          onSubmit={handleDeleteAccountSubmit}
        >
          <div className="profile-form-heading profile-danger-heading">
            <AlertTriangle size={18} />
            <div>
              <h2>Xoá tài khoản</h2>
              <p>
                Hành động này sẽ vô hiệu hoá tài khoản, xoá thông tin hồ sơ và đăng
                xuất khỏi mọi phiên đăng nhập.
              </p>
            </div>
          </div>

          <label className="profile-field">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><KeyRound size={16} /> Mật khẩu hiện tại</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={handleDeleteFieldChange}
              placeholder="Nhập mật khẩu hiện tại"
              type="password"
              value={deleteForm.password}
            />
            {deleteErrors.password ? (
              <span className="profile-field-error">{deleteErrors.password}</span>
            ) : null}
          </label>

          <label className="profile-field">
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Trash2 size={16} /> Nhập XOA TAI KHOAN</span>
            <input
              autoComplete="off"
              name="confirmationText"
              onChange={handleDeleteFieldChange}
              placeholder="XOA TAI KHOAN"
              value={deleteForm.confirmationText}
            />
            {deleteErrors.confirmationText ? (
              <span className="profile-field-error">{deleteErrors.confirmationText}</span>
            ) : null}
          </label>

          <button
            className="profile-save-button profile-delete-button"
            disabled={isDeletingAccount}
            type="submit"
          >
            <Trash2 size={18} />
            {isDeletingAccount ? 'Đang xoá tài khoản...' : 'Xoá tài khoản'}
          </button>
        </form>
      </div>
      <ConfirmDialog
        dialog={confirmDialog}
        isWorking={isDeletingAccount}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => void handleConfirmDeleteAccount()}
      />
    </section>
  )
}
