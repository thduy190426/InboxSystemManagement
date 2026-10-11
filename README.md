# Inbox System Management (Nền Tảng Trò Chuyện & Mạng Xã Hội Trực Tuyến)

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

**Inbox System Management** là nền tảng giao tiếp và mạng xã hội trực tuyến toàn diện, cung cấp trải nghiệm nhắn tin thời gian thực, gọi thoại/video chất lượng cao, tính năng Story 24h tương tự Facebook/Messenger/Instagram, mã hóa đầu cuối E2EE, cùng bảng điều khiển quản trị chuyên sâu. Hệ thống sở hữu giao diện người dùng cao cấp với phong cách Glassmorphism hiện đại, hỗ trợ Progressive Web App (PWA) và đa ngôn ngữ hoàn chỉnh.

---

## Mục Tiêu & Tổng Quan Hệ Thống

Dự án được xây dựng với mục tiêu mang lại một môi trường kết nối an toàn, mượt mà và giàu tương tác cho người dùng cá nhân lẫn đội nhóm. Ứng dụng tích hợp kiến trúc micro-features với WebSocket hai chiều, cơ chế tự phục hồi schema cơ sở dữ liệu (Self-healing DB Migration), hệ thống kiểm duyệt nội dung tự động, cùng khả năng phân quyền đa cấp bậc.

---

## Rà Soát Chi Tiết Chức Năng Theo Từng Trang & Phân Hệ

### 1. Trang Đăng Nhập & Xác Thực (`LoginPage.tsx`)
- **Đăng nhập cơ bản:** Hỗ trợ đăng nhập bằng Email và Mật khẩu với cơ chế kiểm tra dữ liệu đầu vào chuẩn xác.
- **Xác thực mạng xã hội (OAuth 2.0):** Đăng nhập nhanh 1-chạm thông qua tài khoản **Google** và **Facebook**.
- **Xác thực 2 lớp (2FA TOTP):** Tự động phát hiện tài khoản đã bật 2FA và hiển thị giao diện nhập mã OTP 6 số từ Google Authenticator / Authy trước khi cấp quyền truy cập.
- **Ghi nhớ đăng nhập (Remember Me):** Lưu trữ phiên làm việc an toàn trên LocalStorage hoặc SessionStorage.
- **Bảo vệ chống Bot (Google reCAPTCHA):** Ngăn chặn các cuộc tấn công tự động và brute-force đăng nhập.
- **Chuyển hướng thông minh:** Tự động điều hướng người dùng quay lại trang trước đó sau khi đăng nhập thành công.

### 2. Trang Đăng Ký Tài Khoản (`RegisterPage.tsx`)
- **Biểu mẫu đăng ký đầy đủ:** Nhập Họ tên, Email, Số điện thoại, Mật khẩu và Xác nhận mật khẩu.
- **Đo lường độ mạnh mật khẩu:** Đánh giá độ an toàn của mật khẩu theo thời gian thực (độ dài, ký tự đặc biệt, chữ hoa, số).
- **Điều khoản & Chính sách:** Tích hợp liên kết trực tiếp đến trang Điều khoản dịch vụ và Chính sách bảo mật.
- **Tự động kích hoạt tài khoản:** Tạo tài khoản ngay lập tức và gửi thông báo chào mừng.

### 3. Trang Quên Mật Khẩu & Khôi Phục (`ForgotPasswordPage.tsx`)
- **Gửi mã xác minh OTP:** Gửi mã xác thực dùng một lần (OTP) về Email người dùng qua dịch vụ Resend hoặc Mailtrap.
- **Đếm ngược thời gian OTP:** Cơ chế đếm ngược gửi lại mã tránh lạm dụng yêu cầu.
- **Đặt lại mật khẩu an toàn:** Nhập mã OTP hợp lệ và đổi mật khẩu mới trực tiếp không cần đăng nhập lại.

