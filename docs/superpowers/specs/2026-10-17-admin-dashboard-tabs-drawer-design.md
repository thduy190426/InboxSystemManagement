# Admin Dashboard Tabs Layout, Time Filter Bug Fix & User Detail Drawer Design Document

**Date:** 2026-10-17  
**Status:** Approved  
**Author:** Antigravity AI  
**Scope:** `src/components/views/AdminPage.tsx`, `src/components/views/admin/*`, `src/services/api/adminApi.ts`, `backend/src/controllers/system/admin.controller.js`, `backend/src/routes/system/admin.routes.js`, `src/style.css`, `src/locales/*`

---

## 1. Overview & Goals

The Admin Dashboard currently aggregates all administration domains into a single, vertically scrolling page: Overview stats, 5 Recharts data charts, Content Moderation (`ModerationPanel`), Message Reports, and User Management table. This causes high DOM weight, slow page loads, and a cluttered user experience.

Additionally, two core limitations exist:
1. **Time Filter Logic Bug:** The header time selector `timeFilter` (`7days` / `30days` / `all`) is saved in React state, but `refreshStats()` calls `fetchAdminStats()` without parameters, and backend `getAdminStats` completely ignores `request.query.timeFilter`, hardcoding `INTERVAL 6 DAY` and 7-day arrays. Chart subtitles are also hardcoded to "7 ngày qua".
2. **Missing User Deep Dive (User Detail Drawer):** Clicking a user row currently either does nothing or only allows editing basic info (Name, Email, Role) via a modal. Admins lack visibility into login history, active sessions/devices, 2FA security status, and participation metrics (joined conversations, messages sent).

### Goals
- **Fix Time Filtering (End-to-End):** Make `timeFilter` (`7days`, `30days`, `all`) work seamlessly across frontend and backend database queries, dynamically updating line charts, distribution totals, and labels.
- **Tabbed Layout:** Partition the Admin Dashboard into 4 dedicated views, synchronized with URL query params (`/admin?tab=dashboard|users|moderation|audit`):
  1. **Tổng quan & Biểu đồ (`dashboard`)**: Stat summary cards + time filter + 5 analytical charts.
  2. **Quản lý người dùng (`users`)**: Full user table, multi-select bulk operations, role/status/gender filters, CSV export, and pagination.
  3. **Báo cáo & Kiểm duyệt (`moderation`)**: Banned word management (`ModerationPanel`) + message reports list and resolution workflow.
  4. **Nhật ký & Cài đặt hệ thống (`audit`)**: Admin audit activity log (tracking user locks/unlocks, role changes, report reviews) + system configuration toggles.
- **User Detail Drawer (`AdminUserDrawer`):** A slide-over panel opening on user row click, displaying comprehensive account metrics, security (2FA), active sessions/devices, and action triggers (Edit, Lock/Unlock, Delete).

---

## 2. Architecture & Component Structure

### 2.1 Backend Changes (`backend/src/`)
- **`backend/src/controllers/system/admin.controller.js`**:
  - Update `getAdminStats(request, response, next)`:
    - Read `timeFilter = request.query.timeFilter || '30days'`.
    - Adjust MySQL queries for `userGrowth` and `messageVolume` based on filter:
      - `7days`: `created_at >= UTC_DATE() - INTERVAL 6 DAY` (7 days map).
      - `30days`: `created_at >= UTC_DATE() - INTERVAL 29 DAY` (30 days map).
      - `all`: `created_at >= UTC_DATE() - INTERVAL 89 DAY` (90 days / all-time map).
  - Add `getAdminUserDetails(request, response, next)`:
    - Route: `GET /admin/users/:id/details`.
    - Queries user record (`two_factor_enabled`, `last_login`, role, status), `user_sessions` (active devices, IP, user agent, expiration), count of `conversation_participants`, and count of sent `messages`.
  - Add `ensureAdminAuditLogsTable()`, `logAdminAction(...)`, and `getAdminAuditLogs(request, response, next)`:
    - Automatically creates `admin_audit_logs` table (id, admin_id, admin_name, action, target_type, target_id, details, ip_address, created_at).
    - Logs admin actions on user lock/unlock, user delete, role update, and report review.
- **`backend/src/routes/system/admin.routes.js`**:
  - Register `GET /users/:id/details` → `getAdminUserDetails`.
  - Register `GET /audit-logs` → `getAdminAuditLogs`.

### 2.2 Frontend API & Types (`src/services/api/adminApi.ts`)
- Add interfaces:
  ```typescript
  export type AdminUserSession = {
    id: number
    deviceName: string | null
    ipAddress: string | null
    userAgent: string | null
    createdAt: string
    updatedAt: string
    expiresAt: string
    revokedAt: string | null
    isActive: boolean
  }

  export type AdminUserDetail = {
    user: AdminUser
    twoFactorEnabled: boolean
    stats: {
      conversationsCount: number
      messagesCount: number
    }
    sessions: AdminUserSession[]
  }

  export type AdminAuditLog = {
    id: number
    adminId: string
    adminName: string
    action: string
    targetType: string
    targetId: string | null
    details: string | null
    ipAddress: string | null
    createdAt: string
  }
  ```
