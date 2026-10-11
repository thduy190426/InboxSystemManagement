# Story Interactive Stickers & Highlights (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai Giai đoạn 3 của hệ thống Story: Nhãn dán tương tác (Interactive Stickers: Poll 2 phương án, Emoji Slider cảm xúc, Event Countdown đếm ngược), Kho lưu trữ Story (Archive) và Bộ sưu tập Tin nổi bật (Highlights) ghim trên trang cá nhân (`ProfilePage.tsx`) xem lại qua `StoryViewerOverlay`.

**Architecture:** Mở rộng metadata JSON v2 cho các loại overlays tương tác (`poll`, `slider`, `countdown`). Dữ liệu bình chọn (votes) được lưu trữ an toàn trong MySQL qua cơ chế self-healing migration. Story Highlights được ghim trên trang cá nhân dưới dạng các bong bóng tròn với ảnh bìa gradient bắt mắt.

**Tech Stack:** Node.js, Express, MySQL 8 (mysql2 pool), React 19, TypeScript, Vanilla CSS, Lucide-react, i18next.

---

### Task 1: Backend Database & REST APIs (`story.controller.js`, `story.routes.js`)

**Files:**
- Modify: `backend/src/controllers/core/story.controller.js`
- Modify: `backend/src/routes/core/story.routes.js`

**Interfaces:**
- Poll Vote: `POST /api/stories/:id/poll-vote`, `GET /api/stories/:id/poll-stats`
- Slider Vote: `POST /api/stories/:id/slider-vote`, `GET /api/stories/:id/slider-stats`
- Story Archive: `GET /api/stories/archive`
- Highlights: `GET /api/stories/highlights`, `POST /api/stories/highlights`, `GET /api/stories/highlights/:id`, `DELETE /api/stories/highlights/:id`

- [ ] **Step 1: Mở rộng `ensureStorySchema()` trong `story.controller.js`**
Thêm các bảng:
- `story_poll_votes` (id, story_id, user_id, option_idx, created_at)
- `story_slider_votes` (id, story_id, user_id, value, created_at)
- `story_highlights` (id, user_id, title, cover_url, created_at, updated_at)
- `story_highlight_items` (id, highlight_id, story_id, order_index, created_at)

- [ ] **Step 2: Triển khai các API controllers cho Poll, Slider, Archive và Highlights**
- `votePoll`, `getPollStats`
- `voteSlider`, `getSliderStats`
- `getStoryArchive`: truy vấn các story của user (`user_id = req.user.id`)
- `getHighlights`: lấy danh sách các highlights theo `user_id`
- `createHighlight`: lưu highlight và danh sách story items
- `getHighlightById`: trả về thông tin highlight kèm items định dạng `UserStoryGroup`
- `deleteHighlight`: xóa highlight của tác giả

- [ ] **Step 3: Đăng ký các endpoints trong `story.routes.js`**
Gắn middleware `auth` và liên kết với các controller methods.

- [ ] **Step 4: Kiểm tra cú pháp backend**
Chạy: `node --check backend/src/controllers/core/story.controller.js`
Expected: PASS.

---

### Task 2: Frontend Types & API Client (`storyApi.ts`, `types.ts`)

**Files:**
- Modify: `src/types.ts`
- Modify: `src/services/api/storyApi.ts`

- [ ] **Step 1: Khai báo types cho Interactive Stickers và Highlights trong `src/types.ts`**
- `PollOverlayData`, `SliderOverlayData`, `CountdownOverlayData`
- `StoryHighlightSummary`, `StoryHighlightDetail`

- [ ] **Step 2: Thêm các hàm gọi API vào `src/services/api/storyApi.ts`**
- `votePoll(storyId, optionIdx)`, `getPollStats(storyId)`
- `voteSlider(storyId, value)`, `getSliderStats(storyId)`
- `getStoryArchive()`
- `getHighlights(userId?)`, `createHighlight(payload)`, `getHighlightById(id)`, `deleteHighlight(id)`

---

### Task 3: Interactive Sticker Pickers trong Creator Studio

