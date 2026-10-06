# Inbox System Management (Real-time Chat Platform)

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

The **Inbox System Management** project is a comprehensive online communication platform designed to connect users through real-time messaging and calls. The system provides a seamless, highly secure experience with a premium User Interface (UI) featuring modern Glassmorphism effects, similar to popular social networking platforms today.

---

## Project Objectives

The core objective of the project is to provide a secure, user-friendly, and robust chat environment. The application supports both one-on-one and group chats, while offering contact management, personal settings, and a dedicated Admin dashboard for monitoring overall system activity.

---

## Key Features

### 1. Real-time Chat
- One-on-one (1-1) and group messaging with instant response speeds powered by WebSockets (`Socket.IO`).
- Support for diverse content types: Text, images, videos, audio (voice messages), file attachments, and **GIPHY (GIFs)**.
- Advanced message actions (Context menu):
  - Reply to messages
  - Forward messages
  - Pin important messages
  - Unsend / Edit messages
  - Report messages for violations to administrators.
- Detailed message statuses: Sending, Sent, Delivered, Seen (Read Receipts) with indicator icons.
- Message interaction: Drop emoji reactions on specific messages.
- Real-time "typing..." indicators.
- Search functionality within conversations.
- Archive, hide, and categorize conversations (All, Unread, Archived, Groups).
- Clear chronological date separation.

### 2. Group & Chat Management
- Create and manage in-depth group chats with robust validation logic.
- Group roles: Owner and Member.
- Group settings: Rename and change group avatars.
- Member approval via Join Requests or Invite Links.
- Set nicknames for individual group members or friends.
- Easy options for admins to leave or disband groups.
- Right-side Detail Panel:
  - Neatly view all images, videos, and files sent in the group, categorized by tabs.
  - Automatically filter out GIF/Emoji images from the attachments list to prevent clutter.

### 3. Audio & Video Calls
- Integrated high-quality online audio and video calling.
- Modern overlay call interface, ensuring uninterrupted user experience when minimized.
- Store and display detailed call history (Time, duration, missed calls).

### 4. Contact & Friend Management
- Easily search for and send/receive friend requests with other users in the system.
- Set private nicknames for friends.
- Block list to limit disturbances and protect privacy.
- Real-time activity status: Online, Offline, Busy, Away, complete with an online duration badge.

### 5. Notification System
- Web Push Notifications to keep users updated even when the app tab is closed.
- Lively in-app notifications for new messages, friend requests, missed calls, and other interactions.

### 6. Admin Dashboard
- Modern, comprehensive dashboard specifically for the Administration Team.
- Clear administrative badge system: Owner, Admin, Moderator, User.
- Visual statistical charts: Registrations and visits over the last 7 days, total users, active users.
- Report Management: Review and handle reported messages.
- User Management: View lists, grant permissions, suspend/ban accounts, or intervene to ensure system security.

### 7. Customization & UX (UI/UX)
- **Glassmorphism Effects:** Chat bubbles feature a subtle backdrop blur, ensuring text remains sharp and prominent against any complex background.
- Chat interface customization: Set unique backgrounds for individual conversations. Settings are reliably stored locally.
- **Dynamic Avatar Support (GIFs):** Users can upload animated GIFs as profile pictures; the system automatically retains the animation without cropping it into a static image.
- **Social Logins:** Seamlessly authenticate using external providers like **Google** and **Facebook** via OAuth integration.
- **Stories / Notes (24h):** Post short images, videos, or statuses that automatically disappear after 24 hours.
- Internationalization (i18n) support, allowing users to flexibly switch interface languages.
- Comprehensive and incredibly smooth Dark/Light Mode across all components.
- Secure authentication: Login, Registration, Forgot Password, and secure OTP email verification (via Resend or Mailtrap).
- Direct browser-based Avatar Cropper tool for static images.
- Integrated Static/Animated Stickers library for personalized expression.
- "Reaction Storm" animation effects that flood the screen when users rapidly tap and hold emoji reactions.

---

## Current Progress & Missing Features (Messenger Clone Parity)

The project has currently completed the vast majority of core features for a real-time messaging system. The Front-end source code (especially the `MessageInput` chat frame) was recently refactored using the Context API to solve "Prop Drilling", making the code cleaner and more scalable. The current UI has also overcome interruption issues caused by missing chunks (`vite:preloadError`).

However, to achieve full parity with a complete Facebook Messenger clone, the system still lacks the following features:

1. **In-depth Custom Chat Experience:**
   - **Gradient Themes:** The system currently supports Dark/Light modes but lacks the ability to change the primary color theme (Gradient) for individual chats (e.g., Love Theme, Halloween...).
   - **Custom Notification Sounds:** Users cannot yet set different message or ringtone sounds for specific users/groups.
   - **Default Emoji Customization:** The ability to change the default quick-emoji in the bottom right corner (currently fixed as "👍") to any other emoji of choice per conversation.

2. **Advanced Interface & Interactions:**
   - **Chat Bubbles:** The ability to minimize chats into floating bubbles on the screen (especially important if developing a PWA/Mobile version).
   - **Read Receipts with Avatars:** Instead of just a "Seen" icon, the system should display a small avatar of the person(s) who viewed the message at the bottom (like Messenger).
   - **Link Previews:** When sending a URL (e.g., YouTube, news articles), the system needs to fetch and display the thumbnail, title, and short description from Meta tags (Open Graph).

