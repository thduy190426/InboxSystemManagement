# Design Specification: Group Creation & Group Chat Optimization

- **Date:** 2026-10-12
- **Topic:** Hoàn thiện và tối ưu tính năng Tạo nhóm & Chat nhóm
- **Status:** Approved for Implementation

---

## 1. Executive Summary & Goals

### 1.1 Objective
Nâng cấp toàn diện trải nghiệm tạo nhóm và chat nhóm trên toàn hệ thống InboxSystemManagement:
1. **Tách và hiện đại hóa Modal Tạo nhóm (`CreateGroupModal.tsx`):**
   - Tách khỏi [InboxPanel.tsx](file:///c:/Users/duyho/Downloads/InboxSystemManagement/src/components/panels/InboxPanel.tsx) thành component độc lập tại [src/components/panels/modals/CreateGroupModal.tsx](file:///c:/Users/duyho/Downloads/InboxSystemManagement/src/components/panels/modals/CreateGroupModal.tsx).
   - Thêm ô tìm kiếm bạn bè (Search input) lọc theo tên và email theo thời gian thực.
   - Thêm thanh Chips hiển thị danh sách thành viên đã chọn ở trên cùng, hỗ trợ click `x` để bỏ chọn nhanh.
   - Avatar uploader có hình ảnh xem trước (Image Preview) tròn trực quan, nút xóa ảnh để quay lại avatar chữ cái mặc định.
   - Thêm trường tùy chọn Mô tả nhóm (Description).
   - Cho phép tạo nhóm khi chọn từ 1 bạn bè trở lên (nhóm từ 2 người, linh hoạt).
2. **Khắc phục triệt để lỗi Real-time Socket Broadcast:**
   - Trong [conversation.controller.js](file:///c:/Users/duyho/Downloads/InboxSystemManagement/backend/src/controllers/core/conversation.controller.js), nâng cấp hàm `emitConversationChanged` để song song phát sự kiện tới:
     1. Room `conversation:${conversationId}` (dành cho người đang mở cuộc trò chuyện).
     2. Room `user:${userId}` của từng thành viên thông qua `emitToUsers` (dành cho thành viên đang ở ngoài danh sách Inbox, chưa vào phòng chat).
   - Đảm bảo khi tạo nhóm mới hoặc có tin nhắn mới, tất cả thành viên trong nhóm đều lập tức nhận được dữ liệu thời gian thực mà không cần tải lại trang.
3. **Tối ưu hóa Header và Trải nghiệm Chat nhóm (`ChatPanel.tsx`):**
   - Header nhóm hiển thị: Avatar nhóm, Tên nhóm, và Phụ đề trạng thái thông minh: `X thành viên • Y đang hoạt động` (tính theo presence online của members).
   - Cho phép click vào Header để mở ngay bảng thông tin và quản trị nhóm ([DetailPanel.tsx](file:///c:/Users/duyho/Downloads/InboxSystemManagement/src/components/panels/DetailPanel.tsx)).
   - Hiển thị đầy đủ tên người gửi và avatar cho từng tin nhắn trong nhóm.
   - Tối ưu gợi ý `@mention` autocomplete khi soạn tin nhắn nhóm.

---

## 2. Architecture & Data Flow

### 2.1 Backend Socket Dual-Cast Strategy
Hiện tại, `emitConversationChanged` chỉ gọi:
```javascript
emitToConversation(conversationId, 'conversation:changed', payload)
```
Do Socket.IO chỉ đưa client vào room `conversation:${conversationId}` khi client chủ động gọi sự kiện `conversation:join` (mở khung chat), nên các thành viên khác đang ở danh sách Inbox sẽ không nhận được thông báo tạo nhóm mới hoặc tin nhắn mới.

**Giải pháp:**
```javascript
async function emitConversationChanged(connection, conversationId, actorUserId, eventType) {
  try {
    await ensureMessageHiddenEntriesTable()
    const [rows] = await connection.execute(
      `SELECT user_id
      FROM conversation_participants
      WHERE conversation_id = ? AND left_at IS NULL`,
      [conversationId],
    )

    const userIds = rows.map((row) => Number(row.user_id))
    const payload = {
      conversationId: String(conversationId),
      actorUserId: String(actorUserId),
      eventType,
      userIds,
    }

    emitToConversation(conversationId, 'conversation:changed', payload)
    emitToUsers(userIds, 'conversation:changed', payload)
  } catch (error) {
    console.error('Không thể phát ra sự kiện thời gian thực của cuộc trò chuyện:', error)
  }
}
```

### 2.2 Backend API `createGroupConversation`
Hỗ trợ nhận:
- `title`: Tên nhóm (bắt buộc, 2-50 ký tự).
- `description`: Mô tả nhóm (tùy chọn, tối đa 255 ký tự).
- `memberIds`: Mảng JSON các `publicId` (tối thiểu 1 thành viên).
- `avatar`: File ảnh tải lên qua Multer/Cloudinary.

Lưu `description` vào cột `description` của bảng `conversations` khi tạo nhóm:
```javascript
const [conversationResult] = await connection.execute(
  `INSERT INTO conversations (
    public_id,
    type,
    title,
    description,
    avatar_url,
    created_by,
    last_message_at
  ) VALUES (?, 'group', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
  [randomUUID(), title, description || null, avatarUrl, currentUserId],
)
```

---

## 3. Frontend Component Structure

### 3.1 `CreateGroupModal.tsx`
Tạo tại `src/components/panels/modals/CreateGroupModal.tsx`:
- Props:
  - `isOpen: boolean`
  - `isClosing?: boolean`
  - `onClose: () => void`
  - `friends: ContactUser[]`
  - `isCreating: boolean`
  - `onSubmit: (payload: { title: string; description?: string; memberIds: string[]; avatar?: File | null }) => Promise<void>`
- Trạng thái nội bộ:
  - `title`: string
  - `description`: string
  - `searchTerm`: string (lọc theo `fullName`, `email`, `handle`)
  - `selectedMemberIds`: string[]
  - `avatarFile`: File | null
  - `avatarPreview`: string | null (dùng `URL.createObjectURL` và tự động revoke khi unmount/đổi file)

### 3.2 Tích hợp vào `InboxPanel.tsx`
- Loại bỏ toàn bộ form modal tạo nhóm inline cũ (dòng 774-871).
- Import và render `<CreateGroupModal />`.
- Giúp `InboxPanel.tsx` giảm hơn 100 dòng code thừa, dễ đọc và bảo trì.

### 3.3 Tối ưu Header `ChatPanel.tsx`
- Khi `activeConversation.type === 'group'`:
  - Avatar: Hiển thị `AvatarFallback` với tên nhóm và avatar nhóm.
  - Subtitle:
    - Tính số lượng thành viên online: `members.filter(m => m.presence === 'online').length`.
    - Render: `{t('membersCount', { count: members.length })} • {t('membersOnlineCount', { count: onlineCount })}`
  - Header click action: Khi `type === 'group'`, nút bấm header gọi `onToggleDetails` để mở `DetailPanel` (thay vì disabled như trước).

---

## 4. Localization (i18n)
Bổ sung các khóa dịch trong [src/locales/vi.json](file:///c:/Users/duyho/Downloads/InboxSystemManagement/src/locales/vi.json) và [src/locales/en.json](file:///c:/Users/duyho/Downloads/InboxSystemManagement/src/locales/en.json):
- `groupDescPlaceholder`: "Mô tả nhóm (không bắt buộc)..." / "Group description (optional)..."
- `searchFriendsPlaceholder`: "Tìm kiếm bạn bè theo tên, email..." / "Search friends by name, email..."
- `groupMembersSubtitle`: "{{total}} thành viên • {{online}} đang hoạt động" / "{{total}} members • {{online}} active"
- `removeSelected`: "Bỏ chọn" / "Remove"
- `changeGroupAvatar`: "Đổi ảnh nhóm" / "Change group avatar"
- `removeGroupAvatar`: "Gỡ ảnh" / "Remove avatar"
