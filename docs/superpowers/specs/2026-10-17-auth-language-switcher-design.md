# Auth Pages Quick Language Switcher Design Document

**Date:** 2026-10-17  
**Status:** Approved  
**Author:** Antigravity AI  
**Scope:** `src/components/auth/AuthLanguageSwitcher.tsx`, `src/pages/auth/*`, `src/style.css`

---

## 1. Overview & Goals

The authentication pages (`LoginPage`, `RegisterPage`, and `ForgotPasswordPage`) currently lack an instant language switcher, requiring users to log in before they can change the language in Settings.

This specification details a reusable, lightweight, accessible, and aesthetically pleasing **Language Switcher** component (`AuthLanguageSwitcher`) placed at the top-right corner of the authentication viewport, enabling single-click toggling between Vietnamese (`vi`) and English (`en`) with real-time UI re-rendering and persistent local storage.

---

## 2. Architecture & Component Structure

### 2.1 File Organization & Changes

- `src/components/auth/AuthLanguageSwitcher.tsx` (New Component):
  - Encapsulates the Globe icon and segmented toggle pill (`VI` | `EN`).
  - Directly interfaces with `useTranslation()` from `react-i18next`.
  - Persists preference via `localStorage.setItem('language', targetLang)`.
- `src/pages/auth/LoginPage.tsx`:
  - Mount `<AuthLanguageSwitcher />` inside `.auth-shell`.
- `src/pages/auth/RegisterPage.tsx`:
  - Mount `<AuthLanguageSwitcher />` inside `.auth-shell`.
- `src/pages/auth/ForgotPasswordPage.tsx`:
  - Mount `<AuthLanguageSwitcher />` inside `.auth-shell`.
- `src/style.css`:
  - Styles for `.auth-lang-switcher`, `.auth-lang-pill`, `.auth-lang-btn`, and active/hover states with glassmorphism.

---

## 3. Component Details & UX Design

### 3.1 Layout & Visual Design
- **Positioning:** Fixed/absolute at `top: 20px; right: 24px; z-index: 50;`.
- **Styling:**
  - Glassmorphic container with `backdrop-filter: blur(14px); background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 9999px; padding: 4px 6px;`.
  - Left icon: `Globe` (size 15px, color `#94a3b8`).
  - Segmented Buttons:
    - `VI` and `EN` buttons with `border-radius: 9999px; padding: 4px 10px; font-size: 12px; font-weight: 700; cursor: pointer;`.
    - Active segment: `background: #14b8a6; color: #ffffff; box-shadow: 0 2px 8px rgba(20, 184, 166, 0.4);`.
    - Inactive segment: `color: #cbd5e1; background: transparent;`. On hover: `color: #ffffff; background: rgba(255, 255, 255, 0.08);`.
  - Responsive: on mobile screens (`max-width: 640px`), scales padding and positions at `top: 14px; right: 14px;`.

### 3.2 State & Persistence
- Current language is determined from `i18n.language?.startsWith('vi') ? 'vi' : 'en'`.
- On click:
  - If target language is already active, no-op.
  - Otherwise, call `i18n.changeLanguage(lang)` and `localStorage.setItem('language', lang)`.
  - React components re-render immediately with the new language.

---

## 4. Verification & Testing Strategy

1. **Visual Testing:** Open `LoginPage`, `RegisterPage`, and `ForgotPasswordPage`. Verify that the toggle pill is displayed cleanly at the top-right without overlapping cards or buttons.
2. **Toggle Behavior:** Click `EN` on `LoginPage`; verify all form labels, buttons, and placeholders change to English instantly. Click `VI`; verify they change back to Vietnamese.
3. **Persistence:** Toggle to `EN`, refresh the page; verify English remains active. Navigate between Login and Register; verify language choice is preserved.
4. **Build Verification:** Run `npm run build` to confirm 0 TypeScript or bundling errors.
