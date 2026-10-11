# Thiết Kế Chi Tiết: Hệ Thống Story Chuẩn Messenger/Facebook (Giai Đoạn 1 - Core Platform)

- **Ngày tạo**: 2026-10-11
- **Trạng thái**: Đã phê duyệt (Approved)
- **Tác giả**: Antigravity & User

---

## 1. Mục Tiêu & Tổng Quan Giai Đoạn 1

Giai đoạn 1 tập trung xây dựng nền tảng vững chắc và toàn diện cho tính năng **Story**, mô phỏng chính xác trải nghiệm tương tác của Facebook và Messenger:
1. **Core Viewer mượt mà & Đầy đủ cử chỉ**: Thanh tiến trình đa phần (segmented progress bar), tự động chuyển cảnh, chạm trái/phải để điều hướng, nhấn giữ để tạm dừng (hold to pause), vuốt chuyển giữa các tài khoản, preload tải trước media kế tiếp.
2. **Tương tác Cảm xúc (Reactions) chuẩn Facebook**: Thanh chọn emoji nổi bật (❤️ 😂 😮 😢 😡 👍), ràng buộc chặt chẽ **mỗi người dùng chỉ có duy nhất 1 reaction** trên mỗi Story (chọn emoji khác sẽ đổi, bấm lại emoji cũ sẽ gỡ bỏ).
3. **Cầu nối Phản hồi vào Chat 1-1 (Direct Chat Reply Bridge)**: Gửi bình luận hoặc reaction trực tiếp vào cuộc trò chuyện riêng giữa người xem và tác giả Story dưới dạng tin nhắn trích dẫn Story (kèm thumbnail thu nhỏ, nhãn Story và nội dung phản hồi).
4. **Thống kê người xem chi tiết (Viewer Analytics Bottom Sheet)**: Chủ sở hữu Story có thể vuốt lên hoặc bấm nút mắt để mở Bottom Sheet xem tổng lượt xem, danh sách người đã xem, ai đã thả cảm xúc gì và thời gian xem, kèm nút xóa Story.
5. **Quyền riêng tư & Bạn thân (Privacy & Close Friends)**: Hỗ trợ phạm vi hiển thị: Công khai, Bạn bè, Chỉ mình tôi, Bạn thân (Close Friends). Story Bạn Thân hiển thị viền xanh lá (Green Ring) đặc trưng và badge ngôi sao nhận diện.
6. **Đồng bộ thời gian thực (Realtime Sockets)**: Cập nhật Story mới, lượt xem, reaction và thông báo tức thì qua Socket.io mà không cần tải lại trang.

---

## 2. Kiến Trúc Cơ Sở Dữ Liệu (Database Schema)

Hệ thống sử dụng cơ sở dữ liệu MySQL với mô hình quan hệ chuẩn hóa cao:

```
+-------------------------------------------------------------+
|                          stories                            |
+-------------------------------------------------------------+
| id (CHAR 36, PK)                                            |
| user_id (BIGINT UNSIGNED, FK -> users.id)                   |
| media_url (VARCHAR 500)                                     |
| media_type (ENUM 'image', 'video')                          |
| text_content (TEXT NULL)                                    |
| privacy (ENUM 'public', 'friends', 'close_friends', 'only_me')|
| views_count (INT UNSIGNED DEFAULT 0)                        |
| reactions_count (INT UNSIGNED DEFAULT 0)                    |
| expires_at (DATETIME)                                       |
| created_at (DATETIME)                                       |
+-------------------------------------------------------------+
          |                                  |
          | 1:N                              | 1:N
          v                                  v
+-----------------------+          +--------------------------+
|      story_views      |          |     story_reactions      |
+-----------------------+          +--------------------------+
| id (BIGINT, PK)       |          | id (BIGINT, PK)          |
| story_id (CHAR 36, FK)|          | story_id (CHAR 36, FK)   |
| viewer_id (BIGINT, FK)|          | user_id (BIGINT, FK)     |
| viewed_at (DATETIME)  |          | reaction (VARCHAR 16)    |
| UNIQUE(story_id,      |          | created_at (DATETIME)    |
|        viewer_id)     |          | updated_at (DATETIME)    |
+-----------------------+          | UNIQUE(story_id, user_id)|
                                   +--------------------------+

+-------------------------------------------------------------+
|                     story_close_friends                     |
+-------------------------------------------------------------+
| id (BIGINT, PK)                                             |
| user_id (BIGINT UNSIGNED, FK -> users.id)                   |
| friend_id (BIGINT UNSIGNED, FK -> users.id)                 |
| created_at (DATETIME)                                       |
| UNIQUE(user_id, friend_id)                                  |
+-------------------------------------------------------------+
```

