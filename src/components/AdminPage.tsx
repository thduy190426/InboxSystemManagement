import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Loader2,
  MoreVertical,
  Search,
  Shield,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import {
  deleteUser,
  fetchAdminStats,
  fetchAdminUsers,
  updateUserStatus,
  type AdminStats,
  type AdminUser,
  type AdminUserRole,
  type AdminUserStatus,
  type AdminUsersPagination,
} from '../services/adminApi'
import type { AuthUser } from '../services/authApi'
import { ConfirmDialog, type ConfirmDialogState } from './ConfirmDialog'

type AdminPageProps = {
  currentUser: AuthUser | null
  pushToast?: (text: string, tone?: 'info' | 'error') => void
}

type EditUserState = {
  user: AdminUser
  role: AdminUserRole
  status: AdminUserStatus
}

const USER_PAGE_SIZE = 20

const emptyStats: AdminStats = {
  totalUsers: 0,
  activeUsers: 0,
  suspendedUsers: 0,
  onlineUsers: 0,
  alertCount: 0,
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

function formatLastLogin(value: string | null) {
  if (!value) {
    return 'Chưa đăng nhập'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Không rõ!'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function getStatusLabel(status: AdminUserStatus) {
  if (status === 'active') {
    return 'Hoạt động'
  }

  if (status === 'inactive') {
    return 'Không hoạt động'
  }

  return 'Đã khóa'
}

export function AdminPage({ currentUser, pushToast }: AdminPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [stats, setStats] = useState<AdminStats>(emptyStats)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState<AdminUsersPagination>({
    page: 1,
    limit: USER_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [isUsersLoading, setIsUsersLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageError, setPageError] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<EditUserState | null>(null)
  const [isSavingUser, setIsSavingUser] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [isConfirmWorking, setIsConfirmWorking] = useState(false)

  const isLoading = isStatsLoading || isUsersLoading

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    let isMounted = true

    async function loadStats() {
      setIsStatsLoading(true)

      try {
        const nextStats = await fetchAdminStats()

        if (isMounted) {
          setStats(nextStats)
        }
      } catch (error) {
        const message = getErrorMessage(error, 'Không thể tải thống kê quản trị!')

        if (isMounted) {
          setPageError(message)
          pushToast?.(message, 'error')
        }
      } finally {
        if (isMounted) {
          setIsStatsLoading(false)
        }
      }
    }

    void loadStats()

    return () => {
      isMounted = false
    }
  }, [pushToast])

  useEffect(() => {
    let isMounted = true

    async function loadUsers() {
      setIsUsersLoading(true)

      try {
        const response = await fetchAdminUsers({
          page,
          limit: USER_PAGE_SIZE,
          search: debouncedSearch,
        })

        if (isMounted) {
          setUsers(response.users)
          setPagination(response.pagination)
          setPageError(null)
        }
      } catch (error) {
        const message = getErrorMessage(error, 'Không thể tải danh sách người dùng!')

        if (isMounted) {
          setUsers([])
          setPageError(message)
          pushToast?.(message, 'error')
        }
      } finally {
        if (isMounted) {
          setIsUsersLoading(false)
        }
      }
    }

    void loadUsers()

    return () => {
      isMounted = false
    }
  }, [debouncedSearch, page, pushToast])

  const tableContent = useMemo(() => {
    if (isUsersLoading) {
      return (
        <tr>
          <td colSpan={5}>
            <div className="admin-loading-row">
              <Loader2 size={18} />
              Đang tải danh sách người dùng...
            </div>
          </td>
        </tr>
      )
    }

    if (users.length === 0) {
      return (
        <tr>
          <td colSpan={5}>
            <div className="admin-empty-row">
              {debouncedSearch ? 'Không tìm thấy người dùng phù hợp!' : 'Chưa có người dùng nào!'}
            </div>
          </td>
        </tr>
      )
    }

    return users.map((user) => (
      <tr key={user.id}>
        <td>
          <div className="user-cell">
            <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
        </td>
        <td>
          <span className={`role-badge role-${user.role}`}>
            {user.role === 'admin' ? <Shield size={12} /> : null}
            {user.role}
          </span>
        </td>
        <td>
          <span className={`status-badge status-${user.status}`}>
            {user.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {getStatusLabel(user.status)}
          </span>
        </td>
        <td className="text-muted">{formatLastLogin(user.lastLogin)}</td>
        <td>
          <div className="action-buttons">
            <button
              title="Chỉnh sửa"
              type="button"
              onClick={() => setEditUser({ user, role: user.role, status: user.status })}
            >
              <Edit2 size={16} />
            </button>
            <button
              title="Xoá"
              className="text-danger"
              type="button"
              onClick={() => openDeleteDialog(user)}
            >
              <Trash2 size={16} />
            </button>
            <button title="Tùy chọn khác" type="button">
              <MoreVertical size={16} />
            </button>
          </div>
        </td>
      </tr>
    ))
  }, [debouncedSearch, isUsersLoading, users])

  async function refreshStats() {
    try {
      setStats(await fetchAdminStats())
    } catch (error) {
      pushToast?.(getErrorMessage(error, 'Không thể tải lại thống kê quản trị!'), 'error')
    }
  }

  async function handleSaveUser() {
    if (!editUser) {
      return
    }

    setIsSavingUser(true)

    try {
      const response = await updateUserStatus(editUser.user.id, {
        role: editUser.role,
        status: editUser.status,
      })

      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === response.user.id ? response.user : user)),
      )
      setEditUser(null)
      pushToast?.('Cập nhật người dùng thành công!')
      void refreshStats()
    } catch (error) {
      pushToast?.(getErrorMessage(error, 'Không thể cập nhật người dùng!'), 'error')
    } finally {
      setIsSavingUser(false)
    }
  }

  function openDeleteDialog(user: AdminUser) {
    setConfirmDialog({
      title: 'Xóa người dùng',
      description: `Bạn có chắc muốn xóa ${user.name} khỏi hệ thống?`,
      confirmLabel: 'Xóa',
      cancelLabel: 'Hủy',
      tone: 'danger',
      onConfirm: async () => {
        await deleteUser(user.id)
        setUsers((currentUsers) => currentUsers.filter((item) => item.id !== user.id))
        setPagination((currentPagination) => ({
          ...currentPagination,
          total: Math.max(0, currentPagination.total - 1),
        }))
        pushToast?.('Đã xóa người dùng thành công!')
        void refreshStats()
      },
    })
  }

  async function handleConfirmDialog() {
    if (!confirmDialog) {
      return
    }

    setIsConfirmWorking(true)

    try {
      await confirmDialog.onConfirm()
      setConfirmDialog(null)
    } catch (error) {
      pushToast?.(getErrorMessage(error, 'Không thể thực hiện thao tác!'), 'error')
    } finally {
      setIsConfirmWorking(false)
    }
  }

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>Quản trị hệ thống</h1>
          <p>Xin chào, {currentUser?.displayName || currentUser?.fullName || 'Admin'}!</p>
        </div>
        <div className="admin-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {pageError ? <div className="admin-error-message">{pageError}</div> : null}

      <div className="admin-dashboard-cards">
        <div className="stat-card">
          <div className="stat-icon users-icon"><Users size={24} /></div>
          <div className="stat-info">
            <h3>Tổng người dùng</h3>
            <p className="stat-value">{isStatsLoading ? '...' : formatNumber(stats.totalUsers)}</p>
            <span className="stat-trend positive">{formatNumber(stats.suspendedUsers)} tài khoản bị khóa</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active-icon"><Activity size={24} /></div>
          <div className="stat-info">
            <h3>Đang hoạt động</h3>
            <p className="stat-value">{isStatsLoading ? '...' : formatNumber(stats.activeUsers)}</p>
            <span className="stat-trend">{formatNumber(stats.onlineUsers)} đang online</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon alert-icon"><AlertCircle size={24} /></div>
          <div className="stat-info">
            <h3>Cảnh báo hệ thống</h3>
            <p className="stat-value">{isStatsLoading ? '...' : formatNumber(stats.alertCount)}</p>
            <span className="stat-trend negative">Cần xử lý</span>
          </div>
        </div>
      </div>

      <div className="admin-content-section">
        <div className="section-header">
          <h2>Danh sách người dùng</h2>
          <button className="btn-primary" onClick={() => pushToast?.('Tính năng thêm người dùng chưa được Implement!')} type="button">
            + Thêm người dùng
          </button>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Đăng nhập cuối</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>{tableContent}</tbody>
          </table>
        </div>

        <div className="admin-pagination">
          <span>
            {isLoading ? 'Đang tải...' : `${formatNumber(pagination.total)} người dùng`}
          </span>
          <div>
            <button
              disabled={isUsersLoading || page <= 1}
              type="button"
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            >
              Trước
            </button>
            <span>
              Trang {pagination.page}/{pagination.totalPages}
            </span>
            <button
              disabled={isUsersLoading || page >= pagination.totalPages}
              type="button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {editUser ? (
        <div className="admin-edit-backdrop" role="presentation">
          <section aria-labelledby="admin-edit-title" aria-modal="true" className="admin-edit-modal" role="dialog">
            <button
              className="admin-edit-close"
              disabled={isSavingUser}
              title="Dong"
              type="button"
              onClick={() => setEditUser(null)}
            >
              <X size={18} />
            </button>
            <h2 id="admin-edit-title">Chỉnh sửa người dùng</h2>
            <p>{editUser.user.name}</p>
            <label>
              Vai trò
              <select
                value={editUser.role}
                onChange={(event) =>
                  setEditUser((current) =>
                    current ? { ...current, role: event.target.value as AdminUserRole } : current,
                  )
                }
              >
                <option value="user">user</option>
                <option value="agent">agent</option>
                <option value="admin">admin</option>
                <option value="owner">owner</option>
              </select>
            </label>
            <label>
              Trạng thái
              <select
                value={editUser.status}
                onChange={(event) =>
                  setEditUser((current) =>
                    current ? { ...current, status: event.target.value as AdminUserStatus } : current,
                  )
                }
              >
                <option value="active">Hoạt động</option>
                <option value="inactive">Không hoạt động</option>
                <option value="suspended">Đã khóa</option>
              </select>
            </label>
            <div className="admin-edit-actions">
              <button disabled={isSavingUser} type="button" onClick={() => setEditUser(null)}>
                Hủy
              </button>
              <button disabled={isSavingUser} type="button" onClick={() => void handleSaveUser()}>
                {isSavingUser ? <Loader2 size={16} /> : <CheckCircle2 size={16} />}
                {isSavingUser ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmDialog
        dialog={confirmDialog}
        isWorking={isConfirmWorking}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => void handleConfirmDialog()}
      />
    </div>
  )
}
