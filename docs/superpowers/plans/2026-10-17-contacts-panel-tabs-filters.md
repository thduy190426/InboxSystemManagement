# Contacts Panel Tabs, Filters, and Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the "View Full Profile" button in `ContactProfile` to navigate to `ProfilePage.tsx`, convert `ContactsPanel.tsx` into a modern 3-tab layout, and add status filtering (All / Online / Recent) and alphabetical sorting (A-Z / Z-A).

**Architecture:** Connect `onViewFullProfile` callback from `ChatApp.tsx` through `ContactsPanel.tsx` into `ContactProfile`, restructure sections into distinct tabs (`friends`, `requests`, `suggestions`), and introduce a filter/sort toolbar with responsive CSS.

**Tech Stack:** React 19, TypeScript, `react-i18next`, `lucide-react`, Vanilla CSS.

## Global Constraints

- Retain existing friend request, unfriend, and message actions without breaking changes.
- Provide bilingual Vietnamese and English text via `t(key, { defaultValue: '...' })`.
- Ensure 0 TypeScript or bundling errors via `npm run build`.

---

### Task 1: Fix Full Profile Navigation in `ChatApp.tsx` and `ContactsPanel.tsx`

**Files:**
- Modify: `src/components/panels/ContactsPanel.tsx`
- Modify: `src/components/views/ChatApp.tsx`

**Interfaces:**
- Produces: `onViewFullProfile?: (user: ContactUser) => void` in `ContactsPanelProps`

- [ ] **Step 1: Add `onViewFullProfile` to `ContactsPanelProps` and pass to `<ContactProfile />`**
- [ ] **Step 2: Connect `onViewFullProfile` in `ChatApp.tsx`**
For both `<ContactsPanel />` and `<ContactProfile />` in `ChatApp.tsx`, implement:
```tsx
onViewFullProfile={(user) => {
  ctrl.setProfileContactToOpen(user)
  ctrl.setActiveView('profile')
}}
```

---

### Task 2: Implement Tabs Architecture in `ContactsPanel.tsx`

**Files:**
- Modify: `src/components/panels/ContactsPanel.tsx`

- [ ] **Step 1: Add `activeTab` state and Tab switching header**
Tabs: `'friends' | 'requests' | 'suggestions'`.
Badges: total friends, requests count (`requests.length`), suggestions count.
- [ ] **Step 2: Render active tab content**
Render only the active tab's list, with global search results shown when a global search is triggered.

---

### Task 3: Implement Filter & Sort Toolbar

**Files:**
- Modify: `src/components/panels/ContactsPanel.tsx`

- [ ] **Step 1: Add `statusFilter` and `sortOrder` states**
Status: `'all' | 'online' | 'recent'`.
Sort: `'default' | 'az' | 'za'`.
- [ ] **Step 2: Compute filtered and sorted friends**
Apply query search, presence filter (`online` / `recent`), and alphabetical sorting.
- [ ] **Step 3: Render toolbar**
Search input, filter chips (`Tất cả`, `Đang online`, `Hoạt động gần đây`), and sort dropdown (`Mặc định`, `Tên A → Z`, `Tên Z → A`).

---

### Task 4: Localization (i18n) & CSS Styling

**Files:**
- Modify: `src/locales/vi.json`
- Modify: `src/locales/en.json`
- Modify: `src/style.css`

- [ ] **Step 1: Add translation keys for tabs, filters, and sort options**
- [ ] **Step 2: Add CSS rules for tabs, badges, toolbar, chips, and sort controls**

---

### Task 5: Build Verification, Commit & Push

- [ ] **Step 1: Run `npm run build` and ensure 0 TypeScript or bundling errors**
- [ ] **Step 2: Commit all changes with descriptive commit message**
- [ ] **Step 3: Push to `origin main` and notify the user**
