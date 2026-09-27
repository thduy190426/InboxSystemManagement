# Hệ Thống Quản Lý Tin Nhắn (Inbox System Management)

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

Dự án **Hệ Thống Quản Lý Tin Nhắn** là một nền tảng giao tiếp trực tuyến toàn diện, được thiết kế để kết nối người dùng thông qua việc nhắn tin và gọi điện theo thời gian thực (Real-time). Hệ thống cung cấp trải nghiệm mượt mà, bảo mật cao và giao diện người dùng (UI) hiện đại, tương tự như các nền tảng mạng xã hội phổ biến hiện nay.

---

## Mục Tiêu Của Dự Án

Mục tiêu cốt lõi của dự án là mang lại một không gian trò chuyện bảo mật, thân thiện và mạnh mẽ. Ứng dụng hỗ trợ cả trò chuyện cá nhân và trò chuyện nhóm, đồng thời cung cấp hệ thống quản lý danh bạ, cài đặt cá nhân, và một trang quản trị (Admin) dành riêng cho việc giám sát hoạt động toàn hệ thống.

---

## Các Tính Năng Nổi Bật

### 1. Trò Chuyện Thời Gian Thực (Real-time Chat)
- Nhắn tin cá nhân (1-1) và nhắn tin nhóm với tốc độ phản hồi tức thì nhờ công nghệ WebSockets (`Socket.IO`).
- Hỗ trợ đa dạng loại nội dung: Văn bản, hình ảnh, video, âm thanh (voice message), tệp đính kèm và **GIPHY (GIFs)**.
- Các thao tác tin nhắn nâng cao:
  - Trả lời tin nhắn (Reply)
  - Chuyển tiếp tin nhắn (Forward)
  - Ghim tin nhắn quan trọng (Pin)
  - Thu hồi / Chỉnh sửa tin nhắn (Unsend / Edit)
  - Báo cáo tin nhắn (Report) vi phạm cho quản trị viên.
- Trạng thái tin nhắn chi tiết: Đang gửi, Đã gửi, Đã nhận, Đã xem (Read Receipts).
- Tương tác tin nhắn: Thả biểu tượng cảm xúc (reactions) vào từng tin nhắn cụ thể.
- Hiển thị trạng thái "đang nhập tin nhắn..." (typing indicator).
- Tìm kiếm tin nhắn trong cuộc trò chuyện (Search within conversation).
- Lưu trữ (Archive), Ẩn (Hide) và phân loại cuộc trò chuyện (Tất cả, Chưa đọc, Đã lưu trữ).

### 2. Quản Lý Nhóm & Cuộc Trò Chuyện (Group & Chat Management)
- Tạo và quản lý nhóm trò chuyện chuyên sâu.
- Phân quyền nhóm: Chủ nhóm (Owner) và Thành viên (Member).
- Cài đặt nhóm: Đổi tên, thay đổi ảnh đại diện nhóm.
- Duyệt thành viên qua Yêu cầu tham gia (Join Requests) hoặc Link mời tham gia nhóm (Invite Link).
- Cài đặt biệt danh (Nickname) cho từng thành viên trong nhóm hoặc bạn bè.
- Tuỳ chỉnh giao diện chat: Thay đổi hình nền (Background) cho từng cuộc trò chuyện.
- Rời nhóm, giải tán nhóm (Disband) dễ dàng cho quản trị viên nhóm.

### 3. Quản Lý Cuộc Gọi (Audio/Video Call)
- Tích hợp tính năng gọi điện thoại và gọi video trực tuyến chất lượng cao.
- Giao diện cuộc gọi hiện đại dạng Overlay, không làm gián đoạn trải nghiệm sử dụng.
- Lưu trữ và hiển thị chi tiết lịch sử cuộc gọi (Thời gian, thời lượng, cuộc gọi nhỡ).

### 4. Quản Lý Danh Bạ & Bạn Bè
- Tìm kiếm, gửi/nhận lời mời kết bạn dễ dàng với những người dùng khác trong hệ thống.
- Cài đặt biệt danh (Nickname) riêng tư cho bạn bè.
- Danh sách chặn người dùng (Block List) để hạn chế sự làm phiền và bảo vệ quyền riêng tư.
- Hiển thị trạng thái hoạt động theo thời gian thực: Trực tuyến (Online), Ngoại tuyến (Offline), Bận (Busy), Vắng mặt (Away) cùng với huy hiệu thời gian online.

### 5. Hệ Thống Thông Báo
- Hệ thống thông báo đẩy (Web Push Notifications) giúp người dùng nhận thông báo ngay cả khi không mở tab ứng dụng.
- Thông báo In-app sinh động về tin nhắn mới, lời mời kết bạn, cuộc gọi nhỡ và các tương tác khác.

