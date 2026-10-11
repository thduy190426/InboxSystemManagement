# Thiết Kế Chi Tiết: Quick Tutorial / Product Tour Hệ Thống

- **Ngày tạo**: 2026-10-11
- **Trạng thái**: Đã phê duyệt (Approved)
- **Tác giả**: Antigravity & User

---

## 1. Mục Tiêu & Tổng Quan

Hệ thống **Quick Tutorial / Product Tour** nhằm mục đích nâng cao trải nghiệm người dùng, giúp người dùng mới hoặc người dùng cập nhật tính năng làm quen nhanh chóng với các phân hệ quan trọng: **Chat**, **Story**, **Hồ sơ cá nhân (Profile)** và **Cài đặt (Settings)**.

### Mục tiêu chính:
1. **Hướng dẫn trực quan (Step-by-step Onboarding)**: Làm nổi bật (spotlight) các phần tử giao diện chính và hiển thị popover giải thích công dụng, cách dùng.
2. **Kích hoạt linh hoạt theo trang (Per-page Modular Tour)**: Tự động kích hoạt khi người dùng lần đầu truy cập trang tương ứng, không gây ngợp thông tin.
3. **Đánh dấu tính năng mới (Feature Badges & Tooltips)**: Hiển thị badge `✨ New` trên các tính năng như Story, Emoji Reaction, Bình chọn (Poll), Ghim tin nhắn (Pin), Xem trước liên kết (Link Preview); tự động ẩn sau khi người dùng đã tương tác.
4. **Xem lại bất cứ lúc nào (Replay On-demand)**: Thêm mục "Hướng dẫn & Trợ giúp" trong trang Cài đặt để người dùng xem lại từng tour hoặc đặt lại toàn bộ trạng thái.
5. **Hiệu năng & Tương thích**: Tương thích hoàn toàn với React 19, tải Driver.js lười (dynamic import lazy load), không làm ảnh hưởng thời gian tải trang ban đầu, hoạt động trơn tru trên cả Desktop lẫn Mobile.

---

## 2. Kiến Trúc Hệ Thống

```
+-------------------------------------------------------------+
|                        React App                            |
|                                                             |
|   +-----------------------+     +-----------------------+   |
|   |    tutorialStore      | <-> |    localStorage       |   |
|   |  (Zustand State)      |     | (per userId storage)  |   |
|   +-----------------------+     +-----------------------+   |
|               |                                             |
|               v                                             |
|   +-----------------------+     +-----------------------+   |
|   |   tourService.ts      | --> |  Driver.js (Dynamic)  |   |
|   | (Lifecycle & Runners) |     |  Spotlight & Popovers |   |
|   +-----------------------+     +-----------------------+   |
|               |                                             |
|               +-----------------------+                     |
|               v                       v                     |
|       +---------------+       +---------------+             |
|       | FeatureBadge  |       | TourReplay    |             |
|       | & Tooltips    |       | in Settings   |             |
|       +---------------+       +---------------+             |
+-------------------------------------------------------------+
```

### 2.1. Quản lý trạng thái (`src/stores/tutorialStore.ts`)
* Lưu trữ theo tài khoản: `localStorage.getItem(`inbox_tutorial_state_${userId}`)`.
* Thuộc tính:
  * `completedTours: Record<string, boolean>` (`chat`, `story`, `profile`, `settings`).
  * `interactedFeatures: Record<string, boolean>` (`story`, `emojiReaction`, `poll`, `pinnedMessages`, `linkPreview`).
  * `isRunningTour: boolean`.
  * `currentTourKey: string | null`.
* Hành động:
  * `initForUser(userId: string | number)`: Tải trạng thái từ localStorage của user.
  * `completeTour(tourKey: string)`: Đánh dấu đã hoàn thành tour và lưu vào localStorage.
  * `resetTour(tourKey: string)`: Đặt lại 1 tour để xem lại.
  * `resetAllTours()`: Đặt lại tất cả các tour và huy hiệu.
  * `markFeatureInteracted(featureId: string)`: Đánh dấu người dùng đã tương tác với tính năng mới (ẩn huy hiệu `✨ New`).

### 2.2. Dịch vụ Tour Runner (`src/services/tutorial/tourService.ts`)
* Sử dụng thư viện `driver.js` thông qua dynamic import:
  ```ts
  const { driver } = await import('driver.js')
  import('driver.js/dist/driver.css')
  ```
* Tùy biến theme và popover:
  * Lớp phủ mờ backdrop với độ trong suốt tối ưu cho cả Light Mode và Dark Mode.
  * Nút "Tiếp tục" (Next), "Quay lại" (Prev), "Đóng/Bỏ qua" (Close/Skip), "Hoàn thành" (Done) được kết nối với hệ thống `i18n`.
  * Hỗ trợ tự động kiểm tra phần tử DOM tồn tại (`document.querySelector('[data-tour="..."]')`), nếu phần tử chưa sẵn sàng hoặc màn hình nhỏ ẩn đi thì tự động bỏ qua bước đó mượt mà (graceful fallback).

---

## 3. Cấu Hình Các Bước Hướng Dẫn (`src/features/tutorial/tourSteps.ts`)

Các bước được gán target bằng thuộc tính `data-tour="identifier"`:

### 3.1. Chat Tour (`chat`)
1. `data-tour="nav-rail"`: Thanh điều hướng chính (Chuyển đổi giữa Tin nhắn, Danh bạ, Hồ sơ, Cài đặt, Thông báo).
2. `data-tour="inbox-search-filter"`: Thanh tìm kiếm hội thoại và các bộ lọc tin nhắn (Tất cả, Chưa đọc, Đã ghim).
3. `data-tour="inbox-conversation-list"`: Danh sách tin nhắn đến và cuộc trò chuyện gần đây.
4. `data-tour="chat-header-actions"`: Khu vực thông tin người nhận, cuộc gọi thoại, gọi video và ghim hội thoại.
5. `data-tour="chat-message-input"`: Ô nhập văn bản, gửi ảnh, file đính kèm, biểu tượng cảm xúc và tạo cuộc bình chọn (Poll).

