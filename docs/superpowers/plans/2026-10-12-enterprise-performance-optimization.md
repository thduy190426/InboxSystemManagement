# Enterprise Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai tối ưu hoá hiệu năng toàn diện cho ứng dụng Inbox System Management đạt chuẩn Enterprise Scale: triệt tiêu HTTP polling bằng WebSocket typing, nén HTTP responses bằng Gzip, mở rộng connection pool, loại bỏ DDL checks lặp lại, tối ưu broadcast socket, ảo hoá danh sách chat (virtualization) và phân tách bundle chunks.

**Architecture:** Kiến trúc Client-Server ExpressJS + Socket.IO + MySQL + React 19 + Vite. Thay thế polling HTTP bằng WebSocket event-driven, bổ sung compression stream tầng middleware, scale connection pool MySQL với keep-alive, và ảo hoá DOM ở cả danh sách chat lẫn luồng tin nhắn.

**Tech Stack:** Node.js, Express 4, Socket.IO 4, MySQL2, compression, React 19, react-virtuoso, Vite 8.

## Global Constraints

- Preserve all existing comments and docstrings.
- Maintain existing styles and translations in `src/locales/vi.json` and `src/locales/en.json`.
- Strict type checking with TypeScript (`tsc && vite build` must pass with 0 errors).
- Zero regression on existing direct chat, group chat, and story features.

---

### Task 1: Backend HTTP Compression & Database Pool Scaling

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/app.js:1-48`
- Modify: `backend/src/config/db.js:1-25`

**Interfaces:**
- Consumes: Express request/response pipeline, MySQL2 pool
- Produces: Gzip/Brotli compressed responses for all JSON > 1KB, expanded connection pool (30 connections) with TCP keep-alive

- [ ] **Step 1: Install compression in backend**
Run: `npm --prefix backend install compression`
Expected: `compression` added to `backend/package.json` dependencies.

- [ ] **Step 2: Add compression middleware in `backend/src/app.js`**
Add:
```javascript
const compression = require('compression')
// ...
app.use(compression({
  threshold: 1024,
  level: 6,
}))
```
Place before route definitions in `backend/src/app.js`.

- [ ] **Step 3: Update MySQL Pool configuration in `backend/src/config/db.js`**
Update `connectionLimit` to default 30 and enable keep-alive:
```javascript
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 30),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
```

- [ ] **Step 4: Verify compression and DB connection**
Run a test request to `/api/health` and verify headers.
Run: `node -e "const { pool } = require('./backend/src/config/db'); pool.getConnection().then(c => { console.log('OK'); c.release(); process.exit(0); })"`
Expected: Output `OK`.

- [ ] **Step 5: Commit changes**
```bash
git add backend/package.json backend/package-lock.json backend/src/app.js backend/src/config/db.js
git commit -m "perf: add http compression and scale mysql connection pool"
```

---

### Task 2: Schema Migrations Optimization (Remove DDL from Request Path)

**Files:**
- Modify: `backend/src/controllers/core/conversation.controller.js:1540-1555`
- Modify: `backend/src/server.js:15-37`

**Interfaces:**
- Consumes: MySQL connection from pool
- Produces: Single-run migration execution on server boot, 0 repeated DDL queries during `listConversations`

- [ ] **Step 1: Update `backend/src/controllers/core/conversation.controller.js`**
Wrap `ensureMessageHiddenEntriesTable`, `ensureConversationParticipantHiddenAtColumn`, `ensureConversationParticipantMessageRequestStatusColumn`, `ensureConversationQuickEmojiColumn` with an in-memory guard flag:
```javascript
let isConversationSchemaEnsured = false
async function ensureConversationSchemaOnce() {
  if (isConversationSchemaEnsured) return
  await ensureMessageHiddenEntriesTable()
  await ensureConversationParticipantHiddenAtColumn()
  await ensureConversationParticipantMessageRequestStatusColumn()
  await ensureConversationQuickEmojiColumn()
  isConversationSchemaEnsured = true
}
```
In `listConversations`, replace the 4 separate awaits with `await ensureConversationSchemaOnce()`.

- [ ] **Step 2: Export and call `ensureConversationSchemaOnce` at server start**
In `backend/src/server.js`:
Call `ensureConversationSchemaOnce()` during `startServer()`.

- [ ] **Step 3: Verify server startup and schema check**
Run: `node -e "const { testConnection } = require('./backend/src/config/db'); testConnection().then(() => { console.log('DB OK'); process.exit(0); })"`
Expected: Output `DB OK`.

- [ ] **Step 4: Commit changes**
```bash
git add backend/src/controllers/core/conversation.controller.js backend/src/server.js
git commit -m "perf: avoid repeating DDL checks in listConversations request path"
```

---

### Task 3: WebSocket Real-time Typing Indicators (Eliminate 1.5s HTTP Polling)

**Files:**
- Modify: `backend/src/realtime/socket.js:750-840`
- Modify: `src/services/realtime/realtime.ts`
- Modify: `src/hooks/chat/useChatAppController.ts:740-770`
- Modify: `src/hooks/chat/useChatRealtime.ts`

**Interfaces:**
- Consumes: Socket.IO client/server events
- Produces: `typing:start` and `typing:stop` socket events, eliminating `/api/conversations/:id/typing` polling

- [ ] **Step 1: Add typing socket handlers to `backend/src/realtime/socket.js`**
Add socket event listeners:
```javascript
socket.on('typing:start', ({ conversationId } = {}) => {
  if (!conversationId) return
  socket.to(getConversationRoom(conversationId)).emit('conversation:typing', {
    conversationId: String(conversationId),
    userId: socket.user.id,
    userName: socket.user.full_name,
    isTyping: true,
  })
})

