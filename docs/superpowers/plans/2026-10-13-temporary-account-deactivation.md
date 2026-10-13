# Temporary Account Deactivation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement temporary account deactivation with password confirmation in SettingsPage, session revocation, and seamless auto-reactivation upon login.

**Architecture:** Database schema auto-migration adding `deactivated_at` column, backend `POST /api/users/me/deactivate` endpoint with session revocation and presence offline update, auto-reactivation during authentication endpoints, frontend API methods, controller state & validation in `useSettingsPageController`, warning card in `SettingsPage`, and comprehensive i18n support.

**Tech Stack:** Node.js, Express, MySQL 8 (Backend) / React 18, TypeScript, Vite, i18next, Lucide React (Frontend).

## Global Constraints
- Spec: `docs/superpowers/specs/2026-10-13-temporary-account-deactivation-design.md`
- Approach: Approach 1 (Warning Card in Settings Page Danger Zone, password required, optional reason, auto-reactivate on login).
- Type Safety: Zero errors with `npx tsc --noEmit`.
- Build: Zero errors with `npm run build`.
- Commits: Individual Git commit per task.

---

### Task 1: Database Migration & Backend Deactivation Endpoint

**Files:**
- Modify: `backend/src/utils/userProfileColumns.js:3-18`
- Modify: `backend/src/controllers/core/user.controller.js:250-275, 620-704`
- Modify: `backend/src/routes/core/user.routes.js:8-35`

**Interfaces:**
- Consumes: `pool` from `backend/src/config/db`, `bcrypt` from `bcryptjs`, `emitToUsers` from `backend/src/realtime/socket`.
- Produces: `POST /api/users/me/deactivate` route and handler returning `{ message: string }`.

- [ ] **Step 1: Update `userProfileColumns.js` to ensure `deactivated_at` column exists**
In `backend/src/utils/userProfileColumns.js`, add `deactivated_at` to `profileColumns`:
```javascript
  { name: 'deactivated_at', definition: 'DATETIME NULL DEFAULT NULL' },
```

- [ ] **Step 2: Add validation and controller logic in `user.controller.js`**
In `backend/src/controllers/core/user.controller.js`:
Add `validateDeactivateAccountPayload`:
```javascript
function validateDeactivateAccountPayload(payload) {
  const source = payload && typeof payload === 'object' ? payload : {}
  const password = typeof source.password === 'string' ? source.password : ''
  const reason = typeof source.reason === 'string' ? source.reason.trim() : ''
  const errors = {}

  if (!password) {
    errors.password = 'Mật khẩu hiện tại là bắt buộc!'
  }

  return {
    data: {
      password,
      reason,
    },
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}
```

Add `deactivateAccount` handler:
```javascript
async function deactivateAccount(request, response, next) {
  const connection = await pool.getConnection()

  try {
    const user = await getUserPasswordRecord(request.user.id)

    if (!user) {
      return response.status(404).json({
        message: 'Không tìm thấy tài khoản!',
      })
    }

    const validation = validateDeactivateAccountPayload(request.body)

    if (!validation.isValid) {
      return response.status(422).json({
        message: 'Dữ liệu xác nhận vô hiệu hoá tài khoản không hợp lệ!',
        errors: validation.errors,
      })
    }

    const isPasswordValid = await bcrypt.compare(validation.data.password, user.password_hash)

    if (!isPasswordValid) {
      return response.status(401).json({
        message: 'Mật khẩu hiện tại không đúng!',
        errors: {
          password: 'Mật khẩu hiện tại không đúng!',
        },
      })
    }

    await connection.beginTransaction()
    await connection.execute(
      `UPDATE users
      SET
        deactivated_at = CURRENT_TIMESTAMP,
        presence = 'offline',
        online_since = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [request.user.id],
    )
    await connection.execute(
      `UPDATE user_sessions
      SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND revoked_at IS NULL`,
      [request.user.id],
    )
    await connection.commit()

    const [contactRows] = await pool.execute(
      `SELECT contact_user_id AS user_id
      FROM contacts
      WHERE owner_user_id = ? AND status = 'accepted'`,
      [request.user.id],
    )

    emitToUsers(
      contactRows.map((row) => Number(row.user_id)),
      'presence:changed',
      {
        userId: String(request.user.id),
        presence: 'offline',
      },
    )

    response.json({
      message: 'Tài khoản của bạn đã được vô hiệu hoá tạm thời!',
    })
  } catch (error) {
    await connection.rollback()
    next(error)
  } finally {
    connection.release()
  }
}
```
Export `deactivateAccount` in `module.exports`.

- [ ] **Step 3: Register route in `user.routes.js`**
Import `deactivateAccount` and add `router.post('/me/deactivate', deactivateAccount)`.

- [ ] **Step 4: Verify backend syntax**
Run: `node -c backend/src/utils/userProfileColumns.js && node -c backend/src/controllers/core/user.controller.js && node -c backend/src/routes/core/user.routes.js`
Expected: 0 errors (valid syntax).

- [ ] **Step 5: Commit**
```bash
git add backend/src/utils/userProfileColumns.js backend/src/controllers/core/user.controller.js backend/src/routes/core/user.routes.js
git commit -m "feat(backend): add temporary account deactivation endpoint and column migration"
```

---

### Task 2: Backend Auto-Reactivation on Login

**Files:**
- Modify: `backend/src/controllers/system/auth.controller.js:85-125, 410-455, 820-895, 950-980`

**Interfaces:**
- Consumes: `users.deactivated_at`
- Produces: `wasReactivated: boolean` flag in auth response payloads (`login`, `login2FA`, `googleLogin`, `facebookLogin`).

- [ ] **Step 1: Include `deactivated_at` in `getUserByEmail`**
In `backend/src/controllers/system/auth.controller.js`, add `deactivated_at` to the `SELECT` query in `getUserByEmail(email)`:
```sql
  show_activity_status,
  deactivated_at,
  created_at,
