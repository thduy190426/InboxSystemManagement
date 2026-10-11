# Mutual Friends (Bạn Chung) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full-stack Mutual Friends functionality (Facebook/Messenger style) with batch calculation in suggestions, search, and requests, interactive avatar stack badge (`<MutualFriendsBadge />`), full details modal (`<MutualFriendsModal />`), and realtime cache updates.

**Architecture:** A centralized SQL-indexed batch query utility in the backend enriches user cards in a single query (zero N+1 requests); a dedicated endpoint serves complete mutual friend lists on modal open; a lightweight client cache with WebSocket invalidation provides instant rendering across Desktop & Mobile.

**Tech Stack:** Node.js, Express, MySQL 8, Socket.IO, React 19, TypeScript, Vanilla CSS Tokens, i18next.

---

## Global Constraints
- Zero N+1 HTTP calls from Frontend when loading user lists.
- Full type-safety in `types.ts` with no `any` leaks.
- Consistent bilingual translations in `src/locales/vi.json` and `src/locales/en.json`.
- Strict responsive styling compatible with Dark/Light theme variables.

---

### Task 1: Backend Database Queries & Utilities for Mutual Friends Calculation

**Files:**
- Create: `backend/src/utils/mutualFriends.util.js`
- Test: `backend/tests/verify_mutual_friends_db.js`

**Interfaces:**
- Produces:
  - `attachMutualFriendsSummary(currentUserId: number, userRows: Array): Promise<Array>`
  - `getMutualFriendsList(currentUserId: number, targetUserId: number): Promise<Array>`

- [ ] **Step 1: Write test script for mutual friends DB utility**
Create `backend/tests/verify_mutual_friends_db.js` to test queries on edge cases (same user, 0 mutual friends, multiple mutual friends).

- [ ] **Step 2: Run test script to verify it fails**
Run: `node backend/tests/verify_mutual_friends_db.js`
Expected: FAIL ("Cannot find module '../src/utils/mutualFriends.util'")

- [ ] **Step 3: Implement `backend/src/utils/mutualFriends.util.js`**
Write batch query using indexed `contacts` join to calculate `mutualCount` and `mutualPreviews` (up to 3 items).

- [ ] **Step 4: Run test script to verify it passes**
Run: `node backend/tests/verify_mutual_friends_db.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/src/utils/mutualFriends.util.js backend/tests/verify_mutual_friends_db.js
git commit -m "feat(backend): add mutual friends calculation utility and DB tests"
```

---

### Task 2: Backend API Endpoints & Controller Integrations

**Files:**
- Modify: `backend/src/controllers/core/contact.controller.js`
- Modify: `backend/src/routes/core/contact.routes.js`
- Modify: `backend/src/controllers/core/story.controller.js`

**Interfaces:**
- Produces:
  - `GET /contacts/:userId/mutual-friends` -> `{ totalCount: number, mutualFriends: Array }`
  - Enriched `mutualCount` & `mutualPreviews` in `/contacts/suggestions`, `/contacts/search`, `/contacts/requests`

- [ ] **Step 1: Add `listMutualFriends` controller and route**
Add `listMutualFriends` in `contact.controller.js` and register `router.get('/:userId/mutual-friends', listMutualFriends)` in `contact.routes.js`.

- [ ] **Step 2: Integrate `attachMutualFriendsSummary` into `listSuggestions`, `searchUsers`, `listIncomingRequests`**
Call `await attachMutualFriendsSummary(currentUserId, rows)` before mapping and returning response.

- [ ] **Step 3: Integrate `attachMutualFriendsSummary` into `getStoryViewers` in `story.controller.js`**
Enrich story viewers with mutual friend metrics.

- [ ] **Step 4: Verify endpoints with integration script**
Run: `node backend/tests/verify_mutual_friends_api.js`
Expected: HTTP 200 responses with valid `mutualCount` and `mutualPreviews` fields.

- [ ] **Step 5: Commit**
```bash
git add backend/src/controllers/core/contact.controller.js backend/src/routes/core/contact.routes.js backend/src/controllers/core/story.controller.js
git commit -m "feat(backend): expose mutual friends endpoint and enrich suggestions/search/story"
```

---

### Task 3: Frontend Data Types, API Client & i18n Locales

**Files:**
- Modify: `src/types.ts`
- Modify: `src/services/api/contactApi.ts`
- Modify: `src/locales/vi.json`
- Modify: `src/locales/en.json`

