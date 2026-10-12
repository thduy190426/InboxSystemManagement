# Group Creation & Group Chat Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện và tối ưu toàn diện tính năng tạo nhóm và chat nhóm: giao diện tạo nhóm hiện đại, phát Socket dual-cast thời gian thực chuẩn xác, và header nhóm hiển thị số thành viên online trực quan.

**Architecture:** Tách `CreateGroupModal` thành component độc lập với tính năng search filter bạn bè, preview avatar, chip chọn thành viên; tối ưu Backend `emitConversationChanged` để phát đồng thời tới `conversationRoom` và `userRoom` của từng thành viên; nâng cấp `ChatPanel` header hiển thị số lượng thành viên online và click để mở quản trị nhóm.

**Tech Stack:** React 18, TypeScript, TailwindCSS/Vanilla CSS, Lucide Icons, Socket.IO, ExpressJS, MySQL2, Cloudinary.

## Global Constraints
- Node.js & Express ESM/CommonJS backend (`backend/src/`).
- Frontend React + Vite + TypeScript (`src/`).
- Hỗ trợ đa ngôn ngữ đầy đủ trong `src/locales/vi.json` và `src/locales/en.json`.
- Giữ nguyên toàn bộ comment và docstrings không liên quan trong các file hiện hữu.

---

### Task 1: Tối ưu Backend Socket Broadcast & API Tạo Nhóm
**Files:**
- Modify: `backend/src/controllers/core/conversation.controller.js:652-671, 1881-1950`
- Test: `node --check backend/src/controllers/core/conversation.controller.js`

**Interfaces:**
- `emitConversationChanged(connection, conversationId, actorUserId, eventType)`: Gọi thêm `emitToUsers(userIds, 'conversation:changed', payload)`
- `createGroupConversation(request, response, next)`: Hỗ trợ `description` và điều kiện `uniquePublicIds.length >= 1`

- [x] **Step 1: Cập nhật hàm `emitConversationChanged` trong `backend/src/controllers/core/conversation.controller.js`**
- [x] **Step 2: Cập nhật hàm `createGroupConversation` trong `backend/src/controllers/core/conversation.controller.js`**
- [x] **Step 3: Kiểm tra cú pháp backend bằng `node --check`**

---

### Task 2: Cập nhật TypeScript Types & API Client
**Files:**
- Modify: `src/services/api/chatApi.ts:515-535`
- Modify: `src/hooks/chat/useConversationActions.ts:444-460`

**Interfaces:**
- `createGroupConversation(payload: { title: string; description?: string; memberIds: string[]; avatar?: File | null })`

- [x] **Step 1: Cập nhật `createGroupConversation` trong `src/services/api/chatApi.ts` để gửi thêm `description` trong FormData nếu có.**
- [x] **Step 2: Cập nhật `handleCreateGroup` trong `src/hooks/chat/useConversationActions.ts`**

---

### Task 3: Bổ sung từ khóa i18n Đa ngôn ngữ (vi & en)
**Files:**
- Modify: `src/locales/vi.json`
- Modify: `src/locales/en.json`

- [x] **Step 1: Thêm các khóa dịch vào `src/locales/vi.json`**
- [x] **Step 2: Thêm các khóa dịch tương ứng vào `src/locales/en.json`**

---

### Task 4: Xây dựng Component `CreateGroupModal.tsx` Hiện Đại
**Files:**
- Create: `src/components/panels/modals/CreateGroupModal.tsx`

- [x] **Step 1: Viết component `CreateGroupModal.tsx` với đầy đủ logic**

---

### Task 5: Tích hợp `CreateGroupModal` vào `InboxPanel.tsx`
**Files:**
- Modify: `src/components/panels/InboxPanel.tsx`

- [x] **Step 1: Thay thế form modal inline cũ trong `InboxPanel.tsx` bằng component `<CreateGroupModal />`**
- [x] **Step 2: Xóa các state cục bộ không còn dùng trong `InboxPanel.tsx`**

---

### Task 6: Tối ưu Header Chat Nhóm và Trải nghiệm Chat trong `ChatPanel.tsx`
**Files:**
- Modify: `src/components/panels/ChatPanel.tsx:275-303`

- [x] **Step 1: Cập nhật Header Profile Button trong `ChatPanel.tsx`**

---

### Task 7: Kiểm thử Tổng thể, Build và Xác nhận Không Lỗi
**Files:**
- Run: `npx tsc --noEmit`
- Run: `npm run build`
- Run: `node --check` trên backend

- [x] **Step 1: Chạy kiểm tra TypeScript (`npx tsc --noEmit`) - PASS**
- [x] **Step 2: Chạy kiểm tra cú pháp Backend (`node --check`) - PASS**
- [x] **Step 3: Chạy Vite build production (`npm run build`) - PASS**