### 4. Trang Pháp Lý & Lỗi Điều Hướng (`TermsPage.tsx`, `PrivacyPolicyPage.tsx`, `NotFoundPage.tsx`)
- **Điều khoản sử dụng (`/terms`):** Quy định rõ ràng quyền hạn, trách nhiệm tài khoản và chuẩn mực giao tiếp trong hệ thống.
- **Chính sách bảo mật (`/privacy`):** Minh bạch về cách thức thu thập, lưu trữ, mã hóa và bảo vệ dữ liệu cá nhân.
- **Trang 404 Không tìm thấy (`NotFoundPage.tsx`):** Giao diện thân thiện khi đường dẫn không tồn tại, hỗ trợ nút "Quay lại trang trước" hoặc "Về hộp thư chính".

### 5. Phân Hệ Trò Chuyện & Nhắn Tin Thời Gian Thực (`ChatApp.tsx`, `InboxPanel.tsx`, `ChatPanel.tsx`, `DetailPanel.tsx`)
#### a. Quản lý danh sách hội thoại (Inbox Panel):
- **Phân loại Tab thông minh:** 
  - *Tất cả (All):* Toàn bộ cuộc trò chuyện.
  - *Chưa đọc (Unread):* Lọc nhanh tin nhắn mới chưa xem.
  - *Chờ / Lời mời (Requests):* Tin nhắn từ người lạ chưa kết bạn.
  - *Nhóm (Group):* Các nhóm chat đang tham gia.
  - *Lưu trữ (Archived):* Các cuộc trò chuyện đã ẩn/lưu trữ.
- **Ghim hội thoại (Pin / Unpin):** Ghim các cuộc trò chuyện quan trọng lên vị trí đầu tiên.
- **Tìm kiếm toàn cục (Global Search):** Tìm kiếm tức thì người dùng, bạn bè và nội dung tin nhắn.
- **Tùy biến kích thước danh sách:** Thanh kéo giãn (Resizer) cho phép tùy chỉnh độ rộng danh sách chat từ 320px đến 45vw, hoặc thu gọn thành dạng mini icon (100px).
- **Huy hiệu hoạt động:** Hiển thị chấm trạng thái online và thời lượng trực tuyến (`OnlineDurationBadge`).

#### b. Nhắn tin 1-1 & Trò chuyện nhóm (Direct & Group Chat):
- **Tạo nhóm chat nâng cao:** Đặt tên nhóm, tải ảnh đại diện nhóm, tìm kiếm và thêm thành viên với kiểm tra số lượng tối thiểu.
- **Phân quyền trong nhóm:** Trưởng nhóm (Owner) và Thành viên (Member); kiểm duyệt yêu cầu tham gia (Join Requests), liên kết mời vào nhóm (Invite Link), đổi tên nhóm, đổi avatar, đặt biệt danh (Nicknames).
- **Giải tán & Rời nhóm:** Trưởng nhóm có quyền chuyển nhượng hoặc giải tán nhóm; thành viên có thể rời nhóm bất kỳ lúc nào.
- **Nội dung tin nhắn đa dạng:**
  - Tin nhắn văn bản định dạng rõ ràng, phát hiện liên kết URL tự động.
  - Kho biểu tượng cảm xúc Emoji (`emoji-picker-react`).
  - Kho ảnh động GIF (`GIPHY API`) tìm kiếm theo từ khóa.
  - Thư viện nhãn dán Sticker tĩnh và động phong phú.
  - Đính kèm tệp tin: Hình ảnh, video, âm thanh, tài liệu (hỗ trợ kéo thả Drag & Drop và dán từ Clipboard `Ctrl + V`).
  - Ghi âm và gửi tin nhắn thoại (Voice Message) trực tiếp từ microphone.
