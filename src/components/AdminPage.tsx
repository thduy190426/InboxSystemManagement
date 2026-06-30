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
    return 'Chua dang nhap'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Khong ro'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function getStatusLabel(status: AdminUserStatus) {
  if (status === 'active') {
    return 'Hoat dong'
  }

  if (status === 'inactive') {
    return 'Khong hoat dong'
  }

  return 'Da khoa'
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
        const message = getErrorMessage(error, 'Khong the tai thong ke quan tri!')

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
        const message = getErrorMessage(error, 'Khong the tai danh sach nguoi dung!')

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
              Dang tai danh sach nguoi dung...
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
              {debouncedSearch ? 'Khong tim thay nguoi dung phu hop.' : 'Chua co nguoi dung nao.'}
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
              title="Chinh sua"
              type="button"
              onClick={() => setEditUser({ user, role: user.role, status: user.status })}
            >
              <Edit2 size={16} />
            </button>
            <button
              title="Xoa"
              className="text-danger"
              type="button"
              onClick={() => openDeleteDialog(user)}
            >
              <Trash2 size={16} />
            </button>
            <button title="Tuy chon khac" type="button">
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
      pushToast?.(getErrorMessage(error, 'Khong the tai lai thong ke quan tri!'), 'error')
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
      pushToast?.('Cap nhat nguoi dung thanh cong!')
      void refreshStats()
    } catch (error) {
      pushToast?.(getErrorMessage(error, 'Khong the cap nhat nguoi dung!'), 'error')
    } finally {
      setIsSavingUser(false)
    }
  }

  function openDeleteDialog(user: AdminUser) {
    setConfirmDialog({
      title: 'Xoa nguoi dung',
      description: `Ban co chac muon xoa ${user.name} khoi he thong?`,
      confirmLabel: 'Xoa',
      cancelLabel: 'Huy',
      tone: 'danger',
      onConfirm: async () => {
        await deleteUser(user.id)
        setUsers((currentUsers) => currentUsers.filter((item) => item.id !== user.id))
        setPagination((currentPagination) => ({
          ...currentPagination,
          total: Math.max(0, currentPagination.total - 1),
        }))
        pushToast?.('Da xoa nguoi dung thanh cong!')
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
      pushToast?.(getErrorMessage(error, 'Khong the thuc hien thao tac!'), 'error')
    } finally {
      setIsConfirmWorking(false)
    }
  }

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>Quan tri he thong</h1>
          <p>Xin chao, {currentUser?.displayName || currentUser?.fullName || 'Admin'}!</p>
        </div>
        <div className="admin-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Tim kiem nguoi dung theo ten hoac email..."
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
            <h3>Tong nguoi dung</h3>
            <p className="stat-value">{isStatsLoading ? '...' : formatNumber(stats.totalUsers)}</p>
            <span className="stat-trend positive">{formatNumber(stats.suspendedUsers)} tai khoan bi khoa</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active-icon"><Activity size={24} /></div>
          <div className="stat-info">
            <h3>Dang hoat dong</h3>
            <p className="stat-value">{isStatsLoading ? '...' : formatNumber(stats.activeUsers)}</p>
            <span className="stat-trend">{formatNumber(stats.onlineUsers)} dang online</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon alert-icon"><AlertCircle size={24} /></div>
          <div className="stat-info">
            <h3>Canh bao he thong</h3>
            <p className="stat-value">{isStatsLoading ? '...' : formatNumber(stats.alertCount)}</p>
            <span className="stat-trend negative">Can xu ly</span>
          </div>
        </div>
      </div>

      <div className="admin-content-section">
        <div className="section-header">
          <h2>Danh sach nguoi dung</h2>
          <button className="btn-primary" onClick={() => pushToast?.('Tinh nang them nguoi dung chua duoc implement')} type="button">
            + Them nguoi dung
          </button>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nguoi dung</th>
                <th>Vai tro</th>
                <th>Trang thai</th>
                <th>Dang nhap cuoi</th>
                <th>Thao tac</th>
              </tr>
            </thead>
            <tbody>{tableContent}</tbody>
          </table>
        </div>

        <div className="admin-pagination">
          <span>
            {isLoading ? 'Dang tai...' : `${formatNumber(pagination.total)} nguoi dung`}
          </span>
          <div>
            <button
              disabled={isUsersLoading || page <= 1}
              type="button"
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            >
              Truoc
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
            <h2 id="admin-edit-title">Chinh sua nguoi dung</h2>
            <p>{editUser.user.name}</p>
            <label>
              Vai tro
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
              Trang thai
              <select
                value={editUser.status}
                onChange={(event) =>
                  setEditUser((current) =>
                    current ? { ...current, status: event.target.value as AdminUserStatus } : current,
                  )
                }
              >
                <option value="active">Hoat dong</option>
                <option value="inactive">Khong hoat dong</option>
                <option value="suspended">Da khoa</option>
              </select>
            </label>
            <div className="admin-edit-actions">
              <button disabled={isSavingUser} type="button" onClick={() => setEditUser(null)}>
                Huy
              </button>
              <button disabled={isSavingUser} type="button" onClick={() => void handleSaveUser()}>
                {isSavingUser ? <Loader2 size={16} /> : <CheckCircle2 size={16} />}
                {isSavingUser ? 'Dang luu...' : 'Luu thay doi'}
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
