# Contacts Panel Tabs, Filters, and Navigation Fix Design Document

**Date:** 2026-10-17  
**Status:** Approved  
**Author:** Antigravity AI  
**Scope:** `src/components/panels/ContactsPanel.tsx`, `src/components/views/ChatApp.tsx`, `src/style.css`, `src/locales/*`

---

## 1. Overview & Goals

The Contacts view (`ContactsPanel.tsx`) currently renders all contacts sections (Friends, Suggestions, Search Results, Friend Requests) in a single long scrollable page. Additionally, in the quick contact profile popup (`ContactProfile`), the "View Full Profile" button does not navigate to `ProfilePage.tsx` because its callback was not wired. Finally, users lack filters for online status and alphabetical name sorting.

This specification addresses these issues with:
1. **Full Profile Navigation Fix:** Passing `onViewFullProfile` from `ChatApp.tsx` through `ContactsPanel.tsx` to `ContactProfile`, enabling one-click transition to `ProfilePage`.
2. **Tabbed Layout:** Dividing the panel into 3 dedicated tabs:
   - **Tất cả bạn bè** (Friends list with total count badge)
   - **Lời mời kết bạn** (Friend requests with pending count badge)
   - **Gợi ý** (Friend suggestions with count badge)
   - Global Search results displayed dynamically when searching or requested.
3. **Status Filter & Sorting Toolbar:**
   - Filter chips: `Tất cả` (`all`), `Đang online` (`online`), `Hoạt động gần đây` (`away` / `busy` / `recent`).
   - Sort dropdown: `Mặc định` (`default`), `Tên A → Z` (`az`), `Tên Z → A` (`za`).
   - Search bar filtering the active tab instantly, with option to search global users.

---

## 2. Architecture & Component Structure

### 2.1 File Changes
- `src/components/panels/ContactsPanel.tsx`:
  - Add `onViewFullProfile?: (user: ContactUser) => void` to `ContactsPanelProps`.
  - Pass `onViewFullProfile` into `<ContactProfile />`.
  - Add state `activeTab: 'friends' | 'requests' | 'suggestions'`.
  - Add state `statusFilter: 'all' | 'online' | 'recent'`.
  - Add state `sortOrder: 'default' | 'az' | 'za'`.
  - Implement client-side filtering and sorting for the friends and suggestions lists.
  - Render Tab Header bar, Filter/Sort toolbar, and tab contents.
- `src/components/views/ChatApp.tsx`:
  - Pass `onViewFullProfile={(user) => { ctrl.setProfileContactToOpen(user); ctrl.setActiveView('profile'); }}` to `<ContactsPanel />`.
  - Pass `onViewFullProfile` to the floating `<ContactProfile />` popup.
- `src/style.css`:
  - Styles for `.cp-tabs-bar`, `.cp-tab-btn`, `.cp-tab-badge`, `.cp-toolbar`, `.cp-filter-chips`, `.cp-filter-chip`, `.cp-sort-select`.
- `src/locales/vi.json` & `src/locales/en.json`:
  - Add translation keys for tabs, filters, and sorting options under `panels` namespace.

---

## 3. Data Flow & Filter Logic

### 3.1 Profile Navigation
```
[User clicks "Xem trang cá nhân đầy đủ" in ContactProfile]
   ↓
onViewFullProfile(user)
   ↓
ChatApp:
  ctrl.setProfileContactToOpen(user)
  ctrl.setActiveView('profile')
   ↓
App renders ProfilePage for target user
```

### 3.2 Filtering & Sorting Pipeline (Friends Tab)
```
rawFriends
   ↓ (Query filter)
Filter by fullName, handle, email (case-insensitive)
   ↓ (Presence filter)
'all': keep all
'online': friend.presence === 'online'
'recent': ['online', 'away', 'busy'].includes(friend.presence)
   ↓ (Sort order)
'default': original order
'az': localeCompare on friend.fullName (ascending)
'za': localeCompare on friend.fullName (descending)
   ↓
displayedFriends
```

---

## 4. Verification & Testing Strategy

1. **Navigation:** Open quick contact profile on Contacts or Chat, click "Xem trang cá nhân đầy đủ". Verify the app transitions to `ProfilePage.tsx` with that contact's profile loaded.
2. **Tabs:** Switch between "Tất cả bạn bè", "Lời mời kết bạn", and "Gợi ý". Verify each tab displays its own section and badges accurately.
3. **Filtering:** In "Tất cả bạn bè", select "Đang online"; verify only online contacts appear. Select "Tất cả"; verify full list returns.
4. **Sorting:** Select "Tên A → Z"; verify contacts are ordered alphabetically. Select "Tên Z → A"; verify reverse alphabetical order.
5. **Build:** Run `npm run build` to confirm 0 TypeScript or bundling errors.
