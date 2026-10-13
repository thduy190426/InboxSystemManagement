# Đặc tả Kỹ thuật: Tính năng Vô hiệu hoá Tài khoản Tạm thời (Temporary Account Deactivation)

**Ngày lập:** 2026-10-13  
**Trạng thái:** Chờ phê duyệt (Pending Review)  
**Tác giả:** Antigravity AI Pair Programmer  

---

## 1. Tổng quan (Overview)

Tính năng **Vô hiệu hoá tài khoản tạm thời** cho phép người dùng tự tạm dừng hoạt động tài khoản của mình trên hệ thống thay vì phải xoá vĩnh viễn dữ liệu.

### Mục tiêu chính:
1. **Bảo toàn dữ liệu:** Tin nhắn, lịch sử trò chuyện, danh sách bạn bè, bài viết và tập tin được giữ nguyên vẹn 100%.
2. **Ẩn hồ sơ & Đăng xuất:** Khi tài khoản bị vô hiệu hoá, tài khoản lập tức chuyển sang trạng thái ngoại tuyến (`offline`), thu hồi toàn bộ phiên đăng nhập (sessions) trên tất cả thiết bị, và tạm ẩn đối với người dùng khác.
3. **Kích hoạt lại liền mạch (Seamless Reactivation):** Người dùng có thể quay lại bất cứ lúc nào chỉ bằng cách đăng nhập lại bằng email và mật khẩu hợp lệ. Hệ thống sẽ tự động kích hoạt lại tài khoản và gửi lời chào mừng trở lại.

---

## 2. Luồng Người dùng & Trải nghiệm (User Experience Flow)

### 2.1. Luồng vô hiệu hoá trên trang Cài đặt (Settings Page)
1. Người dùng truy cập tab **Cài đặt** (`SettingsPage`).
2. Tại thanh điều hướng bên trái, chọn mục **"Vô hiệu hoá tài khoản"** (`#deactivate-account`), nằm ngay phía trên mục "Xoá tài khoản".
3. Thẻ Card hiển thị giao diện cảnh báo (màu vàng cam / warning):
   - Tiêu đề: **Vô hiệu hoá tài khoản tạm thời**
   - Mô tả: Giải thích rõ ràng tài khoản sẽ bị ẩn và đăng xuất, nhưng dữ liệu vẫn an toàn và có thể đăng nhập lại bất kỳ lúc nào để mở lại.
   - Trường nhập: **Mật khẩu hiện tại** (bắt buộc).
   - Trường chọn: **Lý do tạm dừng** (tùy chọn: "Tôi cần nghỉ ngơi một thời gian", "Tạm thời không có nhu cầu sử dụng", "Lo ngại về quyền riêng tư", "Lý do khác").
4. Người dùng bấm nút **"Vô hiệu hoá tài khoản"**.
5. Hiển thị hộp thoại `ConfirmDialog` xác nhận hành động.
6. Khi xác nhận thành công:
   - Hệ thống gọi API `POST /users/me/deactivate`.
   - Đăng xuất người dùng, xóa token cục bộ (`authStorage.clearTokens()`).
   - Điều hướng về màn hình Đăng nhập kèm thông báo Toast: *"Tài khoản của bạn đã được vô hiệu hoá tạm thời."*

### 2.2. Luồng tự động kích hoạt lại (Reactivation Flow)
1. Người dùng mở trang Đăng nhập và nhập Email + Mật khẩu tài khoản đã vô hiệu hoá.
2. Backend kiểm tra thông tin đăng nhập:
   - Mật khẩu chính xác.
   - Tài khoản có cờ `deactivated_at IS NOT NULL`.
3. Backend tự động khôi phục tài khoản:
   - Đặt `deactivated_at = NULL`.
   - Cập nhật trạng thái hiện diện `presence = 'online'`.
   - Trả về thông tin đăng nhập kèm cờ `wasReactivated: true`.
4. Frontend nhận token, lưu trữ và điều hướng vào ứng dụng, hiển thị thông báo Toast chào mừng: *"Chào mừng trở lại! Tài khoản của bạn đã được kích hoạt lại thành công."*

---

## 3. Kiến trúc Kỹ thuật & Thiết kế API (Architecture & API Design)

### 3.1. Cơ sở dữ liệu (Database Schema)
Bảng `users` bổ sung cột:
```sql
ALTER TABLE users ADD COLUMN deactivated_at DATETIME NULL DEFAULT NULL;
```
*(Được hỗ trợ kiểm tra và thêm tự động an toàn trong `backend/src/server.js` khi khởi động).*

### 3.2. Backend Endpoints

#### Endpoint 1: Vô hiệu hoá tài khoản
- **Phương thức & URL:** `POST /api/users/me/deactivate`
- **Yêu cầu xác thực:** Bearer Token.
- **Request Body:**
  ```json
  {
    "password": "my_current_password",
    "reason": "Tôi cần nghỉ ngơi một thời gian"
  }
  ```