### 3.2. Story Tour (`story`)
1. `data-tour="story-feed"`: Thanh hiển thị Story nổi bật từ bạn bè theo thời gian thực (24 giờ).
2. `data-tour="create-story-btn"`: Nút tạo Story mới với ảnh, văn bản và phông nền sinh động.
3. `data-tour="story-viewer-guide"`: Hướng dẫn xem story, thả cảm xúc và gửi tin nhắn phản hồi story.

### 3.3. Profile Tour (`profile`)
1. `data-tour="profile-avatar-cover"`: Cập nhật ảnh đại diện và ảnh bìa cá nhân.
2. `data-tour="profile-info-fields"`: Chỉnh sửa họ tên, tiểu sử (bio), ngày sinh và số điện thoại.
3. `data-tour="profile-privacy-toggles"`: Cài đặt quyền riêng tư (Ẩn/Hiện trạng thái online, thông tin liên hệ).

### 3.4. Settings Tour (`settings`)
1. `data-tour="settings-theme"`: Tùy chỉnh giao diện Sáng / Tối và ngôn ngữ hiển thị.
2. `data-tour="settings-security-2fa"`: Quản lý bảo mật xác thực hai yếu tố (2FA) và đổi mật khẩu.
3. `data-tour="settings-sessions"`: Quản lý các phiên đăng nhập và thiết bị đang hoạt động.
4. `data-tour="settings-tutorial-replay"`: Nút xem lại các tour hướng dẫn bất cứ lúc nào.

---

## 4. Hệ Thống Huy Hiệu "Mới" (`FeatureBadge`) & Tooltips

### 4.1. Component `FeatureBadge` (`src/components/ui/FeatureBadge.tsx`)
* Nhận props: `featureId: string`, `label?: string` (mặc định "✨ New" hoặc "Mới").
* Kiểm tra `tutorialStore.isFeatureInteracted(featureId)`. Nếu chưa tương tác thì hiển thị badge với hiệu ứng chuyển động nhẹ (pulse / glow animation).
* Khi người dùng click hoặc hover vào tính năng, gọi `markFeatureInteracted(featureId)` để badge biến mất mượt mà.

### 4.2. Vị trí gắn Huy hiệu:
* **Story**: Icon Story trên thanh danh sách tin nhắn.
* **Poll (Bình chọn)**: Nút tạo Poll trong menu đính kèm thanh chat.
* **Emoji Reaction**: Menu reaction nhanh trên tin nhắn.
* **Ghim tin nhắn**: Nút Pin trên header hoặc menu hành động tin nhắn.
* **Link Preview**: Thẻ xem trước liên kết trong tin nhắn.

---

## 5. Trung Tâm Hướng Dẫn Trong Cài Đặt (`SettingsPage`)

Trong `SettingsPage.tsx`, thêm một Card riêng:
* **Tiêu đề**: "Hướng dẫn sử dụng & Khám phá" (`Quick Tutorial & Help`).
* **Mô tả**: "Xem lại các bước hướng dẫn trực quan cho từng khu vực hoặc đặt lại toàn bộ hướng dẫn."
* **Danh sách hành động**:
  * Nút "Xem hướng dẫn Chat" (Chuyển sang Chat và bật tour).
  * Nút "Xem hướng dẫn Story" (Mở xem Story và bật tour).
  * Nút "Xem hướng dẫn Hồ sơ cá nhân" (Chuyển sang Profile và bật tour).
  * Nút "Xem hướng dẫn Cài đặt" (Bật ngay tour Cài đặt).
  * Nút "Đặt lại toàn bộ hướng dẫn" (Reset tất cả trạng thái đã hoàn thành).

---

## 6. Đa Ngôn Ngữ & Phong Cách Giao Diện (i18n & Styling)

* Bổ sung các bản dịch trong `src/locales/vi.json` và `src/locales/en.json` cho:
  * Nút điều hướng tour: Tiếp tục, Quay lại, Bỏ qua, Hoàn thành.
  * Tiêu đề và nội dung từng bước của 4 tour (Chat, Story, Profile, Settings).
  * Huy hiệu và mô tả trong cài đặt.
* CSS trong `src/style.css` hoặc file tour riêng `src/styles/tour.css`:
  * Styling Popover theo chuẩn thiết kế hiện đại (bo góc 14px, đổ bóng mềm, font rõ ràng).
  * Tương thích hoàn toàn với nền tối Dark Theme và màn hình điện thoại dưới 768px.

---

## 7. Kế Hoạch Triển Khai

1. **Cài đặt thư viện**: Thêm `driver.js` vào dependencies.
2. **Xây dựng State & Service**: Tạo `tutorialStore.ts`, `tourService.ts`, `tourSteps.ts`.
3. **Cập nhật i18n**: Bổ sung key ngôn ngữ tiếng Việt & tiếng Anh.
4. **Gắn Data-tour Attributes**: Gắn `data-tour` vào `NavRail`, `InboxPanel`, `ChatPanel`, `StoryFeed`, `ProfilePage`, `SettingsPage`.
5. **Xây dựng UI Badge & Settings Replay**: Tạo `FeatureBadge.tsx` và tích hợp Card Replay vào `SettingsPage`.
6. **Kiểm thử & Tinh chỉnh**: Kiểm tra chạy trên desktop, mobile, xem lại tour, và lưu trữ localStorage.