- **Trạng thái gửi tin thời gian thực:** Đang gửi (Sending), Đã gửi (Sent), Đã nhận (Delivered), Đã xem (Seen) kèm hiển thị avatar người đã xem.
- **Chỉ báo soạn thảo ("Typing..."):** Hiển thị thời gian thực khi đối phương đang gõ tin nhắn.
- **Tương tác với tin nhắn (Message Context Menu):**
  - Trả lời tin nhắn (Quote Reply).
  - Chuyển tiếp tin nhắn (Forward Message Modal) đến người dùng hoặc nhóm khác.
  - Ghim tin nhắn trong đoạn chat (`PinnedMessagesDrawer`).
  - Thu hồi / Xóa tin nhắn ở cả hai phía hoặc chỉ phía bản thân.
  - Chỉnh sửa nội dung tin nhắn đã gửi.
  - Báo cáo tin nhắn vi phạm (Report Message) gửi đến ban quản trị.
  - Thả cảm xúc Emoji: Reaction đa dạng kèm hiệu ứng bão cảm xúc ("Reaction Storm") tràn màn hình khi nhấn giữ.
- **Cuộc bình chọn nhóm (Group Polls):**
  - Tạo câu hỏi bình chọn (`CreatePollModal.tsx`) với nhiều phương án.
  - Tùy chọn cho phép chọn nhiều mục, bình chọn ẩn danh.
  - Hiển thị thanh tỷ lệ phần trăm và số lượng người bình chọn cập nhật thời gian thực (`PollMessage.tsx`).
- **Mã hóa đầu cuối (E2EE Secret Chat):** Tích hợp công nghệ mã hóa Signal Protocol (`E2EEEngine.ts` với khóa Curve25519) cho các cuộc trò chuyện bí mật.

#### c. Bảng chi tiết cuộc trò chuyện (Detail Panel):
- **Thông tin hội thoại:** Xem thông tin cá nhân đối phương, thành viên nhóm, biệt danh, trạng thái online.
- **Kho lưu trữ phương tiện (Media Gallery):** Phân chia theo tab chuyên biệt:
  - *Hình ảnh (Photos):* Xem toàn bộ ảnh đã gửi (tự động loại trừ ảnh GIF/Emoji).
  - *Video:* Xem các video đã chia sẻ trong đoạn chat.
  - *Tệp tin (Files):* Danh sách tài liệu đính kèm kèm kích thước và ngày gửi.
  - *Liên kết (Links):* Danh sách các đường link đã chia sẻ.
- **Trình xem ảnh/video phóng to (`GalleryViewer.tsx`):** Xem ảnh toàn màn hình, duyệt qua lại giữa các ảnh.
- **Tùy biến hình nền (Chat Wallpaper):** Cài đặt hình nền riêng biệt cho từng cuộc trò chuyện, lưu trữ cục bộ.

### 6. Phân Hệ Gọi Thoại & Gọi Video Trực Tuyến (`CallOverlay.tsx`, `callRealtime.ts`)
- **Cuộc gọi WebRTC P2P:** Gọi âm thanh (Audio Call) và gọi hình ảnh (Video Call) chất lượng cao với độ trễ thấp.
- **Giao diện Overlay linh hoạt:** Cho phép thu nhỏ cuộc gọi xuống góc màn hình để tiếp tục nhắn tin mà không bị ngắt kết nối.
- **Điều khiển cuộc gọi:** Bật/tắt micro, chuyển đổi camera, bật/tắt camera, chia sẻ màn hình máy tính (Screen Sharing).
- **Lịch sử cuộc gọi:** Ghi nhận và hiển thị chi tiết lịch sử cuộc gọi trong đoạn chat (thời gian gọi, thời lượng, cuộc gọi nhỡ).

### 7. Phân Hệ Danh Bạ & Bạn Bè (`ContactsPanel.tsx`)
- **Tìm kiếm bạn bè:** Tìm kiếm người dùng trong toàn hệ thống theo tên, email, tên định danh (@handle).
- **Quản lý quan hệ bạn bè:**
  - Gửi lời mời kết bạn, hủy lời mời đã gửi.
  - Danh sách lời mời kết bạn đã nhận: Chấp nhận hoặc Từ chối.
  - Danh sách Bạn bè: Trực tiếp nhắn tin hoặc gọi điện.
  - Danh sách Đã chặn (Blocked Users): Chặn và bỏ chặn người dùng.
