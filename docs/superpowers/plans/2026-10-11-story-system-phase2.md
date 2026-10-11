# Story Creator Studio (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai Giai đoạn 2 của hệ thống Story: Xây dựng trình tạo Story nâng cao (Story Creator Studio) bao gồm WebRTC Camera (chụp ảnh, quay video ngắn), bộ lọc màu (Filters/Effects), trình soạn thảo văn bản đa dạng (màu, font chữ, nền highlight, kéo thả), nhãn dán Stickers & Emojis, Vị trí & Hashtag, Nhạc nền (Background Music kèm nghe thử), chế độ Xem trước (Live Preview), và đồng bộ hiển thị các lớp phủ + phát nhạc trên StoryViewerOverlay.

**Architecture:** Sử dụng kiến trúc Hybrid Rendering: Media gốc (ảnh hoặc video) được giữ nguyên vẹn chất lượng cao, các lớp phủ đồ họa (Text, Sticker, Filter, Music, Location) được quản lý dưới dạng cấu trúc JSON overlays lưu trong `text_content` của bảng `stories`. Client-side Canvas và Pointer Event API xử lý kéo thả mượt mà trên tỷ lệ 9:16 chuẩn thiết bị.

**Tech Stack:** React 19, TypeScript, WebRTC API, MediaRecorder API, HTML5 Audio API, Lucide-react, i18next, Vanilla CSS.

## Global Constraints
- React 19.2.7.
- Tương thích ngược 100%: Story cũ chỉ chứa văn bản thô vẫn hiển thị bình thường.
- Không làm đơ hoặc giảm hiệu năng trình duyệt: Sử dụng pointer events tính vị trí theo tỷ lệ phần trăm `%` (`x`, `y`) để responsive trên mọi độ phân giải màn hình.
- Media video không bị re-encode gây hao tốn pin/CPU, overlays được vẽ đè mượt mà bằng CSS/DOM.
- Hỗ trợ đầy đủ đa ngôn ngữ tiếng Việt và tiếng Anh.

---

### Task 1: WebRTC Camera Viewfinder (`StoryCameraViewfinder.tsx`)

**Files:**
- Create: `src/components/story/StoryCameraViewfinder.tsx`
- Modify: `src/styles/story.css`

**Interfaces:**
- Consumes: `navigator.mediaDevices.getUserMedia`, `MediaRecorder`.
- Produces: `onCapture: (file: File) => void`, `onSelectFile: (file: File) => void`, `onClose: () => void`.

- [ ] **Step 1: Xây dựng giao diện và luồng điều khiển Camera WebRTC**

Tạo `StoryCameraViewfinder.tsx`:
- Quản lý stream video, chuyển đổi `facingMode: 'user' | 'environment'`.
- Nút chụp ảnh: Chụp frame hiện tại từ `<video>` vào `<canvas>` xuất thành `File` (image/jpeg).
- Nút quay video: Nhấn để bắt đầu / kết thúc ghi âm hình ảnh qua `MediaRecorder` xuất thành `File` (video/webm hoặc video/mp4), có bộ đếm thời gian tối đa 15s.
- Nút chọn file từ máy: Mở input `<input type="file" accept="image/*,video/*">`.
- Nút đóng và nút đổi camera.

- [ ] **Step 2: Cập nhật CSS cho Camera Viewfinder trong `src/styles/story.css`**
Thêm styles cho màn hình camera toàn màn hình, nút chụp tròn viền đỏ/trắng, bộ đếm thời gian quay video, nút đổi camera.

- [ ] **Step 3: Kiểm tra build TypeScript**
Chạy: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/components/story/StoryCameraViewfinder.tsx src/styles/story.css
git commit -m "feat(story): add webrtc camera viewfinder with photo snapshot and video recording"
```

---

### Task 2: Bộ Lọc Màu CSS & Bộ Chọn Filter (`StoryFilterSelector.tsx`)

**Files:**
- Create: `src/components/story/StoryFilterSelector.tsx`
- Modify: `src/styles/story.css`

**Interfaces:**
- Consumes: Danh sách 8 filters: `normal`, `warm`, `cool`, `vintage`, `noir`, `vivid`, `cyberpunk`, `dreamy`.
- Produces: `selectedFilter: string`, `onSelectFilter: (filter: string) => void`.

- [ ] **Step 1: Định nghĩa các class CSS filter trong `src/styles/story.css`**
Bao gồm:
- `.story-filter-normal { filter: none; }`
- `.story-filter-warm { filter: sepia(0.25) saturate(1.3) contrast(1.05); }`
- `.story-filter-cool { filter: hue-rotate(185deg) saturate(1.15) brightness(1.05); }`
- `.story-filter-vintage { filter: sepia(0.55) contrast(0.9) brightness(0.95); }`
- `.story-filter-noir { filter: grayscale(1) contrast(1.25) brightness(0.95); }`
- `.story-filter-vivid { filter: saturate(1.6) contrast(1.1); }`
- `.story-filter-cyberpunk { filter: hue-rotate(270deg) saturate(1.4) contrast(1.2); }`
- `.story-filter-dreamy { filter: brightness(1.1) contrast(0.95) saturate(1.2); }`

- [ ] **Step 2: Tạo component `StoryFilterSelector.tsx`**
Thanh cuộn ngang các thẻ thumbnail filter xem trước kèm tên bộ lọc, bấm chọn cập nhật filter ngay lập tức.

- [ ] **Step 3: Kiểm tra compile TypeScript**
Chạy: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/components/story/StoryFilterSelector.tsx src/styles/story.css
git commit -m "feat(story): add css color filters and filter selector component"
```

