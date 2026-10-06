import { useEffect, useMemo, useRef, useState } from 'react'
import { ModerationPanel } from '../panels/ModerationPanel'
import {
  Area,
  AreaChart,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Edit2,
  Flag,
  KeyRound,
  Lock,
  Loader2,
  Mail,
  MessageSquare,
  PieChart,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  X,
  XCircle,
  Download,
  Filter,
} from 'lucide-react'
import { exportToCSV } from '../../utils/exportUtils'
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
  type AdminChartPoint,
  type AdminUser,
  type AdminUserRole,
  type AdminUserStatus,
  type AdminUsersPagination,
  type MessageReport,
  type MessageReportStatus,
} from '../../services/api/adminApi'
import type { AuthUser } from '../../services/api/authApi'
import { AvatarFallback } from '../ui/AvatarFallback'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog, type ConfirmDialogState } from '../ui/ConfirmDialog'

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
const USER_ROLES: Array<AdminUserRole | 'all'> = ['all', 'user', 'agent', 'owner']
const USER_STATUSES: Array<AdminUserStatus | 'all'> = ['all', 'active', 'inactive', 'suspended']
const USER_GENDERS = ['all', 'male', 'female', 'other', 'prefer_not_to_say', 'unknown'] as const
type UserGenderFilter = typeof USER_GENDERS[number]

