# Inbox System Management (Real-Time Communication & Social Platform)

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

**Inbox System Management** is a full-featured real-time communication and social media platform that delivers instant messaging, high-fidelity WebRTC voice & video calling, an Instagram/Facebook-grade 24-hour Story ecosystem, Signal-protocol End-to-End Encryption (E2EE), and a comprehensive administrative management dashboard. Built with a modern Glassmorphism visual language, smooth micro-interactions, full Progressive Web App (PWA) offline support, and bilingual internationalization (i18n).

---

## System Overview & Objectives

The system is architected to provide an enterprise-ready, fluid, and highly interactive communication hub for individuals, teams, and communities. It combines a reactive micro-feature frontend with persistent two-way WebSockets, self-healing database schema migrations, automated real-time content moderation, granular role-based access control, and hardware-accelerated media streaming.

---

## Comprehensive Feature Audit by Page & Module

### 1. Authentication & Login Page (`LoginPage.tsx`)
- **Standard Authentication:** Secure login using Email and Password with real-time input validation.
- **Social OAuth 2.0 Sign-In:** One-click single sign-on via **Google** and **Facebook**.
- **Two-Factor Authentication (2FA TOTP):** Automatic detection of 2FA-enabled accounts, rendering a secure 6-digit TOTP verification view for Google Authenticator / Authy before granting session tokens.
- **Persistent Session (Remember Me):** Secure token storage management across LocalStorage and SessionStorage.
- **Bot Defense (Google reCAPTCHA):** Shielding authentication endpoints from brute-force and automated credential-stuffing attacks.
- **Intelligent Redirects:** Automatically redirects authenticated users back to their intended route after successful sign-in.

### 2. User Registration Page (`RegisterPage.tsx`)
- **Complete Onboarding Form:** Captures Full Name, Email, Phone Number, Password, and Password Confirmation.
- **Real-Time Password Strength Meter:** Evaluates password resilience dynamically across length, case variation, numbers, and special symbols.
- **Legal Compliance:** In-app links to the Terms of Service and Privacy Policy agreements.
- **Instant Activation:** Creates account credentials instantly and triggers welcome notifications.

### 3. Password Recovery & Reset Page (`ForgotPasswordPage.tsx`)
- **Email OTP Verification:** Dispatches secure single-use 6-digit OTP tokens to user email addresses via Resend API / Mailtrap.
- **Resend Cooldown Timer:** Prevents email flooding with an automated countdown before a new OTP can be requested.
- **Direct Password Reset:** Allows users to set a new password immediately upon successful token validation without requiring re-authentication.

### 4. Legal & Error Navigation Pages (`TermsPage.tsx`, `PrivacyPolicyPage.tsx`, `NotFoundPage.tsx`)
- **Terms of Service (`/terms`):** Detailed guidelines on user rights, account responsibilities, communication standards, and acceptable use policies.
- **Privacy Policy (`/privacy`):** Transparent disclosures regarding data collection, encryption, cookie handling, and personal data retention.
- **Custom 404 Error Page (`NotFoundPage.tsx`):** Friendly, interactive fallback page offering quick actions to "Return to previous page" or "Navigate to Inbox".

### 5. Real-Time Chat & Instant Messaging (`ChatApp.tsx`, `InboxPanel.tsx`, `ChatPanel.tsx`, `DetailPanel.tsx`)

#### a. Conversation List & Inbox Management (Inbox Panel):
- **Smart Category Filtering:**
  - *All:* Complete list of active conversations.
  - *Unread:* Quick filter for conversations containing unread messages.
  - *Requests:* Message requests from non-contacts.
  - *Groups:* Direct filter for joined group channels.
  - *Archived:* Vault for hidden or archived conversation threads.
- **Conversation Pinning (Pin / Unpin):** Priority pinning of vital chats to the top of the conversation list.
- **Global Search:** Instant searching across contacts, users, and message history with highlighted matching terms.
- **Custom Resizable Sidebar:** Interactive divider handle allowing users to resize the conversation panel from 320px up to 45vw, or collapse it into a space-efficient Mini Icon bar (100px).
- **Online Presence Indicator:** Live online status dot coupled with duration badges (`OnlineDurationBadge`).