### Các ràng buộc quan trọng:
- `UNIQUE(story_id, viewer_id)`: Một người dùng xem story nhiều lần chỉ được tính là 1 lượt xem duy nhất.
- `UNIQUE(story_id, user_id)`: Đảm bảo chặt chẽ mỗi người dùng chỉ có duy nhất 1 cảm xúc tại một thời điểm trên một Story.

---

## 3. Kiến Trúc Backend & REST APIs

### 3.1. Danh sách Endpoints
1. `GET /api/stories`:
   - Lấy danh sách Story còn hiệu lực (`expires_at > NOW()`).
   - Lọc quyền riêng tư: Story `'only_me'` chỉ trả về cho chính chủ; Story `'close_friends'` chỉ trả về cho chính chủ hoặc bạn bè nằm trong danh sách `story_close_friends`.
   - Bổ sung thông tin cho từng story item: `is_close_friend: boolean`, `has_viewed: boolean` (đối với requester), `my_reaction: string | null`, `views_count: number`.
2. `POST /api/stories`:
   - Đăng story mới (hỗ trợ upload media lên Cloudinary, nhận `privacy`: `'public' | 'friends' | 'close_friends' | 'only_me'`).
   - Phát socket `story:created`.
3. `POST /api/stories/:id/view`:
   - Ghi nhận lượt xem cho story (`INSERT IGNORE INTO story_views`).
   - Tăng `views_count` nếu là lượt xem mới.
   - Phát socket `story:viewed` tới chủ sở hữu story.
4. `POST /api/stories/:id/react`:
   - Body: `{ reaction: '❤️' | '😂' | '😮' | '😢' | '😡' | '👍' | '🔥' }`.
   - Nếu reaction gửi lên trùng với reaction hiện tại của user -> gỡ bỏ (Xóa khỏi `story_reactions`, giảm `reactions_count`).
   - Nếu khác emoji cũ -> Cập nhật/Thêm mới (`INSERT ... ON DUPLICATE KEY UPDATE`), cập nhật `reactions_count`.
   - Tự động tạo tin nhắn `story_reply` gửi vào cuộc trò chuyện 1-1 với chủ story thông báo đã thả reaction (nếu có yêu cầu gửi thông báo).
   - Phát socket `story:reacted`.
5. `POST /api/stories/:id/reply`:
   - Body: `{ message: string }`.
   - Tìm hoặc tạo cuộc trò chuyện 1-1 (`conversation`) giữa người xem và tác giả Story.
   - Tạo tin nhắn mới với `message_type = 'story_reply'`, lưu metadata trích dẫn (`story_id`, `media_url`, `media_type`, `text_content`).
   - Phát socket `message:new` tới các thành viên cuộc trò chuyện.
6. `GET /api/stories/:id/viewers`:
   - Chỉ tác giả Story mới có quyền gọi.
   - Trả về danh sách người xem: `id`, `full_name`, `display_name`, `avatar_url`, `viewed_at`, `reaction` (nếu có).
7. `DELETE /api/stories/:id`:
   - Xóa Story (chỉ tác giả).
   - Phát socket `story:deleted`.
8. `GET /api/stories/close-friends`:
   - Lấy danh sách bạn bè thân thiết của người dùng hiện tại.
9. `POST /api/stories/close-friends/toggle`:
   - Body: `{ friend_id: number }`.
   - Thêm hoặc xóa bạn bè khỏi danh sách Bạn thân.

---

## 4. Kiến Trúc Frontend & UI/UX

```
src/components/story/
├── StoryFeed.tsx                # Thanh cuộn Story ở đầu trang với Green Ring & unread states
├── StoryViewerOverlay.tsx       # Màn hình xem Story toàn diện (cử chỉ, timer, preload, pause)
├── StoryReactionSelector.tsx    # Thanh biểu tượng cảm xúc nổi bật với hiệu ứng pop-up
├── StoryViewerDrawer.tsx        # Bottom Sheet thống kê người xem & reaction của chủ Story
├── CloseFriendsModal.tsx        # Modal quản lý danh sách Bạn Thân
└── StoryCreatorModal.tsx        # Modal đăng Story với chọn quyền riêng tư (Công khai/Bạn thân/...)

src/components/chat/
└── StoryReplyCard.tsx           # Thẻ trích dẫn Story hiển thị trong tin nhắn trò chuyện 1-1
```