const emptyStats: AdminStats = {
  totalUsers: 0,
  activeUsers: 0,
  suspendedUsers: 0,
  onlineUsers: 0,
  alertCount: 0,
  userGrowth: [],
  messageVolume: [],
  roleDistribution: [],
  reportStatusDistribution: [],
  conversationDistribution: [],
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

function formatChartLabel(label: string, t: any) {
  const labels: Record<string, string> = {
    agent: t('labelAgent'),
    direct: t('labelDirect'),
    dismissed: t('labelDismissed'),
    group: t('labelGroup'),
    owner: t('labelOwner'),
    pending: t('labelPending'),
    reviewed: t('labelReviewed'),
    support: t('labelSupport'),
    user: t('labelUser'),
  }

  return labels[label] || label
}

function TrendLineChart({
  data,
  isLoading,
  tone,
  t,
}: {
  data: AdminChartPoint[]
  isLoading: boolean
  tone: 'primary' | 'blue'
  t: any
}) {
  if (isLoading) {
    return <div className="admin-chart-placeholder">{t('chartLoading')}</div>
  }

  if (data.length === 0) {
    return <div className="admin-chart-placeholder">{t('chartNoData')}</div>
  }

  const color = tone === 'primary' ? '#14b8a6' : '#3b82f6'

  return (
    <div className="admin-trend-chart" style={{ height: '240px', width: '100%', marginTop: '24px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id={`color${tone}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--muted)', fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line)', borderRadius: '12px', color: 'var(--text)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
            itemStyle={{ color: color, fontWeight: 'bold' }}
            cursor={{ stroke: 'var(--line)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill={`url(#color${tone})`} 
            activeDot={{ r: 6, strokeWidth: 0, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function DistributionChart({
  data,
  isLoading,
  tone,
  t,
}: {
  data: AdminChartPoint[]
  isLoading: boolean
  tone: 'primary' | 'orange' | 'blue'
  t: any
}) {
  const total = data.reduce((sum, point) => sum + point.value, 0)

  if (isLoading) {
    return <div className="admin-chart-placeholder">{t('dataLoading')}</div>
  }

  if (total === 0) {
    return <div className="admin-chart-placeholder">{t('chartNoData')}</div>
  }

  const COLORS = tone === 'primary' 
    ? ['#14b8a6', '#0f766e', '#042f2e', '#99f6e4', '#5eead4'] 
    : tone === 'orange'
    ? ['#f59e0b', '#b45309', '#78350f', '#fde68a', '#fcd34d']
    : ['#3b82f6', '#1d4ed8', '#1e3a8a', '#bfdbfe', '#93c5fd']

  const formattedData = data.map(d => ({ ...d, label: formatChartLabel(d.label, t) }))

  return (
    <div className="admin-distribution" style={{ height: '220px', width: '100%', marginTop: '16px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line)', borderRadius: '12px', color: 'var(--text)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
            itemStyle={{ fontWeight: 'bold' }}
            formatter={(value: any) => [formatNumber(Number(value)), t('countLabel')]}
          />
          <Legend 
            wrapperStyle={{ fontSize: '13px', color: 'var(--muted)' }} 
            layout="vertical" 
            verticalAlign="middle" 
            align="right"
          />
          <Pie
            data={formattedData}
            cx="40%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
            nameKey="label"
            stroke="none"
          >
            {formattedData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}

function formatLastLogin(value: string | null, t: any) {
  if (!value) {
    return t('notLoggedIn')
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return t('unknownTime')
  }

  const hh = date.getHours().toString().padStart(2, '0')
  const mm = date.getMinutes().toString().padStart(2, '0')
  const ss = date.getSeconds().toString().padStart(2, '0')
  const dd = date.getDate().toString().padStart(2, '0')
  const MM = (date.getMonth() + 1).toString().padStart(2, '0')
  const yyyy = date.getFullYear()

  return `${hh}:${mm}:${ss} | ${dd}/${MM}/${yyyy}`
}

function formatReportTime(value: string, t: any) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return t('unknownTime')
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function getReportStatusLabel(status: MessageReportStatus, t: any) {
  if (status === 'reviewed') {
    return t('statusReviewed')
  }

  if (status === 'dismissed') {
    return t('statusDismissed')
  }

  return t('statusPending')
}

function getStatusLabel(status: AdminUserStatus, t: any) {
  if (status === 'suspended') {
    return t('statusSuspended')
  }

  return t('statusNormal')
}

function getGenderLabel(gender: string | null | undefined, t: any) {
  if (gender === 'male') return t('genderMale')
  if (gender === 'female') return t('genderFemale')
  if (gender === 'other') return t('genderOther')
  if (gender === 'prefer_not_to_say') return t('genderHidden')
  return t('genderUnknown')
}

function getRoleLabel(role: AdminUserRole | 'all', t: any) {
  if (role === 'all') return t('filterAllRoles')
  return formatChartLabel(role, t)
}

function getUserStatusFilterLabel(status: AdminUserStatus | 'all', t: any) {
  if (status === 'all') return t('filterAllAccounts')
  if (status === 'suspended') return t('filterLockedAccounts')
  if (status === 'inactive') return t('filterOfflineAccounts')
  return t('filterUnlockedAccounts')
}

function getGenderFilterLabel(gender: UserGenderFilter, t: any) {
  if (gender === 'all') return t('filterAllGenders')
  if (gender === 'unknown') return t('genderUnknown')
  return getGenderLabel(gender, t)
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
  const roleParam = params.get('role') as AdminUserRole | 'all' | null
  const statusParam = params.get('status') as AdminUserStatus | 'all' | null
  const genderParam = params.get('gender') as UserGenderFilter | null

  return {
    page: Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1,
    search: params.get('search')?.trim() ?? '',
    reportStatus: reportStatusParam && REPORT_STATUSES.includes(reportStatusParam)
      ? reportStatusParam
      : 'pending',
    role: roleParam && USER_ROLES.includes(roleParam) ? roleParam : 'all',
    status: statusParam && USER_STATUSES.includes(statusParam) ? statusParam : 'all',
    gender: genderParam && USER_GENDERS.includes(genderParam) ? genderParam : 'all',
  }
}

function updateAdminQueryParams(params: {
  page: number
  search: string
  reportStatus: MessageReportStatus | 'all'
  role: AdminUserRole | 'all'
  status: AdminUserStatus | 'all'
  gender: UserGenderFilter
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

  if (params.role !== 'all') {
    query.set('role', params.role)
  }

  if (params.status !== 'all') {
    query.set('status', params.status)
  }

  if (params.gender !== 'all') {
    query.set('gender', params.gender)
  }

  const nextUrl = query.toString() ? `/admin?${query.toString()}` : '/admin'

  if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
    window.history.replaceState(null, '', nextUrl)
  }
}

export function AdminPage({ currentUser, pushToast }: AdminPageProps) {
  const { t } = useTranslation('admin')
  const initialQueryParams = readAdminQueryParams()
  const [timeFilter, setTimeFilter] = useState('30days')
  const [searchQuery, setSearchQuery] = useState(initialQueryParams.search)
  const [debouncedSearch, setDebouncedSearch] = useState(initialQueryParams.search)
  const [roleFilter, setRoleFilter] = useState<AdminUserRole | 'all'>(initialQueryParams.role)
  const [statusFilter, setStatusFilter] = useState<AdminUserStatus | 'all'>(initialQueryParams.status)
  const [genderFilter, setGenderFilter] = useState<UserGenderFilter>(initialQueryParams.gender)
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
  const [busyBulkAction, setBusyBulkAction] = useState<'lock' | 'unlock' | 'delete' | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(() => new Set())
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [isConfirmWorking, setIsConfirmWorking] = useState(false)
  const hasMountedSearchEffectRef = useRef(false)
  const suppressSearchEffectRef = useRef(false)

  const isLoading = isStatsLoading || isUsersLoading
  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.has(user.id)),
    [selectedUserIds, users],
  )
  const selectableUserIds = useMemo(() => users.map((user) => user.id), [users])
  const isAllCurrentPageSelected =
    selectableUserIds.length > 0 && selectableUserIds.every((userId) => selectedUserIds.has(userId))
  const hasUserFilters = roleFilter !== 'all' || statusFilter !== 'all' || genderFilter !== 'all'

  const handleExportUsers = () => {
    const sourceUsers = selectedUsers.length > 0 ? selectedUsers : users
    const headers = ['ID', t('colUser'), t('displayNameLabel'), t('emailLabel'), t('colRole'), t('colAccount'), t('colGender'), t('colLastLogin'), t('colCreatedAt')]
    const data = sourceUsers.map(u => [u.id, u.fullName, u.displayName, u.email, u.role, getStatusLabel(u.status, t), getGenderLabel(u.gender, t), u.lastLogin, u.createdAt])
    exportToCSV('users_export.csv', headers, data)
    pushToast?.(selectedUsers.length > 0 ? t('exportSelectedUsersSuccess', { count: selectedUsers.length }) : t('exportUsersSuccess'), 'info')
  }

  const handleExportReports = () => {
    const headers = ['ID', t('reporterCol'), t('contentPreviewCol'), t('reasonCol'), t('colAccount'), t('reportedAtCol')]
    const data = reports.map(r => [r.id, r.reporter.name, r.messageText.substring(0, 50), r.reason, r.status, r.createdAt])
    exportToCSV('reports_export.csv', headers, data)
    pushToast?.(t('exportReportsSuccess'), 'info')
  }

  useEffect(() => {
    function handleLocationChange() {
      const params = readAdminQueryParams()

      suppressSearchEffectRef.current = true
      setSearchQuery(params.search)
      setDebouncedSearch(params.search)
      setPage(params.page)
      setReportStatus(params.reportStatus)
      setRoleFilter(params.role)
      setStatusFilter(params.status)
      setGenderFilter(params.gender)
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
      role: roleFilter,
      status: statusFilter,
      gender: genderFilter,
    })
  }, [debouncedSearch, genderFilter, page, reportStatus, roleFilter, statusFilter])

  useEffect(() => {
    setSelectedUserIds(new Set())
  }, [debouncedSearch, genderFilter, page, roleFilter, statusFilter])

  useEffect(() => {
    let isMounted = true

    async function loadStats() {
      setIsStatsLoading(true)

      try {
        const nextStats = await fetchAdminStats(timeFilter)

        if (isMounted) {
          setStats(nextStats)
        }
      } catch (error) {
        const message = getErrorMessage(error, t('statsLoadErr'))

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
  }, [pushToast, timeFilter])

  useEffect(() => {
    let isMounted = true

    async function loadUsers() {
      setIsUsersLoading(true)

      try {
        const response = await fetchAdminUsers({
          page,
          limit: USER_PAGE_SIZE,
          search: debouncedSearch,
          role: roleFilter,
          status: statusFilter,
          gender: genderFilter,
        })

        if (isMounted) {
          setUsers(response.users)
          setPagination(response.pagination)
          setPageError(null)
        }
      } catch (error) {
        const message = getErrorMessage(error, t('usersLoadErr'))

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
  }, [debouncedSearch, genderFilter, page, pushToast, roleFilter, statusFilter])

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
        const message = getErrorMessage(error, t('reportsLoadErr'))

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
      return Array.from({ length: 3 }).map((_, i) => (
        <article className="message-report-row" key={`skeleton-${i}`}>
          <div className="message-report-main">
            <div className="message-report-topline">
              <div className="skeleton skeleton-text" style={{ width: '80px', height: '20px', borderRadius: '10px' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '100px', height: '12px' }}></div>
            </div>
            <div className="skeleton skeleton-text" style={{ width: '120px', height: '16px', margin: '8px 0' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '100%', height: '16px', marginBottom: '8px' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '80%', height: '16px' }}></div>
          </div>
          <div className="message-report-actions">
            <div className="skeleton skeleton-text" style={{ width: '80px', height: '32px', borderRadius: '6px' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '80px', height: '32px', borderRadius: '6px' }}></div>
          </div>
        </article>
      ))
    }

    if (reports.length === 0) {
      return (
        <div className="admin-empty-row">
          {reportStatus === 'pending' ? t('noPendingReports') : t('noMatchingReports')}
        </div>
      )
    }

    return reports.map((report) => (
      <article className="message-report-row" key={report.id}>
        <div className="message-report-main">
          <div className="message-report-topline">
            <span className={`report-status-badge status-${report.status}`}>
              {getReportStatusLabel(report.status, t)}
            </span>
            <small>{formatReportTime(report.createdAt, t)}</small>
          </div>
          <strong>{report.reportedUser.name}</strong>
          <p>{report.messageText || `[${report.messageType}]`}</p>
          <small>
            {t('reportedBy', { reporter: report.reporter.name, conversation: report.conversationName })}
          </small>
        </div>
        <div className="message-report-actions">
          <button
            disabled={busyReportId === report.id || report.status === 'reviewed'}
            onClick={() => void handleUpdateReportStatus(report, 'reviewed')}
            type="button"
          >
            {busyReportId === report.id ? <Loader2 size={15} /> : <CheckCircle2 size={15} />}
            {t('actionReview')}
          </button>
          <button
            disabled={busyReportId === report.id || report.status === 'dismissed'}
            onClick={() => void handleUpdateReportStatus(report, 'dismissed')}
            type="button"
          >
            <XCircle size={15} />
            {t('actionDismiss')}
          </button>
        </div>
      </article>
    ))
  }, [busyReportId, isReportsLoading, reportStatus, reports])

  const tableContent = useMemo(() => {
    if (isUsersLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td data-label={t('selectUserLabel')}><div className="skeleton skeleton-icon"></div></td>
          <td data-label={t('colUser')}>
            <div className="user-cell">
              <div className="skeleton skeleton-avatar"></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton skeleton-text" style={{ width: '120px', height: '16px' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '160px', height: '12px' }}></div>
              </div>
            </div>
          </td>
          <td data-label={t('colRole')}><div className="skeleton skeleton-text" style={{ width: '80px', height: '24px', borderRadius: '12px' }}></div></td>
          <td data-label={t('colAccount')}><div className="skeleton skeleton-text" style={{ width: '100px', height: '24px', borderRadius: '12px' }}></div></td>
          <td data-label={t('colGender')}><div className="skeleton skeleton-text" style={{ width: '60px', height: '16px' }}></div></td>
          <td data-label={t('colCreatedAt')}><div className="skeleton skeleton-text" style={{ width: '120px', height: '16px' }}></div></td>
          <td data-label={t('colLastLogin')}><div className="skeleton skeleton-text" style={{ width: '140px', height: '16px' }}></div></td>
          <td data-label={t('colActions')}>
            <div className="action-buttons">
              <div className="skeleton skeleton-icon"></div>
              <div className="skeleton skeleton-icon"></div>
              <div className="skeleton skeleton-icon"></div>
            </div>
          </td>
        </tr>
      ))
    }

    if (users.length === 0) {
      return (
        <tr>
          <td colSpan={8}>
            <div className="admin-empty-row">
              {debouncedSearch ? t('noMatchingUsers') : t('noUsers')}
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
          <td className="admin-select-cell" data-label={t('selectUserLabel')}>
            <input
              aria-label={t('selectUserAria', { name: user.name })}
              checked={selectedUserIds.has(user.id)}
              type="checkbox"
              onChange={(event) => toggleUserSelection(user.id, event.target.checked)}
            />
          </td>
          <td data-label={t('colUser')}>
            <div className="user-cell">
              <AvatarFallback className="user-avatar" name={user.fullName} src={user.avatarUrl} />
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            </div>
          </td>
          <td data-label={t('colRole')}>
            <span className={`role-badge role-${user.role}`}>
              {user.role}
            </span>
          </td>
          <td data-label={t('colAccount')}>
            <span className={`status-badge status-${user.status}`}>
              {isLocked ? <Lock size={12} /> : <CheckCircle2 size={12} />}
              {getStatusLabel(user.status, t)}
            </span>
          </td>
          <td data-label={t('colGender')}>{getGenderLabel(user.gender, t)}</td>
          <td className="text-muted" data-label={t('colCreatedAt')}>{user.createdAt ? formatLastLogin(user.createdAt, t) : t('na')}</td>
          <td className="text-muted" data-label={t('colLastLogin')}>{formatLastLogin(user.lastLogin, t)}</td>
          <td data-label={t('colActions')}>
            <div className="action-buttons">
              <button
                title={t('editTitle')}
                type="button"
                onClick={() => setEditUser(createEditState(user))}
              >
                <Edit2 size={16} />
              </button>
              <button
                className={isLocked ? 'text-success' : 'text-warning'}
                disabled={isLockBusy}
                title={isLocked ? t('unlockAccountTitle') : t('lockAccountTitle')}
                type="button"
                onClick={() => openLockDialog(user)}
              >
                {isLockBusy ? <Loader2 size={16} /> : isLocked ? <Unlock size={16} /> : <Lock size={16} />}
              </button>
              <button
                title={t('deleteTitle')}
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
  }, [busyLockUserId, debouncedSearch, isUsersLoading, selectedUserIds, users])

  async function refreshStats() {
    try {
      setStats(await fetchAdminStats())
    } catch (error) {
      pushToast?.(getErrorMessage(error, t('statsRefreshErr')), 'error')
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
      pushToast?.(getErrorMessage(error, t('reportsRefreshErr')), 'error')
    }
  }

  async function refreshUsers(showSuccess = false) {
    setIsUsersLoading(true)

    try {
      const response = await fetchAdminUsers({
        page,
        limit: USER_PAGE_SIZE,
        search: debouncedSearch,
        role: roleFilter,
        status: statusFilter,
        gender: genderFilter,
      })

      setUsers(response.users)
      setPagination(response.pagination)
      setPageError(null)

      if (showSuccess) {
        pushToast?.(t('usersRefreshSuccess'), 'info')
      }
    } catch (error) {
      const message = getErrorMessage(error, t('usersRefreshErr'))

      setUsers([])
      setPageError(message)
      pushToast?.(message, 'error')
    } finally {
      setIsUsersLoading(false)
    }
  }

  function toggleUserSelection(userId: string, checked: boolean) {
    setSelectedUserIds((currentSelection) => {
      const nextSelection = new Set(currentSelection)

      if (checked) {
        nextSelection.add(userId)
      } else {
        nextSelection.delete(userId)
      }

      return nextSelection
    })
  }

  function toggleCurrentPageSelection(checked: boolean) {
    setSelectedUserIds((currentSelection) => {
      const nextSelection = new Set(currentSelection)

      selectableUserIds.forEach((userId) => {
        if (checked) {
          nextSelection.add(userId)
        } else {
          nextSelection.delete(userId)
        }
      })

      return nextSelection
    })
  }

  function handleUserFilterChange(
    setter: (value: any) => void,
    value: AdminUserRole | AdminUserStatus | UserGenderFilter | 'all',
  ) {
    setter(value)
    setPage(1)
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
      pushToast?.(status === 'reviewed' ? t('reportReviewedSuccess') : t('reportDismissedSuccess'), 'info')
      void refreshStats()
    } catch (error) {
      pushToast?.(getErrorMessage(error, t('reportUpdateErr')), 'error')
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
      pushToast?.(t('nameMinLenErr'), 'error')
      return
    }

    if (!email) {
      pushToast?.(t('emailEmptyErr'), 'error')
      return
    }

    if (password.length < 8) {
      pushToast?.(t('passwordMinErr'), 'error')
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
      pushToast?.(t('createUserSuccess'))
      void refreshStats()
    } catch (error) {
      pushToast?.(getErrorMessage(error, t('createUserErr')), 'error')
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
      pushToast?.(t('nameMinLenErr'), 'error')
      return
    }

    if (!email) {
      pushToast?.(t('emailEmptyErr'), 'error')
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
      pushToast?.(t('updateUserSuccess'))
      void refreshStats()
    } catch (error) {
      pushToast?.(getErrorMessage(error, t('updateUserErr')), 'error')
    } finally {
      setIsSavingUser(false)
    }
  }

  function openLockDialog(user: AdminUser) {
    const isLocked = !user.isActive

    setConfirmDialog({
      title: isLocked ? t('unlockAccountConfirmTitle') : t('lockAccountConfirmTitle'),
      description: isLocked ? t('unlockAccountConfirmDesc', { name: user.name }) : t('lockAccountConfirmDesc', { name: user.name }),
      confirmLabel: isLocked ? t('unlockBtn') : t('lockBtn'),
      cancelLabel: t('cancelBtn'),
      tone: isLocked ? 'default' : 'danger',
      onConfirm: async () => {
        setBusyLockUserId(user.id)

        try {
          const response = isLocked ? await unlockAdminUser(user.id) : await lockAdminUser(user.id)

          updateUserInList(response.user)
          pushToast?.(isLocked ? t('unlockedSuccess') : t('lockedSuccess'))
          void refreshStats()
        } finally {
          setBusyLockUserId(null)
        }
      },
    })
  }

  function openDeleteDialog(user: AdminUser) {
    setConfirmDialog({
      title: t('deleteAccountConfirmTitle'),
      description: t('deleteAccountConfirmDesc', { name: user.name }),
      confirmLabel: t('deleteBtn'),
      cancelLabel: t('cancelBtn'),
      tone: 'danger',
      onConfirm: async () => {
        await deleteUser(user.id)
        setUsers((currentUsers) => currentUsers.filter((item) => item.id !== user.id))
        setPagination((currentPagination) => ({
          ...currentPagination,
          total: Math.max(0, currentPagination.total - 1),
        }))
        pushToast?.(t('deleteAccountSuccess'))
        void refreshStats()
      },
    })
  }

  function openBulkLockDialog(shouldLock: boolean) {
    const targetUsers = selectedUsers.filter((user) => shouldLock ? user.isActive : !user.isActive)

    if (targetUsers.length === 0) {
      pushToast?.(shouldLock ? t('bulkNoUnlockedUsers') : t('bulkNoLockedUsers'), 'error')
      return
    }

    setConfirmDialog({
      title: shouldLock ? t('bulkLockConfirmTitle') : t('bulkUnlockConfirmTitle'),
      description: shouldLock
        ? t('bulkLockConfirmDesc', { count: targetUsers.length })
        : t('bulkUnlockConfirmDesc', { count: targetUsers.length }),
      confirmLabel: shouldLock ? t('lockBtn') : t('unlockBtn'),
      cancelLabel: t('cancelBtn'),
      tone: shouldLock ? 'danger' : 'default',
      onConfirm: async () => {
        setBusyBulkAction(shouldLock ? 'lock' : 'unlock')

        try {
          const responses = await Promise.all(
            targetUsers.map((user) => shouldLock ? lockAdminUser(user.id) : unlockAdminUser(user.id)),
          )

          responses.forEach((response) => updateUserInList(response.user))
          setSelectedUserIds(new Set())
          pushToast?.(shouldLock ? t('bulkLockSuccess', { count: responses.length }) : t('bulkUnlockSuccess', { count: responses.length }))
          void refreshStats()
        } finally {
          setBusyBulkAction(null)
        }
      },
    })
  }

  function openBulkDeleteDialog() {
    if (selectedUsers.length === 0) {
      return
    }

    setConfirmDialog({
      title: t('bulkDeleteConfirmTitle'),
      description: t('bulkDeleteConfirmDesc', { count: selectedUsers.length }),
      confirmLabel: t('deleteBtn'),
      cancelLabel: t('cancelBtn'),
      tone: 'danger',
      onConfirm: async () => {
        setBusyBulkAction('delete')

        try {
          await Promise.all(selectedUsers.map((user) => deleteUser(user.id)))
          const deletedIds = new Set(selectedUsers.map((user) => user.id))

          setUsers((currentUsers) => currentUsers.filter((item) => !deletedIds.has(item.id)))
          setPagination((currentPagination) => ({
            ...currentPagination,
            total: Math.max(0, currentPagination.total - deletedIds.size),
            totalPages: Math.max(1, Math.ceil(Math.max(0, currentPagination.total - deletedIds.size) / currentPagination.limit)),
          }))
          setSelectedUserIds(new Set())
          pushToast?.(t('bulkDeleteSuccess', { count: deletedIds.size }))
          void refreshStats()
        } finally {
          setBusyBulkAction(null)
        }
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
      pushToast?.(getErrorMessage(error, t('actionErr')), 'error')
    } finally {
      setIsConfirmWorking(false)
    }
  }

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>{t('pageTitle')}</h1>
          <p>{t('welcomeMsg', { name: currentUser?.displayName || currentUser?.fullName || 'Admin' })}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="admin-search">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="admin-filter" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <Filter size={16} color="var(--muted)" />
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none' }}
            >
              <option value="7days">{t('filter7Days')}</option>
              <option value="30days">{t('filter30Days')}</option>
              <option value="all">{t('filterAllTime')}</option>
            </select>
          </div>
        </div>
      </header>

      {pageError ? <div className="admin-error-message">{pageError}</div> : null}

      <div className="admin-dashboard-cards">
        <div className="stat-card">
          <div className="stat-icon users-icon"><Users size={24} /></div>
          <div className="stat-info">
            <h3>{t('totalUsersTitle')}</h3>
            <p className="stat-value">{isStatsLoading ? <div className="skeleton skeleton-text" style={{ width: '80px', height: '28px', marginTop: '4px' }}></div> : formatNumber(stats.totalUsers)}</p>
            <span className="stat-trend positive">{isStatsLoading ? <div className="skeleton skeleton-text" style={{ width: '120px', height: '14px', marginTop: '4px' }}></div> : t('suspendedCount', { count: formatNumber(stats.suspendedUsers) })}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active-icon"><Activity size={24} /></div>
          <div className="stat-info">
            <h3>{t('unlockedUsersTitle')}</h3>
            <p className="stat-value">{isStatsLoading ? <div className="skeleton skeleton-text" style={{ width: '80px', height: '28px', marginTop: '4px' }}></div> : formatNumber(stats.activeUsers)}</p>
            <span className="stat-trend">{isStatsLoading ? <div className="skeleton skeleton-text" style={{ width: '100px', height: '14px', marginTop: '4px' }}></div> : t('onlineCount', { count: formatNumber(stats.onlineUsers) })}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon alert-icon"><AlertCircle size={24} /></div>
          <div className="stat-info">
            <h3>{t('systemAlertsTitle')}</h3>
            <p className="stat-value">{isStatsLoading ? <div className="skeleton skeleton-text" style={{ width: '80px', height: '28px', marginTop: '4px' }}></div> : formatNumber(stats.alertCount)}</p>
            <span className="stat-trend negative">{isStatsLoading ? <div className="skeleton skeleton-text" style={{ width: '60px', height: '14px', marginTop: '4px' }}></div> : t('needsAction')}</span>
          </div>
        </div>
      </div>

      <div className="admin-chart-grid">
        <section className="admin-chart-panel admin-chart-panel-wide">
          <div className="admin-chart-header">
            <div>
              <h2>
                <BarChart3 size={18} />
                {t('newUsersLabel')}
              </h2>
              <p>{t('last7DaysLabel')}</p>
            </div>
            <strong>{formatNumber(stats.userGrowth.reduce((sum, point) => sum + point.value, 0))}</strong>
          </div>
          <TrendLineChart t={t} data={stats.userGrowth} isLoading={isStatsLoading} tone="primary" />
        </section>

        <section className="admin-chart-panel admin-chart-panel-wide">
          <div className="admin-chart-header">
            <div>
              <h2>
                <MessageSquare size={18} />
                {t('messageVolumeLabel')}
              </h2>
              <p>{t('last7DaysLabel')}</p>
            </div>
            <strong>{formatNumber(stats.messageVolume.reduce((sum, point) => sum + point.value, 0))}</strong>
          </div>
          <TrendLineChart t={t} data={stats.messageVolume} isLoading={isStatsLoading} tone="blue" />
        </section>

        <section className="admin-chart-panel">
          <div className="admin-chart-header">
            <div>
              <h2>
                <PieChart size={18} />
                {t('roleDistributionTitle')}
              </h2>
              <p>{t('userDistributionLabel')}</p>
            </div>
          </div>
          <DistributionChart t={t} data={stats.roleDistribution} isLoading={isStatsLoading} tone="primary" />
        </section>

        <section className="admin-chart-panel">
          <div className="admin-chart-header">
            <div>
              <h2>
                <AlertCircle size={18} />
                {t('reportStatusTitle')}
              </h2>
              <p>{t('allReportsLabel')}</p>
            </div>
          </div>
          <DistributionChart t={t} data={stats.reportStatusDistribution} isLoading={isStatsLoading} tone="orange" />
        </section>

        <section className="admin-chart-panel">
          <div className="admin-chart-header">
            <div>
              <h2>
                <Users size={18} />
                {t('conversationTypesTitle')}
              </h2>
              <p>{t('conversationTypesLabel')}</p>
            </div>
          </div>
          <DistributionChart t={t} data={stats.conversationDistribution} isLoading={isStatsLoading} tone="blue" />
        </section>
      </div>

      <ModerationPanel pushToast={pushToast} />

      <div className="admin-content-section message-report-section">
        <div className="section-header">
          <h2>
            <Flag size={18} />
            {t('messageReportsSection')}
          </h2>
          <div className="report-toolbar">
            <select
              value={reportStatus}
              onChange={(event) => setReportStatus(event.target.value as MessageReportStatus | 'all')}
            >
              <option value="pending">{t('filterPending')}</option>
              <option value="reviewed">{t('filterReviewed')}</option>
              <option value="dismissed">{t('filterDismissed')}</option>
              <option value="all">{t('filterAll')}</option>
            </select>
            <button className="btn-secondary" disabled={isReportsLoading} onClick={handleExportReports} type="button" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-hover)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text)', cursor: 'pointer' }}>
              <Download size={15} />
              {t('exportCSVBtn')}
            </button>
            <button disabled={isReportsLoading} onClick={() => void refreshReports()} type="button">
              {isReportsLoading ? <Loader2 size={15} /> : <Flag size={15} />}
              {t('refreshBtn')}
            </button>
          </div>
        </div>
        <div className="message-report-list">
          {reportsContent}
        </div>
      </div>

      <div className="admin-content-section">
        <div className="section-header">
          <h2>{t('userListSection')}</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" disabled={isUsersLoading} onClick={() => void refreshUsers(true)} type="button" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-hover)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text)', cursor: 'pointer' }}>
              {isUsersLoading ? <Loader2 size={15} /> : <Users size={15} />}
              {t('refreshBtn')}
            </button>
            <button className="btn-secondary" onClick={handleExportUsers} type="button" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-hover)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text)', cursor: 'pointer' }}>
              <Download size={15} />
              {selectedUsers.length > 0 ? t('exportSelectedBtn') : t('exportCSVBtn')}
            </button>
            <button className="btn-primary" onClick={() => setCreateUser(emptyCreateUser)} type="button">
              <Plus size={16} />
              {t('addUserBtn')}
            </button>
          </div>
        </div>

        <div className="admin-user-toolbar">
          <div className="admin-user-filters">
            <label>
              <span>{t('roleFilterLabel')}</span>
              <select
                value={roleFilter}
                onChange={(event) => handleUserFilterChange(setRoleFilter, event.target.value as AdminUserRole | 'all')}
              >
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>{getRoleLabel(role, t)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('accountFilterLabel')}</span>
              <select
                value={statusFilter}
                onChange={(event) => handleUserFilterChange(setStatusFilter, event.target.value as AdminUserStatus | 'all')}
              >
                {USER_STATUSES.map((status) => (
                  <option key={status} value={status}>{getUserStatusFilterLabel(status, t)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('genderFilterLabel')}</span>
              <select
                value={genderFilter}
                onChange={(event) => handleUserFilterChange(setGenderFilter, event.target.value as UserGenderFilter)}
              >
                {USER_GENDERS.map((gender) => (
                  <option key={gender} value={gender}>{getGenderFilterLabel(gender, t)}</option>
                ))}
              </select>
            </label>
            <button
              disabled={!hasUserFilters}
              type="button"
              onClick={() => {
                setRoleFilter('all')
                setStatusFilter('all')
                setGenderFilter('all')
                setPage(1)
              }}
            >
              <X size={14} />
              {t('clearFiltersBtn')}
            </button>
          </div>

          <div className="admin-bulk-actions">
            <span>{t('selectedUsersCount', { count: selectedUsers.length })}</span>
            <button disabled={selectedUsers.length === 0 || Boolean(busyBulkAction)} type="button" onClick={() => openBulkLockDialog(true)}>
              {busyBulkAction === 'lock' ? <Loader2 size={14} /> : <Lock size={14} />}
              {t('lockSelectedBtn')}
            </button>
            <button disabled={selectedUsers.length === 0 || Boolean(busyBulkAction)} type="button" onClick={() => openBulkLockDialog(false)}>
              {busyBulkAction === 'unlock' ? <Loader2 size={14} /> : <Unlock size={14} />}
              {t('unlockSelectedBtn')}
            </button>
            <button className="is-danger" disabled={selectedUsers.length === 0 || Boolean(busyBulkAction)} type="button" onClick={openBulkDeleteDialog}>
              {busyBulkAction === 'delete' ? <Loader2 size={14} /> : <Trash2 size={14} />}
              {t('deleteSelectedBtn')}
            </button>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-select-cell">
                  <input
                    aria-label={t('selectAllUsersAria')}
                    checked={isAllCurrentPageSelected}
                    disabled={users.length === 0}
                    type="checkbox"
                    onChange={(event) => toggleCurrentPageSelection(event.target.checked)}
                  />
                </th>
                <th>{t('colUser')}</th>
                <th>{t('colRole')}</th>
                <th>{t('colAccount')}</th>
                <th>{t('colGender')}</th>
                <th>{t('colCreatedAt')}</th>
                <th>{t('colLastLogin')}</th>
                <th>{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>{tableContent}</tbody>
          </table>
        </div>

        <div className="admin-pagination">
          <span>
            {isLoading ? t('loadingTxt') : t('usersCount', { count: formatNumber(pagination.total) })}
          </span>
          <div>
            <button
              disabled={isUsersLoading || page <= 1}
              type="button"
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            >
              {t('prevBtn')}
            </button>
            <span>
              {t('pageIndicator', { page: pagination.page, totalPages: pagination.totalPages })}
            </span>
            <button
              disabled={isUsersLoading || page >= pagination.totalPages}
              type="button"
              onClick={() => setPage((currentPage) => currentPage + 1)}
            >
              {t('nextBtn')}
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
              title={t('closeBtnTitle')}
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
                  {t('newAccountBadge')}
                </span>
                <h2 id="admin-create-title">{t('createAccountTitle')}</h2>
                <p>{t('createAccountDesc')}</p>
              </div>
            </div>

            <div className="admin-edit-grid">
              <label>
                {t('fullNameLabel')}
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
                {t('displayNameLabel')}
                <input
                  placeholder={t('displayNamePlaceholder')}
                  value={createUser.displayName}
                  onChange={(event) =>
                    setCreateUser((current) =>
                      current ? { ...current, displayName: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label>
                {t('emailLabel')}
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
                {t('passwordLabel')}
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
                {t('roleLabel')}
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
              {t('passwordPolicyDesc')}
            </div>

            <div className="admin-edit-actions">
              <button disabled={isCreatingUser} type="button" onClick={() => setCreateUser(null)}>
                <X size={16} />
                {t('cancelBtn')}
              </button>
              <button disabled={isCreatingUser} type="button" onClick={() => void handleCreateUser()}>
                {isCreatingUser ? <Loader2 size={16} /> : <CheckCircle2 size={16} />}
                {isCreatingUser ? t('creatingBtn') : t('createBtn')}
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
              title={t('closeBtnTitle')}
              type="button"
              onClick={() => setEditUser(null)}
            >
              <X size={18} />
            </button>
            <div className="admin-edit-hero">
              <AvatarFallback className="admin-edit-avatar" name={visibleEditUser.user.fullName} src={visibleEditUser.user.avatarUrl} />
              <div>
                <span className={`admin-lock-pill ${visibleEditUser.user.isActive ? 'is-open' : 'is-locked'}`}>
                  {visibleEditUser.user.isActive ? <Unlock size={13} /> : <Lock size={13} />}
                  {visibleEditUser.user.isActive ? t('statusNormalBadge') : t('statusLockedBadge')}
                </span>
                <h2 id="admin-edit-title">{t('editAccountTitle')}</h2>
                <p>{visibleEditUser.user.id}</p>
              </div>
            </div>

            <div className="admin-edit-grid">
              <label>
                {t('fullNameLabel')}
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
                {t('displayNameLabel')}
                <input
                  placeholder={t('displayNamePlaceholder')}
                  value={visibleEditUser.displayName}
                  onChange={(event) =>
                    setVisibleEditUser((current) =>
                      current ? { ...current, displayName: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label>
                {t('emailLabel')}
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
                {t('roleLabel')}
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
                ? t('editAccountDescNormal')
                : t('editAccountDescLocked')}
            </div>

            <div className="admin-edit-actions">
              <button disabled={isSavingUser || isEditExiting} type="button" onClick={() => setEditUser(null)}>
                <X size={16} />
                {t('cancelBtn')}
              </button>
              <button disabled={isSavingUser || isEditExiting} type="button" onClick={() => void handleSaveUser()}>
                {isSavingUser ? <Loader2 size={16} /> : <CheckCircle2 size={16} />}
                {isSavingUser ? t('savingBtn') : t('saveBtn')}
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
