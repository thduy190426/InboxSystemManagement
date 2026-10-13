# Public Profile (Timeline, Cover Photo, Friends, Follow) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `ProfilePage.tsx` into a full-featured social media public profile with cover photo, interactive timeline (composer, posts, media gallery, reactions, comments), friends list, and follow/unfollow relationships.

**Architecture:** A unified profile view supporting both own profile and other users' public profiles. Powered by a robust `timelineApi` service with IndexedDB and LocalStorage fallback persistence. Modular components for Cover, Header, Timeline, About, Friends, and Followers tabs.

**Tech Stack:** React 19, TypeScript, Lucide React, i18next, IndexedDB / LocalStorage, CSS3 Glassmorphism design tokens.

## Global Constraints

- Preserve all existing profile editing capabilities and validation from `ProfilePage.tsx`.
- Support 100% bilingual i18n (`vi.json` and `en.json`) with zero hardcoded UI strings.
- Pure client-side resilient storage (IndexedDB + LocalStorage fallback) so all features work reliably offline and without backend migration delays.
- Clean responsive layout for Mobile (375px), Tablet (768px), and Desktop (1280px+).

---

### Task 1: Timeline & Follow Data Types & Persistence Service

**Files:**
- Create: `src/types/timeline.ts`
- Create: `src/services/api/timelineApi.ts`
- Test: Build verification with TypeScript

**Interfaces:**
- Produces: `TimelinePost`, `PostComment`, `PostReaction`, `FollowStats`, `timelineApi` functions: `fetchUserPosts`, `createPost`, `deletePost`, `toggleReaction`, `addComment`, `fetchFollowStats`, `toggleFollowUser`, `fetchFollowersList`, `fetchFollowingList`, `uploadCoverPhoto`, `getCoverPhoto`.

- [ ] **Step 1: Create `src/types/timeline.ts`**
Define `PostPrivacy`, `PostReactionType`, `PostReaction`, `PostComment`, `TimelinePost`, `FollowStats`.

- [ ] **Step 2: Create `src/services/api/timelineApi.ts`**
Implement IndexedDB/LocalStorage storage logic for posts, comments, likes, followers/following relations, and cover photos with initial seed mock posts for demo users.

- [ ] **Step 3: Verify TypeScript compilation**
Run `npx tsc --noEmit` and ensure zero errors.

- [ ] **Step 4: Commit Task 1**
```bash
git add src/types/timeline.ts src/services/api/timelineApi.ts
git commit -m "feat(timeline): add timeline and follow data types and storage service"
```

---

### Task 2: Multi-Language i18n Localization for Public Profile

**Files:**
- Modify: `src/locales/vi.json`
- Modify: `src/locales/en.json`

**Interfaces:**
- Produces: Localization keys under `profile.public` and `profile.timeline` for:
  - Cover photo (`changeCover`, `uploadingCover`, `removeCover`)
  - Actions (`editProfile`, `message`, `friendAdd`, `friendCancel`, `friendAccept`, `friendStatus`, `follow`, `following`, `unfollow`)
  - Stats (`postsCount`, `friendsCount`, `followersCount`, `followingCount`)
  - Tabs (`tabTimeline`, `tabAbout`, `tabFriends`, `tabFollowers`)
  - Composer (`composerPlaceholder`, `addPhoto`, `privacyPublic`, `privacyFriends`, `privacyOnlyMe`, `postBtn`, `postingBtn`)
  - Post card (`justNow`, `minutesAgo`, `hoursAgo`, `daysAgo`, `likeBtn`, `commentBtn`, `deletePostBtn`, `deletePostConfirm`, `commentsTitle`, `writeCommentPlaceholder`, `sendCommentBtn`, `noPostsYet`)
  - Followers tab (`followersTab`, `followingTab`, `noFollowersYet`, `noFollowingYet`, `followBack`)

- [ ] **Step 1: Add Vietnamese translations to `src/locales/vi.json`**
- [ ] **Step 2: Add English translations to `src/locales/en.json`**
- [ ] **Step 3: Verify JSON validity and TypeScript build**
Run: `node -e "JSON.parse(fs.readFileSync('src/locales/vi.json')); JSON.parse(fs.readFileSync('src/locales/en.json')); console.log('JSON Valid')"`
- [ ] **Step 4: Commit Task 2**
```bash
git add src/locales/vi.json src/locales/en.json
git commit -m "feat(i18n): add public profile, timeline, and follow translations"
```

---

### Task 3: Profile Cover & Profile Header Components

**Files:**
- Create: `src/components/profile/ProfileCover.tsx`
- Create: `src/components/profile/ProfileHeader.tsx`
- Modify: `src/style.css` (add cover & header styles)

**Interfaces:**
- Consumes: `timelineApi.uploadCoverPhoto`, `timelineApi.getCoverPhoto`, `timelineApi.fetchFollowStats`, `timelineApi.toggleFollowUser`, `contactApi` friend actions.
- Produces: `ProfileCover`, `ProfileHeader` components with stats bar and actions.

- [ ] **Step 1: Create `src/components/profile/ProfileCover.tsx`**
Includes high-res banner with responsive height, default aesthetic gradient, file input trigger, and loading state.