#### b. Direct Messaging & Group Collaboration (Chat Panel):
- **Advanced Group Creation:** Custom group name, group avatar upload, member search, and minimum member validation.
- **Group Governance & Permissions:** Role segregation between Owner and Members; join request moderation, group invite links, avatar/name updates, and individual member nicknames.
- **Disbandment & Leaving:** Group owners can transfer ownership or disband groups; members can leave chats freely.
- **Rich Message Types:**
  - Standard formatted text with automated URL link preview and detection.
  - Full Emoji library (`emoji-picker-react`).
  - Animated GIF search powered by the **GIPHY API**.
  - Static and animated sticker collections.
  - File and media attachments: Images, videos, audio clips, and documents with Drag & Drop and Clipboard paste (`Ctrl + V`) support.
  - Voice audio messaging recorded directly via microphone with waveform preview.
- **Real-Time Delivery Lifecycle:** Visual status tags for *Sending*, *Sent*, *Delivered*, and *Seen* (with avatar indicators of who viewed the message).
- **Typing Indicator:** Real-time animated indicator displaying when the other party is typing.
- **Message Context Actions:**
  - Reply with quote context.
  - Message forwarding (`ForwardMessageModal.tsx`) to individuals or groups.
  - Message pinning (`PinnedMessagesDrawer.tsx`) within the chat stream.
  - Revoke / Delete messages for everyone or for oneself only.
  - Edit sent message content inline.
  - Flag and report inappropriate messages directly to administrators.
  - Emoji Reactions with interactive **"Reaction Storm"** screen-filling animations on long-press.
- **Interactive Group Polls:**
  - Create custom polls (`CreatePollModal.tsx`) with multiple options.
  - Configurable multiple selections and anonymous voting modes.
  - Live vote distribution bar and percentage display updating in real-time (`PollMessage.tsx`).
- **End-to-End Encryption (E2EE Secret Chat):** Integrated Curve25519 Signal Protocol engine (`E2EEEngine.ts`) guaranteeing zero-knowledge confidentiality for secret conversations.

#### c. Conversation Details Panel (Detail Panel):
- **Profile & Member Overview:** Inspect recipient contact details, group member rosters, custom nicknames, and presence.
- **Categorized Media Vault:** Segmented tabs for convenient browsing:
  - *Photos:* Filtered collection of shared images (automatically excludes GIF stickers and emojis).
  - *Videos:* Dedicated player grid for shared video clips.
  - *Files:* Document repository displaying file extensions, sizes, and timestamps.
  - *Links:* Aggregated history of all shared external web URLs.
- **Fullscreen Gallery Viewer (`GalleryViewer.tsx`):** Lightbox-style preview with image zooming, pan, and adjacent photo navigation.
- **Custom Chat Wallpapers:** Set unique custom background wallpapers per conversation, persisted in local storage.

### 6. High-Definition Voice & Video Calling (`CallOverlay.tsx`, `callRealtime.ts`)
- **Peer-to-Peer WebRTC Architecture:** Ultra-low latency Audio and Video calls directly between clients.
- **Floating Call Overlay:** Minimize active calls into a movable picture-in-picture window to continue chatting without interrupting the stream.
- **In-Call Stream Controls:** Toggle microphone mute, switch active camera devices, toggle video feed, and perform live Desktop Screen Sharing.
- **Call Session Logging:** Automatic generation of call summary bubbles in the chat thread (call duration, timestamps, and missed call alerts).

### 7. Contacts & Social Graph Management (`ContactsPanel.tsx`)
- **Global Directory Search:** Search users across the platform by display name, email, or `@handle`.
- **Relationship Lifecycle:**
  - Send and cancel pending friend requests.
  - Review incoming friend requests: Accept or Decline.
  - Friend roster with one-click direct messaging and calling shortcuts.
  - Blocked users manager: Block and unblock users with instant access restriction.
- **Private Nicknames:** Assign personalized private nicknames to friends.
- **Quick Contact Profile Modal (`ContactProfile`):** View public user information before initiating contact requests.
- **Multi-State Presence:** Live status updates reflecting *Online*, *Offline*, *Busy*, and *Away*.