- Export functions:
  - `fetchAdminUserDetails(userId: string): Promise<AdminUserDetail>`
  - `fetchAdminAuditLogs(): Promise<AdminAuditLog[]>`
  - Update `fetchAdminStats(timeFilter?: string)`

### 2.3 Component Hierarchy
```
AdminPage
├── AdminHeader (Title, Global Search, TimeFilter selector for dashboard)
├── AdminTabsNav (Dashboard | Users | Moderation | Audit Logs)
│
├── [Tab 1: Dashboard]
│   ├── StatCards (Total Users, Active, Suspended, Online)
│   └── AdminCharts (TrendLineChart x2, DistributionChart x3 with dynamic time labels)
│
├── [Tab 2: Users]
│   ├── AdminUsersTab (Table, search, filters, pagination, bulk actions)
│   └── AdminUserDrawer (Slide-over detail drawer on user click)
│
├── [Tab 3: Moderation]
│   ├── ModerationPanel (Banned keyword & moderation rules)
│   └── MessageReportsSection (Reports filter, review action, CSV export)
│
└── [Tab 4: Audit & Settings]
    └── AdminAuditLogsTab (Activity logs table, filter, CSV export & system settings)
```

---

## 3. UI/UX Details

### 3.1 Tab Navigation
- Nav tabs rendered below header with clean pill / border-bottom indicator styling:
  - `📊 Tổng quan & Biểu đồ` (`dashboard`)
  - `👥 Quản lý người dùng` (`users`)
  - `🛡️ Báo cáo & Kiểm duyệt` (`moderation`) - with pending badge if `alertCount > 0`
  - `📝 Nhật ký & Cài đặt` (`audit`)
- Reading and writing `?tab=...` in URL query params via `window.history.replaceState` or `URLSearchParams`.

### 3.2 User Detail Drawer (`AdminUserDrawer.tsx`)
- Slide-over panel (width ~480px - 560px on desktop, 100% on mobile) sliding in from the right edge with backdrop blur.
- Close via clicking backdrop, top-right `X` button, or pressing `Escape`.
- Sections:
  1. **Hero Header:** Large avatar with fallback, Full name, username/display name, email, User ID badge, Role pill, Status pill, and online presence badge.
  2. **Tương tác & Hoạt động (Activity Overview):**
     - Số cuộc trò chuyện tham gia (conversations count).
     - Số tin nhắn đã gửi (messages sent).
     - Ngày tạo tài khoản (formatted date/time).
     - Lần hoạt động gần nhất (relative time).
  3. **Bảo mật & 2FA (Security):**
     - Trạng thái xác thực 2 lớp (2FA): Active (Green shield) / Inactive (Muted shield).
     - Mật khẩu: Đã được mã hóa an toàn.
  4. **Phiên đăng nhập & Thiết bị (Sessions & Devices):**
     - Danh sách thiết bị từ `user_sessions`: Tên thiết bị (Mobile / Desktop / Browser), IP Address, Thời gian đăng nhập, Trạng thái (Đang hoạt động / Đã hết hạn / Thu hồi).
  5. **Quick Action Footer:**
     - Nút "Chỉnh sửa" (Mở Edit User Modal).
     - Nút "Khóa / Mở khóa tài khoản".
     - Nút "Xóa tài khoản".

### 3.3 Dynamic Chart Subtitles
- When `timeFilter === '7days'`: Displays "7 ngày qua".
- When `timeFilter === '30days'`: Displays "30 ngày qua".
- When `timeFilter === 'all'`: Displays "Toàn bộ thời gian (90 ngày)".

---

## 4. Verification & Testing Strategy

1. **Time Filter Testing:**
   - Change `timeFilter` to 7 days, 30 days, All time.
   - Verify network request `GET /api/admin/stats?timeFilter=...`.
   - Verify charts update data points and subtitles ("7 ngày qua", "30 ngày qua", "Toàn bộ thời gian").
   - Click refresh button; verify `timeFilter` is retained.
2. **Tab Navigation Testing:**
   - Switch between all 4 tabs (Dashboard, Users, Moderation, Audit).
   - Check URL query parameter updates to `?tab=users`, `?tab=moderation`, etc.
   - Reload page (`F5`); verify active tab remains selected.
3. **User Detail Drawer Testing:**
   - Click on any user row in the Users tab.
   - Verify drawer opens smoothly from the right without triggering row checkbox.
   - Verify user information, 2FA status, joined conversations count, and device sessions load correctly.
   - Test action buttons in drawer (Edit opens edit modal, Lock/Unlock opens confirm dialog).
   - Close drawer using `X`, backdrop click, or `Escape` key.
4. **Audit Logs Testing:**
   - Lock/unlock a user or review a report.
   - Check Tab 4 (Audit Logs) to verify the new audit event is logged with admin name, action, and timestamp.
5. **Build & Type Checking:**
   - Run `npm run build` to confirm 0 TypeScript, JSX, or bundling errors.
