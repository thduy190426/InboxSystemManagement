# Design Specification: Mutual Friends Feature (Bạn Chung)

- **Date:** 2026-10-12
- **Topic:** Mutual Friends (Hiển thị bạn chung tương tự Facebook/Messenger)
- **Status:** Approved for Implementation

---

## 1. Executive Summary & Goals

### 1.1 Objective
Enhance platform trust, social connectivity, and profile authenticity by displaying mutual friends ("Bạn chung") across user touchpoints:
1. **Contacts Panel (`ContactsPanel.tsx`):**
   - Friend suggestions list (`suggestions`)
   - Global user search results (`search`)
   - Incoming friend requests (`requests`)
   - Detailed contact profile popup (`ContactProfile`)
2. **Story Viewer (`StoryViewerDrawer.tsx`):**
   - Story viewer & reaction lists
3. **Dedicated Interactive Modal (`MutualFriendsModal.tsx`):**
   - Clicking on the mutual friends badge opens a responsive modal showing the full roster of mutual friends with direct message & profile shortcuts.

### 1.2 UX Principles
- **Avatar Stack:** Render 2–3 overlapping circular micro-avatars with crisp borders and clean shadow.
- **Accompanying Counter Text:** E.g., *"3 bạn chung"* / *"3 mutual friends"*, localized via i18n.
- **No Layout Shift:** Fallback gracefully to nothing if mutual friend count is 0.
- **High Performance:** Batch database calculation for list queries (zero N+1 HTTP calls from client) combined with short-lived client caching.
- **Real-Time Consistency:** Instant cache invalidation and UI re-fetch when friend relationships change (`contacts:changed` Socket.IO events).

---

## 2. Architecture & Data Flow

### 2.1 Mutual Friends Definition in MySQL
In this platform, a friendship between User A and User B exists when:
- `contacts` has an entry with `owner_user_id = A AND contact_user_id = B AND status = 'accepted'` (and reciprocal entry `owner_user_id = B AND contact_user_id = A AND status = 'accepted'`).

A user $M$ is a mutual friend between Current User $U_{me}$ and Target User $U_{target}$ if and only if:
1. $M \neq U_{me}$ and $M \neq U_{target}$
2. $U_{me}$ is friends with $M$: `c_me.owner_user_id = U_me AND c_me.contact_user_id = M AND c_me.status = 'accepted'`
3. $U_{target}$ is friends with $M$: `c_target.owner_user_id = U_target AND c_target.contact_user_id = M AND c_target.status = 'accepted'`
4. $M$ is an active, non-deleted user (`users.deleted_at IS NULL AND users.is_active = 1`).

### 2.2 Backend Batch Query Strategy
To avoid N+1 queries when returning a list of $K$ target users, a helper utility `attachMutualFriendsSummary(currentUserId, userRows)` runs a single indexed query:

```sql
SELECT 
  c_target.owner_user_id AS target_user_id,
  m.id AS mutual_friend_id,
  m.public_id,
  m.full_name,
  m.avatar_url,
  m.handle
FROM contacts c_target
INNER JOIN contacts c_me 
  ON c_me.owner_user_id = ? 
  AND c_me.contact_user_id = c_target.contact_user_id 
  AND c_me.status = 'accepted'
INNER JOIN users m 
  ON m.id = c_target.contact_user_id 
  AND m.deleted_at IS NULL 
  AND m.is_active = 1
WHERE c_target.owner_user_id IN (?) 
  AND c_target.status = 'accepted'
ORDER BY c_target.owner_user_id, m.full_name ASC
```

From this result set:
- Group items by `target_user_id`.
- Calculate `mutualCount = matchingFriends.length`.
- Extract `mutualPreviews = matchingFriends.slice(0, 3)` (fields: `id`, `fullName`, `avatarUrl`, `handle`).
- Attach to each user object in the response.

### 2.3 Detailed Mutual Friends API Endpoint
- **Route:** `GET /contacts/:userId/mutual-friends`
- **Controller:** `listMutualFriends(request, response, next)`
- **Query:** Returns full list of mutual friends between `request.user.id` and `:userId`, with presence status, handle, avatar, and join timestamp.
- **Response Format:**
```json
{
  "totalCount": 5,
  "mutualFriends": [
    {
      "id": "public_uuid",
      "userId": 12,
      "fullName": "Nguyen Van A",
      "handle": "vana",
      "avatarUrl": "https://...",
      "presence": "online"
    }
  ]
}
```

