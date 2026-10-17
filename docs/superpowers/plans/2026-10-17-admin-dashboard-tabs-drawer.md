# Admin Dashboard Tabs, Time Filter Fix & User Detail Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Admin Dashboard with a 4-tab layout (`dashboard`, `users`, `moderation`, `audit`), fix the `timeFilter` stats bug across frontend and backend, implement a comprehensive User Detail Drawer (`AdminUserDrawer`), and provide an Audit Logs tab.

**Architecture:** 
- Backend: Update `getAdminStats` to parse `timeFilter` (`7days`, `30days`, `all`), add `getAdminUserDetails` (`GET /admin/users/:id/details`), and add audit logging (`GET /admin/audit-logs`).
- Frontend: Synchronize tabs with URL query params (`/admin?tab=...`), isolate dashboard cards/charts into Tab 1 with dynamic time subtitles, users into Tab 2 with slide-over User Detail Drawer on row click, moderation into Tab 3, and audit logs into Tab 4.

**Tech Stack:** React 19, TypeScript, Lucide Icons, Recharts, Express.js backend (MySQL), Vanilla CSS, i18next.

## Global Constraints
- Must maintain 0 TypeScript errors on `npm run build`.
- Preserve existing user management operations (bulk lock/delete, CSV export, role/status/gender filters).
- Ensure row clicks open drawer while checkbox and action buttons stop propagation.
- Sync active tab with URL query parameter `tab`.

---

### Task 1: Backend API Enhancements (`admin.controller.js` & `admin.routes.js`)

**Files:**
- Modify: `backend/src/controllers/system/admin.controller.js`
- Modify: `backend/src/routes/system/admin.routes.js`

- [x] **Step 1: Update `getAdminStats` to support `timeFilter`**
Update `getAdminStats` to read `request.query.timeFilter` (`7days` default is 7 days, `30days` is 30 days, `all` is 90 days), build appropriate date ranges and day maps.
- [x] **Step 2: Implement `getAdminUserDetails` in `admin.controller.js`**
Query target user row (`two_factor_enabled`, `last_login`, role, status), `user_sessions` (active devices, IP, user_agent, created_at, expires_at, revoked_at), count of joined conversations from `conversation_participants`, and count of sent messages from `messages`.
- [x] **Step 3: Implement `ensureAdminAuditLogsTable`, `logAdminAction`, and `getAdminAuditLogs`**
Create `admin_audit_logs` table if not exists. Add helper `logAdminAction(adminUser, action, targetType, targetId, details, req)`. Call `logAdminAction` inside `lockAdminUser`, `unlockAdminUser`, `deleteAdminUser`, `updateAdminUser`, and `updateMessageReport`.
- [x] **Step 4: Register routes in `admin.routes.js`**
Add:
```javascript
router.get('/users/:id/details', getAdminUserDetails)
router.get('/audit-logs', getAdminAuditLogs)
```
- [x] **Step 5: Verify backend syntax & commit**
Run node syntax check on `backend/src/controllers/system/admin.controller.js`.
Commit changes to git.

---

### Task 2: Frontend API Types, Functions & i18n Locales

**Files:**
- Modify: `src/services/api/adminApi.ts`
- Modify: `src/locales/vi.json`
- Modify: `src/locales/en.json`

- [x] **Step 1: Add Types and API functions in `adminApi.ts`**
Add `AdminUserSession`, `AdminUserDetail`, `AdminAuditLog` types.
Export `fetchAdminUserDetails(userId: string): Promise<AdminUserDetail>`.
Export `fetchAdminAuditLogs(): Promise<AdminAuditLog[]>`.
Verify `fetchAdminStats(timeFilter?: string)` forwards `timeFilter` properly.
- [x] **Step 2: Add localization keys in `vi.json` and `en.json`**
Add translations for tabs:
- `tabDashboard`: "Tổng quan & Biểu đồ"
- `tabUsers`: "Quản lý người dùng"
- `tabModeration`: "Báo cáo & Kiểm duyệt"
- `tabAudit`: "Nhật ký & Cài đặt"
Add translations for User Drawer:
- `drawerTitle`: "Chi tiết người dùng"
- `sectionOverview`: "Tổng quan hoạt động"
- `sectionSecurity`: "Bảo mật & Xác thực"
- `sectionSessions`: "Phiên đăng nhập & Thiết bị"
- `joinedConversations`: "Hội thoại tham gia"
- `sentMessages`: "Tin nhắn đã gửi"
- `twoFactorActive`: "Đã kích hoạt 2FA"
- `twoFactorInactive`: "Chưa bật 2FA"
- `activeDevices`: "Thiết bị đang kết nối"
- `noSessionsFound`: "Không có phiên đăng nhập nào"
Add translations for Audit tab:
- `auditLogsTitle`: "Nhật ký hoạt động Quản trị"
- `colAdmin`: "Quản trị viên"
- `colAction`: "Hành động"
- `colTarget`: "Đối tượng"
- `colDetails`: "Chi tiết"
- `colTime`: "Thời gian"
- [x] **Step 3: Run `npm run build` to verify types**
- [x] **Step 4: Commit**
`git commit -m "feat(admin): add admin user details, audit log API and i18n keys"`

---

### Task 3: User Detail Drawer Component & Users Tab Row Interaction

**Files:**
- Create: `src/components/views/admin/AdminUserDrawer.tsx`
- Modify: `src/components/views/admin/AdminUsersTab.tsx`

