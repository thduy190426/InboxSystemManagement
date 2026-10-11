# Thiết Kế Chi Tiết: Trình Tạo Story Nâng Cao (Giai Đoạn 2 - Story Creator Studio)

- **Ngày tạo**: 2026-10-11
- **Trạng thái**: Đã phê duyệt (Approved)
- **Tác giả**: Antigravity & User

---

## 1. Mục Tiêu & Tổng Quan Giai Đoạn 2

Giai đoạn 2 nâng tầm trải nghiệm sáng tạo nội dung của người dùng với **Story Creator Studio** chuẩn mực tương đương Facebook và Messenger Stories:
1. **Camera WebRTC Trong Ứng Dụng**: Chụp ảnh tức thì, quay video ngắn có bộ đếm thời gian, chuyển đổi camera trước/sau và hỗ trợ tải tệp ảnh/video từ thiết bị.
2. **Hệ Thống Lớp Phủ Tương Tác (Interactive Overlays Engine)**:
   - **Văn bản đa dạng**: Chọn màu sắc (palette), đổi font chữ (Modern, Handwriting, Impact, Typewriter), đổi kiểu nền (Trong suốt, Hộp nền mờ, Nền khối), kéo thả vị trí.
   - **Stickers & Emojis**: Bộ sưu tập nhãn dán vui nhộn và emoji đa dạng, hỗ trợ kéo thả trên khung hình.
   - **Vị trí (Location), Hashtag & Mention (@user)**: Thêm các sticker thông tin định danh tương tự Instagram/Facebook.
   - **Bộ lọc màu (Filters/Effects)**: 8 bộ lọc CSS thời thượng (Normal, Warm, Cool, Vintage, Noir, Vivid, Cyberpunk, Dreamy).
   - **Nhạc nền (Background Music)**: Danh sách nhạc mẫu thịnh hành (Chill Lo-fi, Upbeat, Acoustic, Piano) + Tải tệp MP3 tùy chỉnh, kèm sticker sóng nhạc/đĩa than hoạt họa.
3. **Chế Độ Xem Trước (Live Preview)**: Xem trước thời gian thực toàn bộ hiệu ứng, nhạc nền và các lớp phủ trước khi xuất bản.
4. **Lưu Trữ & Hiển Thị (Hybrid Rendering Pipeline)**:
   - Đối với ảnh: Hợp nhất (burn-in canvas) hoặc lưu các lớp phủ sắc nét.
   - Đối với video: Giữ nguyên chất lượng video gốc và lưu metadata overlays (text, sticker, filter, music) dưới dạng JSON trong `text_content` để StoryViewer phát nhạc và render lớp phủ mượt mà, không tốn pin/CPU transcode video của người dùng.

---

## 2. Kiến Trúc Dữ Liệu & Metadata

Story metadata được lưu trữ cấu trúc trong trường `text_content` của bảng `stories`:

```json
{
  "version": 2,
  "caption": "Mô tả ngắn gọn hoặc văn bản chính",
  "filter": "warm | cool | vintage | noir | vivid | cyberpunk | dreamy | normal",
  "music": {
    "title": "Sunset Lo-Fi",
    "artist": "Royalty Free Beats",
    "url": "https://assets.mixkit.co/.../audio.mp3"
  },
  "overlays": [
    {
      "id": "txt-1",
      "type": "text",
      "text": "Check in tại Đà Nẵng 🌊",
      "color": "#ffffff",
      "bgColor": "rgba(0,0,0,0.6)",
      "font": "modern | handwriting | impact | typewriter",
      "x": 50,
      "y": 30
    },
    {
      "id": "stk-1",
      "type": "sticker",
      "value": "🔥",
      "x": 80,
      "y": 60,
      "scale": 1.2
    },
    {
      "id": "loc-1",
      "type": "location",
      "value": "Đà Nẵng, Việt Nam",
      "x": 50,
      "y": 80
    }
  ]
}
```

Nếu một Story cũ được tạo chỉ bằng chuỗi văn bản thông thường (text thô), hệ thống tự động fallback hiển thị như phiên bản Giai đoạn 1 (tương thích ngược 100%).

---

## 3. Kiến Trúc Thành Phần Frontend

```
src/components/story/
├── StoryCreatorModal.tsx          # Wrapper chính cho Studio Modal
├── StoryCameraViewfinder.tsx      # Giao diện WebRTC Camera (chụp ảnh, quay video, flip camera)
├── StoryStudioEditor.tsx          # Khung vẽ Studio chính (kéo thả overlays, toolbar công cụ)
├── StoryFilterSelector.tsx        # Thanh cuộn chọn bộ lọc màu thời thượng
├── StoryMusicPicker.tsx           # Modal/Drawer chọn bài hát hoặc tải MP3 lên
├── StoryStickerPicker.tsx         # Bảng chọn nhãn dán, emoji, vị trí, hashtag
└── StoryLivePreview.tsx           # Chế độ xem trước thời gian thực
```

### 3.1. Camera Viewfinder (`StoryCameraViewfinder.tsx`)
- Sử dụng `navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true })`.
- Nút tròn: Click để chụp ảnh (Draw video frame sang Canvas -> Blob/File).
- Nhấn giữ (hoặc click nút đỏ) để quay video qua `MediaRecorder`, tự động dừng sau 15 giây.
- Nút chuyển camera (Flip camera) cho điện thoại hoặc thiết bị có nhiều camera.
- Nút chọn file từ máy: Mở file picker hỗ trợ `image/*,video/*`.

### 3.2. Studio Editor (`StoryStudioEditor.tsx`)
- Khung canvas 9:16 có bo góc mô phỏng màn hình điện thoại.
- Công cụ phía trên: Nút Thêm Chữ (Aa), Nút Sticker (😊), Nút Âm nhạc (🎵), Nút Bộ lọc (✨), Nút Xem trước (👁️).
- Kéo thả các phần tử text/sticker trên canvas (sử dụng pointer events: `pointerdown`, `pointermove`, `pointerup` tính toán vị trí theo tỷ lệ phần trăm `%` để responsive trên mọi màn hình).
- Thanh chọn quyền riêng tư và nút "Chia sẻ lên tin".

### 3.3. Cập nhật StoryViewerOverlay
- Nhận diện metadata JSON trong `story.text_content`.
- Tự động áp dụng CSS filter lên thẻ `<img>` hoặc `<video>`.
- Hiển thị các lớp overlay (Text, Sticker, Location) đúng vị trí tỷ lệ `%`.
- Phát bài nhạc nền `new Audio(music.url)` đồng bộ khi Story đang chạy, tự động dừng khi Story bị pause hoặc chuyển sang story khác.

---

## 4. Kế Hoạch Kiểm Thử & Nghiệm Thu

1. **Camera WebRTC**: Chụp ảnh xuất ra blob ảnh hợp lệ; quay video xuất ra blob video có thể phát lại được.
2. **Text & Stickers**: Thêm chữ, đổi font/màu/nền, kéo thả vị trí thành công.
3. **Bộ lọc Filter**: Xem trước mượt mà 8 hiệu ứng filter trên ảnh/video.
4. **Nhạc nền**: Chọn bài hát mẫu hoặc tải file MP3 lên, nghe thử và đồng bộ phát trong Story.
5. **Xem trước (Preview)**: Chuyển đổi giữa chế độ biên tập và xem trước trơn tru.
6. **Đăng & Hiển thị**: Đăng story thành công lên Cloudinary + Backend, StoryViewer tái hiện đầy đủ hiệu ứng và nhạc nền.