### 8. 24-Hour Story Ecosystem (Facebook / Instagram Grade)

#### a. Story Feed (`StoryFeed.tsx`):
- Circular avatar reel stationed prominently above the chat list.
- Highlights "+ Add Story", user's active story, and friend stories.
- Visual distinction with vibrant purple/pink gradient rings for standard stories, and **signature emerald green rings** for "Close Friends" posts.
- Instant seen/unseen ring status synchronization via WebSockets.

#### b. Story Creator Studio (`StoryStudioEditor.tsx`, `StoryCreatorModal.tsx`):
- **Flexible Content Sources:**
  - Live 15-second photo/video capture through camera viewfinder (`StoryCameraViewfinder.tsx`).
  - Device media upload (JPG, PNG, MP4, MOV).
  - Text Story mode with curated solid colors and modern gradient backdrops.
- **Cinematic Visual Filters (`StoryFilterSelector.tsx`):** Normal, Warm, Cool, Vintage, Noir, Vivid, Cyberpunk, and Dreamy.
- **Story Music Soundtrack Picker (`StoryMusicPicker.tsx`):**
  - Integrated music library with live animated audio soundwaves.
  - Custom audio file upload (MP3/AAC).
  - Spinning vinyl record badge displayed dynamically during playback.
- **Stickers & Social Tags (`StoryStickerPicker.tsx`):**
  - Draggable, resizable Emoji stickers on a 9:16 canvas.
  - Interactive Location Tag with automated city autocomplete.
  - Topical `#hashtag` sticker.
  - User mention `@username` sticker.

#### c. Interactive Stickers & Widgets (`StoryInteractiveWidgets.tsx`):
- **Interactive Poll Widget:** Create two-option questions; viewers tap to cast votes and immediately inspect percentage distributions.
- **Emoji Slider Widget:** Viewers drag their favorite emoji across a slider gradient, triggering animated floating emoji particles and calculating the community score.
- **Live Event Countdown Widget:** Set event milestones with real-time Day : Hour : Minute : Second countdown timers.

#### d. Full-Screen Story Viewer (`StoryViewerOverlay.tsx`):
- Standard 9:16 mobile/desktop viewport with automatic story segment progression bars.
- Press-and-hold to pause playback; click left/right bounds to jump forward/backward.
- Quick interactive reaction dock: Tap emojis or type direct responses routed straight to the creator's 1-on-1 chat.
- Creator Viewers Drawer (`StoryViewerDrawer.tsx`): Displays viewer lists and reaction breakdowns for the author's stories.
- Author management: Delete individual stories on demand.

#### e. Close Friends System (`CloseFriendsModal.tsx`):
- Manage a curated list of Close Friends.
- Flexible audience privacy tiers when publishing stories: *Public*, *Friends*, *Close Friends*, or *Only Me*.

#### f. Story Highlights & Archive (`StoryHighlightBar.tsx`, `StoryHighlightModal.tsx`):
- **Story Archive:** Automatically archives expired stories beyond the 24-hour window.
- **Create Highlights:** Group archived stories into named highlight collections with custom cover images.
- **Profile Integration (`ProfilePage.tsx`):** Circular highlight reels rendered directly on user profiles, playable anytime through the Story Viewer.

### 9. User Profile Management (`ProfilePage.tsx`)
- **Avatar & Cover Photo Customization:**
  - Support for animated **GIF Avatars** with preserved motion loops.
  - In-browser interactive image cropping tool (`AvatarCropper`) for static profile pictures.
- **Detailed Identity Metadata:** Display Name, Username (`@handle`), Phone, Gender, Address, Birthdate, and Bio.
- **Custom Status:** Custom emoji + text status with automatic expiration options (1 hour, 4 hours, end of day, end of week, or never).
- **Story Highlights Section:** "+ New" creation button and interactive highlight albums with localized labels.

### 10. Settings & Security (`SettingsPage.tsx`, `TwoFactorSettings.tsx`)
- **Theme & Styling Engine:** Seamless Dark Mode / Light Mode switching via global CSS variable tokens.
- **Internationalization (i18n):** Instant on-the-fly toggling between English and Vietnamese (`vi` / `en`).
- **Account Security:**
  - Password change management.
  - 2FA TOTP configuration: Generates QR codes for authenticator apps and verifies 6-digit codes to enable/disable protection.
