# Auth Language Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a quick language switcher (Toggle Pill `[VI | EN]`) on all authentication pages (`LoginPage`, `RegisterPage`, and `ForgotPasswordPage`), allowing users to switch languages before logging in.

**Architecture:** Create a reusable `AuthLanguageSwitcher` component with glassmorphism styling, integrate it into the top-right corner of the authentication shell layout, bind it to `i18n.changeLanguage` and `localStorage`, and verify across all auth pages.

**Tech Stack:** React 19, TypeScript, `react-i18next`, `lucide-react`, Vanilla CSS.

## Global Constraints

- Do not alter existing authentication flows, APIs, or form states.
- Support instant toggling between `vi` (Tiếng Việt) and `en` (English).
- Keep consistent glassmorphism styling matching the current auth theme.
- Ensure 0 TypeScript or bundling errors via `npm run build`.

---

### Task 1: Create `AuthLanguageSwitcher` Component

**Files:**
- Create: `src/components/auth/AuthLanguageSwitcher.tsx`

**Interfaces:**
- Produces: `<AuthLanguageSwitcher className?: string />`

- [ ] **Step 1: Write `src/components/auth/AuthLanguageSwitcher.tsx`**
Create component using `useTranslation()`, rendering Globe icon and two buttons (`VI`, `EN`). Active state determined by `i18n.language?.startsWith('vi') ? 'vi' : 'en'`.

---

### Task 2: Add CSS Styling for Language Switcher

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Append styles for `.auth-lang-switcher` in `src/style.css`**
Add styles for floating container (`top: 20px; right: 24px; position: absolute; z-index: 50;`), glassmorphism backdrop, pill buttons, active state teal highlight, and mobile responsive rules.

---

### Task 3: Mount `AuthLanguageSwitcher` in Auth Pages

**Files:**
- Modify: `src/pages/auth/LoginPage.tsx`
- Modify: `src/pages/auth/RegisterPage.tsx`
- Modify: `src/pages/auth/ForgotPasswordPage.tsx`

- [ ] **Step 1: Mount in `LoginPage.tsx`**
Import `AuthLanguageSwitcher` and render at the top of `.auth-shell`.
- [ ] **Step 2: Mount in `RegisterPage.tsx`**
Import `AuthLanguageSwitcher` and render at the top of `.auth-shell`.
- [ ] **Step 3: Mount in `ForgotPasswordPage.tsx`**
Import `AuthLanguageSwitcher` and render at the top of `.auth-shell`.

---

### Task 4: Verification, Build, Commit & Push

- [ ] **Step 1: Run `npm run build` to confirm 0 compilation errors**
- [ ] **Step 2: Commit all changes with conventional commit message**
- [ ] **Step 3: Push to `origin main` and notify the user**
