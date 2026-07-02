import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Flag,
  KeyRound,
  Lock,
  Loader2,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import {
  createAdminUser,
  deleteUser,
  fetchAdminStats,
  fetchAdminUsers,
  fetchMessageReports,
  lockAdminUser,
  unlockAdminUser,
  updateAdminUser,
  updateMessageReportStatus,
  type AdminStats,
  type AdminUser,
  type AdminUserRole,
  type AdminUserStatus,
  type AdminUsersPagination,
  type MessageReport,
  type MessageReportStatus,
} from '../services/adminApi'
import type { AuthUser } from '../services/authApi'
import { ConfirmDialog, type ConfirmDialogState } from './ConfirmDialog'

type AdminPageProps = {
  currentUser: AuthUser | null
  pushToast?: (text: string, tone?: 'info' | 'error') => void
}

type EditUserState = {
  user: AdminUser
  fullName: string
  displayName: string
  email: string
  role: AdminUserRole
}

type CreateUserState = {
  fullName: string
  displayName: string
  email: string
  password: string
  role: AdminUserRole
}

const USER_PAGE_SIZE = 20
const REPORT_PAGE_SIZE = 10
const EDIT_EXIT_DURATION_MS = 140
const REPORT_STATUSES: Array<MessageReportStatus | 'all'> = ['pending', 'reviewed', 'dismissed', 'all']

const emptyStats: AdminStats = {
  totalUsers: 0,
  activeUsers: 0,
  suspendedUsers: 0,
  onlineUsers: 0,
  alertCount: 0,
}