### 4.1. Chi tiết trải nghiệm xem Story (`StoryViewerOverlay.tsx`)
- **Điều khiển cử chỉ (Gesture & Keyboard):**
  - Click/Touch bên trái (< 30% chiều rộng màn hình): Story trước.
  - Click/Touch bên phải (> 70% chiều rộng màn hình): Story kế tiếp.
  - Nhấn giữ (Mouse down / Touch start ở giữa): Tạm dừng bộ đếm thời gian và dừng phát video; thả tay tiếp tục chạy.
  - Phím điều hướng: Mũi tên trái/phải để chuyển story, Spacebar để Pause/Resume, ESC để đóng.
- **Tối ưu Preloading:**
  - Tự động tải trước hình ảnh `new Image().src = nextMediaUrl` hoặc nạp sẵn video metadata cho story kế tiếp trong danh sách để khi chuyển cảnh không bị hiện màn hình đen hoặc vòng xoay chờ.
- **Thanh cảm xúc Reaction chuẩn Messenger:**
  - Nút tim ở góc dưới, khi di chuột hoặc bấm sẽ mở thanh 6 biểu tượng (`❤️`, `😂`, `😮`, `😢`, `😡`, `👍`).
  - Nếu đã thả reaction: Nút chuyển sang biểu tượng cảm xúc đã chọn; bấm lại lần nữa để gỡ bỏ (hủy reaction).

### 4.2. Thống kê người xem (`StoryViewerDrawer.tsx`)
- Hiển thị nút biểu tượng con mắt + số người xem ở góc dưới bên trái màn hình Story của chính mình.
- Bấm vào hoặc vuốt lên mở Bottom Sheet trượt mượt mà:
  - Header: Tổng lượt xem (Ví dụ: `👁️ 24 người đã xem`).
  - Thanh tab lọc: `Tất cả (24)`, `❤️ (15)`, `😂 (5)`, `🔥 (4)`.
  - Danh sách từng người: Avatar, Tên, Thời gian đã xem (`5 phút trước`, `1 giờ trước`), emoji đã thả.
  - Nút menu 3 chấm hoặc nút thùng rác: Cho phép xóa Story với popup xác nhận.

### 4.3. Quản lý Bạn Thân (`CloseFriendsModal.tsx`)
- Danh sách bạn bè kèm ô tìm kiếm thời gian thực.
- Checkbox/Switch bật tắt nhanh trạng thái Bạn thân.
- Badge ngôi sao xanh lá nổi bật.

---

## 5. Kế Hoạch Kiểm Thử & Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. **Hiển thị Feed**:
   - Story của bạn thân hiển thị viền xanh lá (Green ring); Story thường hiển thị viền gradient; Story đã xem hết hiển thị viền xám.
2. **Xem Story**:
   - Tự động chạy tiến trình 5 giây (hoặc theo thời lượng video); chạm trái/phải chuyển đúng story; nhấn giữ dừng đúng lúc; phím bàn phím hoạt động trơn tru.
   - Preload hoạt động ngầm, chuyển story mượt mà không bị giật lag.
3. **Thả Reaction**:
   - Thả cảm xúc cập nhật ngay lập tức.
   - Đổi cảm xúc khác thay thế đúng cảm xúc cũ; bấm lại cảm xúc đang có thì gỡ bỏ.
4. **Phản hồi Story**:
   - Nhập tin nhắn gửi thành công vào hội thoại 1-1 với tác giả Story, hiển thị thẻ trích dẫn Story đẹp mắt.
5. **Thống kê người xem**:
   - Khi người khác mở xem, lượt xem được ghi nhận và hiển thị trong Bottom Sheet của chủ story.
   - Bộ lọc reaction trong Bottom Sheet phân loại chính xác.
6. **Bảo mật & Quyền riêng tư**:
   - Người ngoài không thể xem story ở chế độ Close Friends nếu không nằm trong danh sách.
   - Chỉ chủ story mới có quyền truy cập API xem danh sách người xem và API xóa story.
