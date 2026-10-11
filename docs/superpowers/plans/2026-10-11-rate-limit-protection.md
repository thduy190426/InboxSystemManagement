# Rate Limit & Anti-Spam Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai cơ chế Rate Limiting và Anti-Spam toàn diện trên mọi trang và endpoint API của hệ thống InboxSystemManagement, bổ sung dọn rác tự động chống rò rỉ bộ nhớ ở Backend và hiển thị đếm ngược 429 thân thiện ở Frontend.

**Architecture:** Sử dụng Sliding Window in-memory tối ưu hóa có gắn timer dọn dẹp TTL rác định kỳ trên Express. Áp dụng middleware Rate Limiter chuyên biệt theo từng loại tài nguyên (upload nặng, gửi tin nhắn, tạo nhóm, kết bạn, đổi mật khẩu, link preview) kết hợp với interceptor 429 và bảo vệ nút submit ở React Frontend.

**Tech Stack:** Node.js, Express, JavaScript, React 19, TypeScript, Sonner Toast, i18next, Vite.

## Global Constraints

- Không cài thêm thư viện bên ngoài không cần thiết; tận dụng kiến trúc middleware native hiện có.
- Không làm gián đoạn luồng người dùng bình thường (ngưỡng giới hạn cân đối giữa bảo mật và trải nghiệm).
- Header phản hồi phải tuân thủ chuẩn: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`.
- Mã lỗi trả về chuẩn `429 Too Many Requests`.
- Toàn bộ thay đổi phải vượt qua `npm run check` (Backend) và `npm run build` (Frontend).

---

### Task 1: Nâng cấp Bộ lõi Rate Limiter & Cơ chế Dọn rác Bộ nhớ (Backend)

**Files:**
- Modify: `backend/src/middleware/rateLimit.middleware.js`
- Test: `backend/test_rate_limit.js` (Scratch test script)

**Interfaces:**
- Consumes: Express `(request, response, next)`
- Produces: `createRateLimiter`, `cleanupExpiredBuckets`, cùng các bộ Rate Limiter:
  - `oauthRateLimit` (15/15m per IP)
  - `verify2FASetupRateLimit` (10/15m per user)
  - `presenceRateLimit` (60/1m per user)
  - `createStoryRateLimit` (5/10m per user)
  - `attachmentUploadRateLimit` (10/1m per user)
  - `createConversationRateLimit` (15/1m per user)
  - `createGroupRateLimit` (5/10m per user)
  - `typingRateLimit` (30/1m per user)
  - `reactionRateLimit` (60/1m per user)
  - `reportMessageRateLimit` (5/10m per user)
  - `groupInviteRateLimit` (10/5m per user)
  - `friendRequestRateLimit` (10/1m per user)
  - `changePasswordRateLimit` (5/15m per user)
  - `updateProfileRateLimit` (20/1m per user)
  - `linkPreviewRateLimit` (15/1m per user)

- [ ] **Step 1: Viết test kịch bản kiểm tra Rate Limiter và Auto-Cleanup**

Tạo file `backend/test_rate_limit.js` để test cơ chế sliding window, chặn khi quá giới hạn, sinh headers chuẩn và xoá key hết hạn.

- [ ] **Step 2: Nâng cấp `backend/src/middleware/rateLimit.middleware.js`**

Thêm `cleanupExpiredBuckets()` chạy ngầm định kỳ mỗi 5 phút, thêm headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`, và định nghĩa đầy đủ các limiter mới.

- [ ] **Step 3: Chạy test kịch bản**

Run: `node backend/test_rate_limit.js`  
Expected: PASS toàn bộ các case (chặn 429, đúng retryAfterSeconds, dọn sạch buckets hết hạn).

- [ ] **Step 4: Dọn dẹp file test tạm và Commit Task 1**

```bash
git add backend/src/middleware/rateLimit.middleware.js
git commit -m "feat(backend): upgrade rate limiter with auto-purge and comprehensive limits"
```

---

### Task 2: Gắn Rate Limiter vào Tất cả các Routes API còn thiếu

