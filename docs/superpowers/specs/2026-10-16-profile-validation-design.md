# Tài liệu đặc tả kỹ thuật: Hệ thống Validation Trang Cá Nhân (ProfilePage)

- **Ngày tạo:** 2026-10-16
- **Tác giả:** Antigravity Agent
- **Trạng thái:** Đã phê duyệt (Approved)
- **Mục tiêu:** Bổ sung cơ chế validate toàn diện cho các phần tử trên trang cá nhân (`ProfilePage.tsx`), bao gồm: Form thông tin cá nhân (`AboutTab.tsx`), Kiểm tra tệp tải lên (Avatar & Ảnh bìa trong `ProfilePage.tsx`, `ProfileCover.tsx`, `ProfileHeader.tsx`), và Giới hạn tạo bài viết/bình luận (`TimelineTab.tsx`).

---

## 1. Mục tiêu & Phạm vi (Objectives & Scope)

### 1.1. Hiện trạng
1. **Form thông tin cá nhân (`AboutTab.tsx`)**:
   - Hiện chỉ kiểm tra rỗng cho `displayName` và regex đơn giản cho `handle`.
   - Các trường `phone`, `birthDate`, `address`, `bio`, `statusMessage` hoàn toàn chưa có kiểm tra định dạng hoặc giới hạn độ dài.
2. **Tải tệp Avatar & Ảnh bìa (`ProfilePage.tsx`)**:
   - Chưa kiểm tra dung lượng tối đa (file size limit). Người dùng có thể vô tình chọn file quá nặng gây đơ trình duyệt hoặc tràn bộ nhớ.
   - Chưa kiểm tra chặt chẽ định dạng MIME type cho phép (chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF).
3. **Dòng thời gian (`TimelineTab.tsx`)**:
   - Bài viết chưa có giới hạn độ dài ký tự tối đa (nếu paste text siêu dài sẽ vỡ giao diện).
   - Chưa giới hạn số lượng ảnh tải lên cùng một bài viết (upload vô hạn).
   - Bình luận chưa kiểm tra độ dài tối đa.

### 1.2. Giải pháp sau khi hoàn thành
1. Xây dựng module dùng chung `src/utils/profileValidation.ts` chứa các hằng số, biểu thức chính quy (regex), và các hàm validate dạng pure functions độc lập.
2. Tích hợp kiểm tra form vào `AboutTab.tsx`, phản hồi lỗi inline màu đỏ ngay dưới từng trường nhập liệu.
3. Tích hợp kiểm tra tệp vào `ProfilePage.tsx` khi người dùng chọn ảnh đại diện (`handleAvatarSelect`) và ảnh bìa (`handleCoverChange`), bật thông báo toast lỗi khi tệp không hợp lệ.
4. Tích hợp kiểm tra giới hạn bài đăng và bình luận vào `TimelineTab.tsx`.

---

## 2. Chi tiết quy chuẩn Validation (Rules & Constraints)

### 2.1. Form thông tin cá nhân (`AboutTab`)
* **Tên hiển thị (`displayName`)**:
  * Bắt buộc (`required`).
  * Độ dài từ 2 đến 50 ký tự sau khi cắt tỉa khoảng trắng (`trim()`).
* **Tên định danh (`handle`)**:
  * Không bắt buộc, nhưng nếu nhập thì phải có từ 3 đến 32 ký tự, chỉ chứa chữ thường, số, dấu chấm và gạch dưới: `/^[a-z0-9][a-z0-9._]{2,31}$/`.
* **Số điện thoại (`phone`)**:
  * Không bắt buộc, nhưng nếu nhập phải đúng định dạng số điện thoại Việt Nam hoặc quốc tế (từ 9 đến 15 chữ số/kí tự hợp lệ: `/^[+]?[0-9\s().-]{9,15}$/`).
* **Ngày sinh (`birthDate`)**:
  * Không bắt buộc, nhưng nếu nhập không được là ngày trong tương lai.
  * Năm sinh tối thiểu từ năm 1900 trở đi và độ tuổi tối thiểu từ 6 tuổi trở lên.
* **Địa chỉ (`address`)**:
  * Tối đa 200 ký tự.
* **Tiểu sử (`bio`)**:
  * Tối đa 300 ký tự.
* **Trạng thái cá nhân (`statusMessage`)**:
  * Tối đa 100 ký tự.