---

## 3. Frontend Component Design

### 3.1 `<MutualFriendsBadge />`
- **Location:** `src/components/ui/MutualFriendsBadge.tsx`
- **Props:**
  - `targetUser: { id: string | number; mutualCount?: number; mutualPreviews?: Array<{ id: string; fullName: string; avatarUrl?: string }> }`
  - `onOpenModal: (userId: string, targetName: string) => void`
  - `size?: 'sm' | 'md'`
  - `className?: string`
- **Render:**
  - If `mutualCount === 0` or undefined: Render `null`.
  - Else:
    - Avatar stack container (`.mf-avatar-stack`) with overlapping negative margin (`margin-left: -6px` for index > 0), 20px - 24px diameter, white/dark border ring.
    - Text link (`.mf-count-label`): e.g. `3 bạn chung` (clickable with hover underline).
    - Accessible tooltip or title.

### 3.2 `<MutualFriendsModal />`
- **Location:** `src/components/ui/MutualFriendsModal.tsx`
- **Features:**
  - Modal overlay with Glassmorphism dialog (`role="dialog"`).
  - Header: *"Bạn chung với {targetName}"* + total count badge.
  - Search filter input to quickly search mutual friends by name/handle.
  - Scrollable list of mutual friends with:
    - Circular avatar + presence indicator.
    - Full name & @handle.
    - Action buttons: "Nhắn tin" (Message) and "Trang cá nhân" (Profile).
  - Empty state when search yields no matches.
  - Close button and backdrop click dismissal.

### 3.3 Integration Touchpoints
1. `ContactsPanel.tsx`:
   - `ContactCard`: Add `<MutualFriendsBadge />` below user name/handle in Suggestions, Search Results, and Incoming Requests.
   - `ContactProfile`: Add a prominent Mutual Friends row in the hero/info section.
2. `StoryViewerDrawer.tsx`:
   - Story viewer item: Add `<MutualFriendsBadge size="sm" />` under viewer name if viewer is not already direct friend or has mutual connections.
3. API Client (`contactApi.ts`):
   - Add `fetchMutualFriends(userId: string)` calling `/contacts/:userId/mutual-friends`.
4. Types (`types.ts`):
   - Extend `ContactUser` and related types with optional `mutualCount?: number` and `mutualPreviews?: MutualFriendPreview[]`.

---

## 4. Internationalization (i18n)

Add keys in `src/locales/vi.json` and `src/locales/en.json`:
- `vi.json`:
  ```json
  "mutualFriends": {
    "badge_one": "{{count}} bạn chung",
    "badge_other": "{{count}} bạn chung",
    "modalTitle": "Bạn chung với {{name}}",
    "searchPlaceholder": "Tìm kiếm trong bạn chung...",
    "noResults": "Không tìm thấy bạn chung nào phù hợp",
    "viewAll": "Xem tất cả bạn chung",
    "loading": "Đang tải danh sách bạn chung..."
  }
  ```
- `en.json`:
  ```json
  "mutualFriends": {
    "badge_one": "{{count}} mutual friend",
    "badge_other": "{{count}} mutual friends",
    "modalTitle": "Mutual friends with {{name}}",
    "searchPlaceholder": "Search mutual friends...",
    "noResults": "No mutual friends match your search",
    "viewAll": "View all mutual friends",
    "loading": "Loading mutual friends..."
  }
  ```

---

## 5. Testing & Verification Plan

1. **Unit & Query Verification:**
   - Verify SQL query with 0 mutual friends, 1 mutual friend, 5+ mutual friends.
   - Ensure user does not appear as their own mutual friend.
2. **UI & Cross-Device Responsiveness:**
   - Verify avatar stack alignment on Desktop and Mobile.
   - Verify modal opening and keyboard Esc closing.
3. **Real-time Invalidation:**
   - Accept a friend request or unfriend, verify mutual friends badge updates without page reload.
4. **Build & Type Checking:**
   - Run `npm run build` to confirm 0 TypeScript / Rolldown errors.