- **Biệt danh riêng tư:** Đặt biệt danh cá nhân hóa cho bạn bè.
- **Hồ sơ nhanh (`ContactProfile`):** Xem chi tiết thông tin công khai của liên hệ trước khi kết bạn.
- **Trạng thái hoạt động:** Cập nhật thời gian thực các trạng thái Online, Offline, Bận (Busy), Vắng mặt (Away).

### 8. Hệ Thống Story (Tin 24h) Đầy Đủ Như Facebook & Messenger
#### a. Bảng tin Story (`StoryFeed.tsx`):
- Thanh Story hình tròn đặt ngay đầu danh sách chat Inbox.
- Hiển thị nút "Tạo tin mới", story của chính mình và danh sách story bạn bè.
- Phân biệt viền gradient hồng/tím rực rỡ cho story thông thường và **viền xanh lá đặc trưng** cho story chia sẻ chế độ "Bạn thân (Close Friends)".
- Hiển thị trạng thái đã xem / chưa xem theo thời gian thực.

#### b. Story Creator Studio (`StoryStudioEditor.tsx`, `StoryCreatorModal.tsx`):
- **Nguồn đăng tin:**
  - Chụp ảnh hoặc quay video 15s trực tiếp từ Camera (`StoryCameraViewfinder.tsx`).
  - Tải ảnh / video có sẵn từ thiết bị.
  - Tạo Story dạng văn bản (Text Story) với nhiều kiểu màu nền đơn sắc và dải gradient nghệ thuật.
- **Bộ lọc màu điện ảnh (Filters - `StoryFilterSelector.tsx`):** Normal, Warm, Cool, Vintage, Noir, Vivid, Cyberpunk, Dreamy.
- **Nhạc nền Story (`StoryMusicPicker.tsx`):**
  - Kho nhạc mẫu sẵn có, hiển thị sóng âm thanh động (Sound waves) chân thực.
  - Hỗ trợ tải nhạc MP3/Audio từ máy tính lên story.
  - Huy hiệu đĩa than quay động phát nhạc trong khi xem.
- **Nhãn dán trang trí & Tiện ích (`StoryStickerPicker.tsx`):**
  - Chèn Emoji tự do, hỗ trợ kéo thả định vị trên khung canvas 9:16.
  - Thẻ địa điểm (Location Tag) với gợi ý nhanh các thành phố.
  - Thẻ chủ đề (Hashtag Tag) định dạng `#hashtag`.
  - Thẻ nhắc tên bạn bè (Mention Tag) định dạng `@username`.

#### c. Nhãn dán tương tác (Interactive Stickers - `StoryInteractiveWidgets.tsx`):
- **Bình chọn (Interactive Poll):** Tạo câu hỏi với 2 phương án bình chọn; người xem bấm bình chọn và xem tỷ lệ % kèm đánh dấu lựa chọn của mình ngay lập tức.
- **Thanh trượt cảm xúc (Emoji Slider):** Người xem kéo thả Emoji yêu thích trên thanh trượt; kích hoạt hiệu ứng nổ hạt Emoji bay lên màn hình và hiển thị điểm trung bình cộng đồng.
- **Đồng hồ đếm ngược (Interactive Countdown):** Đặt tên sự kiện và mốc thời gian kết thúc; hiển thị đồng hồ đếm ngược Ngày : Giờ : Phút : Giây thời gian thực.

#### d. Trình phát Story toàn màn hình (`StoryViewerOverlay.tsx`):
- Tỷ lệ khung hình chuẩn 9:16, thanh tiến trình (Progress Bar) tự động chuyển tiếp từng tin.
- Nhấn giữ chuột/màn hình để tạm dừng xem tin.
- Nhấp bên trái/phải để chuyển nhanh tin trước/sau.
- Thanh tương tác nhanh: Thả cảm xúc Emoji, nhập phản hồi gửi thẳng vào cuộc trò chuyện 1-1 với tác giả.
- Danh sách người xem (`StoryViewerDrawer.tsx`): Tác giả có thể xem danh sách ai đã xem tin của mình và cảm xúc họ thả.
- Quyền xóa story của bản thân.