---

### Task 3: Nhạc Nền & Bộ Chọn Nhạc (`StoryMusicPicker.tsx`)

**Files:**
- Create: `src/components/story/StoryMusicPicker.tsx`
- Modify: `src/styles/story.css`

**Interfaces:**
- Consumes: Thư viện nhạc royalty-free và upload MP3 từ máy.
- Produces: `selectedMusic: { title: string; artist: string; url: string } | null`, `onSelectMusic: (music: any) => void`.

- [ ] **Step 1: Tạo component `StoryMusicPicker.tsx`**
- Cung cấp danh sách 5 bản nhạc mẫu chất lượng cao (Chill Lo-fi, Upbeat Vibe, Acoustic Peace, Sunny Morning, Night Drive).
- Nút phát thử (Play/Pause) cho từng bài trước khi chọn.
- Nút tải lên file nhạc `.mp3` hoặc `.wav` từ máy.
- Nút gỡ bỏ nhạc nền nếu không muốn dùng.

- [ ] **Step 2: Thêm CSS styling cho Music Picker**
Thêm styles pop-up/bottom sheet chọn nhạc, hiệu ứng sóng âm thanh (sound waves animation).

- [ ] **Step 3: Kiểm tra compile TypeScript**
Chạy: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/components/story/StoryMusicPicker.tsx src/styles/story.css
git commit -m "feat(story): implement music picker with royalty-free tracks and custom audio upload"
```

---

### Task 4: Nhãn Dán, Emoji, Vị Trí & Hashtag (`StoryStickerPicker.tsx`)

**Files:**
- Create: `src/components/story/StoryStickerPicker.tsx`
- Modify: `src/styles/story.css`

**Interfaces:**
- Consumes: Danh mục Stickers, Emojis, Input địa điểm, Input hashtag, Input mention.
- Produces: `onAddOverlay: (overlay: StoryOverlayItem) => void`.

- [ ] **Step 1: Xây dựng `StoryStickerPicker.tsx`**
- Tab 1: Emojis thịnh hành (❤️, 🔥, 🎉, ☕, 🌟, ✨, 😎, 🥳, 🌈, 🍕, 🎵, 🏖️...).
- Tab 2: Stickers biểu cảm độc đáo.
- Tab 3: Thẻ Vị trí (Location tag) có ô nhập tên địa điểm.
- Tab 4: Thẻ Hashtag (`#tag`) và Nhắc đến người dùng (`@mention`).

- [ ] **Step 2: Thêm CSS styling cho Sticker Picker**
Grid hiển thị emoji kích thước lớn, tabs chuyển đổi mượt mà.

- [ ] **Step 3: Commit**
```bash
git add src/components/story/StoryStickerPicker.tsx src/styles/story.css
git commit -m "feat(story): add sticker emoji location and hashtag picker"
```

---

### Task 5: Soạn Thảo Văn Bản & Studio Canvas (`StoryStudioEditor.tsx`)

**Files:**
- Create: `src/components/story/StoryStudioEditor.tsx`
- Modify: `src/styles/story.css`

**Interfaces:**
- Consumes: File media (ảnh/video), overlays, filters, music.
- Produces: Khung vẽ biên tập 9:16 tương tác: Kéo thả các lớp text/stickers bằng pointer events, thanh toolbar trên đầu (Aa, Nhãn dán, Nhạc, Bộ lọc, Xem trước), thanh dưới chân (Quyền riêng tư, Nút Chia sẻ).

- [ ] **Step 1: Tạo `StoryStudioEditor.tsx`**
- Quản lý state `overlays`: mảng các phần tử `{ id, type, text, color, bgColor, font, x, y, scale }`.
- Xử lý kéo thả bằng `onPointerDown`, `onPointerMove`, `onPointerUp` với tọa độ `%` tương đối trên khung 9:16.
- Hộp thoại nhập văn bản: Chọn bảng màu (8 màu nổi bật), chọn font (Modern, Caveat, Impact, Courier), chọn nền chữ (Transparent, Box, Solid).
- Nút thùng rác / Xóa khi kéo lớp xuống đáy hoặc click nút xóa.
- Nút Xem trước (Live Preview).