- **Active Sessions Manager:** Inspect active device types, browsers, IP addresses, and session timestamps; supports remote single-session revocation or logging out all other devices.
- **Privacy Controls:** Granular visibility toggles for online presence, phone number, birthday, location, gender, bio, and Read Receipts.
- **Product Tour Controls:** Replay introductory tours or reset guide flags.
- **Permanent Account Deletion:** Secure self-service account termination with confirmation safeguards.

### 11. Administration Dashboard (`AdminPage.tsx`)
- **Hierarchical Role-Based Access Control:** Multi-level permissions (Owner, Admin, Moderator, User).
- **Visual System Analytics:** 7-day registration and traffic trajectory charts, total users, and active concurrent counts.
- **User Account Management:** Search, filter by role/status, adjust access privileges, ban, or unban user accounts.
- **Automated Content Moderation:**
  - System-wide Banned Words list with automatic message masking.
  - Blocked File Extensions list to protect users from malicious payloads (`.exe`, `.bat`, `.sh`, `.vbs`, etc.).
- **Incident & Report Handling:** Review user-flagged messages within conversational context; approve punitive actions or dismiss reports.
- **System Rate Limiting Configuration:** Real-time monitoring and threshold configuration to safeguard endpoints from DDoS and API abuse.

### 12. Notification Center & Web Push (`NotificationsPanel.tsx`)
- **In-App Real-Time Alerts:** Live notifications for incoming messages, friend requests, story replies, and missed calls.
- **Batch Actions:** Filter by Read/Unread, mark all as read, and bulk delete notifications.
- **Web Push Notifications:** Standalone Service Worker (`push-service-worker.js`) delivering system notifications even when browser tabs are closed.

### 13. Interactive Product Tour (`useAutoTour.ts`)
- Intelligent spotlight tours guiding new users through four critical platform journeys:
  - Chat Experience Tour.
  - Story Creation & Viewer Tour.
  - User Profile Tour.
  - Settings & Security Tour.
- Automatically triggered for first-time sign-ins, with local completion persistence and manual replay support.

---

## Technical Stack & Architecture

### Frontend
- **Framework & Language:** React 19, TypeScript
- **Build Tool:** Vite (optimized code-splitting, HMR, and ultra-fast bundle delivery)
- **Styling Architecture:** Pure Vanilla CSS with CSS Variables, Design Token system, Glassmorphism aesthetics, and smooth micro-animations
- **Core Dependencies:**
  - `lucide-react`: Lightweight SVG icon set
  - `emoji-picker-react`: Emoji selector
  - `socket.io-client`: Low-latency bidirectional WebSocket client
  - `i18next` & `react-i18next`: Internationalization engine
  - `react-easy-crop`: In-browser canvas image cropper
  - `sonner`: Toast notification framework
  - `@privacyresearch/curve25519-typescript`: Curve25519 cryptographic primitives for Signal E2EE

### Backend
- **Runtime & Framework:** Node.js, Express.js
- **Database:** MySQL (managed with `mysql2` connection pooling)
- **Self-Healing Schema Migration:** Automated runtime table and column discovery, ensuring schema consistency across server boots without manual intervention
- **Real-Time Engine:** Socket.IO (message transport, presence sync, calling signals, typing indicators, reactions, story events)
- **Signaling Layer:** WebRTC Signaling Server for peer-to-peer audio/video calling
- **Cloud Media Storage:** Cloudinary (secure asset transformation, image/video optimization, and hosting)
- **Email & Delivery Service:** Resend API / Nodemailer / Mailtrap
- **Security & Optimization:**
  - `web-push`: VAPID-compliant push notifications
  - `bcryptjs`: One-way cryptographic password hashing
  - `speakeasy` & `qrcode`: TOTP secret generation and QR encoding
  - `helmet`, `cors`: HTTP security headers
  - `rateLimit.middleware.js`: Multi-tiered rate limiters protecting against endpoint abuse
  - `multer`: Multi-part stream upload handling

---

## Project Directory Structure

