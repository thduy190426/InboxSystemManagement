# Story Interactive Stickers & Highlights (Phase 3) Design Specification

**Tác giả:** Antigravity Agent  
**Ngày:** 2026-10-12  
**Mục tiêu:** Hoàn thiện Giai đoạn 3 của hệ sinh thái Story chuẩn Messenger/Facebook/Instagram:
1. **Interactive Stickers:** Nhãn dán tương tác gồm Bình chọn (Poll 2 phương án), Thanh trượt cảm xúc (Emoji Slider 0-100%), và Đếm ngược sự kiện (Event Countdown).
2. **Story Highlights & Archive:** Tự động lưu trữ Story quá 24 giờ (Archive) và tạo các bộ sưu tập Tin nổi bật (Highlights) ghim trên trang cá nhân (`ProfilePage.tsx`) có thể mở xem lại trực tiếp qua `StoryViewerOverlay`.

---

## 1. Kiến Trúc Dữ Liệu & Database Schema

### 1.1. Bảng Dữ Liệu Tương Tác
- **`story_poll_votes`**:
  - `id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
  - `story_id CHAR(36) NOT NULL` (khóa ngoại `stories(id)` ON DELETE CASCADE)
  - `user_id BIGINT UNSIGNED NOT NULL` (khóa ngoại `users(id)` ON DELETE CASCADE)
  - `option_idx TINYINT UNSIGNED NOT NULL` (0 = Lựa chọn 1, 1 = Lựa chọn 2)
  - `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - `UNIQUE KEY uq_story_poll (story_id, user_id)`

- **`story_slider_votes`**:
  - `id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
  - `story_id CHAR(36) NOT NULL` (khóa ngoại `stories(id)` ON DELETE CASCADE)
  - `user_id BIGINT UNSIGNED NOT NULL` (khóa ngoại `users(id)` ON DELETE CASCADE)
  - `value FLOAT NOT NULL` (giá trị phần trăm 0 -> 100)
  - `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - `UNIQUE KEY uq_story_slider (story_id, user_id)`

### 1.2. Bảng Dữ Liệu Story Highlights & Archive
- **`story_highlights`**:
  - `id CHAR(36) NOT NULL PRIMARY KEY`
  - `user_id BIGINT UNSIGNED NOT NULL` (khóa ngoại `users(id)` ON DELETE CASCADE)
  - `title VARCHAR(100) NOT NULL`
  - `cover_url VARCHAR(255) NULL`
  - `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - `updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
  - `KEY idx_highlights_user (user_id)`

- **`story_highlight_items`**:
  - `id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
  - `highlight_id CHAR(36) NOT NULL` (khóa ngoại `story_highlights(id)` ON DELETE CASCADE)
  - `story_id CHAR(36) NOT NULL` (khóa ngoại `stories(id)` ON DELETE CASCADE)
  - `order_index INT UNSIGNED NOT NULL DEFAULT 0`
  - `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
  - `UNIQUE KEY uq_highlight_story (highlight_id, story_id)`

---

## 2. Đặc Tả REST API Backend

### 2.1. Interactive Stickers
1. `POST /api/stories/:id/poll-vote`:
   - Request Body: `{ optionIdx: 0 | 1 }`
   - Response: `{ success: true, pollStats: { countA: number, countB: number, percentA: number, percentB: number, total: number, myVote: 0 | 1 } }`
2. `GET /api/stories/:id/poll-stats`:
   - Response: `{ success: true, pollStats: { ... } }`
3. `POST /api/stories/:id/slider-vote`:
   - Request Body: `{ value: number }` (0 - 100)
   - Response: `{ success: true, sliderStats: { average: number, myValue: number, total: number } }`
4. `GET /api/stories/:id/slider-stats`:
   - Response: `{ success: true, sliderStats: { ... } }`

### 2.2. Archive & Highlights
1. `GET /api/stories/archive`: Lấy toàn bộ các tin lịch sử của user đăng nhập.
2. `GET /api/stories/highlights?userId=:id`: Lấy danh sách tóm tắt các Tin nổi bật của một user (id, title, cover_url, storyCount).
3. `POST /api/stories/highlights`: Tạo tin nổi bật mới với `{ title, coverUrl?, storyIds: string[] }`.
4. `PUT /api/stories/highlights/:id`: Sửa tin nổi bật `{ title, coverUrl?, storyIds: string[] }`.
5. `DELETE /api/stories/highlights/:id`: Xóa tin nổi bật.
6. `GET /api/stories/highlights/:id`: Lấy chi tiết tin nổi bật dưới định dạng `UserStoryGroup` để `StoryViewerOverlay` có thể phát liền mạch.

---

## 3. Kiến Trúc Frontend UI/UX

### 3.1. Sticker Tương Tác trong Creator Studio
- **Tab Stickers** mở rộng thêm 3 tiện ích:
  - **Bình chọn (Poll)**: Form nhập câu hỏi (mặc định: "Hỏi mọi người...") và 2 lựa chọn (mặc định: "Có" & "Không").
  - **Cảm xúc (Slider)**: Form nhập câu hỏi + chọn emoji đại diện (😍, 🔥, ❤️, 👏, 🥳, 🥺).
  - **Đếm ngược (Countdown)**: Form nhập sự kiện (ví dụ: "Sinh nhật 🎉", "Khai giảng 🎓") + chọn ngày giờ kết thúc.

### 3.2. Hiển thị & Tương tác trong Story Viewer
- **Poll**:
  - Nếu chưa vote: 2 nút bấm lựa chọn với hiệu ứng hover.
  - Sau khi vote: Hiển thị thanh tiến trình % đổ màu (gradient) cùng số phần trăm của từng phương án, có icon tích xanh ở lựa chọn của người xem.
- **Emoji Slider**:
  - Thanh trượt mượt mà có emoji đầu kéo. Khi kéo, emoji phóng to và hiển thị % nổi. Khi thả tay, gửi kết quả và hiển thị vạch trung bình chung của mọi người kèm hiệu ứng emoji bay lên (particle burst).
- **Countdown**:
  - Đồng hồ đếm ngược `DD : HH : MM : SS` cập nhật mỗi giây.

### 3.3. Story Highlights trên Trang Cá Nhân (`ProfilePage.tsx`)
- Thanh trượt ngang các bong bóng tròn Tin nổi bật (Highlights row):
  - Bong bóng đầu tiên: Nút "+ Mới" (Mở modal tạo Tin nổi bật từ kho lưu trữ Archive).
  - Các bong bóng tiếp theo: Ảnh bìa tròn viền mạ vàng / gradient đẹp mắt kèm tên danh mục bên dưới.
  - Bấm vào bong bóng: Mở `StoryViewerOverlay` xem các tin trong Highlight đó.
  - Cho phép người sở hữu xóa hoặc chỉnh sửa danh mục Highlight.