#### e. Bạn thân (Close Friends Modal - `CloseFriendsModal.tsx`):
- Tìm kiếm và quản lý danh sách Bạn thân (Close Friends).
- Tùy chọn quyền riêng tư linh hoạt khi đăng story: *Công khai (Public)*, *Bạn bè (Friends)*, *Bạn thân (Close Friends)*, *Chỉ mình tôi (Only me)*.

#### f. Tin nổi bật & Kho lưu trữ (Highlights & Archive - `StoryHighlightBar.tsx`, `StoryHighlightModal.tsx`):
- **Kho lưu trữ tin (Story Archive):** Tự động lưu lại toàn bộ các story cũ đã quá 24h của người dùng.
- **Tạo bộ sưu tập Tin nổi bật (Create Highlight):** Đặt tên bộ sưu tập, chọn ảnh bìa và chọn nhiều story từ kho lưu trữ.
- **Hiển thị trên Trang cá nhân (`ProfilePage.tsx`):** Thanh bong bóng tròn viền gradient nổi bật, cho phép xem lại toàn bộ bộ sưu tập bằng trình phát Story Viewer.

### 9. Trang Hồ Sơ Cá Nhân (`ProfilePage.tsx`)
- **Quản lý ảnh đại diện & ảnh bìa:** 
  - Hỗ trợ ảnh động **GIF Avatar** giữ nguyên chuyển động sinh động.
  - Công cụ cắt ảnh đại diện trực quan (`AvatarCropper`) cho ảnh tĩnh.
- **Thông tin chi tiết:** Chỉnh sửa Tên hiển thị, Tên định danh (@handle), Số điện thoại, Giới tính, Địa chỉ, Ngày sinh, Tiểu sử (Bio).
- **Trạng thái cá nhân (Custom Status):** Biểu tượng Emoji trạng thái kèm nội dung tin nhắn trạng thái; hỗ trợ đặt hạn giờ tự xóa trạng thái (1 giờ, 4 giờ, hết ngày, hết tuần hoặc không xóa).
- **Khu vực Tin nổi bật (Story Highlights):** Nút "+ Mới" và danh sách các bộ sưu tập story đã lưu.

### 10. Trang Cài Đặt & Bảo Mật (`SettingsPage.tsx`, `TwoFactorSettings.tsx`)
- **Giao diện & Chủ đề:** Chuyển đổi Dark Mode / Light Mode siêu mượt với hệ thống biến CSS toàn cục.
- **Đa ngôn ngữ (i18n):** Chuyển đổi ngôn ngữ Tiếng Việt và Tiếng Anh tức thì, đồng bộ toàn hệ thống.
- **Bảo mật tài khoản:**
  - Thay đổi mật khẩu tài khoản.
  - Bật/tắt xác thực 2 lớp (2FA TOTP): Hiển thị mã QR để quét bằng ứng dụng Authenticator, xác minh mã OTP 6 số để kích hoạt.
- **Quản lý phiên đăng nhập (Active Sessions):** Xem danh sách thiết bị và trình duyệt đang đăng nhập, địa chỉ IP, thời gian hoạt động; cho phép đăng xuất từ xa từng thiết bị hoặc đăng xuất tất cả thiết bị khác.
- **Quyền riêng tư:** Tùy chọn ẩn/hiển thị trạng thái hoạt động trực tuyến, số điện thoại, ngày sinh, địa chỉ, giới tính, tiểu sử, và thông báo đã xem (Read Receipts).
- **Trợ giúp & Khám phá (Product Tour):** Xem lại các chuyến tham quan hướng dẫn giao diện hoặc đặt lại toàn bộ trạng thái hướng dẫn.
- **Xóa tài khoản vĩnh viễn:** Hỗ trợ tính năng tự hủy tài khoản kèm hộp thoại xác nhận bảo mật.

