import type { AuthUser } from './authApi'
import { apiFetch, requestJson } from './apiClient'

type AvatarResponse = {
  message: string
  user: AuthUser
}

type ProfileResponse = {
  message?: string
  user: AuthUser
}

export type UserSession = {
  id: string
  deviceName: string | null
  ipAddress: string | null
  userAgent: string | null
  isCurrent: boolean
  expiresAt: string
  revokedAt: string | null
  createdAt: string
  updatedAt: string
}

type SessionsResponse = {
  sessions: UserSession[]
}

export type ProfilePayload = {
  displayName: string
  phone: string
  gender: string
  address: string
  birthDate: string
  bio: string
  statusMessage: string
}

export type ChangePasswordPayload = {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export type DeleteAccountPayload = {
  password: string
  confirmationText: string
}

async function requestProfile(path: string, options: RequestInit = {}) {
  return requestJson<ProfileResponse>(path, options, 'Không thể xử lý hồ sơ người dùng!')
}

export function fetchProfile() {
  return requestProfile('/users/me')
}

export function updateProfile(payload: ProfilePayload) {
  return requestProfile('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function changePassword(payload: ChangePasswordPayload) {
  return requestJson<{ message: string }>(
    '/users/me/password',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    'Không thể đổi mật khẩu!',
  )
}

export function fetchSessions() {
  return requestJson<SessionsResponse>(
    '/users/me/sessions',
    {},
    'Không thể tải danh sách phiên đăng nhập!',
  )
}

export function revokeSession(sessionId: string) {
  return requestJson<{ message: string; revokedCurrentSession: boolean }>(
    `/users/me/sessions/${sessionId}`,
    {
      method: 'DELETE',
    },
    'Không thể thu hồi phiên đăng nhập!',
  )
}

export function revokeOtherSessions() {
  return requestJson<{ message: string; revokedCount: number }>(
    '/users/me/sessions/others',
    {
      method: 'DELETE',
    },
    'Không thể đăng xuất khỏi thiết bị khác!',
  )
}

export function deleteAccount(payload: DeleteAccountPayload) {
  return requestJson<{ message: string }>(
    '/users/me',
    {
      method: 'DELETE',
      body: JSON.stringify(payload),
    },
    'Không thể xoá tài khoản!',
  )
}

export async function uploadAvatar(file: File) {
  const formData = new FormData()
  formData.append('avatar', file)

  const response = await apiFetch('/users/me/avatar', {
    method: 'PATCH',
    body: formData,
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body.message ?? 'Không thể cập nhật ảnh đại diện!')
  }

  return body as AvatarResponse
}