**Files:**
- Modify: `backend/src/routes/system/auth.routes.js`
- Modify: `backend/src/routes/core/conversation.routes.js`
- Modify: `backend/src/routes/core/story.routes.js`
- Modify: `backend/src/routes/core/contact.routes.js`
- Modify: `backend/src/routes/core/user.routes.js`
- Modify: `backend/src/routes/link.routes.js`

**Interfaces:**
- Gắn các middleware mới vào các endpoint:
  - `auth.routes.js`: `/google`, `/facebook`, `/2fa/verify-setup`, `/presence`
  - `conversation.routes.js`: `/direct`, `/groups`, `/messages/attachments`, `/typing`, `/messages/:messageId/reactions`, `/messages/:messageId/report`, `/join/:token`, `/invite/reset`
  - `story.routes.js`: `POST /`
  - `contact.routes.js`: `POST /request`
  - `user.routes.js`: `PATCH /me/password`, `PATCH /me`
  - `link.routes.js`: `GET /`

- [ ] **Step 1: Cập nhật `auth.routes.js`**
- [ ] **Step 2: Cập nhật `conversation.routes.js`**
- [ ] **Step 3: Cập nhật `story.routes.js`**
- [ ] **Step 4: Cập nhật `contact.routes.js`**
- [ ] **Step 5: Cập nhật `user.routes.js`**
- [ ] **Step 6: Cập nhật `link.routes.js`**
- [ ] **Step 7: Kiểm tra cú pháp toàn bộ backend**

Run: `npm --prefix backend run check`  
Expected: Tất cả các file kiểm tra hợp lệ không có lỗi cú pháp.

- [ ] **Step 8: Commit Task 2**

```bash
git add backend/src/routes/
git commit -m "feat(backend): attach rate limiters across all API endpoints"
```

---

### Task 3: Cập nhật Frontend API Client & Bắt lỗi HTTP 429 Thân thiện

**Files:**
- Modify: `src/services/api/apiClient.ts`
- Modify: `src/locales/vi.json`
- Modify: `src/locales/en.json`

**Interfaces:**
- Consumes: Response headers `Retry-After`, response body `retryAfterSeconds`
- Produces: `ApiRequestError` mở rộng trường `retryAfterSeconds?: number` và hiển thị toast tiếng Việt/Anh đếm ngược trực quan.

- [ ] **Step 1: Cập nhật `src/services/api/apiClient.ts`**
Thêm xử lý khi status là 429: đọc `Retry-After` header hoặc `retryAfterSeconds` từ body, gán vào `ApiRequestError`.

- [ ] **Step 2: Bổ sung từ điển dịch thuật trong `vi.json` và `en.json`**
Thêm các chuỗi thông báo rate limit rõ ràng.

- [ ] **Step 3: Commit Task 3**

```bash
git add src/services/api/apiClient.ts src/locales/vi.json src/locales/en.json
git commit -m "feat(frontend): handle HTTP 429 with retry-after toast notifications"
```

---

### Task 4: Kiểm tra và Tối ưu Chống Double-Click / Spam Submit trên Giao diện

**Files:**
- Inspect & Verify: `src/components/views/ProfilePage.tsx`
- Inspect & Verify: `src/components/panels/ContactsPanel.tsx`
- Inspect & Verify: `src/components/panels/InboxPanel.tsx`
- Inspect & Verify: `src/components/views/ChatApp.tsx`

- [ ] **Step 1: Rà soát trạng thái disabled khi submit ở các modal và form**
Đảm bảo khi người dùng nhấn "Đổi mật khẩu", "Tạo nhóm", "Gửi kết bạn", "Đăng tin", nút luôn bị khóa (disabled/loading) ngăn click dồn dập.

- [ ] **Step 2: Commit Task 4**

```bash
git add src/components/
git commit -m "fix(frontend): strengthen double-click prevention on key action buttons"
```

---

### Task 5: Kiểm thử Tổng thể & Xác thực Toàn diện (Verification)

- [ ] **Step 1: Chạy `npm --prefix backend run check`**
- [ ] **Step 2: Chạy `npm run build`** (Kiểm tra TypeScript và đóng gói Frontend)
- [ ] **Step 3: Chạy script kiểm thử bắn request liên tiếp tới endpoint để xác nhận mã 429 được trả về chính xác**
- [ ] **Step 4: Hoàn tất và sẵn sàng bàn giao**
