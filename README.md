# Hệ Thống Quản Lý Tin Nhắn (Inbox System Management)

Dự án Hệ Thống Quản Lý Tin Nhắn là một nền tảng giao tiếp trực tuyến toàn diện, được thiết kế để kết nối người dùng thông qua việc nhắn tin theo thời gian thực. Hệ thống cung cấp trải nghiệm tương tự như các nền tảng mạng xã hội phổ biến với giao diện hiện đại, tốc độ phản hồi nhanh và được tối ưu hóa cho nhiều thiết bị khác nhau.

## Mục Tiêu Của Dự Án

Mục tiêu cốt lõi của dự án là mang lại một không gian trò chuyện bảo mật, thân thiện và mạnh mẽ. Ứng dụng hỗ trợ cả trò chuyện cá nhân và trò chuyện nhóm, đồng thời cung cấp hệ thống quản lý danh bạ, cài đặt cá nhân, và một trang quản trị (Admin) dành cho việc giám sát hoạt động hệ thống.

## Các Tính Năng Chính

### 1. Trò Chuyện Thời Gian Thực
* Nhắn tin cá nhân và nhắn tin nhóm với tốc độ phản hồi tức thì nhờ công nghệ Socket.IO.
* Hỗ trợ đa dạng loại nội dung: Văn bản, hình ảnh, video, âm thanh, và tệp đính kèm.
* Tính năng trả lời tin nhắn, chuyển tiếp tin nhắn, ghim tin nhắn quan trọng và thu hồi tin nhắn.
* Thể hiện trạng thái tin nhắn: Đang gửi, Đã gửi, Đã nhận, Đã xem.
* Thả biểu tượng cảm xúc (Reaction) vào từng tin nhắn.
* Hiển thị trạng thái đang nhập chữ của người bên kia.

### 2. Quản Lý Cuộc Gọi
* Tích hợp tính năng gọi điện thoại và gọi video trực tuyến (Real-time Audio/Video Call).
* Lưu trữ và hiển thị lịch sử cuộc gọi chi tiết.

### 3. Quản Lý Danh Bạ & Bạn Bè
* Tìm kiếm và kết bạn với những người dùng khác trong hệ thống.
* Đồng ý hoặc từ chối lời mời kết bạn.
* Danh sách chặn người dùng để hạn chế sự làm phiền.
* Hiển thị trạng thái trực tuyến (Online, Offline, Busy, Away).

### 4. Thông Báo
* Hệ thống thông báo đẩy (Web Push Notifications) giúp người dùng không bỏ lỡ tin nhắn kể cả khi không mở ứng dụng.
* Thông báo bên trong ứng dụng về tin nhắn mới, lời mời kết bạn, hoặc các tương tác khác.

### 5. Quản Trị Hệ Thống (Admin Dashboard)
* Giao diện quản trị hiện đại dành riêng cho Ban Quản Trị.
* Bảng điều khiển tổng quan với các số liệu: Tổng số người dùng, người dùng đang hoạt động, và cảnh báo hệ thống.
* Quản lý danh sách người dùng, cấp quyền, khóa tài khoản hoặc can thiệp vào các hoạt động bảo mật.

## Công Nghệ Sử Dụng

### Giao Diện (Frontend)
* ReactJS 19 (TypeScript)
* Vite (Trình đóng gói và môi trường phát triển)
* Lucide React (Thư viện biểu tượng SVG)
* Emoji Picker React (Bộ chọn biểu tượng cảm xúc)
* Socket.IO Client (Kết nối thời gian thực)
* CSS thuần (Vanilla CSS) với biến CSS hiện đại (CSS Variables)

### Máy Chủ (Backend)
* Node.js & ExpressJS
* MySQL (Cơ sở dữ liệu quan hệ với thư viện `mysql2`)
* Socket.IO (Xử lý kết nối WebSocket)
* Cloudinary (Lưu trữ và tối ưu hóa hình ảnh/tệp đính kèm)
* Web Push (Dịch vụ thông báo đẩy)
* Mailtrap (Kiểm thử và gửi thư điện tử xác thực)
* BcryptJS (Mã hóa mật khẩu)
* Helmet & CORS (Bảo mật máy chủ)

## Cấu Trúc Thư Mục
* `backend/`: Mã nguồn của máy chủ, chứa các API RESTful, kết nối cơ sở dữ liệu và xử lý Socket.IO.
* `database/`: Các tập lệnh SQL để khởi tạo cơ sở dữ liệu.
* `public/`: Chứa các tệp tĩnh như hình ảnh, favicon.
* `src/`: Mã nguồn giao diện người dùng (React components, pages, services, styles).

## Hướng Dẫn Cài Đặt

### Yêu Cầu Hệ Thống
* Node.js (phiên bản 18 trở lên)
* MySQL Server
* Tài khoản Cloudinary
* Tài khoản Mailtrap

### Các Bước Khởi Chạy

1. Khởi tạo cơ sở dữ liệu MySQL bằng các tệp trong thư mục `database/`.
2. Thiết lập các biến môi trường cho Backend bằng cách tạo tệp `.env` trong thư mục `backend/`.
3. Thiết lập các biến môi trường cho Frontend (nếu cần) trong tệp `.env` ở thư mục gốc.
4. Cài đặt các gói phụ thuộc (Dependencies) cho toàn bộ hệ thống.
   Trong thư mục gốc, chạy lệnh:
   ```bash
   npm install
   ```
   Di chuyển vào thư mục backend và chạy lệnh tương tự:
   ```bash
   cd backend
   npm install
   ```
5. Chạy ứng dụng. Quay lại thư mục gốc và sử dụng lệnh:
   ```bash
   npm run dev:all
   ```
   Lệnh này sẽ khởi động song song cả Frontend (Vite) và Backend (Nodemon).

## Quy Trình Đóng Góp

Chúng tôi luôn hoan nghênh những đóng góp để hệ thống trở nên hoàn thiện hơn. Nếu bạn tìm thấy lỗi hoặc muốn thêm tính năng mới, vui lòng tạo một báo cáo (Issue) hoặc gửi Yêu cầu Kéo (Pull Request). Hãy đảm bảo tuân thủ các quy chuẩn lập trình đang được sử dụng trong dự án.

## Giấy Phép

Dự án này được phát triển nội bộ. Mọi quyền liên quan đến sao chép và phân phối đều được bảo lưu.
