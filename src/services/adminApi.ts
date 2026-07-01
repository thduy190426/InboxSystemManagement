import { requestJson } from './apiClient'

export type AdminUserRole = 'user' | 'agent' | 'owner'
export type AdminUserStatus = 'active' | 'inactive' | 'suspended'

export type AdminStats = {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  onlineUsers: number
  alertCount: number
}

export type AdminUser = {
  id: string
  name: string
  fullName: string
  displayName: string | null
  email: string
  role: AdminUserRole
  status: AdminUserStatus
  presence: string
  isActive: boolean
  avatarUrl: string | null
  lastLogin: string | null
  createdAt: string
  updatedAt: string
}

export type AdminUsersPagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type MessageReportStatus = 'pending' | 'reviewed' | 'dismissed'

export type MessageReport = {
  id: string
  status: MessageReportStatus
  reason: string | null
  messageId: string
  messageText: string
  messageType: string
  conversationId: string
  conversationName: string
  reporter: {
    id: string
    name: string
    email: string
  }
  reportedUser: {
    id: string
    name: string
    email: string
  }
  reviewedBy: {
    id: string
    name: string
  } | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export type FetchMessageReportsResponse = {
  reports: MessageReport[]
  pagination: AdminUsersPagination
}

export type FetchAdminUsersParams = {
  page?: number
  limit?: number
  search?: string
}

export type FetchAdminUsersResponse = {
  users: AdminUser[]
  pagination: AdminUsersPagination
}

export type UpdateAdminUserPayload = {
  role?: AdminUserRole
  fullName?: string
  displayName?: string | null
  email?: string
}

export type UpdateAdminUserResponse = {
  message: string
  user: AdminUser
}

export type DeleteAdminUserResponse = {
  message: string
  deletedUserId: string
}

export async function fetchAdminStats() {
  const response = await requestJson<{ stats: AdminStats }>(
    '/admin/stats',
    {},
    'Không thể tải thống kê quản trị!',
  )

  return response.stats
}

export function fetchAdminUsers(params: FetchAdminUsersParams = {}) {
  const query = new URLSearchParams()

  if (params.page) {
    query.set('page', String(params.page))
  }

  if (params.limit) {
    query.set('limit', String(params.limit))
  }

  if (params.search) {
    query.set('search', params.search)
  }

  const suffix = query.toString() ? `?${query.toString()}` : ''

  return requestJson<FetchAdminUsersResponse>(
    `/admin/users${suffix}`,
    {},
    'Không thể tải danh sách người dùng!',
  )
}

export function fetchMessageReports(
  params: { page?: number; limit?: number; status?: MessageReportStatus | 'all' } = {},
) {
  const query = new URLSearchParams()

  if (params.page) {
    query.set('page', String(params.page))
  }

  if (params.limit) {
    query.set('limit', String(params.limit))
  }

  if (params.status && params.status !== 'all') {
    query.set('status', params.status)
  }

  const suffix = query.toString() ? `?${query.toString()}` : ''

  return requestJson<FetchMessageReportsResponse>(
    `/admin/message-reports${suffix}`,
    {},
    'Không thể tải danh sách báo cáo!',
  )
}

export function updateMessageReportStatus(
  reportId: string,
  status: Exclude<MessageReportStatus, 'pending'>,
) {
  return requestJson<{ message: string; report: MessageReport }>(
    `/admin/message-reports/${encodeURIComponent(reportId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    'Không thể cập nhật báo cáo!',
  )
}

export function updateAdminUser(userId: string, payload: UpdateAdminUserPayload) {
  return requestJson<UpdateAdminUserResponse>(
    `/admin/users/${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    'Không thể cập nhật người dùng!',
  )
}

export function lockAdminUser(userId: string) {
  return requestJson<UpdateAdminUserResponse>(
    `/admin/users/${encodeURIComponent(userId)}/lock`,
    {
      method: 'PATCH',
    },
    'Không thể khóa tài khoản!',
  )
}

export function unlockAdminUser(userId: string) {
  return requestJson<UpdateAdminUserResponse>(
    `/admin/users/${encodeURIComponent(userId)}/unlock`,
    {
      method: 'PATCH',
    },
    'Không thể mở khóa tài khoản!',
  )
}

export function deleteUser(userId: string) {
  return requestJson<DeleteAdminUserResponse>(
    `/admin/users/${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
    },
    'Không thể xóa người dùng!',
  )
}
