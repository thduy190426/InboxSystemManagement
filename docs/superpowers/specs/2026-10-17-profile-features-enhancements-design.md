# Profile Page Features & Fixes Design Document

**Date:** 2026-10-17  
**Status:** Approved  
**Author:** Antigravity AI  
**Scope:** `src/components/views/ProfilePage.tsx`, `src/components/profile/*`, `src/services/api/timelineApi.ts`, `src/locales/*`

---

## 1. Overview & Goals

This specification defines the architecture and implementation details for four key enhancements to the User Profile (`ProfilePage`):
1. **Friends Tab Navigation Fix:** Clicking on a friend card or profile icon in `FriendsTab` navigates to that friend's profile page instead of triggering message sending (`onSendMessage`).
2. **Timeline Post Inline Editing:** Post authors can edit their published posts (caption text, privacy level: Public / Friends / Only Me, and removing unwanted attached images) directly inline on the post card.
3. **Timeline Post Media Lightbox:** Clicking any image attached to a post opens a full-screen, high-definition lightbox viewer with Prev/Next navigation, keyboard arrow/ESC support, image counter (`1 / N`), and image download action.
4. **Other User Profile Options Menu:** A 3-dots dropdown menu (`MoreVertical`) in `ProfileHeader` for other users' profiles, featuring:
   - **Copy Profile Link:** Copies the profile link/handle to the clipboard with visual toast feedback.
   - **Report Account:** Displays an interactive modal with categorized reporting reasons (Spam, Harassment, Impersonation, Inappropriate Content, Other) and notes.
   - **Block User:** Triggers a confirmation dialog and invokes `contactApi.blockContact()` with updated status and toast feedback.

---

## 2. Architecture & Component Structure

### 2.1 File Organization & Changes

- `src/services/api/timelineApi.ts`:
  - Add `updatePost(postId: string, userId: string, updates: { content?: string; privacy?: PostPrivacy; mediaUrls?: string[] }): Promise<TimelinePost>`
- `src/components/views/ProfilePage.tsx`:
  - Add `onViewUserProfile?: (user: ContactUser) => void` prop to `ProfilePageProps`.
  - Pass `onViewUserProfile` to `FriendsTab`.
  - Wire `handleUpdatePost` to `TimelineTab`.
  - Wire 3-dots actions (copy profile link, block user, report account).
- `src/components/views/ChatApp.tsx`:
  - Pass `onViewUserProfile={(user) => ctrl.setProfileContactToOpen(user as ContactUser)}` to `<ProfilePage />`.
- `src/components/profile/FriendsTab.tsx`:
  - Ensure card clicks and `UserIcon` button invoke `onViewFriendProfile(friend)`.
  - Keep `onSendMessage(friend)` on the `MessageCircle` button for quick messaging.
- `src/components/profile/TimelineTab.tsx`:
  - Support `onUpdatePost?: (postId: string, updates: { content: string; privacy: PostPrivacy; mediaUrls: string[] }) => Promise<void>`.
  - State: `editingPostId: string | null`, `editContent: string`, `editPrivacy: PostPrivacy`, `editMediaUrls: string[]`, `isUpdatingPost: boolean`.
  - Add Edit button (icon `Edit3`) to the post header for the post author.
  - Render inline editor with caption textarea, privacy dropdown, media removal chips, Save & Cancel buttons.
  - Image click opens the new `PostMediaLightbox`.
- `src/components/profile/PostMediaLightbox.tsx` (New Component):
  - Props: `images: string[]`, `initialIndex: number`, `onClose: () => void`.
  - Features: full-screen glassmorphism overlay, large image display, previous/next chevron buttons, counter (`${index + 1} / ${images.length}`), download button, ESC key and outside-click handlers.
- `src/components/profile/ProfileHeader.tsx`:
  - Add 3-dots menu button (`MoreVertical`) for other users.
  - Dropdown options: "Sao chép liên kết" (`Copy`), "Báo cáo tài khoản" (`Flag`), "Chặn người này" (`Ban` or `UserX`).
  - Dropdown closes on selection or clicking outside.
- `src/components/profile/ReportUserModal.tsx` (New Component):
  - Interactive report modal with radio selection of reasons: `spam`, `harassment`, `impersonation`, `inappropriate`, `other`, plus an optional textarea for details.
- `src/locales/en.json` & `src/locales/vi.json`:
  - Complete internationalization for all new UI labels, tooltips, dialogs, and toast messages.

---

## 3. Data Flow & State Management

### 3.1 Friends Navigation
```
[User clicks friend in FriendsTab]
   ↓
onViewFriendProfile(friend)
   ↓
ProfilePage: onViewUserProfile(friend)
   ↓
ChatApp: ctrl.setProfileContactToOpen(friend)
   ↓
ProfilePage re-renders with friend as targetUser (isOwnProfile = false)
```