- [ ] **Step 2: Create `src/components/profile/ProfileHeader.tsx`**
Includes overlapping large avatar with AvatarFallback, online presence badge, role badge, user meta (displayName, handle, bio), action buttons (Edit Profile / Change Cover for own; Message / Add Friend / Follow for other), quick stats bar, and StoryHighlightBar.

- [ ] **Step 3: Add CSS styling to `src/style.css`**
- [ ] **Step 4: Verify compilation**
- [ ] **Step 5: Commit Task 3**
```bash
git add src/components/profile/ProfileCover.tsx src/components/profile/ProfileHeader.tsx src/style.css
git commit -m "feat(profile): create profile cover and profile header components"
```

---

### Task 4: Timeline Tab (Composer, Post Feed, Reactions, Comments)

**Files:**
- Create: `src/components/profile/TimelineTab.tsx`
- Modify: `src/style.css` (timeline feed, composer, comment section styles)

**Interfaces:**
- Consumes: `timelineApi` for post listing, creation, deletion, reactions, comments.
- Produces: `TimelineTab` component.

- [ ] **Step 1: Implement `PostComposer` subcomponent**
Only shown when `isOwnProfile === true`. Allows typing text, selecting multiple previewable images, choosing privacy level, and submitting.

- [ ] **Step 2: Implement `PostCard` subcomponent**
Displays author header, privacy icon, relative timestamp, options menu (delete post for author), rich text body, responsive image gallery grid, reaction button with count, comment drawer toggle with count.

- [ ] **Step 3: Implement `PostComments` subcomponent**
Lists previous comments with user avatars and timestamp, plus quick comment input with Enter key submission.

- [ ] **Step 4: Assemble `TimelineTab`**
Manages post state, optimistic reaction updates, comment additions, and empty state.

- [ ] **Step 5: Add CSS styling in `src/style.css`**
- [ ] **Step 6: Verify compilation**
- [ ] **Step 7: Commit Task 4**
```bash
git add src/components/profile/TimelineTab.tsx src/style.css
git commit -m "feat(timeline): create timeline tab with composer, posts, reactions, and comments"
```

---

### Task 5: About, Friends, and Followers Tab Components

**Files:**
- Create: `src/components/profile/AboutTab.tsx`
- Create: `src/components/profile/FriendsTab.tsx`
- Create: `src/components/profile/FollowersTab.tsx`
- Modify: `src/style.css` (tab styles, friend cards, follower cards)

**Interfaces:**
- Consumes: `contactApi.fetchFriends`, `timelineApi.fetchFollowersList`, `timelineApi.fetchFollowingList`, `userApi.updateProfile`.
- Produces: `AboutTab`, `FriendsTab`, `FollowersTab`.

- [x] **Step 1: Create `src/components/profile/AboutTab.tsx`**
Displays contact information, bio, address, gender, birth date respecting privacy flags; embeds edit form mode when requested.

- [x] **Step 2: Create `src/components/profile/FriendsTab.tsx`**
Displays grid of friend cards with avatar, name, mutual friends count, and "Nhắn tin" action.

- [x] **Step 3: Create `src/components/profile/FollowersTab.tsx`**
Subtab toggle between "Followers" and "Following", user item cards with quick Follow / Unfollow actions.

- [x] **Step 4: Add CSS styling in `src/style.css`**
- [x] **Step 5: Verify compilation**
- [x] **Step 6: Commit Task 5**
```bash
git add src/components/profile/AboutTab.tsx src/components/profile/FriendsTab.tsx src/components/profile/FollowersTab.tsx src/style.css
git commit -m "feat(profile): create about, friends, and followers tabs"
```

---

### Task 6: Integrate Unified `ProfilePage.tsx` and Navigation Routing

**Files:**
- Modify: `src/components/views/ProfilePage.tsx`
- Modify: `src/components/views/ChatApp.tsx` (pass targetUser or handle navigation to other profile)
- Modify: `src/components/panels/ContactsPanel.tsx` (add button to view full public profile)

**Interfaces:**
- Consumes: Components from Tasks 3, 4, 5.
- Produces: Fully integrated `ProfilePage` with tab switching, cover upload, timeline feed, friends list, and follow actions.

- [x] **Step 1: Refactor `ProfilePage.tsx`**
Incorporate `ProfileCover`, `ProfileHeader`, and tab navigation switching between `TimelineTab`, `AboutTab`, `FriendsTab`, and `FollowersTab`.

- [x] **Step 2: Wire up navigation to public profile**
In `ChatApp.tsx` and `ContactsPanel.tsx`, enable clicking a user to view their full public profile page.

- [x] **Step 3: Verify TypeScript compilation and production build**
Run: `npm run build` (`tsc && vite build`)
Expected: Code 0, clean build with zero errors.

- [x] **Step 4: Commit Task 6**
```bash
git add src/components/views/ProfilePage.tsx src/components/views/ChatApp.tsx src/components/panels/ContactsPanel.tsx
git commit -m "feat(profile): integrate unified public profile page with tabs and navigation"
```

---

### Task 7: Final Verification & QA Testing

- [x] **Step 1: Build & bundle verification**
Run `npm run build`
- [x] **Step 2: Inspect functional behaviors**
- [x] **Step 3: Final review and report to user**