**Files:**
- Modify: `src/components/story/StoryStickerPicker.tsx`
- Modify: `src/components/story/StoryStudioEditor.tsx`
- Modify: `src/styles/story.css`

- [ ] **Step 1: Thêm các tab tương tác vào `StoryStickerPicker.tsx`**
- Tab "Bình chọn" (Poll): nhập câu hỏi và 2 lựa chọn A & B.
- Tab "Cảm xúc" (Slider): nhập câu hỏi và chọn emoji (😍, 🔥, ❤️, 👏, 🥳, 🥺).
- Tab "Đếm ngược" (Countdown): nhập sự kiện và chọn ngày giờ đích.

- [ ] **Step 2: Hiển thị Interactive Overlays xem trước trên Canvas Studio `StoryStudioEditor.tsx`**
Render mockup Poll, Slider, Countdown với style thẻ nổi sang trọng trên canvas 9:16.

- [ ] **Step 3: Thêm CSS styling cho Interactive Stickers trong `src/styles/story.css`**
Hiệu ứng bóng đổ thẻ, gradient bo tròn, slider emoji.

---

### Task 4: Tương Tác Trực Tiếp Trong Story Viewer (`StoryInteractiveWidgets.tsx`, `StoryViewerOverlay.tsx`)

**Files:**
- Create: `src/components/story/StoryInteractiveWidgets.tsx`
- Modify: `src/components/story/StoryViewerOverlay.tsx`

- [ ] **Step 1: Xây dựng `StoryInteractiveWidgets.tsx`**
- `InteractivePollWidget`: Cho phép người xem bấm bình chọn -> gửi API -> cập nhật % trực tiếp tức thì với hiệu ứng đổ màu.
- `InteractiveSliderWidget`: Kéo emoji trên thanh trượt -> thả tay gửi kết quả -> hiển thị điểm trung bình và hạt emoji bay lên.
- `InteractiveCountdownWidget`: Bộ đếm ngược thời gian thực `DD : HH : MM : SS`.

- [ ] **Step 2: Tích hợp vào `StoryViewerOverlay.tsx`**
Nhận diện overlay type `poll`, `slider`, `countdown` và render `StoryInteractiveWidgets`.

---

### Task 5: Story Highlights & Archive Trên Trang Cá Nhân (`ProfilePage.tsx`)

**Files:**
- Create: `src/components/story/StoryHighlightBar.tsx`
- Create: `src/components/story/StoryHighlightModal.tsx`
- Modify: `src/components/views/ProfilePage.tsx`
- Modify: `src/styles/story.css`

- [ ] **Step 1: Tạo `StoryHighlightModal.tsx`**
Modal chọn các tin từ kho lưu trữ Archive (`storyApi.getStoryArchive()`), nhập tiêu đề Highlight, chọn ảnh bìa.

- [ ] **Step 2: Tạo `StoryHighlightBar.tsx`**
Thanh cuộn ngang các bong bóng tròn Tin nổi bật:
- Nút "+ Mới" mở `StoryHighlightModal`.
- Các bong bóng tròn viền mạ vàng chứa ảnh bìa và tiêu đề bên dưới.
- Bấm vào bong bóng -> Mở `StoryViewerOverlay` phát bộ sưu tập.

- [ ] **Step 3: Nhúng `StoryHighlightBar.tsx` vào `ProfilePage.tsx`**
Đặt ngay dưới thẻ Avatar & thông tin cá nhân trên trang Profile.

---

### Task 6: Đa Ngôn Ngữ i18n & Kiểm Thử Toàn Diện

**Files:**
- Modify: `src/locales/vi.json`
- Modify: `src/locales/en.json`

- [ ] **Step 1: Bổ sung từ khóa i18n**
Các từ khóa cho Poll, Slider, Countdown, Archive, Highlights.

- [ ] **Step 2: Kiểm tra build TypeScript & Vite**
Chạy: `npm run build`
Expected: PASS 100%.

- [ ] **Step 3: Kiểm thử tự động E2E**
Chạy test kịch bản bình chọn, tạo highlight và truy vấn archive.