```plaintext
InboxSystemManagement/
├── backend/                        # Backend source (Node.js & Express)
│   ├── src/
│   │   ├── config/                 # Database, Cloudinary, WebPush, Mailer configs
│   │   ├── controllers/            # Route business controllers
│   │   │   ├── core/               # Chat, Messages, Contacts, Stories, E2EE
│   │   │   └── system/             # Administration, Auth, Reports
│   │   ├── middleware/             # JWT auth, Rate Limiting, Error handling
│   │   ├── realtime/               # Socket.IO handlers, WebRTC Signaling
│   │   ├── routes/                 # RESTful API route definitions
│   │   │   ├── communications/     # Notifications, Web Push routes
│   │   │   ├── core/               # Conversations, Contacts, Stories, Search
│   │   │   └── system/             # Auth, Admin routes
│   │   ├── services/               # Mailer, Cloudinary, WebPush services
│   │   └── utils/                  # Helper utilities
│   └── package.json
├── database/                       # Initial database SQL bootstrap scripts
├── public/                         # Static assets (Favicons, Logo, PWA Manifest)
├── src/                            # Frontend source (React & TypeScript)
│   ├── components/                 # UI components
│   │   ├── chat/                   # Message area, message items, toolbars
│   │   ├── layout/                 # Navigation Rail (NavRail), Sidebar
│   │   ├── media/                  # WebRTC Call Overlay
│   │   ├── panels/                 # Inbox, Contacts, Notifications, Detail, Polls
│   │   ├── story/                  # Story module (Studio, Viewer, Widgets, Highlights)
│   │   ├── ui/                     # AvatarFallback, Cropper, Dialogs, Badges
│   │   └── views/                  # ChatApp, ProfilePage, SettingsPage, AdminPage
│   ├── hooks/                      # Domain-specific React hooks
│   ├── lib/                        # Internal cryptographic libraries (E2EE Signal Engine)
│   ├── locales/                    # Multilingual dictionaries (vi.json, en.json)
│   ├── pages/                      # Standalone routes (Auth, Legal, 404)
│   ├── services/                   # API clients and browser storage services
│   ├── stores/                     # Global state management (Zustand)
│   ├── styles/                     # CSS stylesheets & Design Tokens (story.css, tour.css)
│   ├── types.ts                    # Platform TypeScript type definitions
│   ├── main.tsx                    # React client entry point
│   └── App.tsx                     # Core application routing & session provider
├── package.json                    # Frontend package dependencies
└── README.md                       # Comprehensive platform documentation
```

---

## Installation & Getting Started

### Prerequisites
Make sure your environment meets the following requirements:
- **Node.js** (v18.0.0 or higher)
- **MySQL Server** (running locally on port 3306 or remote)
- **Cloudinary Account** (Cloud Name, API Key, API Secret)
- **Resend** or **Mailtrap Account** (for sending OTP emails)
- **GIPHY API Key** (for animated GIF search)
- **Google Client ID** / **Facebook App ID** (for social login)

### Setup Instructions

1. **Database Setup:**
   - Open MySQL Client / Workbench and create the database:
     ```sql
     CREATE DATABASE inbox_system_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```
   - *Note:* The backend automatically creates necessary tables upon launch via its built-in schema engine (`ensureSchema`).

2. **Environment Variables Configuration:**
   - Create a `.env` file inside `backend/`:
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
   - Create a `.env` file in the root project folder (Frontend):
     ```env
     VITE_GIPHY_API_KEY=your_giphy_api_key
     VITE_FACEBOOK_APP_ID=your_facebook_app_id
     VITE_GOOGLE_CLIENT_ID=your_google_client_id
     ```

3. **Install Dependencies:**
   - In the root folder:
     ```bash
     npm install
     ```
   - In the `backend` folder:
     ```bash
     cd backend
     npm install
     cd ..
     ```

4. **Launch the Application Concurrently:**
   - In the root folder, run:
     ```bash
     npm run dev:all
     ```
   - The application will automatically boot both services:
     - **Frontend Application:** `http://localhost:5173`
     - **Backend API Server:** `http://localhost:5000`

---

## License & Attribution

This project is developed for educational, research, and communication management purposes. All rights concerning commercial distribution or adaptation are reserved by the author.