- **Xử lý:**
  1. Xác minh mật khẩu người dùng với `bcrypt.compare`.
  2. Nếu sai mật khẩu: Trả về HTTP 401 với lỗi `"Mật khẩu hiện tại không đúng!"`.
  3. Bắt đầu Transaction:
     - `UPDATE users SET deactivated_at = CURRENT_TIMESTAMP, presence = 'offline', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
     - `UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL`
  4. Phát socket event `presence:changed` thông báo user đã `offline`.
  5. Commit Transaction và trả về HTTP 200:
     ```json
     {
       "message": "Tài khoản của bạn đã được vô hiệu hoá tạm thời!"
     }
     ```

#### Endpoint 2: Đăng nhập & Tự động kích hoạt lại (`POST /api/auth/login`)
- **Xử lý bổ sung:**
  - Trong hàm `login` tại `backend/src/controllers/system/auth.controller.js`:
  - Sau khi kiểm tra `bcrypt.compare(password, user.password_hash)` thành công:
  - Nếu `user.deactivated_at` có giá trị:
    ```javascript
    await pool.execute(
      `UPDATE users
      SET deactivated_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [user.id],
    )
    const wasReactivated = true
    ```
  - Trả về payload đăng nhập kèm `wasReactivated: true`.

---

## 4. Thiết kế Frontend & Giao diện

### 4.1. File cấu hình & API Client
- `src/services/api/userApi.ts`:
  ```typescript
  export type DeactivateAccountPayload = {
    password: string
    reason?: string
  }

  export function deactivateAccount(payload: DeactivateAccountPayload) {
    return requestJson<{ message: string }>('/users/me/deactivate', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
  ```

### 4.2. Quản lý trạng thái & Hook
- `src/hooks/views/useSettingsPageController.tsx`:
  - Thêm state `deactivateForm` (`{ password: '', reason: '' }`).
  - Thêm state `deactivateErrors` và `isDeactivatingAccount`.
  - Hàm `handleDeactivateAccountSubmit` và xác nhận qua `ConfirmDialog`.

### 4.3. Giao diện [`SettingsPage.tsx`](file:///c:/Users/duyho/Downloads/InboxSystemManagement/src/components/views/SettingsPage.tsx)
- Sidebar Menu thêm item `#deactivate-account` với icon `PauseCircle` và nhãn i18n `navDeactivate`.
- Card Thẻ Vô hiệu hoá với border cảnh báo màu hổ phách/vàng cam, input mật khẩu an toàn, dropdown chọn lý do, và nút bấm xác nhận.

### 4.4. Đa ngôn ngữ (i18n)
Bổ sung đầy đủ các khóa từ vựng trong `src/locales/vi.json` và `src/locales/en.json`:
- `navDeactivate`: "Vô hiệu hoá tài khoản" / "Deactivate Account"
- `deactivateAccount`: "Vô hiệu hoá tài khoản tạm thời" / "Temporary Account Deactivation"
- `deactivateDesc`: "Tạm thời ẩn hồ sơ và đăng xuất..." / "Temporarily hide your profile and log out..."
- `deactivateReason`: "Lý do vô hiệu hoá" / "Reason for deactivation"
- `deactivateConfirmTitle`: "Xác nhận vô hiệu hoá tài khoản" / "Confirm Account Deactivation"
- `deactivateConfirmDesc`: "Bạn có chắc chắn muốn vô hiệu hoá tài khoản không? Bạn có thể mở lại bất cứ lúc nào bằng cách đăng nhập lại." / "Are you sure you want to deactivate your account? You can reactivate anytime by logging back in."
- `deactivateSuccess`: "Tài khoản của bạn đã được vô hiệu hoá tạm thời." / "Your account has been temporarily deactivated."
- `accountReactivated`: "Chào mừng trở lại! Tài khoản của bạn đã được kích hoạt lại thành công." / "Welcome back! Your account has been successfully reactivated."

---

## 5. Kế hoạch Kiểm thử & Xác thực (QA & Verification)

1. **Kiểm tra mật khẩu:** Nhập sai mật khẩu khi vô hiệu hoá -> Báo lỗi xác thực mật khẩu không đúng.
2. **Kiểm tra vô hiệu hoá thành công:** Nhập đúng mật khẩu -> Thu hồi các phiên đăng nhập, đăng xuất, chuyển về trang đăng nhập.
3. **Kiểm tra kích hoạt lại:** Đăng nhập lại với tài khoản vừa vô hiệu hoá -> Đăng nhập thành công, tài khoản khôi phục `deactivated_at = null`, hiển thị toast chào mừng trở lại.
4. **Kiểm tra an toàn hệ thống:** `npx tsc --noEmit` và `npm run build` đạt 100% không lỗi.