const emptyCreateUser: CreateUserState = {
  fullName: '',
  displayName: '',
  email: '',
  password: '',
  role: 'user',
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

function formatLastLogin(value: string | null) {
  if (!value) {
    return 'Chưa đăng nhập!'
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

function formatReportTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Không rõ!'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function getReportStatusLabel(status: MessageReportStatus) {
  if (status === 'reviewed') {
    return 'Đã xử lý!'
  }

  if (status === 'dismissed') {
    return 'Bỏ qua!'
  }

  return 'Chờ xử lý!'
}

function getStatusLabel(status: AdminUserStatus) {
  if (status === 'suspended') {
    return 'Đã khóa!'
  }

  if (status === 'active') {
    return 'Đang online!'
  }

  return 'Bình thường.'
}

function createEditState(user: AdminUser): EditUserState {
  return {
    user,
    fullName: user.fullName,
    displayName: user.displayName || '',
    email: user.email,
    role: user.role,
  }
}

function readAdminQueryParams() {
  const params = new URLSearchParams(window.location.search)
  const pageParam = Number(params.get('page'))
  const reportStatusParam = params.get('reportStatus') as MessageReportStatus | 'all' | null

  return {
    page: Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1,
    search: params.get('search')?.trim() ?? '',
    reportStatus: reportStatusParam && REPORT_STATUSES.includes(reportStatusParam)
      ? reportStatusParam
      : 'pending',
  }
}

function updateAdminQueryParams(params: {
  page: number
  search: string
  reportStatus: MessageReportStatus | 'all'
}) {
  if (window.location.pathname !== '/admin') {
    return
  }

  const query = new URLSearchParams()

  if (params.search) {
    query.set('search', params.search)
  }

  if (params.page > 1) {
    query.set('page', String(params.page))
  }

  if (params.reportStatus !== 'pending') {
    query.set('reportStatus', params.reportStatus)
  }

  const nextUrl = query.toString() ? `/admin?${query.toString()}` : '/admin'

  if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
    window.history.replaceState(null, '', nextUrl)
  }
}

export function AdminPage({ currentUser, pushToast }: AdminPageProps) {
  const initialQueryParams = readAdminQueryParams()
  const [searchQuery, setSearchQuery] = useState(initialQueryParams.search)
  const [debouncedSearch, setDebouncedSearch] = useState(initialQueryParams.search)
  const [stats, setStats] = useState<AdminStats>(emptyStats)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [reports, setReports] = useState<MessageReport[]>([])
  const [pagination, setPagination] = useState<AdminUsersPagination>({
    page: 1,
    limit: USER_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [isUsersLoading, setIsUsersLoading] = useState(true)
  const [isReportsLoading, setIsReportsLoading] = useState(true)
  const [reportStatus, setReportStatus] = useState<MessageReportStatus | 'all'>(
    initialQueryParams.reportStatus,
  )
  const [busyReportId, setBusyReportId] = useState<string | null>(null)
  const [page, setPage] = useState(initialQueryParams.page)
  const [pageError, setPageError] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<EditUserState | null>(null)
  const [visibleEditUser, setVisibleEditUser] = useState<EditUserState | null>(null)
  const [createUser, setCreateUser] = useState<CreateUserState | null>(null)
  const [isEditExiting, setIsEditExiting] = useState(false)
  const [isSavingUser, setIsSavingUser] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [busyLockUserId, setBusyLockUserId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [isConfirmWorking, setIsConfirmWorking] = useState(false)
  const hasMountedSearchEffectRef = useRef(false)
  const suppressSearchEffectRef = useRef(false)

  const isLoading = isStatsLoading || isUsersLoading

  useEffect(() => {
    function handleLocationChange() {
      const params = readAdminQueryParams()

      suppressSearchEffectRef.current = true
      setSearchQuery(params.search)
      setDebouncedSearch(params.search)
      setPage(params.page)
      setReportStatus(params.reportStatus)
    }

    window.addEventListener('popstate', handleLocationChange)

    return () => {
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  useEffect(() => {
    if (editUser) {
      setVisibleEditUser(editUser)
      setIsEditExiting(false)
      return
    }

    if (!visibleEditUser) {
      return
    }

    setIsEditExiting(true)
    const timer = window.setTimeout(() => {
      setVisibleEditUser(null)
      setIsEditExiting(false)
    }, EDIT_EXIT_DURATION_MS)

    return () => window.clearTimeout(timer)
  }, [editUser, visibleEditUser])

  useEffect(() => {
    if (!hasMountedSearchEffectRef.current) {
      hasMountedSearchEffectRef.current = true
      return
    }

    if (suppressSearchEffectRef.current) {
      suppressSearchEffectRef.current = false
      return
    }

    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    updateAdminQueryParams({
      page,
      reportStatus,
      search: debouncedSearch,
    })
  }, [debouncedSearch, page, reportStatus])

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

  useEffect(() => {
    let isMounted = true

    async function loadReports() {
      setIsReportsLoading(true)

      try {
        const response = await fetchMessageReports({
          page: 1,
          limit: REPORT_PAGE_SIZE,
          status: reportStatus,
        })

        if (isMounted) {
          setReports(response.reports)
          setPageError(null)
        }
      } catch (error) {
        const message = getErrorMessage(error, 'Không thể tải danh sách báo cáo!')

        if (isMounted) {
          setReports([])
          setPageError(message)
          pushToast?.(message, 'error')
        }
      } finally {
        if (isMounted) {
          setIsReportsLoading(false)
        }
      }
    }

    void loadReports()

    return () => {
      isMounted = false
    }
  }, [pushToast, reportStatus])

  const reportsContent = useMemo(() => {
    if (isReportsLoading) {
      return (
        <div className="admin-loading-row">
          <Loader2 size={18} />
          Đang tải báo cáo...
        </div>
      )
    }

    if (reports.length === 0) {
      return (
        <div className="admin-empty-row">
          {reportStatus === 'pending' ? 'Chưa có báo cáo đang chờ xử lý!' : 'Không có báo cáo phù hợp!'}
        </div>
      )
    }

    return reports.map((report) => (
      <article className="message-report-row" key={report.id}>
        <div className="message-report-main">
          <div className="message-report-topline">
            <span className={`report-status-badge status-${report.status}`}>
              {getReportStatusLabel(report.status)}
            </span>
            <small>{formatReportTime(report.createdAt)}</small>
          </div>
          <strong>{report.reportedUser.name}</strong>
          <p>{report.messageText || `[${report.messageType}]`}</p>
          <small>
            Báo cáo bởi {report.reporter.name} trong {report.conversationName}
          </small>
        </div>
        <div className="message-report-actions">
          <button
            disabled={busyReportId === report.id || report.status === 'reviewed'}
            onClick={() => void handleUpdateReportStatus(report, 'reviewed')}
            type="button"
          >
            {busyReportId === report.id ? <Loader2 size={15} /> : <CheckCircle2 size={15} />}
            Xử lý
          </button>
          <button
            disabled={busyReportId === report.id || report.status === 'dismissed'}
            onClick={() => void handleUpdateReportStatus(report, 'dismissed')}
            type="button"
          >
            <XCircle size={15} />
            Bỏ qua
          </button>
        </div>
      </article>
    ))
  }, [busyReportId, isReportsLoading, reportStatus, reports])

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

    return users.map((user) => {
      const isLocked = !user.isActive
      const isLockBusy = busyLockUserId === user.id

      return (
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
              {user.role}
            </span>
          </td>
          <td>
            <span className={`status-badge status-${user.status}`}>
              {isLocked ? <Lock size={12} /> : user.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {getStatusLabel(user.status)}
            </span>
          </td>
          <td className="text-muted">{formatLastLogin(user.lastLogin)}</td>
          <td>
            <div className="action-buttons">
              <button
                title="Chỉnh sửa"
                type="button"
                onClick={() => setEditUser(createEditState(user))}
              >
                <Edit2 size={16} />
              </button>
              <button
                className={isLocked ? 'text-success' : 'text-warning'}
                disabled={isLockBusy}
                title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                type="button"
                onClick={() => openLockDialog(user)}
              >
                {isLockBusy ? <Loader2 size={16} /> : isLocked ? <Unlock size={16} /> : <Lock size={16} />}
              </button>
              <button
                title="Xóa"
                className="text-danger"
                type="button"
                onClick={() => openDeleteDialog(user)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </td>
        </tr>
      )
    })
  }, [busyLockUserId, debouncedSearch, isUsersLoading, users])

  async function refreshStats() {
    try {
      setStats(await fetchAdminStats())
    } catch (error) {
      pushToast?.(getErrorMessage(error, 'Không thể tải lại thống kê quản trị!'), 'error')
    }
  }

  async function refreshReports() {
    try {
      const response = await fetchMessageReports({
        page: 1,
        limit: REPORT_PAGE_SIZE,
        status: reportStatus,
      })

      setReports(response.reports)
    } catch (error) {
      pushToast?.(getErrorMessage(error, 'Không thể tải lại báo cáo!'), 'error')
    }
  }

  async function handleUpdateReportStatus(
    report: MessageReport,
    status: Exclude<MessageReportStatus, 'pending'>,
  ) {
    setBusyReportId(report.id)

    try {
      const response = await updateMessageReportStatus(report.id, status)

      setReports((currentReports) =>
        currentReports.map((item) => (item.id === response.report.id ? response.report : item)),
      )
      pushToast?.(status === 'reviewed' ? 'Đã đánh dấu báo cáo đã xử lý!' : 'Đã bỏ qua báo cáo!', 'info')
      void refreshStats()
    } catch (error) {
      pushToast?.(getErrorMessage(error, 'Không thể cập nhật báo cáo!'), 'error')
    } finally {
      setBusyReportId(null)
    }
  }

  function updateUserInList(updatedUser: AdminUser) {
    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
    )
  }

  async function handleCreateUser() {
    if (!createUser) {
      return
    }

    const fullName = createUser.fullName.trim()
    const displayName = createUser.displayName.trim()
    const email = createUser.email.trim()
    const password = createUser.password

    if (fullName.length < 2) {
      pushToast?.('Họ tên phải có ít nhất 2 ký tự!', 'error')
      return
    }

    if (!email) {
      pushToast?.('Email không được để trống!', 'error')
      return
    }

    if (password.length < 8) {
      pushToast?.('Mật khẩu phải có ít nhất 8 ký tự!', 'error')
      return
    }

    setIsCreatingUser(true)

    try {
      const response = await createAdminUser({
        fullName,
        displayName: displayName || null,
        email,
        password,
        role: createUser.role,
      })

      setUsers((currentUsers) => [response.user, ...currentUsers].slice(0, USER_PAGE_SIZE))
      setPagination((currentPagination) => ({
        ...currentPagination,
        total: currentPagination.total + 1,
        totalPages: Math.max(1, Math.ceil((currentPagination.total + 1) / currentPagination.limit)),
      }))
      setCreateUser(null)
      pushToast?.('Tạo người dùng mới thành công!')
      void refreshStats()
    } catch (error) {
      pushToast?.(getErrorMessage(error, 'Không thể tạo người dùng!'), 'error')
    } finally {
      setIsCreatingUser(false)
    }
  }

  async function handleSaveUser() {
    if (!editUser || !visibleEditUser) {
      return
    }

    const fullName = visibleEditUser.fullName.trim()
    const displayName = visibleEditUser.displayName.trim()
    const email = visibleEditUser.email.trim()

    if (fullName.length < 2) {
      pushToast?.('Họ tên phải có ít nhất 2 ký tự!', 'error')
      return
    }

    if (!email) {
      pushToast?.('Email không được để trống!', 'error')
      return
    }

    setIsSavingUser(true)

    try {
      const response = await updateAdminUser(editUser.user.id, {
        fullName,
        displayName: displayName || null,
        email,
        role: visibleEditUser.role,
      })

      updateUserInList(response.user)
      setEditUser(null)
      pushToast?.('Cập nhật người dùng thành công!')
      void refreshStats()
    } catch (error) {
      pushToast?.(getErrorMessage(error, 'Không thể cập nhật người dùng!'), 'error')
    } finally {
      setIsSavingUser(false)
    }
  }

  function openLockDialog(user: AdminUser) {
    const isLocked = !user.isActive

    setConfirmDialog({
      title: isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
      description: isLocked
        ? `Tài khoản ${user.name} sẽ có thể đăng nhập và sử dụng hệ thống trở lại!`
        : `Tài khoản ${user.name} sẽ bị đăng xuất khỏi các phiên hiện tại và không thể đăng nhập cho đến khi được mở khóa!`,
      confirmLabel: isLocked ? 'Mở khóa' : 'Khóa tài khoản',
      cancelLabel: 'Hủy',
      tone: isLocked ? 'default' : 'danger',
      onConfirm: async () => {
        setBusyLockUserId(user.id)

        try {
          const response = isLocked ? await unlockAdminUser(user.id) : await lockAdminUser(user.id)

          updateUserInList(response.user)
          pushToast?.(isLocked ? 'Đã mở khóa tài khoản!' : 'Đã khóa tài khoản!')
          void refreshStats()
        } finally {
          setBusyLockUserId(null)
        }
      },
    })
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
            <h3>Tài khoản mở khóa</h3>
            <p className="stat-value">{isStatsLoading ? '...' : formatNumber(stats.activeUsers)}</p>
            <span className="stat-trend">{formatNumber(stats.onlineUsers)} đang online</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon alert-icon"><AlertCircle size={24} /></div>
          <div className="stat-info">
            <h3>Cảnh báo hệ thống</h3>
            <p className="stat-value">{isStatsLoading ? '...' : formatNumber(stats.alertCount)}</p>
            <span className="stat-trend negative">cần xử lý</span>
          </div>
        </div>
      </div>

      <div className="admin-content-section message-report-section">
        <div className="section-header">
          <h2>
            <Flag size={18} />
            Báo cáo tin nhắn
          </h2>
          <div className="report-toolbar">
            <select
              value={reportStatus}
              onChange={(event) => setReportStatus(event.target.value as MessageReportStatus | 'all')}
            >
              <option value="pending">Chờ xử lý</option>
              <option value="reviewed">Đã xử lý</option>
              <option value="dismissed">Bỏ qua</option>
              <option value="all">Tất cả</option>
            </select>
            <button disabled={isReportsLoading} onClick={() => void refreshReports()} type="button">
              {isReportsLoading ? <Loader2 size={15} /> : <Flag size={15} />}
              Tải lại
            </button>
          </div>
        </div>
        <div className="message-report-list">
          {reportsContent}
        </div>
      </div>

      <div className="admin-content-section">
        <div className="section-header">
          <h2>Danh sách người dùng</h2>
          <button className="btn-primary" onClick={() => setCreateUser(emptyCreateUser)} type="button">
            <Plus size={16} />
            Thêm người dùng
          </button>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Tài khoản</th>
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

      {createUser ? (
        <div className="admin-edit-backdrop" role="presentation">
          <section aria-labelledby="admin-create-title" aria-modal="true" className="admin-edit-modal" role="dialog">
            <button
              className="admin-edit-close"
              disabled={isCreatingUser}
              title="Đóng"
              type="button"
              onClick={() => setCreateUser(null)}
            >
              <X size={18} />
            </button>
            <div className="admin-edit-hero">
              <div className="admin-edit-avatar"><UserPlus size={24} /></div>
              <div>
                <span className="admin-lock-pill is-open">
                  <Unlock size={13} />
                  Tài khoản mới
                </span>
                <h2 id="admin-create-title">Thêm người dùng mới</h2>
                <p>Tài khoản sẽ được kích hoạt ngay sau khi tạo.</p>
              </div>
            </div>

            <div className="admin-edit-grid">
              <label>
                Họ tên
                <input
                  value={createUser.fullName}
                  onChange={(event) =>
                    setCreateUser((current) =>
                      current ? { ...current, fullName: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label>
                Tên hiển thị
                <input
                  placeholder="Để trống để dùng họ tên"
                  value={createUser.displayName}
                  onChange={(event) =>
                    setCreateUser((current) =>
                      current ? { ...current, displayName: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label>
                Email
                <span className="admin-input-with-icon">
                  <Mail size={16} />
                  <input
                    type="email"
                    value={createUser.email}
                    onChange={(event) =>
                      setCreateUser((current) =>
                        current ? { ...current, email: event.target.value } : current,
                      )
                    }
                  />
                </span>
              </label>
              <label>
                Mật khẩu
                <span className="admin-input-with-icon">
                  <KeyRound size={16} />
                  <input
                    autoComplete="new-password"
                    type="password"
                    value={createUser.password}
                    onChange={(event) =>
                      setCreateUser((current) =>
                        current ? { ...current, password: event.target.value } : current,
                      )
                    }
                  />
                </span>
              </label>
              <label>
                Vai trò
                <span className="admin-input-with-icon">
                  <ShieldCheck size={16} />
                  <select
                    value={createUser.role}
                    onChange={(event) =>
                      setCreateUser((current) =>
                        current ? { ...current, role: event.target.value as AdminUserRole } : current,
                      )
                    }
                  >
                    <option value="user">user</option>
                    <option value="agent">agent</option>
                    <option value="owner">owner</option>
                  </select>
                </span>
              </label>
            </div>

            <div className="admin-edit-note">
              Mật khẩu cần đáp ứng chính sách bảo mật giống màn hình đăng ký. Email được xác thực sẵn để người dùng có thể đăng nhập ngay.
            </div>

            <div className="admin-edit-actions">
              <button disabled={isCreatingUser} type="button" onClick={() => setCreateUser(null)}>
                <X size={16} />
                Hủy
              </button>
              <button disabled={isCreatingUser} type="button" onClick={() => void handleCreateUser()}>
                {isCreatingUser ? <Loader2 size={16} /> : <CheckCircle2 size={16} />}
                {isCreatingUser ? 'Đang tạo...' : 'Tạo người dùng'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {visibleEditUser ? (
        <div className={isEditExiting ? 'admin-edit-backdrop is-exiting' : 'admin-edit-backdrop'} role="presentation">
          <section aria-labelledby="admin-edit-title" aria-modal="true" className="admin-edit-modal" role="dialog">
            <button
              className="admin-edit-close"
              disabled={isSavingUser || isEditExiting}
              title="Đóng"
              type="button"
              onClick={() => setEditUser(null)}
            >
              <X size={18} />
            </button>
            <div className="admin-edit-hero">
              <div className="admin-edit-avatar">{visibleEditUser.user.name.charAt(0).toUpperCase()}</div>
              <div>
                <span className={`admin-lock-pill ${visibleEditUser.user.isActive ? 'is-open' : 'is-locked'}`}>
                  {visibleEditUser.user.isActive ? <Unlock size={13} /> : <Lock size={13} />}
                  {visibleEditUser.user.isActive ? 'Bình thường' : 'Đã khóa'}
                </span>
                <h2 id="admin-edit-title">Chỉnh sửa người dùng</h2>
                <p>{visibleEditUser.user.id}</p>
              </div>
            </div>

            <div className="admin-edit-grid">
              <label>
                Họ tên
                <input
                  value={visibleEditUser.fullName}
                  onChange={(event) =>
                    setVisibleEditUser((current) =>
                      current ? { ...current, fullName: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label>
                Tên hiển thị
                <input
                  placeholder="Để trống để dùng họ tên"
                  value={visibleEditUser.displayName}
                  onChange={(event) =>
                    setVisibleEditUser((current) =>
                      current ? { ...current, displayName: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label>
                Email
                <span className="admin-input-with-icon">
                  <Mail size={16} />
                  <input
                    type="email"
                    value={visibleEditUser.email}
                    onChange={(event) =>
                      setVisibleEditUser((current) =>
                        current ? { ...current, email: event.target.value } : current,
                      )
                    }
                  />
                </span>
              </label>
              <label>
                Vai trò
                <span className="admin-input-with-icon">
                  <ShieldCheck size={16} />
                  <select
                    value={visibleEditUser.role}
                    onChange={(event) =>
                      setVisibleEditUser((current) =>
                        current ? { ...current, role: event.target.value as AdminUserRole } : current,
                      )
                    }
                  >
                    <option value="user">user</option>
                    <option value="agent">agent</option>
                    <option value="owner">owner</option>
                  </select>
                </span>
              </label>
            </div>

            <div className="admin-edit-note">
              {visibleEditUser.user.isActive
                ? 'Thao tác khóa/mở khóa được thực hiện riêng để đảm bảo revoke phiên đăng nhập đúng nghiệp vụ.'
                : 'Tài khoản đang bị khóa. Mở khóa tài khoản từ nút khóa/mở khóa trong bảng danh sách.'}
            </div>

            <div className="admin-edit-actions">
              <button disabled={isSavingUser || isEditExiting} type="button" onClick={() => setEditUser(null)}>
                <X size={16} />
                Hủy
              </button>
              <button disabled={isSavingUser || isEditExiting} type="button" onClick={() => void handleSaveUser()}>
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