**Interfaces:**
- Produces:
  - `MutualFriendPreview`: `{ id: string; userId?: number; fullName: string; avatarUrl?: string | null; handle?: string | null }`
  - `MutualFriendDetail`: Extends `MutualFriendPreview` with `presence`, `statusMessage`, `createdAt`
  - `fetchMutualFriends(userId: string): Promise<{ totalCount: number; mutualFriends: MutualFriendDetail[] }>`

- [ ] **Step 1: Extend `types.ts`**
Add `mutualCount?: number` and `mutualPreviews?: MutualFriendPreview[]` to `ContactUser` and related types.

- [ ] **Step 2: Add `fetchMutualFriends` in `contactApi.ts`**
Export `fetchMutualFriends(userId: string)`.

- [ ] **Step 3: Add localization strings in `vi.json` and `en.json`**
Add `mutualFriends` namespace with pluralization keys.

- [ ] **Step 4: Commit**
```bash
git add src/types.ts src/services/api/contactApi.ts src/locales/vi.json src/locales/en.json
git commit -m "feat(types/i18n): add mutual friends type definitions and bilingual translations"
```

---

### Task 4: Frontend UI Components: `<MutualFriendsBadge />` & `<MutualFriendsModal />`

**Files:**
- Create: `src/components/ui/MutualFriendsBadge.tsx`
- Create: `src/components/ui/MutualFriendsModal.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Produces:
  - `<MutualFriendsBadge user={user} onOpenModal={(userId, name) => ...} />`
  - `<MutualFriendsModal targetUserId={id} targetName={name} onClose={() => ...} onMessage={...} onProfile={...} />`

- [ ] **Step 1: Implement `<MutualFriendsBadge />`**
Render 2–3 overlapping circular avatars with negative left margins and a clickable text counter with hover effects.

- [ ] **Step 2: Implement `<MutualFriendsModal />`**
Render accessible dialog with title, live search input, mutual friend cards, and action buttons ("Nhắn tin", "Xem hồ sơ").

- [ ] **Step 3: Add CSS styles in `src/index.css`**
Add styles for `.mf-badge`, `.mf-avatar-stack`, `.mf-modal`, and dark/light mode tokens.

- [ ] **Step 4: Commit**
```bash
git add src/components/ui/MutualFriendsBadge.tsx src/components/ui/MutualFriendsModal.tsx src/index.css
git commit -m "feat(ui): implement MutualFriendsBadge and MutualFriendsModal components"
```

---

### Task 5: Integration in `ContactsPanel.tsx` & `StoryViewerDrawer.tsx`

**Files:**
- Modify: `src/components/panels/ContactsPanel.tsx`
- Modify: `src/components/story/StoryViewerDrawer.tsx`

- [ ] **Step 1: Integrate badge into `ContactCard` in `ContactsPanel.tsx`**
Display `<MutualFriendsBadge />` under name/status in Suggestions, Search, and Requests.

- [ ] **Step 2: Integrate badge into `ContactProfile` popup dialog**
Render a dedicated mutual friends section in contact profile popup.

- [ ] **Step 3: Add modal state in `ContactsPanel.tsx`**
Manage `mutualModalUser` state to open `<MutualFriendsModal />` and handle Message / Profile transitions.

- [ ] **Step 4: Integrate badge into `StoryViewerDrawer.tsx`**
Render compact mutual friends badge for story viewers who have mutual connections.

- [ ] **Step 5: Commit**
```bash
git add src/components/panels/ContactsPanel.tsx src/components/story/StoryViewerDrawer.tsx
git commit -m "feat(views): integrate mutual friends badge into ContactsPanel and StoryViewerDrawer"
```

---

### Task 6: Realtime Invalidation, Verification & Production Build

**Files:**
- Modify: `src/components/panels/ContactsPanel.tsx`
- Test: Full build check

- [ ] **Step 1: Verify socket `contacts:changed` refreshes directory**
Ensure acceptance or cancellation of friend requests re-queries suggestions and search results so mutual friend counts update dynamically.

- [ ] **Step 2: Run `npm run build`**
Verify zero TypeScript compiler errors and successful bundle creation.

- [ ] **Step 3: Commit and push**
```bash
git add -A
git commit -m "feat(contacts): complete mutual friends end-to-end integration and realtime sync"
git push origin main
```
