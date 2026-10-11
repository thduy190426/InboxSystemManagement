# Rate Limiting & Anti-Spam Protection Design

**Date:** 2026-10-11  
**Author:** AI Assistant & Duy Ho  
**Status:** Approved  

---

## 1. Mục tiêu (Goals)
Bảo vệ toàn diện hệ thống InboxSystemManagement chống lại các hành vi spam, tự động hóa độc hại (bots), tấn công brute-force và gửi dữ liệu quá tải (overload/DoS) trên mọi trang và endpoint API, đồng thời:
1. Đảm bảo an toàn tài nguyên máy chủ: CPU, băng thông mạng và ngăn ngừa Memory Leak từ cơ chế lưu trữ Rate Limit in-memory.
2. Trải nghiệm người dùng (UX) mượt mà: phản hồi rõ ràng mã lỗi HTTP 429 kèm thời gian chờ (`Retry-After`) và hiển thị đếm ngược trực quan ở giao diện.
3. Chặn spam ngay từ tầng Client UI: vô hiệu hóa nút submit (disable state) khi đang gửi dữ liệu và áp dụng debounce cho các trường tìm kiếm/nhập liệu.

---

## 2. Kiến trúc & Giải pháp kỹ thuật

### 2.1. Tầng Backend: Nâng cấp `rateLimit.middleware.js`
- **Bộ nhớ trượt (Sliding Window in-memory)**: Lưu danh sách mốc thời gian (timestamps) của các request gần nhất cho mỗi định danh (`key = prefix:identity`).
- **Cơ chế dọn rác tự động (Auto-Purge Garbage Collection)**:
  - Khắc phục lỗi rò rỉ bộ nhớ hiện hữu (Map `buckets` không bao giờ giải phóng key).
  - Tích hợp hàm dọn dẹp định kỳ chạy ngầm (mỗi 5 phút) bằng `setInterval.unref()`.
  - Quét toàn bộ key trong `buckets`, xóa các bucket rỗng hoặc có tất cả timestamp đã vượt quá cửa sổ `windowMs` hoặc không có hoạt động trong 10 phút.
- **Tiêu chuẩn HTTP Header**:
  - Trả về header `Retry-After: <seconds>` khi chạm ngưỡng giới hạn.
  - Trả về `X-RateLimit-Limit` và `X-RateLimit-Remaining` để client dễ theo dõi.
  - Mã trạng thái: `429 Too Many Requests`.

### 2.2. Danh mục Rate Limiter theo từng phân hệ API

#### Phân hệ 1: Xác thực & Bảo mật (Auth & Security)
- `loginRateLimit`: 8 req / 15 phút (theo IP) - `POST /api/auth/login`, `POST /api/auth/login-2fa`.
- `registerRateLimit`: 5 req / 60 phút (theo IP) - `POST /api/auth/register`.
- `oauthRateLimit`: 15 req / 15 phút (theo IP) - `POST /api/auth/google`, `POST /api/auth/facebook`.
- `forgotPasswordRateLimit`: 5 req / 60 phút (theo IP) - `POST /api/auth/forgot-password`.
- `resetPasswordRateLimit`: 10 req / 60 phút (theo IP) - `POST /api/auth/reset-password`.
- `verificationRateLimit`: 10 req / 60 phút (theo IP) - `POST /api/auth/verify`.
- `resendVerificationRateLimit`: 5 req / 60 phút (theo IP) - `POST /api/auth/resend-verification`.
- `verify2FASetupRateLimit`: 10 req / 15 phút (theo User) - `POST /api/auth/2fa/verify-setup`.
- `presenceRateLimit`: 60 req / 1 phút (theo User) - `POST /api/auth/presence`.