### 3.2 Inline Post Editing
```
[User clicks Edit on their post]
   ↓
editingPostId = post.id
editContent = post.content
editPrivacy = post.privacy
editMediaUrls = [...post.mediaUrls]
   ↓
[User edits text / privacy / removes photos & clicks Save]
   ↓
validatePostContent(editContent, editMediaUrls.length)
   ↓
timelineApi.updatePost(post.id, currentUser.id, { content, privacy, mediaUrls })
   ↓
posts state updated in ProfilePage & localStorage
editingPostId = null
Toast: "Đã cập nhật bài viết!" / "Post updated successfully!"
```

### 3.3 Post Media Lightbox
```
[User clicks image at index i in post.mediaUrls]
   ↓
lightboxState = { images: post.mediaUrls, currentIndex: i, isOpen: true }
   ↓
User navigates via Next/Prev buttons or Left/Right arrow keys
User closes via 'X' button, ESC key, or backdrop click
```

### 3.4 3-Dots Menu & Actions
- **Copy Link:**
  - `navigator.clipboard.writeText(window.location.origin + '?user=' + (user.handle || user.id))`
  - Toast: `profile:copyLinkSuccess` ("Đã sao chép liên kết trang cá nhân!")
- **Block User:**
  - Shows confirm dialog: `profile:blockConfirm` ("Bạn có chắc chắn muốn chặn người dùng này?")
  - Calls `contactApi.blockContact(targetUser.id)`
  - Updates `friendshipStatus` to `'blocked'`, removes user from active friend lists if applicable, and triggers `profile:blockSuccess` toast.
- **Report Account:**
  - Opens `ReportUserModal`.
  - User chooses reason & optional note.
  - Triggers submission, closes modal, and displays `profile:reportSuccess` toast.

---

## 4. Internationalization (i18n)

All new strings must be added to both `src/locales/en.json` and `src/locales/vi.json` in the `profile` namespace:
- `editPost`: "Chỉnh sửa bài viết" / "Edit post"
- `savePost`: "Lưu thay đổi" / "Save changes"
- `cancelEdit`: "Hủy" / "Cancel"
- `postUpdated`: "Đã cập nhật bài viết!" / "Post updated successfully!"
- `postUpdateFailed`: "Không thể cập nhật bài viết!" / "Failed to update post!"
- `lightboxClose`: "Đóng" / "Close"
- `lightboxDownload`: "Tải xuống" / "Download"
- `optionsMenu`: "Tùy chọn khác" / "More options"
- `copyProfileLink`: "Sao chép liên kết trang cá nhân" / "Copy profile link"
- `copyLinkSuccess`: "Đã sao chép liên kết trang cá nhân!" / "Profile link copied to clipboard!"
- `copyLinkFailed`: "Không thể sao chép liên kết!" / "Failed to copy link!"
- `reportAccount`: "Báo cáo tài khoản" / "Report account"
- `blockUser`: "Chặn người này" / "Block this user"
- `blockConfirm`: "Bạn có chắc chắn muốn chặn người dùng này không? Họ sẽ không thể gửi tin nhắn hoặc xem bài viết của bạn." / "Are you sure you want to block this user? They will not be able to message you or view your posts."
- `blockSuccess`: "Đã chặn người dùng thành công." / "User blocked successfully."
- `blockFailed`: "Không thể chặn người dùng!" / "Failed to block user!"
- `reportTitle`: "Báo cáo tài khoản người dùng" / "Report user account"
- `reportReasonLabel`: "Lý do báo cáo" / "Reason for report"
- `reportReasons.spam`: "Nội dung rác hoặc tin nhắn quảng cáo (Spam)" / "Spam or unsolicited advertising"
- `reportReasons.harassment`: "Quấy rối hoặc đe dọa" / "Harassment or threats"
- `reportReasons.impersonation`: "Giả mạo danh tính người khác" / "Impersonating someone else"
- `reportReasons.inappropriate`: "Nội dung không phù hợp hoặc nhạy cảm" / "Inappropriate or sensitive content"
- `reportReasons.other`: "Lý do khác" / "Other reason"
- `reportNotesPlaceholder`: "Mô tả thêm chi tiết vi phạm (không bắt buộc)..." / "Additional details about the violation (optional)..."
- `reportSubmit`: "Gửi báo cáo" / "Submit report"
- `reportSuccess`: "Cảm ơn bạn, báo cáo đã được gửi tới đội ngũ quản trị viên." / "Thank you, your report has been submitted to administrators."

---

## 5. Verification & Testing Strategy

1. **Friends Navigation:** Click on a friend card or User icon in the Friends tab; verify that the profile page reloads with the friend's info, handle, cover, posts, and action buttons. Check that the chat button still opens the conversation.
2. **Timeline Edit:** Edit caption of an existing post, toggle privacy between public and friends, remove a photo, click Save; verify state updates immediately and persists in `localStorage`.
3. **Lightbox:** Click photos in a post with 1, 2, and 4 images. Verify Prev/Next transitions, index indicators, keyboard ESC/Arrow keys, and download functionality.
4. **3-Dots Profile Menu:** Open another user's profile. Verify Copy Link copies URL and shows toast. Verify Block User shows confirmation dialog and executes block. Verify Report Account modal opens, allows option selection, and triggers success toast.
5. **Build & Typecheck:** Run `npm run build` to guarantee 0 TypeScript errors and successful production bundling.