- [ ] **Step 2: Thêm CSS styling cho Studio Canvas & Overlays**
Fonts chữ tùy biến, bóng đổ chữ, hiệu ứng drag-and-drop mượt mà.

- [ ] **Step 3: Commit**
```bash
git add src/components/story/StoryStudioEditor.tsx src/styles/story.css
git commit -m "feat(story): implement interactive studio canvas editor with draggable overlays"
```

---

### Task 6: Tích Hợp Vào `StoryCreatorModal.tsx`

**Files:**
- Modify: `src/components/story/StoryCreatorModal.tsx`

**Interfaces:**
- Consumes: `StoryCameraViewfinder`, `StoryStudioEditor`.
- Produces: Luồng tạo Story liền mạch: Chọn camera / tải tệp -> Biên tập trong Studio -> Xem trước -> Nén ảnh & Đăng lên server với metadata overlays.

- [ ] **Step 1: Tái cấu trúc `StoryCreatorModal.tsx`**
- Bước 1: Mở Camera Viewfinder hoặc chọn file.
- Bước 2: Sau khi có file media -> Mở Studio Editor.
- Bước 3: Nén ảnh với `browser-image-compression` (nếu là ảnh > 1MB).
- Bước 4: Đóng gói metadata JSON (overlays, filter, music) gửi lên `storyApi.createStory(file, privacy, JSON.stringify(metadata))`.

- [ ] **Step 2: Commit**
```bash
git add src/components/story/StoryCreatorModal.tsx
git commit -m "feat(story): integrate studio editor and camera viewfinder into story creator modal"
```

---

### Task 7: Hỗ Trợ Overlays & Phát Nhạc Trên `StoryViewerOverlay.tsx`

**Files:**
- Modify: `src/components/story/StoryViewerOverlay.tsx`

**Interfaces:**
- Consumes: `story.text_content` chứa metadata JSON hoặc chuỗi text thô.
- Produces: Áp dụng class CSS filter lên thẻ `<img>` hoặc `<video>`; hiển thị các lớp text/stickers/location/hashtag đúng vị trí `%`; phát nhạc nền đồng bộ bằng HTML5 `Audio`.

- [ ] **Step 1: Phân tích metadata trong `StoryViewerOverlay.tsx`**
Hàm parse an toàn:
```typescript
function parseStoryMetadata(textContent?: string | null) {
  if (!textContent) return null;
  try {
    const data = JSON.parse(textContent);
    if (data && data.version === 2) return data;
  } catch (e) {}
  return null;
}
```

- [ ] **Step 2: Hiển thị các lớp Overlays & Bộ Lọc**
- Thêm class CSS filter `story-filter-${metadata.filter}` vào thẻ media.
- Render danh sách `metadata.overlays` theo tọa độ `left: ${x}%`, `top: ${y}%`.
- Render sticker bài hát xoay nếu có nhạc nền.

- [ ] **Step 3: Phát nhạc nền đồng bộ**
- Khởi tạo audio khi Story có `metadata.music?.url`.
- Tạm dừng audio khi Story bị giữ (hold to pause) hoặc khi đóng viewer.
- Tự động giải phóng audio khi chuyển sang Story khác.

- [ ] **Step 4: Commit**
```bash
git add src/components/story/StoryViewerOverlay.tsx
git commit -m "feat(story): render interactive overlays and play background music in story viewer"
```

---

### Task 8: Đa Ngôn Ngữ i18n & Kiểm Thử Toàn Diện

**Files:**
- Modify: `src/locales/vi.json`
- Modify: `src/locales/en.json`

**Interfaces:**
- Consumes: i18n keys cho Creator Studio.
- Produces: Bản dịch đầy đủ các công cụ biên tập.

- [ ] **Step 1: Bổ sung từ khóa vào `src/locales/vi.json` và `src/locales/en.json`**
Các từ khóa: `camera`, `recordVideo`, `flipCamera`, `filters`, `music`, `stickers`, `addText`, `previewStory`, `dragToTrash`, `musicTrending`, `uploadAudio`.

- [ ] **Step 2: Kiểm tra toàn diện TypeScript & Vite Build**
Chạy: `npm run build`
Expected: Build thành công 100% không lỗi.

- [ ] **Step 3: Commit**
```bash
git add src/locales/vi.json src/locales/en.json
git commit -m "feat(i18n): add translations for story creator studio phase 2"
```
