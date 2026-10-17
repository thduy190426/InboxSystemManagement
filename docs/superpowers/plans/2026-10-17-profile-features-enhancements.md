# Profile Page Features & Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 core features and fixes on the Profile page: (1) Friends tab navigation to view user profile instead of messaging, (2) Inline post editing for caption, privacy, and media removal, (3) Post image lightbox with carousel and download, and (4) 3-dots options menu on other users' profiles (Copy Link, Report Account modal, Block User).

**Architecture:** Extend `timelineApi` for post updates, introduce `PostMediaLightbox` and `ReportUserModal` components, enhance `ProfileHeader` with a clean dropdown menu, fix `FriendsTab` navigation callback wiring through `ChatApp`, and provide complete bilingual i18n support.

**Tech Stack:** React 19, TypeScript, `lucide-react`, `react-i18next`, CSS tokens.

## Global Constraints

- Retain existing design tokens, CSS styling, and responsive layout without breaking changes.
- Provide bilingual Vietnamese and English text via `t(key, { defaultValue: '...' })`.
- Verify TypeScript compilation without errors with `npm run build`.

---

### Task 1: Add Post Update API to `timelineApi.ts`

**Files:**
- Modify: `src/services/api/timelineApi.ts`

**Interfaces:**
- Produces: `timelineApi.updatePost(postId: string, userId: string, updates: { content?: string; privacy?: PostPrivacy; mediaUrls?: string[] }): Promise<TimelinePost>`

- [ ] **Step 1: Add `updatePost` method to `timelineApi`**
Update `src/services/api/timelineApi.ts` to implement `updatePost`. Finds the post by `id` and ensures `userId` matches, modifies the specified fields, writes back to `localStorage`, and returns the updated post.

---

### Task 2: Fix Friends Tab Navigation & Wire `onViewUserProfile` in `ProfilePage` and `ChatApp`

**Files:**
- Modify: `src/components/views/ProfilePage.tsx`
- Modify: `src/components/views/ChatApp.tsx`
- Modify: `src/components/profile/FriendsTab.tsx`

**Interfaces:**
- Consumes: `ctrl.setProfileContactToOpen` from `useChatAppController`
- Produces: `onViewUserProfile?: (user: ContactUser) => void` in `ProfilePageProps`

- [ ] **Step 1: Add `onViewUserProfile` prop to `ProfilePageProps`**
- [ ] **Step 2: Update `FriendsTab` usage in `ProfilePage.tsx`**
In `ProfilePage.tsx`, pass `onViewFriendProfile={(friend) => onViewUserProfile?.(friend)}`.
- [ ] **Step 3: Update `ChatApp.tsx`**
Pass `onViewUserProfile={(user) => ctrl.setProfileContactToOpen(user as ContactUser)}` to `<ProfilePage />`.
- [ ] **Step 4: Verify `FriendsTab.tsx` click behavior**
Ensure clicking `friend-card-left` or the `UserIcon` button triggers `onViewFriendProfile`, while the `MessageCircle` button still triggers `onSendMessage`.

---

### Task 3: Build `PostMediaLightbox` & Integrate with `TimelineTab`

**Files:**
- Create: `src/components/profile/PostMediaLightbox.tsx`
- Modify: `src/components/profile/TimelineTab.tsx`

**Interfaces:**
- Produces: `<PostMediaLightbox images={string[]} initialIndex={number} onClose={() => void} />`

- [ ] **Step 1: Create `src/components/profile/PostMediaLightbox.tsx`**
Includes full-screen backdrop, close button, prev/next buttons (when > 1 image), index indicator (`${current + 1} / ${total}`), download action, and keyboard listener for ESC, ArrowLeft, ArrowRight.
- [ ] **Step 2: Connect image click in `TimelineTab.tsx`**
Add state `lightboxState: { isOpen: boolean; images: string[]; initialIndex: number } | null` in `TimelineTab.tsx`. Clicking any image in `post.mediaUrls` opens the lightbox at that index.

---

### Task 4: Implement Inline Post Editing in `TimelineTab`

**Files:**
- Modify: `src/components/profile/TimelineTab.tsx`
- Modify: `src/components/views/ProfilePage.tsx`

**Interfaces:**
- Consumes: `timelineApi.updatePost`
- Produces: `onUpdatePost: (postId: string, updates: { content: string; privacy: PostPrivacy; mediaUrls: string[] }) => Promise<void>`

- [ ] **Step 1: Add `onUpdatePost` to `TimelineTabProps`**
- [ ] **Step 2: Add inline editing UI in `TimelineTab.tsx`**
Add an edit button (icon `Edit3`) in `post-header-row` for post authors. When clicked, render an inline editor form replacing the post text & media, with caption textarea, privacy select, media chips with remove buttons, Save button, and Cancel button.
- [ ] **Step 3: Wire `handleUpdatePost` in `ProfilePage.tsx`**
Calls `timelineApi.updatePost`, updates the local posts state, and shows a localized toast.

---

### Task 5: Build `ReportUserModal` & 3-Dots Options Menu in `ProfileHeader`

**Files:**
- Create: `src/components/profile/ReportUserModal.tsx`
- Modify: `src/components/profile/ProfileHeader.tsx`
- Modify: `src/components/views/ProfilePage.tsx`

**Interfaces:**
- Consumes: `contactApi.blockContact`
- Produces: `<ReportUserModal targetUser={user} isOpen={boolean} onClose={() => void} onSubmit={(reason, notes) => void} />`
- Produces: 3-dots dropdown in `ProfileHeader` with Copy Link, Report, and Block.

- [ ] **Step 1: Create `src/components/profile/ReportUserModal.tsx`**
Radio buttons for reasons (`spam`, `harassment`, `impersonation`, `inappropriate`, `other`), optional notes textarea, Submit and Cancel buttons.
- [ ] **Step 2: Add 3-dots dropdown menu to `ProfileHeader.tsx`**
Render a `MoreVertical` button in `profile-actions-toolbar` for `!isOwnProfile`. Dropdown includes Copy Profile Link, Report Account, and Block User.
- [ ] **Step 3: Implement handlers in `ProfilePage.tsx`**
  - Copy Link: copies URL / handle to clipboard and shows toast.
  - Report: opens `ReportUserModal`, on submit shows toast.
  - Block: confirms with dialog, calls `blockContact(targetUser.id)`, updates `friendshipStatus = 'blocked'`, and shows toast.

---

### Task 6: Localization (i18n) & CSS Styling

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/vi.json`
- Modify: `src/style.css`

- [ ] **Step 1: Add all new translation keys to `en.json` and `vi.json` under `profile` namespace**
- [ ] **Step 2: Add CSS rules in `src/style.css` for Lightbox, Inline Post Editor, 3-dots menu dropdown, and Report modal**

---

### Task 7: Comprehensive Verification, Build, Commit & Push

- [ ] **Step 1: Run `npm run build` and ensure 0 TypeScript or bundling errors**
- [ ] **Step 2: Verify git diff and ensure clean code style**
- [ ] **Step 3: Commit all changes with descriptive commit message**
- [ ] **Step 4: Push to `origin main` and notify the user**
