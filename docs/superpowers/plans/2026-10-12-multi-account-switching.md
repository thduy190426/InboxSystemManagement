# Multi-Account Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement quick profile & account switching (Multi-Account Switching) inspired by Messenger, allowing users to save multiple logged-in accounts on a device, switch between them in 1 click, and easily add or remove accounts.

**Architecture:** Client-side multi-session management storing a list of `SavedAccount` records in `localStorage`. Active session swaps update current token and socket connection while preserving all saved accounts. Login screen renders a recent account selector for 1-click access.

**Tech Stack:** React 19, TypeScript, Tailwind/Vanilla CSS, Lucide Icons, i18next, Socket.io client.

## Global Constraints
- Preserve existing JWT & Refresh token lifecycle without backend schema changes.
- Ensure socket disconnection & reconnection on account swap to prevent room leakage.
- Maintain full localization in both Vietnamese (`vi.json`) and English (`en.json`).
- Ensure dark/light mode compatibility and zero regressions in `npm run build`.

---

### Task 1: Extend Auth Storage for Multi-Account Sessions

**Files:**
- Modify: `src/services/storage/authStorage.ts`
- Modify: `src/locales/vi.json`
- Modify: `src/locales/en.json`

**Interfaces:**
- Produces:
  - `export type SavedAccount`
  - `export function getSavedAccounts(): SavedAccount[]`
  - `export function saveAccountSession(user: AuthUser, session?: { refreshToken: string; expiresAt: string }): void`
  - `export function removeSavedAccount(accountId: string | number): void`
  - `export function switchActiveAccount(accountId: string | number): SavedAccount | null`

- [x] **Step 1: Define SavedAccount type and helpers in `authStorage.ts`**
Add `SAVED_ACCOUNTS_KEY = 'saved_accounts'`, `getSavedAccounts`, `saveAccountSession`, `removeSavedAccount`, `switchActiveAccount`. Update `storeAuthSession` to automatically save the account to the saved accounts list. Ensure `clearStoredAuthSession` clears active session without deleting the saved accounts list.

- [x] **Step 2: Add localization strings for account switcher in `vi.json` and `en.json`**
Add keys for `accountSwitcher`, `switchAccount`, `addAccount`, `manageAccounts`, `removeAccount`, `removeAccountConfirm`, `currentAccount`, `recentAccounts`, `loginWithAnotherAccount`, `switchedAccountSuccess`.

- [x] **Step 3: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [x] **Step 4: Commit Task 1**
```bash
git add src/services/storage/authStorage.ts src/locales/vi.json src/locales/en.json
git commit -m "feat(auth): add multi-account storage and localization strings"
```

---

### Task 2: Build AccountSwitcherMenu & Dropdown Component

**Files:**
- Create: `src/components/auth/AccountSwitcherMenu.tsx`
- Modify: `src/components/layout/NavRail.tsx`

**Interfaces:**
- Consumes: `getSavedAccounts`, `removeSavedAccount`, `switchActiveAccount` from `authStorage.ts`
- Produces: `<AccountSwitcherMenu />` component used in `NavRail.tsx` and `SettingsPage.tsx`

- [x] **Step 1: Create `src/components/auth/AccountSwitcherMenu.tsx`**
Implement dropdown/popover showing:
1. Current account banner with active indicator.
2. List of other saved accounts with avatar, name, and 1-click switch button.
3. Remove account button (`X`) per account with confirmation.
4. "+ Thêm tài khoản khác" button triggering `onAddAccount`.
5. "Xem trang cá nhân" button triggering navigation to profile.

- [x] **Step 2: Integrate `AccountSwitcherMenu` into `NavRail.tsx`**
Update avatar button in `NavRail.tsx` so clicking toggles the `AccountSwitcherMenu` popover cleanly with outside click dismiss.

- [x] **Step 3: Verify component rendering and compilation**
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [x] **Step 4: Commit Task 2**
```bash
git add src/components/auth/AccountSwitcherMenu.tsx src/components/layout/NavRail.tsx
git commit -m "feat(ui): add AccountSwitcherMenu component and hook into NavRail"
```

---

### Task 3: Support Account Switching in App Root & Socket Lifecycle

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/hooks/chat/useChatAppController.ts`
- Modify: `src/components/views/ChatApp.tsx`

**Interfaces:**
- Consumes: `switchActiveAccount` from `authStorage.ts`
- Produces: `handleSwitchAccount`, `handleAddAccount` handlers in `App.tsx`

- [x] **Step 1: Implement `handleSwitchAccount` and `handleAddAccount` in `App.tsx`**
1. `handleSwitchAccount(accountId)`:
   - Call `switchActiveAccount(accountId)`.
   - Update `currentUser` state.
   - Disconnect old socket and reset chat state.
   - Toast success: `t('switchedAccountSuccess', { name: account.fullName })`.
2. `handleAddAccount()`:
   - Clear active session keys while leaving `saved_accounts` intact.
   - Redirect to `/login` with `isAddingAccount` state.

- [x] **Step 2: Pass handlers through `ChatApp.tsx` down to `NavRail` and `SettingsPage`**
Ensure `onSwitchAccount` and `onAddAccount` are wired through `ChatApp` props.

- [x] **Step 3: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [x] **Step 4: Commit Task 3**
```bash
git add src/App.tsx src/hooks/chat/useChatAppController.ts src/components/views/ChatApp.tsx
git commit -m "feat(core): wire account switching and socket reset in App lifecycle"
```

---

### Task 4: Add Messenger-style Recent Accounts View on LoginPage

**Files:**
- Modify: `src/components/views/LoginPage.tsx`
- Modify: `src/hooks/views/useLoginPageController.ts` (if exists or `LoginPage.tsx`)

**Interfaces:**
- Consumes: `getSavedAccounts`, `removeSavedAccount` from `authStorage.ts`

- [x] **Step 1: Render Saved Accounts Cards on `LoginPage.tsx`**
When `savedAccounts.length > 0`:
1. Render a clean grid of saved accounts cards with avatars and names.
2. Clicking an account card triggers instant login if token is valid, or pre-fills email + shows avatar banner if password re-entry is required.
3. Card "+ Đăng nhập bằng tài khoản khác" toggles the standard login form.
4. Each card has a subtle `X` button in top corner to remove the account from the device.

- [x] **Step 2: Add quick account switcher section into `SettingsPage.tsx`**
Embed the account list in `SettingsPage.tsx` under the Account section so users can also switch or manage accounts from settings.

- [x] **Step 3: Test build**
Run: `npm run build`
Expected: PASS with 0 errors.

- [x] **Step 4: Commit Task 4**
```bash
git add src/components/views/LoginPage.tsx src/components/views/SettingsPage.tsx
git commit -m "feat(login): add Messenger-style recent accounts selector on login page"
```

---

### Task 5: Testing, Validation & Verification

- [x] **Step 1: Run production build verification**
Run: `npm run build`
Expected: Clean bundle build with 0 TypeScript/Vite errors.

- [x] **Step 2: Manual walkthrough check**
1. Check storage methods with mock accounts in browser console.
2. Verify switching account correctly updates `currentUser` and re-renders components.
3. Verify adding another account keeps previous accounts saved.
4. Verify removing an account removes it from storage.