socket.on('typing:stop', ({ conversationId } = {}) => {
  if (!conversationId) return
  socket.to(getConversationRoom(conversationId)).emit('conversation:typing', {
    conversationId: String(conversationId),
    userId: socket.user.id,
    isTyping: false,
  })
})
```

- [ ] **Step 2: Add typing emitters to `src/services/realtime/realtime.ts`**
Export helper functions:
```typescript
export function emitTypingStart(conversationId: string) {
  const socket = getRealtimeSocket()
  if (socket?.connected) {
    socket.emit('typing:start', { conversationId })
  }
}

export function emitTypingStop(conversationId: string) {
  const socket = getRealtimeSocket()
  if (socket?.connected) {
    socket.emit('typing:stop', { conversationId })
  }
}
```

- [ ] **Step 3: Replace HTTP polling in `src/hooks/chat/useChatAppController.ts` with socket events**
Remove `pollTypingStatus` and `window.setInterval(pollTypingStatus, 1500)`.
In `onDraftChange` or typing handlers, emit `emitTypingStart(conversationId)` when input changes, and debounce `emitTypingStop(conversationId)` after 2.5s of inactivity or on submit.

- [ ] **Step 4: Handle `conversation:typing` in `src/hooks/chat/useChatRealtime.ts`**
Listen to `conversation:typing` event on socket:
```typescript
function handleTypingChanged(payload: { conversationId: string; userId: number; isTyping: boolean }) {
  if (payload.conversationId === activeIdRef.current) {
    setTypingByConversation((current) => ({
      ...current,
      [payload.conversationId]: payload.isTyping,
    }))
  }
}
socket.on('conversation:typing', handleTypingChanged)
```

- [ ] **Step 5: Verify build & typing functionality**
Run: `npm run build`
Expected: Build passes with 0 errors.

- [ ] **Step 6: Commit changes**
```bash
git add backend/src/realtime/socket.js src/services/realtime/realtime.ts src/hooks/chat/useChatAppController.ts src/hooks/chat/useChatRealtime.ts
git commit -m "perf: replace http typing polling with real-time websocket events"
```

---

### Task 4: Socket.IO Multi-room Emit Optimization

**Files:**
- Modify: `backend/src/realtime/socket.js:843-851`

**Interfaces:**
- Consumes: Array of user IDs and socket payload
- Produces: Single batched multi-room emit via `io.to(rooms).emit()`

- [ ] **Step 1: Update `emitToUsers` in `backend/src/realtime/socket.js`**
Update:
```javascript
function emitToUsers(userIds, eventName, payload = {}) {
  if (!io) {
    return
  }

  const rooms = [...new Set(userIds.filter(Boolean))].map(getUserRoom)
  if (rooms.length > 0) {
    io.to(rooms).emit(eventName, payload)
  }
}
```

- [ ] **Step 2: Verify socket module loads cleanly**
Run: `node -e "const { emitToUsers } = require('./backend/src/realtime/socket'); console.log(typeof emitToUsers);"`
Expected: Output `function`.

- [ ] **Step 3: Commit changes**
```bash
git add backend/src/realtime/socket.js
git commit -m "perf: batch multi-room socket emissions in single event loop pass"
```

---

### Task 5: Frontend Virtualization for Conversation List (`InboxPanel.tsx`)

**Files:**
- Modify: `src/components/panels/InboxPanel.tsx:624-730`

**Interfaces:**
- Consumes: `conversations: Conversation[]` array
- Produces: Virtualized conversation list using `react-virtuoso` with 60 FPS smooth scrolling

- [ ] **Step 1: Import Virtuoso in `InboxPanel.tsx`**
Ensure `Virtuoso` is imported from `react-virtuoso`.

- [ ] **Step 2: Replace unvirtualized `.map()` with `Virtuoso`**
Wrap the conversation items in `<Virtuoso style={{ height: '100%' }} data={conversations} itemContent={(index, conversation) => (...) } />`.
Preserve all context menus, click events, active conversation styles, unread badges, and pin status.

- [ ] **Step 3: Verify TypeScript build & layout**
Run: `npm run build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit changes**
```bash
git add src/components/panels/InboxPanel.tsx
git commit -m "perf: virtualize conversation list in InboxPanel using Virtuoso"
```

---

### Task 6: Bundle Optimization & Code Splitting in Vite

**Files:**
- Modify: `vite.config.ts:30-45`

**Interfaces:**
- Consumes: Vite Rollup bundler configuration
- Produces: Optimized manual chunks preventing 1MB+ monolithic vendor file, isolating `recharts`, `mediapipe`, `emoji`

- [ ] **Step 1: Update `manualChunks` in `vite.config.ts`**
Update chunking rules:
```typescript
manualChunks: (id) => {
  if (id.includes('node_modules')) {
    if (id.includes('react/') || id.includes('react-dom/')) return 'react-vendor'
    if (id.includes('@tanstack/react-query')) return 'tanstack'
    if (id.includes('recharts')) return 'charts-vendor'
    if (id.includes('@mediapipe')) return 'mediapipe-vendor'
    if (id.includes('emoji-picker-react')) return 'emoji-vendor'
    if (id.includes('lucide-react')) return 'icons-vendor'
    return 'vendor'
  }
}
```

- [ ] **Step 2: Run `npm run build` and inspect chunk sizes**
Run: `npm run build`
Expected: Main `vendor` chunk reduced significantly under 500KB, heavy modules cleanly split.

- [ ] **Step 3: Commit changes**
```bash
git add vite.config.ts
git commit -m "perf: optimize code splitting and chunk sizes in vite config"
```