#### Phân hệ 2: Tin nhắn & Hội thoại (Conversations & Messaging)
- `sendMessageRateLimit`: 20 req / 1 phút (theo User) - `POST /api/conversations/:id/messages`, `.../gif`, `.../forward`.
- `attachmentUploadRateLimit`: 10 files / 1 phút (theo User) - `POST /api/conversations/:id/messages/attachments`.
- `createConversationRateLimit`: 15 req / 1 phút (theo User) - `POST /api/conversations/direct`.
- `createGroupRateLimit`: 5 nhóm / 10 phút (theo User) - `POST /api/conversations/groups`.
- `typingRateLimit`: 30 req / 1 phút (theo User) - `POST /api/conversations/:id/typing`.
- `reactionRateLimit`: 60 req / 1 phút (theo User) - `POST /api/conversations/:id/messages/:messageId/reactions`.
- `reportMessageRateLimit`: 5 req / 10 phút (theo User) - `POST /api/conversations/:id/messages/:messageId/report`.
- `groupInviteRateLimit`: 10 req / 5 phút (theo User) - `POST /api/conversations/join/:token`, `POST /.../invite/reset`.

#### Phân hệ 3: Tải nội dung nặng (Heavy Media & Stories)
- `createStoryRateLimit`: 5 req / 10 phút (theo User) - `POST /api/stories` (ngăn chặn spam tệp đa phương tiện tới 50MB làm cạn kiệt RAM).

#### Phân hệ 4: Danh bạ & Kết bạn (Contacts & Social)
- `friendRequestRateLimit`: 10 req / 1 phút (theo User) - `POST /api/contacts/request`.
- `searchRateLimit`: 30 req / 1 phút (theo User) - `GET /api/contacts/search`, `GET /api/search`, `GET /api/conversations/:id/messages/search`.

#### Phân hệ 5: Người dùng & Cài đặt (User & Settings)
- `changePasswordRateLimit`: 5 req / 15 phút (theo User) - `PATCH /api/users/me/password`.
- `uploadAvatarRateLimit`: 3 req / 1 phút (theo User) - `PATCH /api/users/me/avatar`.
- `updateProfileRateLimit`: 20 req / 1 phút (theo User) - `PATCH /api/users/me`.

#### Phân hệ 6: Tiện ích & Ngoại vi (Utilities & Link Preview)
- `linkPreviewRateLimit`: 15 req / 1 phút (theo User) - `GET /api/link-preview` (chống SSRF abuse và bão hòa connection pool).

#### Phân hệ 7: Bảo vệ toàn cục (Global Fallback)
- `globalRateLimit`: 10,000 req / 15 phút (theo IP) - `ALL /api/*`.

---

### 2.3. Tầng Frontend: Xử lý HTTP 429 & UI Anti-Spam Guard
1. **Bắt lỗi 429 trong `apiClient.ts`**:
   - Khi `response.status === 429`, đọc header `Retry-After` (hoặc body `retryAfterSeconds`).
   - Gửi thông báo toast lỗi rõ ràng kèm thời gian đếm ngược (định dạng: *"Bạn thao tác quá nhanh. Vui lòng thử lại sau {X} giây!"*).
   - Truyền `retryAfterSeconds` trong `ApiRequestError` để các component có thể xử lý trạng thái khóa nút nếu cần.
2. **Ngăn chặn Double Click / Rapid Form Submission**:
   - Rà soát các component: Đổi mật khẩu (`ProfilePage`), Gửi kết bạn (`ContactsPanel`), Tạo nhóm (`InboxPanel`), Đăng story (`StoryList`/`StoryModal`).
   - Đảm bảo thuộc tính `disabled` hoặc cờ `isSubmitting` được kích hoạt ngay khi người dùng bấm gửi.
3. **Quản lý đa ngôn ngữ (i18n)**:
   - Thêm các key dịch thuật tương ứng trong `src/locales/vi.json` và `src/locales/en.json` cho các thông điệp cảnh báo Rate Limit.

---

## 3. Kế hoạch kiểm thử & Đánh giá (Testing Strategy)
- Chạy unit/integration test hoặc script kiểm thử tự động bắn lặp các request tới các endpoint vừa thiết lập rate limit (ví dụ `POST /api/stories`, `POST /api/contacts/request`, `PATCH /api/users/me/password`, `POST /api/conversations/:id/typing`).
- Xác minh mã trạng thái `429 Too Many Requests`, header `Retry-After` và định dạng JSON phản hồi.
- Kiểm tra tính hợp lệ của cơ chế dọn dẹp bộ nhớ (garbage collection) không để lại rò rỉ.
- Kiểm tra linting và kiểm tra cú pháp TypeScript/JavaScript (`npm run check` trên backend và `npm run build` trên frontend).