### 11. Trang Quản Trị Hệ Thống (`AdminPage.tsx`)
- **Phân quyền quản trị đa cấp bậc:** Owner, Admin, Moderator, User.
- **Biểu đồ thống kê trực quan:** Thống kê số lượng đăng ký mới và lượt truy cập trong 7 ngày gần nhất, tổng người dùng, số lượng người dùng đang hoạt động.
- **Quản lý tài khoản người dùng:** Tìm kiếm, lọc theo vai trò/trạng thái, phân quyền quản trị, khóa (Ban) hoặc mở khóa (Unban) tài khoản.
- **Kiểm duyệt nội dung (Content Moderation):**
  - Quản lý danh sách từ khóa nhạy cảm / từ cấm (Banned Words) áp dụng trên toàn bộ chat.
  - Quản lý danh sách phần mở rộng tệp tin bị chặn (Blocked File Extensions) nhằm ngăn phát tán mã độc (`.exe`, `.bat`, `.sh`...).
- **Xử lý báo cáo vi phạm (Report Management):** Xem danh sách báo cáo từ người dùng, xem tin nhắn vi phạm trong ngữ cảnh hội thoại, phê duyệt xử phạt hoặc bác bỏ báo cáo.
- **Cấu hình Rate Limit hệ thống:** Theo dõi và thiết lập giới hạn tần suất gửi yêu cầu để bảo vệ máy chủ khỏi tấn công DDoS và spam.

### 12. Phân Hệ Thông Báo & Web Push (`NotificationsPanel.tsx`)
- **Trung tâm thông báo trong ứng dụng:** Thông báo tin nhắn mới, lời mời kết bạn, phản hồi story, cuộc gọi nhỡ theo thời gian thực.
- **Đánh dấu & Lọc:** Phân loại thông báo đã đọc / chưa đọc, nút "Đánh dấu tất cả đã đọc" và xóa thông báo.
- **Web Push Notifications:** Tích hợp Service Worker (`push-service-worker.js`) gửi thông báo đẩy đến máy tính/điện thoại ngay cả khi người dùng đóng tab trình duyệt.

### 13. Hệ Thống Tour Hướng Dẫn Sản Phẩm (Interactive Product Tour)
- Dẫn dắt người dùng mới làm quen với giao diện ứng dụng thông qua Spotlight nổi bật từng thành phần:
  - Tour Hướng dẫn Trò chuyện (Chat Tour).
  - Tour Hướng dẫn Tính năng Story (Story Tour).
  - Tour Hướng dẫn Trang Cá nhân (Profile Tour).
  - Tour Hướng dẫn Cài đặt & Bảo mật (Settings Tour).
- Tự động kích hoạt thông minh cho tài khoản mới (`useAutoTour.ts`), ghi nhớ trạng thái hoàn thành trên máy và cho phép xem lại bất cứ lúc nào trong trang Cài đặt.

---

## Kiến Trúc Công Nghệ

### Frontend
- **Framework & Ngôn ngữ:** React 19, TypeScript
- **Công cụ đóng gói (Bundler):** Vite (tối ưu hóa tốc độ dev HMR và build bundle phân mảnh siêu nhỏ)
- **Kiến trúc Styling:** Vanilla CSS thuần kết hợp CSS Variables, hệ thống Design Tokens nhất quán, hiệu ứng Glassmorphism & Micro-animations
- **Thư viện cốt lõi:**
  - `lucide-react`: Bộ biểu tượng SVG sắc nét, hiện đại
  - `emoji-picker-react`: Kho emoji trực quan
  - `socket.io-client`: Kết nối WebSocket thời gian thực
  - `i18next` & `react-i18next`: Hệ thống bản địa hóa đa ngôn ngữ song ngữ (vi/en)
  - `react-easy-crop`: Công cụ cắt chỉnh ảnh đại diện in-browser
  - `sonner`: Hệ thống thông báo Toast cao cấp
  - `@privacyresearch/curve25519-typescript`: Mã hóa đầu cuối E2EE Signal Protocol