### 6. Quản Trị Hệ Thống (Admin Dashboard)
- Giao diện quản trị hiện đại, tổng quan (Dashboard) dành riêng cho Ban Quản Trị.
- Biểu đồ thống kê trực quan: Lượt đăng ký và truy cập trong 7 ngày gần nhất, tổng số người dùng, người dùng đang hoạt động (active).
- Quản lý báo cáo (Report Management): Xem xét và xử lý các tin nhắn bị báo cáo.
- Quản lý người dùng: Xem danh sách, cấp quyền, tạm ngưng/khóa tài khoản (Suspend/Ban) hoặc can thiệp vào các hoạt động để đảm bảo an ninh hệ thống.

### 7. Tùy Chỉnh & Trải Nghiệm Người Dùng
- Hỗ trợ đa ngôn ngữ (Internationalization/i18n) giúp người dùng linh hoạt đổi ngôn ngữ giao diện.
- Hỗ trợ Chế độ Tối/Sáng (Dark/Light Mode) toàn diện và mượt mà.
- Cài đặt tài khoản cá nhân, công cụ cắt ảnh đại diện trực tiếp (Avatar Cropper), cập nhật mật khẩu, quyền riêng tư.
- Bảo mật xác thực: Đăng nhập, Đăng ký, Quên mật khẩu, Xác thực email (qua Resend hoặc Mailtrap), và thử thách bảo mật Google reCAPTCHA v2 chống spam.

---

## Công Nghệ Sử Dụng

### Giao Diện Người Dùng (Frontend)
- **Framework:** ReactJS 19
- **Ngôn ngữ:** TypeScript
- **Công cụ xây dựng:** Vite (Siêu tốc, tối ưu hóa quá trình phát triển và đóng gói)
- **Styling:** CSS thuần (Vanilla CSS) kết hợp linh hoạt với CSS Variables cho Dark Mode.
- **Thư viện hỗ trợ:**
  - `lucide-react`: Bộ biểu tượng SVG sắc nét, nhẹ và hiện đại.
  - `emoji-picker-react`: Tích hợp bộ chọn Emoji phong phú.
  - `socket.io-client`: Quản lý kết nối thời gian thực phía máy khách.
  - `i18next` & `react-i18next`: Hỗ trợ đa ngôn ngữ (i18n).
  - `react-easy-crop`: Công cụ cắt sửa ảnh đại diện.
  - `react-google-recaptcha`: Bảo mật chống Spam/Bot.

### Máy Chủ & Dịch Vụ (Backend)
- **Môi trường & Framework:** Node.js, ExpressJS
- **Cơ sở dữ liệu:** MySQL (Sử dụng thư viện `mysql2`)
- **Real-time Engine:** Socket.IO
- **Lưu trữ Đám mây:** Cloudinary (Tối ưu hóa, lưu trữ an toàn hình ảnh, video, tệp đính kèm).
- **Dịch vụ & Bảo mật:**
  - `web-push`: Triển khai thông báo đẩy (Push Notifications) an toàn.
  - `resend` & `nodemailer`: Dịch vụ gửi email thông báo và mã OTP.
  - `bcryptjs`: Mã hóa mật khẩu một chiều mạnh mẽ.
  - `helmet`, `cors`, **Rate Limiting**: Tăng cường bảo mật máy chủ, chống các lỗ hổng web phổ biến và hạn chế request tần suất cao.
  - `multer`: Xử lý tệp tải lên (upload file).

---

## Cấu Trúc Thư Mục Dự Án

