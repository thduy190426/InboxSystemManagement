# Tài liệu đặc tả kỹ thuật: Hồ sơ công khai (Public Profile)

- **Ngày tạo:** 2026-10-13
- **Tác giả:** Antigravity Agent
- **Trạng thái:** Bản thảo hoàn chỉnh (Pending Review)
- **Mục tiêu:** Nâng cấp trang cá nhân (`ProfilePage.tsx`) thành Hồ sơ công khai toàn diện chuẩn mạng xã hội (tương tự Facebook/Twitter/Instagram), bao gồm: Ảnh bìa (Cover photo), Dòng thời gian (Timeline & Posts), Danh sách bạn bè (Friends), và Quan hệ Theo dõi (Follow/Unfollow).

---

## 1. Tổng quan & Phạm vi (Scope & Objectives)

### 1.1. Hiện trạng
- Trang [`ProfilePage.tsx`](file:///c:/Users/duyho/Downloads/InboxSystemManagement/src/components/views/ProfilePage.tsx) hiện tại chỉ đóng vai trò là form chỉnh sửa thông tin cá nhân của người dùng đăng nhập (Avatar, Bio, Phone, Address, Gender, BirthDate, Status message, Story highlights).
- Người dùng chưa có trang cá nhân công khai để người khác ghé thăm, chưa có ảnh bìa (Cover Photo), chưa có Dòng thời gian (Timeline) để đăng bài và tương tác, cũng như chưa có cơ chế Theo dõi 1 chiều (Follow/Unfollow).

### 1.2. Mục tiêu sau khi hoàn thành
1. **Trang cá nhân toàn diện (Unified Profile Experience):** Dùng chung một giao diện sang trọng cho cả việc xem trang cá nhân của chính mình (`isOwnProfile === true`) và xem hồ sơ công khai của người dùng khác (`isOwnProfile === false`).
2. **Ảnh bìa (Cover Photo):** Tỉ lệ 3:1 hoặc 16:9 sắc nét, hỗ trợ tải lên/thay đổi ảnh bìa, lưu trữ IndexedDB/API, có gradient nghệ thuật mặc định.
3. **Dòng thời gian (Timeline & Posts):**
   - Hộp tạo bài viết (Post Composer) cho chủ tài khoản: nhập nội dung, đính kèm nhiều hình ảnh/video, chọn quyền riêng tư (*Công khai*, *Bạn bè*, *Chỉ mình tôi*).
   - Feed danh sách bài viết: hiển thị bài đăng theo thứ tự thời gian mới nhất, hỗ trợ Thả cảm xúc (Like/Love/Haha), Bình luận (Comments) theo thời gian thực và Xóa/Ẩn bài viết của mình.
4. **Danh sách bạn bè (Friends Tab):** Tích hợp sâu với hệ thống bạn bè [`contactApi`](file:///c:/Users/duyho/Downloads/InboxSystemManagement/src/services/api/contactApi.ts), hiển thị danh sách bạn bè, trạng thái trực tuyến và số bạn chung (Mutual Friends).
5. **Theo dõi / Bỏ theo dõi (Followers & Following Tab):**
   - Hệ thống quan hệ 1 chiều: Người dùng có thể nhấn "Theo dõi / Bỏ theo dõi" bất kỳ ai công khai.
   - Hiển thị số lượng Followers và Following trên thanh thống kê và trong tab chuyên biệt.
6. **Đa ngôn ngữ (i18n):** Tích hợp 100% tiếng Việt (`vi.json`) và tiếng Anh (`en.json`).

---

## 2. Kiến trúc thành phần (Component Hierarchy)

```
ProfilePage
├── ProfileCover (Ảnh bìa + Nút thay đổi ảnh bìa + Gradient nghệ thuật)
├── ProfileHeader
│   ├── Avatar lớn đè mép bìa (với AvatarFallback, Role badge, Presence dot)
│   ├── User Meta: DisplayName, Handle (@handle), Bio
│   ├── Action Buttons:
│   │   ├── Nếu chính mình: [Chỉnh sửa hồ sơ] [Đổi ảnh bìa]
│   │   └── Nếu người khác: [Nhắn tin] [Kết bạn / Huỷ kết bạn] [Theo dõi / Bỏ theo dõi]
│   ├── Stats Bar: [Bài viết] • [Bạn bè] • [Người theo dõi] • [Đang theo dõi]
│   └── StoryHighlightBar (Highlights nổi bật)
├── ProfileTabsNavigation
│   ├── Tab: Dòng thời gian (Timeline)
│   ├── Tab: Giới thiệu & Cài đặt (About & Edit)
│   ├── Tab: Bạn bè (Friends)
│   └── Tab: Người theo dõi (Followers & Following)
└── TabContent
    ├── [TimelineTab]
    │   ├── PostComposer (nếu isOwnProfile)
    │   └── PostFeed (PostCard, PostMedia, PostReactions, PostComments)
    ├── [AboutTab]
    │   ├── Thông tin liên hệ, công việc, nơi ở, giới tính, ngày sinh
    │   └── Form chỉnh sửa hồ sơ (với đầy đủ validation & Avatar cropper)
    ├── [FriendsTab]
    │   └── FriendsGrid (Card bạn bè, Avatar, Tên, Bạn chung, Nút nhắn tin)
    └── [FollowersTab]
        ├── Subtab: Người theo dõi (Followers)
        └── Subtab: Đang theo dõi (Following)
```

---

## 3. Thiết kế tầng dữ liệu (Data Models & Storage)

### 3.1. Types & Interfaces (`src/types/timeline.ts`)
```ts
export type PostPrivacy = 'public' | 'friends' | 'only_me'

export type PostReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'

export type PostReaction = {
  userId: string
  userName: string
  type: PostReactionType
  createdAt: string
}

export type PostComment = {
  id: string
  postId: string
  userId: string
  userName: string
  userAvatar?: string | null
  userHandle?: string | null
  content: string
  createdAt: string
}

export type TimelinePost = {
  id: string
  userId: string
  authorName: string
  authorAvatar?: string | null
  authorHandle?: string | null
  authorRole?: string | null
  content: string
  mediaUrls: string[]
  privacy: PostPrivacy
  reactions: PostReaction[]
  comments: PostComment[]
  createdAt: string
  updatedAt?: string
}

export type FollowStats = {
  followersCount: number
  followingCount: number
  isFollowing: boolean
}
```

### 3.2. Dịch vụ lưu trữ & API (`src/services/api/timelineApi.ts`)
- **Lưu trữ Offline & Sync:** Sử dụng IndexedDB (`profileStore` và `timelineStore`) với LocalStorage fallback đảm bảo ứng dụng chạy tức thì, mượt mà và bền vững dữ liệu khi tải lại trang hoặc khi offline.
- **REST Endpoints & Mock Adapters:**
  - `GET /users/:userId/posts`: Lấy danh sách bài viết trên dòng thời gian.
  - `POST /users/posts`: Đăng bài viết mới kèm ảnh (Multipart form data hoặc base64 cache).
  - `DELETE /users/posts/:postId`: Xóa bài viết của chính mình.
  - `POST /users/posts/:postId/react`: Thả/Hủy cảm xúc bài viết.
  - `POST /users/posts/:postId/comments`: Thêm bình luận vào bài viết.
  - `GET /users/:userId/follow-stats`: Lấy số lượng followers, following và trạng thái quan hệ.
  - `POST /users/:userId/follow`: Bắt đầu theo dõi người dùng.
  - `POST /users/:userId/unfollow`: Bỏ theo dõi người dùng.
  - `POST /users/cover`: Tải lên và cập nhật ảnh bìa tài khoản.

---

## 4. Trải nghiệm người dùng & Chi tiết tương tác (UI / UX Details)

### 4.1. Ảnh bìa (Profile Cover)
- Kích thước: Chiều cao 220px - 280px (responsive), bo góc mềm mại 16px, tỉ lệ co giãn `object-fit: cover`.
- Nút "Thay đổi ảnh bìa" nằm ở góc phải ảnh bìa với biểu tượng `Camera`, hỗ trợ xem trước và crop/upload mượt mà.
- Gradient mặc định cao cấp (Modern Teal to Deep Navy Gradient) nếu người dùng chưa đặt ảnh bìa.

### 4.2. Dòng thời gian (Timeline Tab)
- **Hộp tạo bài viết:**
  - Ô nhập văn bản hỗ trợ auto-resize, placeholder thân thiện "Bạn đang nghĩ gì thế, [Tên]?".
  - Nút thêm ảnh: cho phép chọn nhiều hình ảnh xem trước, có nút xóa từng ảnh trước khi đăng.
  - Bộ chọn quyền riêng tư: Công khai (Trái đất), Bạn bè (Nhóm người), Chỉ mình tôi (Ổ khóa).
  - Nút Đăng bài với animation loading.
- **Thẻ bài viết (Post Card):**
  - Header: Avatar tác giả (click để xem profile), Tên, Handle, thời gian đăng (dạng "vừa xong", "5 phút trước", "Hôm qua"), biểu tượng quyền riêng tư.
  - Nội dung văn bản với font chữ dễ đọc, nhận diện link URL tự động.
  - Lưới hình ảnh (Image Grid): tự động căn chỉnh layout 1 ảnh, 2 ảnh, 3 ảnh hoặc 4+ ảnh đẹp mắt.
  - Thanh tương tác:
    - Nút Thích: hiển thị biểu tượng trái tim/ngón tay cái, bấm để đổi trạng thái, hiển thị số lượt thích.
    - Nút Bình luận: bấm để mở/đóng khung bình luận.
  - Khung bình luận:
    - Danh sách các bình luận trước đó với avatar tác giả và thời gian.
    - Ô nhập bình luận nhanh có nút Gửi hoặc phím Enter để đăng ngay lập tức.

### 4.3. Bạn bè & Theo dõi (Friends & Follow Tabs)
- **Tab Bạn bè:** Hiển thị số lượng bạn bè, danh sách thẻ bạn bè dạng card hiện đại với AvatarFallback, Tên, Handle, số bạn chung, và nút "Nhắn tin".
- **Tab Theo dõi:**
  - Bộ chuyển đổi 2 danh sách con: "Người theo dõi" (Followers) và "Đang theo dõi" (Following).
  - Thẻ người dùng với nút hành động tức thì: "Theo dõi lại" / "Đang theo dõi" / "Bỏ theo dõi".

---

## 5. Kế hoạch kiểm thử & Đảm bảo chất lượng (QA & Verification)

1. **Kiểm thử giao diện & Responsive:**
   - Kiểm tra hiển thị trên Mobile (375px), Tablet (768px) và Desktop (1280px+).
   - Kiểm tra độ sắc nét và co giãn của Ảnh bìa và Lưới ảnh bài viết.
2. **Kiểm thử luồng dữ liệu (State & Persistence):**
   - Đăng bài viết mới, kiểm tra bài viết xuất hiện ngay đầu dòng thời gian.
   - Thả tim và thêm bình luận, kiểm tra đếm lượt và cập nhật giao diện không cần reload.
   - Thử theo dõi/bỏ theo dõi một người dùng khác, kiểm tra biến động của chỉ số thống kê.
   - F5 tải lại trang: kiểm tra toàn bộ bài viết, ảnh bìa, danh sách theo dõi được phục hồi đầy đủ.
3. **Kiểm thử tương thích i18n:**
   - Chuyển đổi qua lại giữa tiếng Việt và tiếng Anh, đảm bảo không còn chuỗi tiếng Việt hardcoded nào.
4. **Kiểm thử Typecheck & Production Build:**
   - Chạy `npm run build` (`tsc && vite build`) đảm bảo 0 lỗi TypeScript, 0 lỗi bundle.
