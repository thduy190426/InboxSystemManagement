const fs = require('fs');

const adminPagePath = 'src/components/views/AdminPage.tsx';
let lines = fs.readFileSync(adminPagePath, 'utf8').split('\n');

const tcStart = lines.findIndex(l => l.includes('const tableContent = useMemo('));
let tcEnd = -1;
if (tcStart !== -1) {
  for (let i = tcStart; i < lines.length; i++) {
    if (lines[i].includes('}, [busyLockUserId, debouncedSearch, isUsersLoading, selectedUserIds, users])')) {
      tcEnd = i;
      break;
    }
  }
}

const uiStart = lines.findIndex((l, index) => l.includes('<div className="admin-content-section">') && lines[index+1]?.includes('section-header') && lines[index+2]?.includes('userListSection'));
let uiEnd = -1;
if (uiStart !== -1) {
  for (let i = uiStart; i < lines.length; i++) {
    if (lines[i].includes('<div className="admin-pagination">')) {
      // Find the closing div for this pagination and its parent
      for (let j = i; j < lines.length; j++) {
        if (lines[j].trim() === '</div>' && lines[j-1].trim() === '</div>' && lines[j-2].trim() === '</div>') {
          uiEnd = j;
          break;
        }
      }
      break;
    }
  }
}

if (tcStart !== -1 && tcEnd !== -1 && uiStart !== -1 && uiEnd !== -1) {
  const tableContentJSX = lines.slice(tcStart, tcEnd + 1).join('\n') + '\n';
  const usersUIJSX = lines.slice(uiStart, uiEnd + 1).join('\n');

  const adminUsersTabComponent = `import { useMemo } from 'react';
import { Users, Loader2, Download, Plus, Lock, Unlock, Trash2, X, Edit2, CheckCircle2 } from 'lucide-react';
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
  isLoading: boolean;
  t: any;
  formatNumber: (n: number) => string;
};

export function AdminUsersTab({
  users, isUsersLoading, selectedUsers, selectedUserIds, selectableUserIds, isAllCurrentPageSelected,
  roleFilter, statusFilter, genderFilter, hasUserFilters, pagination, page, busyBulkAction,
  busyLockUserId, debouncedSearch,
  setRoleFilter, setStatusFilter, setGenderFilter, setPage, refreshUsers, handleExportUsers,
  setCreateUser, emptyCreateUser, handleUserFilterChange, openBulkLockDialog, openBulkDeleteDialog,
  toggleCurrentPageSelection, toggleUserSelection, setEditUser, createEditState, openLockDialog,
  openDeleteDialog, isLoading, t, formatNumber
}: Props) {
${tableContentJSX.trim()}

  return (
${usersUIJSX}
  );
}
`;

  fs.writeFileSync('src/components/views/admin/AdminUsersTab.tsx', adminUsersTabComponent);

  lines.splice(uiStart, uiEnd - uiStart + 1, `      <AdminUsersTab 
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
        isLoading={isLoading}
        t={t}
        formatNumber={formatNumber}
      />`);
      
  lines.splice(tcStart, tcEnd - tcStart + 1);

  // Remove duplicate AdminReportsTab import first just in case
  let newContent = lines.join('\n');
  newContent = newContent.replace(/import \{ AdminReportsTab \} from '\.\/admin\/AdminReportsTab';\n/g, '');
  newContent = `import { AdminReportsTab } from './admin/AdminReportsTab';\nimport { AdminUsersTab } from './admin/AdminUsersTab';\n` + newContent;
  
  fs.writeFileSync(adminPagePath, newContent);
  console.log('AdminUsersTab created successfully.');

} else {
  console.log('Could not find boundaries.', {tcStart, tcEnd, uiStart, uiEnd});
}