```

- [ ] **Step 2: Add auto-reactivation to `login` handler**
In `login(request, response, next)`:
```javascript
    let wasReactivated = false
    if (user.deactivated_at) {
      await pool.execute(
        `UPDATE users
        SET deactivated_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [user.id],
      )
      user.deactivated_at = null
      wasReactivated = true
    }
```
And in `response.json(...)`:
```javascript
      message: wasReactivated ? 'Chào mừng trở lại! Tài khoản của bạn đã được kích hoạt lại.' : 'Đăng nhập thành công!',
      wasReactivated,
```

- [ ] **Step 3: Add auto-reactivation to `login2FA`, `googleLogin`, and `facebookLogin`**
Check `user.deactivated_at` and clear it with `wasReactivated = true` in response for 2FA and OAuth handlers if previously deactivated.

- [ ] **Step 4: Verify backend syntax**
Run: `node -c backend/src/controllers/system/auth.controller.js`
Expected: 0 errors.

- [ ] **Step 5: Commit**
```bash
git add backend/src/controllers/system/auth.controller.js
git commit -m "feat(backend): auto-reactivate account upon successful login"
```

---

### Task 3: Frontend API & Localization

**Files:**
- Modify: `src/services/api/userApi.ts:50-55, 125-140`
- Modify: `src/services/api/authApi.ts:37-48`
- Modify: `src/locales/vi.json:480-500, 595-625`
- Modify: `src/locales/en.json:480-500, 595-625`

**Interfaces:**
- Consumes: `requestJson` from `./apiClient`
- Produces: `deactivateAccount(payload: DeactivateAccountPayload): Promise<{ message: string }>`

- [ ] **Step 1: Add `DeactivateAccountPayload` and `deactivateAccount` in `userApi.ts`**
```typescript
export type DeactivateAccountPayload = {
  password: string
  reason?: string
}

export function deactivateAccount(payload: DeactivateAccountPayload) {
  return requestJson<{ message: string }>(
    '/users/me/deactivate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    i18n.t('api.error', { defaultValue: 'Không thể vô hiệu hoá tài khoản!' }),
  )
}
```

- [ ] **Step 2: Add `wasReactivated` to `AuthResponse` in `authApi.ts`**
```typescript
export type AuthResponse = {
  message: string
  user: AuthUser
  wasReactivated?: boolean
  requires2FA?: boolean
  tempToken?: string
  session?: {
    refreshToken: string
    expiresAt: string
  }
  verification?: VerificationState
}
```

- [ ] **Step 3: Add i18n keys to `vi.json` and `en.json`**
Add:
- `navDeactivate`: "Vô hiệu hóa tài khoản" / "Deactivate Account"
- `deactivateAccount`: "Vô hiệu hóa tài khoản tạm thời" / "Temporary Account Deactivation"
- `deactivateDesc`: "Tạm dừng tài khoản và ẩn hồ sơ của bạn. Toàn bộ tin nhắn và dữ liệu được bảo lưu nguyên vẹn, bạn có thể kích hoạt lại bất kỳ lúc nào bằng cách đăng nhập lại." / "Temporarily pause your account and hide your profile. All messages and data remain completely safe, and you can reactivate at any time by logging back in."
- `deactivateReason`: "Lý do tạm dừng (tùy chọn)" / "Reason for deactivation (optional)"
- `deactivateReasonPlaceholder`: "-- Chọn lý do tạm dừng --" / "-- Select a reason --"
- `deactivateReasonBreak`: "Tôi cần nghỉ ngơi một thời gian" / "Taking a break"
- `deactivateReasonNotNeeded`: "Tạm thời không có nhu cầu sử dụng" / "Not using the app right now"
- `deactivateReasonPrivacy`: "Lo ngại về quyền riêng tư" / "Privacy concerns"
- `deactivateReasonOther`: "Lý do khác" / "Other reason"
- `deactivateBtn`: "Vô hiệu hóa tài khoản" / "Deactivate Account"
- `deactivatingBtn`: "Đang vô hiệu hóa..." / "Deactivating..."
- `errDeactivatePwd`: "Vui lòng nhập mật khẩu hiện tại để xác nhận!" / "Please enter your current password to confirm!"
- `deactivateDialogTitle`: "Xác nhận vô hiệu hóa tài khoản" / "Confirm Account Deactivation"
- `deactivateDialogDesc`: "Bạn có chắc chắn muốn tạm dừng tài khoản này? Bạn sẽ bị đăng xuất khỏi tất cả thiết bị. Khi muốn quay lại, chỉ cần đăng nhập lại với email và mật khẩu của bạn." / "Are you sure you want to deactivate your account? You will be logged out of all devices. You can reactivate anytime simply by logging back in."
- `toastDeactivateSuccess`: "Tài khoản của bạn đã được vô hiệu hóa tạm thời." / "Your account has been temporarily deactivated."
- `accountReactivated`: "Chào mừng trở lại! Tài khoản của bạn đã được kích hoạt lại thành công." / "Welcome back! Your account has been successfully reactivated."

- [ ] **Step 4: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**
```bash
git add src/services/api/userApi.ts src/services/api/authApi.ts src/locales/vi.json src/locales/en.json
git commit -m "feat(frontend): add deactivateAccount API types and bilingual localization keys"
```

---

### Task 4: Frontend Controller & SettingsPage UI

**Files:**
- Modify: `src/hooks/views/useSettingsPageController.tsx`
- Modify: `src/components/views/SettingsPage.tsx`
- Modify: `src/components/views/ChatApp.tsx`
- Modify: `src/App.tsx`
- Modify: `src/style.css`

**Interfaces:**
- Consumes: `deactivateAccount` from `userApi`, `onAccountDeactivated` prop.
- Produces: Deactivation form state, confirmation dialog flow, `#deactivate-account` Card, warning badge and button styling.

- [ ] **Step 1: Update `useSettingsPageController.tsx`**
Add:
- Props: `onAccountDeactivated?: () => void`
- State:
  - `deactivateForm`: `{ password: '', reason: '' }`
  - `deactivateErrors`: `Record<string, string>`
  - `isDeactivatingAccount`: `boolean`
- Handlers:
  - `handleDeactivateFieldChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>)`
  - `handleDeactivateAccountSubmit(e: FormEvent<HTMLFormElement>)`
  - `deactivateCurrentAccount()` -> calls `deactivateAccount(deactivateForm)` then `onAccountDeactivated?.()`
- Return all state and handlers.

- [ ] **Step 2: Add styles for warning card and button in `src/style.css`**
Add:
- `.sp-card--warning`
- `.sp-card-icon--warning`
- `.sp-btn--warning`
- `.sp-nav-item--warning`

- [ ] **Step 3: Update `SettingsPage.tsx`**
- Add `onAccountDeactivated?: () => void` to `SettingsPageProps`.
- Add navigation item for `#deactivate-account` with `PauseCircle` icon above `#delete-account`.
- Add `Card` with `id="deactivate-account"`, `warningBorder`, `iconVariant="warning"`.
- Card body includes password input and reason select.
- Card footer includes `.sp-btn--warning` submit button.

- [ ] **Step 4: Pass `handleAccountDeactivated` in `App.tsx` and `ChatApp.tsx`**
In `App.tsx`:
- Implement `handleAccountDeactivated()`:
  ```typescript
  function handleAccountDeactivated() {
    clearStoredAuthSession()
    window.history.replaceState(null, '', toAuthPath('login'))
    setIsRouteKnown(true)
    setIsAuthenticated(false)
    setCurrentUser(null)
    setAuthScreen('login')
    pushToast(t('toastDeactivateSuccess'), 'info')
  }
  ```
- In `handleAuthSuccess()`, check if `response.wasReactivated` is true and show `t('accountReactivated')`.
- Pass `onAccountDeactivated={handleAccountDeactivated}` down through `ChatApp` to `SettingsPage`.

- [ ] **Step 5: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**
```bash
git add src/hooks/views/useSettingsPageController.tsx src/components/views/SettingsPage.tsx src/components/views/ChatApp.tsx src/App.tsx src/style.css
git commit -m "feat(settings): add temporary account deactivation UI card and handling flow"
```

---

### Task 5: End-to-End Verification & Production Build

**Files:**
- Entire workspace

- [ ] **Step 1: Run TypeScript check**
Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Run Vite production build**
Run: `npm run build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 3: Final verification and commit**
Review git status, ensure clean state and ready for deployment.
```bash
git status
```