\`\`\`plaintext
InboxSystemManagement/
├── backend/                # Mã nguồn Backend (Node.js & Express)
│   ├── src/
│   │   ├── config/         # Cấu hình CSDL, Cloudinary, v.v.
│   │   ├── controllers/    # Logic xử lý API (Auth, Chat, Admin, System, v.v.)
│   │   ├── middleware/     # Các middleware (Auth JWT, Rate Limit, Error Handler)
│   │   ├── realtime/       # Logic xử lý Socket.IO
│   │   ├── routes/         # Định tuyến API
│   │   ├── services/       # Dịch vụ bên ngoài (Resend, Mailtrap, Push Notification)
│   │   └── utils/          # Các hàm tiện ích
│   └── package.json
├── database/               # Các tập lệnh SQL để khởi tạo cơ sở dữ liệu
├── public/                 # Các tệp tĩnh (Favicon, Logo...)
├── src/                    # Mã nguồn Frontend (React & Vite)
│   ├── components/         # Các UI Components (Layout, Panels, Views, UI elements)
│   ├── pages/              # Các trang giao diện
│   ├── services/           # Các hàm gọi API từ phía Client (Auth, Chat, Notifications)
│   ├── types.ts            # Định nghĩa kiểu dữ liệu TypeScript
│   ├── style.css           # File CSS toàn cục chứa Design System & Dark Mode
│   └── main.tsx            # Điểm vào của ứng dụng React
├── package.json            # Quản lý dependencies của Frontend
└── README.md               # Tài liệu dự án
\`\`\`

---

## Hướng Dẫn Cài Đặt & Khởi Chạy

### Yêu Cầu Hệ Thống (Prerequisites)
Đảm bảo bạn đã cài đặt và sở hữu:
- **Node.js** (Phiên bản v18.0.0 trở lên)
- **MySQL Server** (Đang chạy tại local hoặc remote)
- Tài khoản **Cloudinary** (Lấy API Key, Secret)
- Tài khoản **Resend** hoặc **Mailtrap** (Cấu hình gửi mail OTP)
- **GIPHY API Key** (Sử dụng cho tính năng gửi GIF)
- **Google reCAPTCHA v2 Key** (Cho tính năng đăng ký, quên mật khẩu)

### Các Bước Cài Đặt

1. **Khởi tạo Cơ sở dữ liệu:**
   - Tạo một Database mới trong MySQL.
   - Chạy các file \`.sql\` có trong thư mục \`database/\` để khởi tạo cấu trúc bảng.

2. **Thiết lập Biến môi trường (Environment Variables):**
   - Di chuyển vào thư mục \`backend/\`, tạo một tệp có tên \`.env\` dựa trên \`.env.example\` (nếu có) hoặc khai báo các thông tin sau:
     \`\`\`env
     PORT=5000
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=yourpassword
     DB_NAME=your_database_name
     JWT_SECRET=your_jwt_secret_key
     CLOUDINARY_CLOUD_NAME=your_cloud_name
     CLOUDINARY_API_KEY=your_api_key
     CLOUDINARY_API_SECRET=your_api_secret
     RESEND_API_KEY=your_resend_api_key
     MAILTRAP_USER=your_mailtrap_user
     MAILTRAP_PASS=your_mailtrap_pass
     VAPID_PUBLIC_KEY=your_vapid_public_key
     VAPID_PRIVATE_KEY=your_vapid_private_key
     \`\`\`
   - Trở lại thư mục gốc (nơi chứa Frontend), tạo tệp \`.env\` với các biến (Vite yêu cầu biến bắt đầu bằng \`VITE_\`):
     \`\`\`env
     VITE_GIPHY_API_KEY=your_giphy_api_key
     VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
     \`\`\`

3. **Cài đặt các gói phụ thuộc (Dependencies):**
   - Tại **thư mục gốc**, mở terminal và chạy:
     \`\`\`bash
     npm install
     \`\`\`
   - Di chuyển vào thư mục **backend**, và chạy:
     \`\`\`bash
     cd backend
     npm install
     \`\`\`

4. **Khởi chạy Ứng dụng:**
   - Trở lại thư mục gốc của dự án, sử dụng lệnh sau để khởi chạy ĐỒNG THỜI cả Frontend và Backend (Sử dụng thư viện \`concurrently\`):
     \`\`\`bash
     npm run dev:all
     \`\`\`
   - Hệ thống sẽ tự động khởi chạy:
     - Frontend tại: \`http://localhost:5173\` (mặc định của Vite)
     - Backend tại: \`http://localhost:5000\` (theo cấu hình \`.env\`)

---

## Hướng Dẫn Đóng Góp (Contributing)

Chúng tôi luôn hoan nghênh những đóng góp để hệ thống trở nên hoàn thiện và mạnh mẽ hơn. Nếu bạn tìm thấy lỗi (bug), có ý tưởng tối ưu hóa, hoặc muốn thêm tính năng mới:
1. **Fork** dự án này về tài khoản của bạn.
2. Tạo một nhánh mới (branch) cho tính năng hoặc sửa lỗi của bạn (\`git checkout -b feature/AmazingFeature\`).
3. Commit những thay đổi của bạn (\`git commit -m 'Add some AmazingFeature'\`).
4. Đẩy (Push) lên nhánh đó (\`git push origin feature/AmazingFeature\`).
5. Tạo một **Pull Request** để chúng tôi xem xét.

Vui lòng tuân thủ các quy chuẩn lập trình, format code đang được sử dụng trong dự án.

---

## Giấy Phép (License)

Dự án này được phát triển nội bộ. Mọi quyền liên quan đến sao chép, chỉnh sửa thương mại và phân phối đều được bảo lưu nghiêm ngặt.
