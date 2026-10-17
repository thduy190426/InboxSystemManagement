import { useEffect, useMemo, useState } from 'react'
import {
  FileText,
  Search,
  Filter,
  Download,
  Loader2,
  RefreshCw,
  Shield,
  Lock,
  Unlock,
  Trash2,
  Edit3,
  Flag,
  Settings,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
} from 'lucide-react'
import {
  type AdminAuditLog,
  fetchAdminAuditLogs,
} from '../../../services/api/adminApi'
import { exportToCSV } from '../../../utils/exportUtils'
import { formatLastLogin } from './AdminUtils'
import { useTranslation } from 'react-i18next'

type AdminAuditLogsTabProps = {
  pushToast?: (text: string, tone?: 'info' | 'error') => void
}

export function AdminAuditLogsTab({ pushToast }: AdminAuditLogsTabProps) {
  const { t } = useTranslation('admin')
  const [logs, setLogs] = useState<AdminAuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')

  // System Settings state stored in localStorage
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(() => {
    return localStorage.getItem('admin_setting_maintenance') === 'true'
  })
  const [allowRegistration, setAllowRegistration] = useState<boolean>(() => {
    return localStorage.getItem('admin_setting_allow_reg') !== 'false'
  })
  const [autoModeration, setAutoModeration] = useState<boolean>(() => {
    return localStorage.getItem('admin_setting_auto_mod') !== 'false'
  })

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const data = await fetchAdminAuditLogs()
      setLogs(data.logs || [])
    } catch (err) {
      console.warn('Failed to load audit logs, showing empty list:', err)
      setLogs([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [])

  const handleToggle = (
    _key: 'maintenance' | 'registration' | 'moderation',
    currentVal: boolean,
    setter: (val: boolean) => void,
    storageKey: string,
    label: string,
  ) => {
    const nextVal = !currentVal
    setter(nextVal)
    localStorage.setItem(storageKey, String(nextVal))
    pushToast?.(t('settingUpdated', { setting: label }), 'info')
  }

  const handleExportCSV = () => {
    const headers = [
      'ID',
      t('colAdmin'),
      'Admin ID',
      t('colAction'),
      t('colTarget'),
      t('colDetails'),
      'IP Address',
      t('colTime'),
    ]
    const data = filteredLogs.map((l) => [
      l.id,
      l.adminName,
      l.adminId,
      l.action,
      `${l.targetType}:${l.targetId || ''}`,
      l.details || '',
      l.ipAddress || '',
      l.createdAt,
    ])
    exportToCSV('admin_audit_logs.csv', headers, data)
    pushToast?.(t('exportAuditCSV'), 'info')
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction = actionFilter === 'all' || log.action === actionFilter
      const query = searchQuery.trim().toLowerCase()
      const matchesQuery =
        !query ||
        log.adminName.toLowerCase().includes(query) ||
        (log.details && log.details.toLowerCase().includes(query)) ||
        (log.targetId && log.targetId.toLowerCase().includes(query))

      return matchesAction && matchesQuery
    })
  }, [logs, actionFilter, searchQuery])

  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'lock_user':
        return (
          <span className="audit-action-badge lock">
            <Lock size={12} />
            Khóa user
          </span>
        )
      case 'unlock_user':
        return (
          <span className="audit-action-badge unlock">
            <Unlock size={12} />
            Mở khóa user
          </span>
        )
      case 'delete_user':
        return (
          <span className="audit-action-badge delete">
            <Trash2 size={12} />
            Xóa user
          </span>
        )
      case 'update_user':
        return (
          <span className="audit-action-badge update">
            <Edit3 size={12} />
            Cập nhật user
          </span>
        )
      case 'resolve_report':
        return (
          <span className="audit-action-badge report">
            <Flag size={12} />
            Duyệt báo cáo
          </span>
        )
      default:
        return (
          <span className="audit-action-badge generic">
            <Shield size={12} />
            {action}
          </span>
        )
    }
  }

  return (
    <div className="admin-audit-container">
      {/* System Settings Section */}
      <div className="admin-content-section admin-settings-section">
        <div className="section-header">
          <div>
            <h2>
              <Settings size={20} />
              {t('systemSettingsTitle')}
            </h2>
            <p className="section-subtitle">{t('systemSettingsSubtitle')}</p>
          </div>
        </div>

        <div className="admin-settings-grid">
          <div className="admin-setting-card">
            <div className="setting-info">
              <h4>{t('maintenanceMode')}</h4>
              <p>{t('maintenanceModeDesc')}</p>
            </div>
            <button
              type="button"
              className={`toggle-btn ${maintenanceMode ? 'active' : ''}`}
              onClick={() =>
                handleToggle(
                  'maintenance',
                  maintenanceMode,
                  setMaintenanceMode,
                  'admin_setting_maintenance',
                  t('maintenanceMode'),
                )
              }
            >
              {maintenanceMode ? (
                <ToggleRight size={28} className="text-warning" />
              ) : (
                <ToggleLeft size={28} className="text-muted" />
              )}
            </button>
          </div>

          <div className="admin-setting-card">
            <div className="setting-info">
              <h4>{t('allowRegistration')}</h4>
              <p>{t('allowRegistrationDesc')}</p>
            </div>
            <button
              type="button"
              className={`toggle-btn ${allowRegistration ? 'active' : ''}`}
              onClick={() =>
                handleToggle(
                  'registration',
                  allowRegistration,
                  setAllowRegistration,
                  'admin_setting_allow_reg',
                  t('allowRegistration'),
                )
              }
            >
              {allowRegistration ? (
                <ToggleRight size={28} className="text-success" />
              ) : (
                <ToggleLeft size={28} className="text-muted" />
              )}
            </button>
          </div>

          <div className="admin-setting-card">
            <div className="setting-info">
              <h4>{t('autoModeration')}</h4>
              <p>{t('autoModerationDesc')}</p>
            </div>
            <button
              type="button"
              className={`toggle-btn ${autoModeration ? 'active' : ''}`}
              onClick={() =>
                handleToggle(
                  'moderation',
                  autoModeration,
                  setAutoModeration,
                  'admin_setting_auto_mod',
                  t('autoModeration'),
                )
              }
            >
              {autoModeration ? (
                <ToggleRight size={28} className="text-primary" />
              ) : (
                <ToggleLeft size={28} className="text-muted" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Section */}
      <div className="admin-content-section admin-audit-section">
        <div className="section-header">
          <div>
            <h2>
              <FileText size={20} />
              {t('auditLogsTitle')}
            </h2>
            <p className="section-subtitle">{t('auditLogsSubtitle')}</p>
          </div>

          <div className="audit-toolbar">
            <div className="audit-search-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="audit-filter-wrap">
              <Filter size={15} />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="all">{t('filterAllActions')}</option>
                <option value="lock_user">Khóa tài khoản</option>
                <option value="unlock_user">Mở khóa tài khoản</option>
                <option value="update_user">Cập nhật thông tin</option>
                <option value="delete_user">Xóa tài khoản</option>
                <option value="resolve_report">Xử lý báo cáo</option>
              </select>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleExportCSV}
              disabled={isLoading || filteredLogs.length === 0}
            >
              <Download size={15} />
              {t('exportCSVBtn')}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => void loadLogs()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              {t('refreshBtn')}
            </button>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-users-table audit-table">
            <thead>
              <tr>
                <th>{t('colAdmin')}</th>
                <th>{t('colAction')}</th>
                <th>{t('colTarget')}</th>
                <th>{t('colDetails')}</th>
                <th>IP Address</th>
                <th>{t('colTime')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td><div className="skeleton skeleton-text" style={{ width: '120px', height: '16px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '90px', height: '24px', borderRadius: '12px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px', height: '16px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '220px', height: '16px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px', height: '16px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '100px', height: '16px' }}></div></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="admin-empty-row">
                      <FileText size={24} style={{ opacity: 0.5, marginBottom: '8px' }} />
                      <p>{t('noAuditLogs')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="audit-admin-cell">
                        <div className="admin-badge-circle">
                          <CheckCircle size={14} />
                        </div>
                        <div>
                          <strong>{log.adminName}</strong>
                          <span className="text-muted">ID: {log.adminId}</span>
                        </div>
                      </div>
                    </td>
                    <td>{renderActionBadge(log.action)}</td>
                    <td>
                      <span className="audit-target-pill">
                        {log.targetType} {log.targetId ? `#${log.targetId}` : ''}
                      </span>
                    </td>
                    <td className="audit-details-cell">
                      <span>{log.details || '—'}</span>
                    </td>
                    <td className="text-muted">
                      <code>{log.ipAddress || '127.0.0.1'}</code>
                    </td>
                    <td className="text-muted">
                      {log.createdAt ? formatLastLogin(log.createdAt, t) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
