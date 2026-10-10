const fs = require('fs');

const adminPagePath = 'src/components/views/AdminPage.tsx';
let content = fs.readFileSync(adminPagePath, 'utf8');

// Find tableContent start and end
const tableContentStartStr = '  const tableContent = useMemo(() => {';
const tableContentEndStr = '  }, [busyLockUserId, debouncedSearch, isUsersLoading, selectedUserIds, users])';

const startIdx = content.indexOf(tableContentStartStr);
const endIdx = content.indexOf(tableContentEndStr, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.log('tableContent block not found');
  process.exit(1);
}

const tableContentJSX = content.substring(startIdx, endIdx + tableContentEndStr.length) + '\n';

// Find usersUI start and end
const usersUIStartStr = '      <div className="admin-content-section">\n        <div className="section-header">\n          <h2>{t(\'userListSection\')}</h2>';
const usersUIEndStr = '        <div className="admin-pagination">';

const uiStartIdx = content.indexOf(usersUIStartStr);
if (uiStartIdx === -1) {
  console.log('usersUI start not found');
  process.exit(1);
}

// Find the end of admin-pagination
const uiPaginationIdx = content.indexOf(usersUIEndStr, uiStartIdx);
if (uiPaginationIdx === -1) {
  console.log('usersUI pagination not found');
  process.exit(1);
}

// Find the closing div for pagination and then the closing div for section
let closingDivs = content.substring(uiPaginationIdx).match(/<\/div>\s*<\/div>\s*<\/div>/);
if (!closingDivs) {
  console.log('usersUI closing divs not found');
  process.exit(1);
}

const usersUIJSX = content.substring(uiStartIdx, uiPaginationIdx + closingDivs.index + closingDivs[0].length);

const adminUsersTabComponent = `import { useMemo } from 'react';
import { Users, Loader2, Download, Plus, Lock, Unlock, Trash2, X, Edit2, CheckCircle2, Search, Filter } from 'lucide-react';
import type { AdminUser, AdminUserRole, AdminUserStatus, AdminUsersPagination } from '../../../services/api/adminApi';
import { getRoleLabel, getUserStatusFilterLabel, getGenderFilterLabel, getStatusLabel, getGenderLabel, formatLastLogin, USER_GENDERS, type UserGenderFilter } from './AdminUtils';
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
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  clearUserFilters: () => void;
  t: any;
  formatNumber: (n: number) => string;
};

export function AdminUsersTab({
  users, isUsersLoading, selectedUsers, selectedUserIds, selectableUserIds, isAllCurrentPageSelected,
  roleFilter, statusFilter, genderFilter, hasUserFilters, pagination, page, busyBulkAction,
  busyLockUserId, debouncedSearch, searchQuery, setSearchQuery, clearUserFilters,
  setRoleFilter, setStatusFilter, setGenderFilter, setPage, refreshUsers, handleExportUsers,
  setCreateUser, emptyCreateUser, handleUserFilterChange, openBulkLockDialog, openBulkDeleteDialog,
  toggleCurrentPageSelection, toggleUserSelection, setEditUser, createEditState, openLockDialog,
  openDeleteDialog, t, formatNumber
}: Props) {
  ${tableContentJSX.trim()}

  return (
    ${usersUIJSX.replace(/\{tableContent\}/, '{tableContent}')}
  );
}
`;

fs.writeFileSync('src/components/views/admin/AdminUsersTab.tsx', adminUsersTabComponent);

content = content.replace(tableContentJSX, '');
content = content.replace(usersUIJSX, `<AdminUsersTab 
        users={users}
        isUsersLoading={isUsersLoading}
        selectedUsers={selectedUsers}
        selectedUserIds={selectedUserIds}
        selectableUserIds={selectableUserIds}
        isAllCurrentPageSelected={isAllCurrentPageSelected}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        genderFilter={genderFilter}
        hasUserFilters={hasUserFilters}
        pagination={pagination}
        page={page}
        busyBulkAction={busyBulkAction}
        busyLockUserId={busyLockUserId}
        debouncedSearch={debouncedSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        clearUserFilters={clearUserFilters}
        setRoleFilter={setRoleFilter}
        setStatusFilter={setStatusFilter}
        setGenderFilter={setGenderFilter}
        setPage={setPage}
        refreshUsers={refreshUsers}
        handleExportUsers={handleExportUsers}
        setCreateUser={setCreateUser}
        emptyCreateUser={emptyCreateUser}
        handleUserFilterChange={handleUserFilterChange}
        openBulkLockDialog={openBulkLockDialog}
        openBulkDeleteDialog={openBulkDeleteDialog}
        toggleCurrentPageSelection={toggleCurrentPageSelection}
        toggleUserSelection={toggleUserSelection}
        setEditUser={setEditUser}
        createEditState={createEditState}
        openLockDialog={openLockDialog}
        openDeleteDialog={openDeleteDialog}
        t={t}
        formatNumber={formatNumber}
      />`);

content = `import { AdminUsersTab } from './admin/AdminUsersTab';\n` + content;
fs.writeFileSync(adminPagePath, content);
console.log('AdminUsersTab created.');