### Backend
- **Nền tảng & Framework:** Node.js, Express.js
- **Cơ sở dữ liệu:** MySQL (sử dụng thư viện `mysql2` với Connection Pool)
- **Tự động khởi tạo cấu trúc (Self-healing DB Migration):** Tự động phát hiện và tạo mới bảng/cột khi khởi động server mà không phụ thuộc file migration thủ công
- **Động cơ thời gian thực:** Socket.IO (đồng bộ tin nhắn, trạng thái online, cuộc gọi, typing indicator, reactions, story replies)
- **Giao thức gọi trực tuyến:** WebRTC Signaling Server
- **Lưu trữ đám mây:** Cloudinary (tối ưu hóa, lưu trữ ảnh, video, âm thanh và tệp đính kèm an toàn)
- **Dịch vụ Email & OTP:** Resend API / Nodemailer / Mailtrap
- **Bảo mật & Tối ưu:**
  - `web-push`: Web Push Notification chuẩn VAPID
  - `bcryptjs`: Băm mật khẩu một chiều mạnh mẽ
  - `speakeasy` & `qrcode`: Tạo và xác minh mã 2FA TOTP
  - `helmet`, `cors`: Thiết lập HTTP Headers an toàn
  - `rateLimit.middleware.js`: Bộ đệm giới hạn tần suất đa tầng bảo vệ toàn diện hệ thống
  - `multer`: Xử lý upload tệp đa phương tiện

---

## Cấu Trúc Thư Mục Dự Án

```plaintext
InboxSystemManagement/
├── backend/                        # Mã nguồn Backend (Node.js & Express)
│   ├── src/
│   │   ├── config/                 # Cấu hình Database, Cloudinary, WebPush, Mailer
│   │   ├── controllers/            # Controller xử lý nghiệp vụ
│   │   │   ├── core/               # Trò chuyện, Tin nhắn, Danh bạ, Story, E2EE
│   │   │   └── system/             # Quản trị viên, Xác thực, Báo cáo
│   │   ├── middleware/             # Middleware xác thực JWT, Rate Limit, Error Logger
│   │   ├── realtime/               # Logic Socket.IO, WebRTC Signaling
│   │   ├── routes/                 # Định tuyến API RESTful
│   │   │   ├── communications/     # Routes thông báo, Web Push
│   │   │   ├── core/               # Routes hội thoại, danh bạ, story, search
│   │   │   └── system/             # Routes auth, admin
│   │   ├── services/               # Dịch vụ gửi mail, upload Cloudinary, Push Notification
│   │   └── utils/                  # Các hàm tiện ích
│   └── package.json
├── database/                       # Kịch bản SQL khởi tạo cơ sở dữ liệu ban đầu
├── public/                         # Tệp tĩnh (Favicon, Logo, PWA Manifest)
├── src/                            # Mã nguồn Frontend (React & TypeScript)
│   ├── components/                 # Các thành phần giao diện
│   │   ├── chat/                   # Khung chat, nội dung tin nhắn, thanh công cụ
│   │   ├── layout/                 # Thanh điều hướng (NavRail), Sidebar
│   │   ├── media/                  # Giao diện cuộc gọi WebRTC Overlay
│   │   ├── panels/                 # Các bảng Inbox, Danh bạ, Thông báo, Chi tiết, Bình chọn
│   │   ├── story/                  # Toàn bộ phân hệ Story (Studio, Viewer, Widgets, Highlights)
│   │   ├── ui/                     # AvatarFallback, Cropper, Dialogs, Badges
│   │   └── views/                  # Trang ChatApp, ProfilePage, SettingsPage, AdminPage
│   ├── hooks/                      # Custom React Hooks theo domain
│   ├── lib/                        # Thư viện thuật toán nội bộ (E2EE Signal Engine)
│   ├── locales/                    # Tệp từ điển đa ngôn ngữ (vi.json, en.json)
│   ├── pages/                      # Các trang độc lập (Auth, Error, Legal)
│   ├── services/                   # Các dịch vụ gọi API và lưu trữ Storage
│   ├── stores/                     # Quản lý trạng thái toàn cục (Zustand)
│   ├── styles/                     # CSS module và Design Tokens (story.css, tour.css...)
│   ├── types.ts                    # Khai báo kiểu TypeScript toàn hệ thống
│   ├── main.tsx                    # Điểm khởi chạy ứng dụng React
│   └── App.tsx                     # Điều hướng và xử lý phiên ứng dụng chính
├── package.json                    # Quản lý thư viện phụ thuộc Frontend
└── README.md                       # Tài liệu hướng dẫn dự án chi tiết
```

