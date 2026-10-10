import { useMemo } from 'react';
import { Users, Loader2, Download, Plus, Lock, Unlock, Trash2, X, Edit2, CheckCircle2 } from 'lucide-react';
import type { AdminUser, AdminUserRole, AdminUserStatus, AdminUsersPagination } from '../../../services/api/adminApi';
import { getRoleLabel, getUserStatusFilterLabel, getGenderFilterLabel, getStatusLabel, getGenderLabel, formatLastLogin, USER_GENDERS, USER_ROLES, USER_STATUSES, type UserGenderFilter } from './AdminUtils';
import { AvatarFallback } from '../../ui/AvatarFallback';

type Props = {
  users: AdminUser[];
  isUsersLoading: boolean;
  selectedUsers: AdminUser[];
  selectedUserIds: Set<string>;
  selectableUserIds: string[];
  isAllCurrentPageSelected: boolean;
  roleFilter: AdminUserRole | 'all';
  statusFilter: AdminUserStatus | 'all';
  genderFilter: UserGenderFilter;
  hasUserFilters: boolean;
  pagination: AdminUsersPagination;
  page: number;
  busyBulkAction: 'lock' | 'unlock' | 'delete' | null;
  busyLockUserId: string | null;
  debouncedSearch: string;
  setRoleFilter: (role: AdminUserRole | 'all') => void;
  setStatusFilter: (status: AdminUserStatus | 'all') => void;
  setGenderFilter: (gender: UserGenderFilter) => void;
  setPage: (page: number | ((p: number) => number)) => void;
  refreshUsers: (showSuccess?: boolean) => Promise<void>;
  handleExportUsers: () => void;
  setCreateUser: (state: any) => void;
  emptyCreateUser: any;
  handleUserFilterChange: (setter: any, value: any) => void;
  openBulkLockDialog: (shouldLock: boolean) => void;
  openBulkDeleteDialog: () => void;
  toggleCurrentPageSelection: (checked: boolean) => void;
  toggleUserSelection: (id: string, checked: boolean) => void;
  setEditUser: (user: any) => void;
  createEditState: (user: AdminUser) => any;
  openLockDialog: (user: AdminUser) => void;
  openDeleteDialog: (user: AdminUser) => void;
  isLoading: boolean;
  t: any;
  formatNumber: (n: number) => string;
};

export function AdminUsersTab({
  users, isUsersLoading, selectedUsers, selectedUserIds, isAllCurrentPageSelected,
  roleFilter, statusFilter, genderFilter, hasUserFilters, pagination, page, busyBulkAction,
  busyLockUserId, debouncedSearch,
  setRoleFilter, setStatusFilter, setGenderFilter, setPage, refreshUsers, handleExportUsers,
  setCreateUser, emptyCreateUser, handleUserFilterChange, openBulkLockDialog, openBulkDeleteDialog,
  toggleCurrentPageSelection, toggleUserSelection, setEditUser, createEditState, openLockDialog,
  openDeleteDialog, isLoading, t, formatNumber
}: Props) {
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

  return (
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
  );
}