3. **Social & Video Features:**
   - **Advanced Polls:** Although the UI foundation exists (`CreatePollModal`), the real-time logic and visual voting progress within group chats need optimization.
   - **Call Filters (AR):** Applying facial filters (AR) during Video Calls.

4. **Advanced Security:**
   - **End-to-End Encryption (E2EE):** Messages currently send via WebSockets, but E2EE using the Signal Protocol is needed to ensure absolute security for Secret Conversations.

---

## Technologies Used

### Frontend (User Interface)
- **Framework:** ReactJS 19
- **Language:** TypeScript
- **Build Tool:** Vite (Ultra-fast, optimizes development and bundling)
- **Styling:** Vanilla CSS flexibly combined with CSS Variables for Dark Mode and Glassmorphism.
- **Supporting Libraries:**
  - `lucide-react`: Crisp, lightweight, and modern SVG icons.
  - `emoji-picker-react`: Rich emoji picker integration.
  - `socket.io-client`: Client-side real-time connection management.
  - `i18next` & `react-i18next`: Multi-language (i18n) support.
  - `react-easy-crop`: In-browser avatar processing and cropping tool.

### Backend (Server & Services)
- **Environment & Framework:** Node.js, ExpressJS
- **Database:** MySQL (Using the `mysql2` library)
- **Real-time Engine:** Socket.IO
- **Cloud Storage:** Cloudinary (Optimization, secure storage of images, videos, and attachments).
- **Services & Security:**
  - `web-push`: Secure Push Notifications implementation.
  - `resend` & `nodemailer`: Email notifications and OTP delivery services.
  - `bcryptjs`: Strong one-way password hashing.
  - `helmet`, `cors`, **Rate Limiting**: Enhanced server security, protection against common web vulnerabilities, and high-frequency request limiting.
  - `multer`: File upload handling.

---

## Project Directory Structure

```plaintext
InboxSystemManagement/
├── backend/                # Backend Source Code (Node.js & Express)
│   ├── src/
│   │   ├── config/         # Database, Cloudinary configurations, etc.
│   │   ├── controllers/    # API Logic (Auth, Chat, Admin, System, etc.)
│   │   ├── middleware/     # Middlewares (JWT Auth, Rate Limit, Error Handler)
│   │   ├── realtime/       # Socket.IO Logic
│   │   ├── routes/         # API Routing
│   │   ├── services/       # External services (Resend, Mailtrap, Push Notification)
│   │   └── utils/          # Utility functions
│   └── package.json
├── database/               # SQL scripts for database initialization
├── public/                 # Static files (Favicon, Logo...)
├── src/                    # Frontend Source Code (React & Vite)
│   ├── components/         # UI Components (Layout, Panels, Views, UI elements)
│   ├── pages/              # Interface pages
│   ├── services/           # Client-side API functions (Auth, Chat, Notifications)
│   ├── types.ts            # TypeScript definitions
│   ├── style.css           # Global CSS file containing Design System & Dark Mode
│   └── main.tsx            # React application entry point
├── package.json            # Frontend dependencies management
└── README.md               # Project documentation
```

---

## Installation & Launch Guide

### Prerequisites
Ensure you have installed and obtained the following:
- **Node.js** (Version v18.0.0 or higher)
- **MySQL Server** (Running locally or remote)
- **Cloudinary** Account (Obtain API Key, Secret)
- **Resend** or **Mailtrap** Account (For OTP email configuration)
- **GIPHY API Key** (Used for GIF sending functionality)
- **Facebook / Google App IDs** (For OAuth Login)

### Installation Steps

1. **Initialize Database:**
   - Create a new Database in MySQL.
   - Run the `.sql` files located in the `database/` directory to initialize the table structures.

2. **Set Environment Variables:**
   - Navigate to the `backend/` directory, create a file named `.env` based on `.env.example` (if available), or declare the following information:
     ```env
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
     ```
   - Return to the root directory (where the Frontend is), and create a `.env` file with the variables (Vite requires variables to start with `VITE_`):
     ```env
     VITE_GIPHY_API_KEY=your_giphy_api_key
     VITE_FACEBOOK_APP_ID=your_facebook_app_id
     VITE_GOOGLE_CLIENT_ID=your_google_client_id
     ```

3. **Install Dependencies:**
   - In the **root directory**, open a terminal and run:
     ```bash
     npm install
     ```
   - Navigate to the **backend** directory, and run:
     ```bash
     cd backend
     npm install
     ```

4. **Launch the Application:**
   - Return to the project's root directory, use the following command to SIMULTANEOUSLY launch both Frontend and Backend (Using the `concurrently` library):
     ```bash
     npm run dev:all
     ```
   - The system will automatically start:
     - Frontend at: `http://localhost:5173` (Vite's default)
     - Backend at: `http://localhost:5000` (based on `.env` configuration)

---

## Contributing

We always welcome contributions to make the system more complete and robust. If you find a bug, have optimization ideas, or want to add a new feature:

1. **Fork** this project to your account.
2. Create a new branch for your feature or bug fix (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a **Pull Request** for us to review.

Please adhere to the programming and code formatting standards currently used in the project.

---

## License

This project is developed internally. All rights related to copying, commercial modification, and distribution are strictly reserved.