---

## Hướng Dẫn Cài Đặt & Khởi Chạy

### Yêu Cầu Tiên Quyết
Đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
- **Node.js** (Phiên bản v18.0.0 trở lên)
- **MySQL Server** (Chạy trên cổng mặc định 3306 hoặc remote)
- Tài khoản **Cloudinary** (lấy Cloud Name, API Key, API Secret)
- Tài khoản **Resend** hoặc **Mailtrap** (để cấu hình gửi Email OTP)
- Khóa **GIPHY API Key** (cho tính năng gửi ảnh GIF)
- Khóa **Google Client ID** / **Facebook App ID** (cho đăng nhập mạng xã hội)

### Các Bước Cài Đặt

1. **Khởi tạo Cơ sở Dữ liệu MySQL:**
   - Mở MySQL Client / Workbench và tạo database mới:
     ```sql
     CREATE DATABASE inbox_system_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```
   - Chạy các script trong thư mục `database/` (hoặc hệ thống sẽ tự động khởi tạo bảng khi server chạy nhờ cơ chế `ensureSchema`).

2. **Cấu hình Biến Môi Trường (Environment Variables):**
   - Tạo file `.env` bên trong thư mục `backend/`:
     ```env
     PORT=5000
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_mysql_password
     DB_NAME=inbox_system_management
     JWT_SECRET=your_super_secret_jwt_key
     CLOUDINARY_CLOUD_NAME=your_cloudinary_name
     CLOUDINARY_API_KEY=your_cloudinary_key
     CLOUDINARY_API_SECRET=your_cloudinary_secret
     RESEND_API_KEY=your_resend_api_key
     MAILTRAP_USER=your_mailtrap_user
     MAILTRAP_PASS=your_mailtrap_pass
     VAPID_PUBLIC_KEY=your_vapid_public_key
     VAPID_PRIVATE_KEY=your_vapid_private_key
     ```
   - Tạo file `.env` tại thư mục gốc của dự án (Frontend):
     ```env
     VITE_GIPHY_API_KEY=your_giphy_api_key
     VITE_FACEBOOK_APP_ID=your_facebook_app_id
     VITE_GOOGLE_CLIENT_ID=your_google_client_id
     ```

3. **Cài Đặt Thư Viện Phụ Thuộc (Dependencies):**
   - Tại thư mục gốc:
     ```bash
     npm install
     ```
   - Tại thư mục backend:
     ```bash
     cd backend
     npm install
     cd ..
     ```

4. **Khởi Chạy Ứng Dụng Đồng Thời:**
   - Tại thư mục gốc, chạy lệnh:
     ```bash
     npm run dev:all
     ```
   - Ứng dụng sẽ tự động khởi động:
     - **Frontend:** `http://localhost:5173`
     - **Backend API:** `http://localhost:5000`

---

## Giấy Phép & Bản Quyền

Dự án này được phát triển phục vụ mục đích học tập, nghiên cứu và quản lý nội bộ. Mọi quyền liên quan đến sao chép, chỉnh sửa thương mại và phân phối vui lòng tuân thủ quy định của tác giả.