- [x] **Step 1: Create `AdminUserDrawer.tsx`**
Implement slide-over drawer with:
- Backdrop overlay with blur.
- Close button (`X`) and `Escape` key listener.
- Loading skeleton while fetching `fetchAdminUserDetails(userId)`.
- User Hero header (Avatar, Full Name, Display Name, Email, Role badge, Status badge, User ID).
- Tabs / Accordion sections:
  1. Overview & Activity metrics (joined conversations, messages sent, created date, last active).
  2. Security & 2FA (2FA status badge, password security info).
  3. Login sessions & Devices (list of sessions from `user_sessions` with device name, IP, user-agent, status).
- Action buttons in drawer footer (Edit profile, Lock/Unlock account, Delete account).
- [x] **Step 2: Update `AdminUsersTab.tsx` for row selection**
- Accept `onSelectUser?: (user: AdminUser) => void` in `Props`.
- Add `onClick={() => onSelectUser?.(user)}` to `<tr className="admin-user-row clickable">`.
- In checkbox cell and action buttons cell, add `e.stopPropagation()` on clicks to prevent triggering the drawer when selecting checkboxes or clicking edit/lock/delete.
- [x] **Step 3: Test build & commit**
Run `npm run build`.
`git commit -m "feat(admin): create AdminUserDrawer and connect user row click"`

---

### Task 4: Audit Logs Tab & Dynamic Chart Labels

**Files:**
- Create: `src/components/views/admin/AdminAuditLogsTab.tsx`
- Modify: `src/components/views/admin/AdminCharts.tsx`

- [x] **Step 1: Create `AdminAuditLogsTab.tsx`**
- Fetch audit logs from `fetchAdminAuditLogs()`.
- Filter logs by action type (All, Lock, Unlock, Role Change, Delete, Report Review).
- Search logs by admin name or target user.
- Export audit logs to CSV.
- System Settings quick toggles (Maintenance mode, Allow registration, Auto moderation) with toast notifications.
- [x] **Step 2: Update chart subtitles in `AdminCharts.tsx`**
- Accept `timeFilter?: string` in chart props.
- Display dynamic period label:
  - `7days`: "7 ngày qua"
  - `30days`: "30 ngày qua"
  - `all`: "Toàn bộ thời gian (90 ngày)"
- [x] **Step 3: Test build & commit**
Run `npm run build`.
`git commit -m "feat(admin): add AdminAuditLogsTab and dynamic chart time subtitles"`

---

### Task 5: AdminPage Refactor with 4-Tab Navigation & TimeFilter Fix

**Files:**
- Modify: `src/components/views/AdminPage.tsx`

- [x] **Step 1: Wire tab query parameter in `AdminPage.tsx`**
- Read initial `tab` query param (`dashboard` | `users` | `moderation` | `audit`, default: `dashboard`).
- Update URL query when switching tabs without full page reload.
- Listen to `popstate` to handle browser back/forward navigation.
- [x] **Step 2: Fix `timeFilter` propagation**
- In `refreshStats()`: pass `timeFilter` parameter (`fetchAdminStats(timeFilter)`).
- Provide `timeFilter` selector in Dashboard tab header.
- [x] **Step 3: Render tab navigation bar**
Render clean tab nav bar:
- `📊 Dashboard`
- `👥 Users`
- `🛡️ Moderation` (with badge if `stats.alertCount > 0`)
- `📝 Audit Logs`
- [x] **Step 4: Partition content into the 4 tabs**
- Tab 1 (`dashboard`): Stat cards + 5 Charts with dynamic timeFilter.
- Tab 2 (`users`): `AdminUsersTab` + `AdminUserDrawer`.
- Tab 3 (`moderation`): `ModerationPanel` + Message Reports list.
- Tab 4 (`audit`): `AdminAuditLogsTab`.
- [x] **Step 5: Test build & commit**
Run `npm run build`.
`git commit -m "refactor(admin): split AdminPage into 4 tabs and fix timeFilter propagation"`

---

### Task 6: Modern UI Styling for Tabs and Drawer

**Files:**
- Modify: `src/style.css`

- [x] **Step 1: Style Admin Navigation Tabs (`.admin-nav-tabs`)**
- Modern pill/segmented buttons with active indicator, smooth hover transitions, and badge counts.
- [x] **Step 2: Style Slide-over Drawer (`.admin-drawer-*`)**
- Fixed right position, `z-index: 1050`, slide-in animation from `translateX(100%)` to `translateX(0)`.
- Backdrop with `backdrop-filter: blur(4px)`.
- Device session cards with icons, IP tags, and status pills.
- Responsive styles for mobile screen sizes (full width on small screens).
- [x] **Step 3: Style Audit Logs Table & Settings Grid**
- Action badges, filter toolbar, responsive table overflow.
- [x] **Step 4: Test build & commit**
Run `npm run build`.
`git commit -m "style(admin): add styles for admin tabs, user detail drawer, and audit logs"`

---

### Task 7: Full Verification & Final Review

- [x] **Step 1: Build & lint verification**
Run `npm run build` and ensure exit code 0.
- [x] **Step 2: Test tab switching and URL persistence**
Verify navigation between Dashboard, Users, Moderation, and Audit tabs. Verify URL query update.
- [x] **Step 3: Test timeFilter updating charts**
Verify selecting 7 days, 30 days, or all updates chart data and subtitles.
- [x] **Step 4: Test User Drawer interaction**
Verify clicking user opens drawer, sessions and 2FA load, action buttons work.
- [x] **Step 5: Final git commit and push**
Push all commits to `origin main`.
