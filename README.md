# Inbox System Management

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E)
![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-111111?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

**Inbox System Management** is a full-stack real-time communication platform that combines instant messaging, social networking features, user administration, security controls, Progressive Web App capabilities, and a modern multi-panel chat experience.

The system is built with a **React + TypeScript + Vite** frontend, a **Node.js + Express** backend, **MySQL** persistence, **Socket.IO** realtime synchronization, **WebRTC** voice and video calling, web push notifications, 24-hour Stories, end-to-end encryption support, and an administrative dashboard for platform governance.

---

## Table of Contents

- [Overview](#overview)
- [Core Highlights](#core-highlights)
- [Architecture](#architecture)
- [Feature Modules](#feature-modules)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Configuration Surface](#configuration-surface)
- [Database Model](#database-model)
- [API and Realtime Layer](#api-and-realtime-layer)
- [Development Notes](#development-notes)
- [Deployment Readiness](#deployment-readiness)
- [License](#license)

---

## Overview

Inbox System Management is designed as a complete communication hub for individuals, teams, and communities. It provides account management, contact relationships, private and group messaging, file sharing, voice messages, polls, video calls, user Stories, profile customization, notification delivery, and role-based administration.

The application follows a realtime-first model. REST APIs provide authenticated data access and domain operations, while Socket.IO keeps messages, presence, notifications, Story events, reactions, read states, typing indicators, and call signaling synchronized across active clients.

---

## Core Highlights

- **Realtime communication:** instant message delivery, typing indicators, presence updates, read receipts, reactions, notifications, and Story synchronization.
- **Rich messaging experience:** text, links, emojis, GIFs, stickers, images, videos, documents, audio files, voice recordings, polls, replies, forwarding, pinning, editing, revocation, and reporting.
- **WebRTC calling:** peer-to-peer audio and video calls with microphone control, camera control, screen sharing, floating call windows, and call history summaries.
- **24-hour Stories:** media Stories, text Stories, camera capture, filters, music, stickers, mentions, hashtags, locations, polls, emoji sliders, countdowns, close friends, archives, and highlights.
- **Security-focused account layer:** email/password authentication, Google OAuth, Facebook login, TOTP-based two-factor authentication, session management, password reset, reCAPTCHA, and role-based access control.
- **End-to-end encryption support:** frontend E2EE modules based on Signal-style key management and Curve25519 cryptographic primitives.
- **Administrative governance:** user management, role management, ban/unban workflows, moderation settings, report handling, blocked words, blocked file extensions, and dashboard analytics.
- **Progressive Web App capabilities:** app manifest, service worker integration, offline-aware behavior, and web push notification support.
- **Internationalization:** English and Vietnamese language resources powered by `i18next` and `react-i18next`.
- **Modern interface:** responsive chat workspace, resizable panels, dark/light themes, glass-style visual language, smooth transitions, and domain-specific UI components.

---

## Architecture

```text
React / Vite Client
  |-- REST API: authentication, users, contacts, conversations, stories, notifications, admin
  |-- Socket.IO: messages, presence, typing, reactions, calls, stories, notifications
  |-- WebRTC: peer-to-peer media streams with backend-assisted signaling
  |
Express API Server
  |-- Middleware: authentication, authorization, CORS, Helmet, rate limiting, logging, errors
  |-- Controllers: auth, admin, contacts, conversations, users, stories, E2EE, notifications
  |-- Services: mail delivery, web push, upload/media integrations
  |
MySQL Database
  |-- users, sessions, contacts, conversations, participants, messages, attachments
  |-- stories, viewers, highlights, notifications, reports, moderation settings
```

Primary application flow:

1. The client authenticates users through the REST API.
2. Authenticated clients fetch profile, contact, conversation, notification, and Story data through domain-specific API clients.
3. The client opens a Socket.IO connection for realtime synchronization.
4. Message state, typing state, reactions, presence, Story updates, notifications, and call events are broadcast through the realtime layer.
5. WebRTC calls use Socket.IO for signaling while media streams flow directly between browser peers whenever network conditions allow.
6. Persistent application data is stored in MySQL, while media handling can be delegated to configured upload and cloud storage services.

---

## Feature Modules

### Authentication and Accounts

- Email and password authentication.
- User registration with identity, email, phone, and password fields.
- Google OAuth and Facebook login.
- TOTP-based two-factor authentication for authenticator apps.
- Password recovery through email OTP verification.
- Remember-me session behavior through browser storage.
- Login protection through reCAPTCHA.
- Active session inspection and remote session revocation.

### Realtime Chat

- Conversation inbox with All, Unread, Requests, Groups, and Archived filters.
- Conversation pinning and unpinning.
- Search across users, contacts, conversations, and message content.
- Resizable and collapsible inbox sidebar.
- One-to-one and group conversations.
- Group creation with name, avatar, member selection, and validation.
- Group governance for owners and members, including invites, join requests, nicknames, leaving, and disbanding.
- Text messages, link previews, emoji, GIFs, stickers, files, images, videos, audio, and voice messages.
- Drag-and-drop uploads, clipboard paste support, and attachment previews.
- Message lifecycle states: sending, sent, delivered, and seen.
- Typing indicators.
- Reply, forward, pin, edit, revoke/delete, and report actions.
- Emoji reactions and animated reaction effects.
- Interactive polls with multiple-choice and anonymous voting modes.

### Voice and Video Calls

- Peer-to-peer WebRTC audio and video calls.
- Floating call overlay for multitasking during active conversations.
- Microphone, camera, and screen-sharing controls.
- Camera switching where supported by the browser.
- Missed-call records, call duration summaries, and call event bubbles in chat.

### Stories

- Avatar-based Story feed.
- Story creation from camera capture, uploaded media, or text backgrounds.
- Visual filters such as Normal, Warm, Cool, Vintage, Noir, Vivid, Cyberpunk, and Dreamy.
- Music selection, custom audio uploads, and animated playback indicators.
- Emoji, location, hashtag, and mention stickers.
- Poll, emoji slider, and countdown widgets.
- Full-screen Story viewer with progress bars, pause, next/previous navigation, and reactions.
- Viewer list and reaction breakdown for Story authors.
- Audience controls for Public, Friends, Close Friends, and Only Me.
- Story archive and profile highlights.

### Contacts and Social Graph

- Global user search by name, email, or handle.
- Friend request creation, cancellation, acceptance, and rejection.
- Friend list with direct messaging and calling shortcuts.
- Blocking and unblocking workflows.
- Private nicknames for contacts.
- Mutual friends display.
- Online, offline, busy, and away presence states.

### User Profiles

- Avatar, cover photo, display name, username, phone, gender, address, birthday, and bio management.
- Animated GIF avatar support.
- In-browser avatar cropping.
- Custom status with emoji and expiration settings.
- Story Highlights displayed on user profiles.

### Settings and Security

- Dark and light theme switching.
- English and Vietnamese language switching.
- Password changes.
- Two-factor authentication setup and removal.
- Active session management.
- Privacy controls for presence, phone number, birthday, address, gender, bio, and read receipts.
- Product tour reset and replay.
- Permanent account deletion with confirmation safeguards.

### Notifications and Web Push

- In-app notifications for messages, friend requests, Story replies, and missed calls.
- Read/unread filtering.
- Mark-all-read and bulk deletion actions.
- Browser push notifications through the service worker at `src/push-service-worker.js`.
- VAPID-based web push delivery.

### Administration

- Role-based access control for `user`, `agent`, `admin`, and `owner` roles.
- Dashboard analytics for registrations, traffic, and user activity.
- User search, filtering, role changes, ban, and unban actions.
- Banned-word and blocked-file-extension management.
- User report review and moderation workflows.
- Endpoint protection through rate-limit configuration.

### Product Tour

- Guided onboarding flows for core product areas.
- Tours for Chat, Stories, Profile, and Settings.
- Persisted tour completion state with manual replay support.

---

## Technology Stack

### Frontend

| Area | Technology |
| --- | --- |
| Framework | React 19, React DOM |
| Language | TypeScript 6 |
| Build system | Vite 8 |
| State and data | Zustand, TanStack Query |
| Realtime client | socket.io-client |
| Interface | CSS variables, vanilla CSS, lucide-react, sonner |
| Internationalization | i18next, react-i18next |
| Media | WebRTC, MediaRecorder, react-easy-crop, browser-image-compression |
| PWA | vite-plugin-pwa, Workbox |
| Charts | Recharts |
| Guided tours | driver.js |

### Backend

| Area | Technology |
| --- | --- |
| Runtime | Node.js |
| Framework | Express.js |
| Database | MySQL, mysql2 connection pool |
| Realtime server | Socket.IO |
| Security | Helmet, CORS, bcryptjs, authentication middleware, rate limiting |
| Uploads | multer, Cloudinary integration |
| Email | Resend, Nodemailer, SMTP fallback |
| Push notifications | web-push, VAPID |
| Two-factor auth | otplib, qrcode |
| Development runtime | nodemon |

---

## Project Structure

```text
InboxSystemManagement/
├── backend/
│   ├── src/
│   │   ├── config/                 # Database, upload, and Cloudinary configuration
│   │   ├── controllers/
│   │   │   ├── communications/     # Notifications and web push controllers
│   │   │   ├── core/               # Users, contacts, conversations, stories, E2EE
│   │   │   └── system/             # Authentication and administration
│   │   ├── middleware/             # Auth, rate limits, logging, error handling
│   │   ├── realtime/               # Socket.IO and WebRTC signaling
│   │   ├── routes/
│   │   │   ├── communications/     # Notification and push routes
│   │   │   ├── core/               # Contact, conversation, story, user, search routes
│   │   │   └── system/             # Auth and admin routes
│   │   ├── services/               # Mail and push services
│   │   ├── utils/                  # Validation, logging, and shared helpers
│   │   ├── app.js                  # Express application composition
│   │   └── server.js               # HTTP server, database bootstrap, realtime init
│   ├── tests/                      # Backend and database verification scripts
│   └── uploads/                    # Local upload placeholder
├── database/
│   └── schema.sql                  # Initial MySQL schema
├── docs/
│   └── superpowers/plans/          # Planning and feature notes
├── public/
│   ├── _redirects                  # SPA redirect configuration
│   └── Favicon.png
├── src/
│   ├── bg-images/                  # Authentication background assets
│   ├── components/
│   │   ├── auth/                   # Account switching UI
│   │   ├── chat/                   # Chat-adjacent components
│   │   ├── layout/                 # Navigation rail and layout components
│   │   ├── media/                  # Call overlay
│   │   ├── panels/                 # Inbox, chat, details, contacts, notifications
│   │   ├── providers/              # Theme provider
│   │   ├── story/                  # Story feed, editor, viewer, widgets
│   │   ├── ui/                     # Shared UI primitives
│   │   └── views/                  # Chat, profile, settings, admin views
│   ├── features/                   # Feature configuration and tour steps
│   ├── hooks/                      # Domain-specific React hooks
│   ├── lib/e2ee/                   # E2EE engine, key manager, signal store
│   ├── locales/                    # English and Vietnamese dictionaries
│   ├── pages/                      # Auth, legal, and error pages
│   ├── services/
│   │   ├── api/                    # REST API clients
│   │   ├── core/                   # Routing, notifications, IndexedDB, offline queue
│   │   ├── realtime/               # Socket.IO and RTC configuration
│   │   ├── storage/                # Authentication storage
│   │   └── tutorial/               # Product tour service
│   ├── stores/                     # Zustand stores
│   ├── styles/                     # Story and tour styles
│   ├── App.tsx                     # Application shell and routing
│   ├── main.tsx                    # React entry point
│   ├── style.css                   # Global styles
│   └── types.ts                    # Shared frontend types
├── index.html
├── package.json                    # Frontend package metadata and scripts
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Configuration Surface

The application is configured through frontend `VITE_*` variables and backend environment variables. These settings define API routing, OAuth providers, CAPTCHA, GIF search, WebRTC ICE servers, database connectivity, CORS origins, upload providers, mail delivery, logging, password hashing, and web push credentials.

### Frontend-facing settings

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL for REST API requests |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client identifier |
| `VITE_FACEBOOK_APP_ID` | Facebook application identifier |
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA site key used by the login page |
| `VITE_GIPHY_API_KEY` | GIPHY API key used by GIF search |
| `VITE_RTC_ICE_SERVERS` | JSON array of WebRTC ICE server definitions |

### Backend-facing settings

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP server port |
| `CLIENT_ORIGIN`, `CLIENT_ORIGINS` | Allowed frontend origins for CORS |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection settings |
| `DB_CONNECTION_LIMIT` | MySQL pool connection limit |
| `BCRYPT_SALT_ROUNDS` | Password hashing cost |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary media upload integration |
| `CLOUDINARY_ROOT_FOLDER` | Root folder for uploaded media assets |
| `RESEND_API_KEY`, `RESEND_SENDER_EMAIL` | Resend email delivery configuration |
| `SMTP_USER`, `SMTP_PASS` | SMTP fallback credentials |
| `MAIL_SENDER_NAME` | Sender display name for system email |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web push notification credentials |
| `LOG_LEVEL`, `DEBUG` | Runtime logging behavior |

---

## Database Model

The MySQL schema in `database/schema.sql` defines the foundational persistence model for the platform. Major table groups include:

- **Identity and access:** users, sessions, password reset tokens, verification tokens, roles, and account state.
- **Social graph:** contacts, friend requests, blocked relationships, private nicknames, and mutual friend support.
- **Messaging:** conversations, participants, messages, attachments, reactions, read receipts, pinned messages, and group metadata.
- **Stories:** Story entries, viewers, reactions, audience settings, close friends, archives, and highlights.
- **Notifications:** in-app notifications and push subscriptions.
- **Moderation and administration:** reports, moderation settings, banned words, blocked extensions, user status, and administrative controls.

During backend startup, `server.js` verifies database connectivity, applies selected performance indexes when needed, and invokes conversation schema guards to keep the running environment aligned with expected conversation features.

---

## API and Realtime Layer

### REST API

The backend registers its API under the `/api` prefix.

| Prefix | Responsibility |
| --- | --- |
| `GET /api/health` | API health check |
| `/api/auth` | Authentication, registration, OAuth, password reset, 2FA, sessions |
| `/api/admin` | Dashboard, user management, moderation, reports |
| `/api/contacts` | Friend requests, contacts, blocking, nicknames |
| `/api/conversations` | Conversations, messages, groups, files, polls |
| `/api/notifications` | Notification center operations |
| `/api/push` | Push subscriptions and web push delivery |
| `/api/search` | Search across users, contacts, and conversations |
| `/api/users` | User profiles and privacy settings |
| `/api/stories` | Story feed, viewers, archive, highlights |
| `/api/e2ee` | E2EE key bundle and secret chat support |
| `/api/link-preview` | URL metadata preview |

Most domain routes require authenticated access through the `authenticate` middleware. Administrative routes also require elevated privileges through `requireAdmin`.

### Socket.IO

The realtime layer is implemented in `backend/src/realtime/socket.js` and initialized from `backend/src/server.js`. It coordinates:

- User connection state and presence.
- Realtime message delivery.
- Typing indicators.
- Delivery and read receipts.
- Message reactions and message updates.
- Story events.
- Notification events.
- WebRTC call signaling.

### WebRTC

The frontend manages RTC configuration in `src/services/realtime/rtcConfig.ts` and call signaling in `src/services/realtime/callRealtime.ts`. The backend is responsible for signaling only; audio and video streams are exchanged peer-to-peer between browsers when supported by the active network path.

---

## Development Notes

- Frontend route parsing lives in `src/services/core/appRoutes.ts` and supports both modern path routes and selected legacy hash routes.
- REST API clients are grouped under `src/services/api`.
- View-level orchestration is separated into domain hooks under `src/hooks`.
- Global client state is stored in Zustand stores under `src/stores`.
- Theme behavior is coordinated by `src/components/providers/ThemeProvider.tsx` and CSS variables in `src/style.css`.
- Language resources are stored in `src/locales/en.json` and `src/locales/vi.json`.
- E2EE logic is isolated under `src/lib/e2ee`; changes in this area should be reviewed carefully because they affect key material and encrypted-session behavior.
- Backend routes are grouped by domain under `backend/src/routes`, with matching controller domains under `backend/src/controllers`.
- Cross-cutting backend concerns such as authentication, rate limiting, request logging, and error handling live in `backend/src/middleware`.
- Secrets, provider credentials, production database dumps, private keys, and environment files should remain outside version control.

---

## Deployment Readiness

- Confirm production CORS origins before public deployment.
- Ensure frontend API routing points to the production API endpoint.
- Use HTTPS for OAuth, camera access, microphone access, Web Push, and WebRTC.
- Configure a production media storage strategy.
- Configure a real email provider for OTP, verification, and password reset flows.
- Generate and secure VAPID keys for browser push notifications.
- Review upload restrictions, blocked extensions, request limits, and moderation settings.
- Validate TypeScript and production bundling before release.
- Back up the database before schema migrations or major production updates.

---

## License

This project is distributed under the terms defined in [LICENSE](LICENSE). Review the license before redistributing, modifying, or using the project for commercial purposes.