### 2.2. Tệp ảnh đại diện & Ảnh bìa (`ProfileHeader` / `ProfileCover` / `ProfilePage`)
* **Định dạng cho phép (`ALLOWED_IMAGE_TYPES`)**:
  * `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
* **Dung lượng tối đa**:
  * Ảnh đại diện (`MAX_AVATAR_SIZE`): `5MB` (5 * 1024 * 1024 bytes).
  * Ảnh bìa (`MAX_COVER_SIZE`): `10MB` (10 * 1024 * 1024 bytes).
* **Phản hồi**: Hiển thị Toast thông báo lỗi cụ thể (ví dụ: "Dung lượng ảnh vượt quá 5MB", "Định dạng ảnh không được hỗ trợ").

### 2.3. Bài viết & Bình luận (`TimelineTab`)
* **Bài viết (`Post Composer`)**:
  * Bắt buộc phải có nội dung chữ HOẶC có ít nhất 1 ảnh đính kèm.
  * Nội dung chữ tối đa `2.000` ký tự.
  * Số lượng ảnh đính kèm tối đa `10` ảnh trên mỗi bài viết.
  * Mỗi ảnh đính kèm không vượt quá `5MB` và phải đúng định dạng ảnh.
* **Bình luận (`Post Comment`)**:
  * Bắt buộc có nội dung (không được rỗng sau khi trim).
  * Tối đa `500` ký tự.

---

## 3. Kiến trúc Module & Giao diện (Interfaces & Architecture)

### 3.1. File `src/utils/profileValidation.ts`
```typescript
export const PROFILE_LIMITS = {
  DISPLAY_NAME_MIN: 2,
  DISPLAY_NAME_MAX: 50,
  HANDLE_MIN: 3,
  HANDLE_MAX: 32,
  PHONE_MIN: 9,
  PHONE_MAX: 15,
  ADDRESS_MAX: 200,
  BIO_MAX: 300,
  STATUS_MESSAGE_MAX: 100,
  POST_CONTENT_MAX: 2000,
  POST_MAX_MEDIA: 10,
  COMMENT_CONTENT_MAX: 500,
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_COVER_SIZE: 10 * 1024 * 1024,  // 10MB
  MAX_MEDIA_FILE_SIZE: 5 * 1024 * 1024 // 5MB
}

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

export function validateImageFile(file: File, options?: { maxSizeBytes?: number; allowedTypes?: string[] }): { isValid: boolean; error?: string }
export function validateProfileForm(form: ProfilePayload, t?: (key: string, options?: any) => string): { isValid: boolean; errors: Partial<Record<keyof ProfilePayload, string>> }
export function validatePostContent(content: string, mediaCount: number, t?: (key: string, options?: any) => string): { isValid: boolean; error?: string }
export function validateCommentContent(content: string, t?: (key: string, options?: any) => string): { isValid: boolean; error?: string }
```

### 3.2. Luồng dữ liệu (Data Flow)
1. **AboutTab Form Submit**:
   - Gọi `validateProfileForm(form, t)`.
   - Nếu `!isValid`: gán state `errors`, tự động focus hoặc làm nổi bật trường bị lỗi, chặn submit.
   - Nếu `isValid`: xóa lỗi, gọi `onSaveProfile(form)`.
2. **File Selection (Avatar & Cover)**:
   - Trước khi đọc `FileReader` hoặc upload, gọi `validateImageFile(file, { maxSizeBytes, allowedTypes })`.
   - Nếu `!isValid`: gọi `pushToast(error, 'error')`, dừng lại, reset input value.
   - Nếu `isValid`: tiếp tục mở cropper hoặc upload lên API.
3. **Timeline Composer & Comment**:
   - Tương tự kiểm tra trước khi dispatch hành động đăng bài hoặc gửi bình luận.

---

## 4. Kế hoạch kiểm thử & Đảm bảo chất lượng (QA & Testing)
1. Kiểm tra build TypeScript (`npm run build` hoặc `tsc --noEmit`).
2. Kiểm tra trực quan giao diện: các thông báo lỗi hiển thị cân đối, không làm vỡ layout form.
3. Kiểm tra các trường hợp biên:
   - Tên hiển thị chỉ chứa dấu cách -> báo lỗi.
   - Tên hiển thị 1 ký tự -> báo lỗi (< 2 ký tự).
   - Số điện thoại chứa chữ cái -> báo lỗi.
   - Ngày sinh năm 2050 -> báo lỗi (ngày tương lai).
   - File dung lượng > 5MB / file không phải ảnh (file .pdf, .exe) -> báo lỗi và không upload.
