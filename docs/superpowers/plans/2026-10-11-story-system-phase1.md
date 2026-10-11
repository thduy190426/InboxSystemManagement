# Story Core Platform (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai hoàn chỉnh Giai đoạn 1 của hệ thống Story chuẩn Messenger/Facebook: Viewer điều khiển cử chỉ mượt mà (hold to pause, tap nav, preload), thanh Reaction chuẩn 1 cảm xúc duy nhất, cầu nối gửi phản hồi (Reply) vào hội thoại 1-1 kèm thẻ trích dẫn Story, Bottom Sheet thống kê chi tiết người xem & reaction của tác giả, Quyền riêng tư & Bạn thân (Close Friends) với Green Ring, và đồng bộ Realtime Socket.

**Architecture:** Mở rộng cơ sở dữ liệu MySQL với mô hình chuẩn hóa gồm `story_views`, `story_reactions`, `story_close_friends`. Xây dựng REST API backend an toàn, hỗ trợ Socket.io realtime events. Phát triển frontend React 19 với các component module chuyên biệt (`StoryViewerOverlay`, `StoryViewerDrawer`, `StoryReactionSelector`, `CloseFriendsModal`, `StoryReplyCard`), tối ưu preloading media và cử chỉ chạm/vuốt.

**Tech Stack:** React 19, TypeScript, MySQL, Node.js / Express, Socket.io, Cloudinary, Lucide-react, i18next, Vanilla CSS.

## Global Constraints
- React version: 19.2.7.
- Không để xảy ra race-condition khi đếm views/reactions (dùng database atomic upsert/delete).
- Mỗi người dùng chỉ duy trì duy nhất 1 reaction trên mỗi Story tại một thời điểm.
- Khi người xem phản hồi hoặc thả tim, tin nhắn được gửi vào cuộc trò chuyện 1-1 với tác giả Story kèm metadata trích dẫn (`story_reply`).
- Phân quyền nghiêm ngặt: Chỉ chủ sở hữu Story mới được xem danh sách người xem (`GET /viewers`) và xóa Story (`DELETE`).
- Story Bạn thân (Close Friends) chỉ hiển thị cho người trong danh sách; hiển thị viền xanh lá (Green Ring) đặc trưng.
- Đầy đủ hỗ trợ đa ngôn ngữ vi/en trong `src/locales/vi.json` và `src/locales/en.json`.

---

### Task 1: Database Migration & Schema Setup

**Files:**
- Create: `backend/migrations/20261011_story_phase1_schema.js`
- Test: `backend/migrations/test_story_phase1_schema.js`

**Interfaces:**
- Consumes: MySQL Connection Pool từ `backend/src/config/db.js`.
- Produces: Bảng `story_views`, `story_reactions`, `story_close_friends`, và mở rộng bảng `stories` với `views_count`, `reactions_count`, enum `privacy`.

- [x] **Step 1: Viết script migration MySQL cho Story Phase 1**

Tạo file `backend/migrations/20261011_story_phase1_schema.js`:
```javascript
require('dotenv').config({ path: '../.env' });
const { pool } = require('../src/config/db.js');

async function runMigration() {
  console.log('[Migration] Starting Story Phase 1 schema migration...');
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Cập nhật bảng stories nếu thiếu các cột
    console.log('[Migration] Updating stories table...');
    const [cols] = await conn.query('SHOW COLUMNS FROM stories');
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('views_count')) {
      await conn.query('ALTER TABLE stories ADD COLUMN views_count INT UNSIGNED NOT NULL DEFAULT 0');
    }
    if (!colNames.includes('reactions_count')) {
      await conn.query('ALTER TABLE stories ADD COLUMN reactions_count INT UNSIGNED NOT NULL DEFAULT 0');
    }

    // Cập nhật enum privacy nếu cần
    await conn.query(`
      ALTER TABLE stories 
      MODIFY COLUMN privacy ENUM('public', 'friends', 'close_friends', 'only_me') NOT NULL DEFAULT 'friends'
    `);

    // 2. Tạo bảng story_views
    console.log('[Migration] Creating story_views table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS story_views (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        story_id CHAR(36) NOT NULL,
        viewer_id BIGINT UNSIGNED NOT NULL,
        viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_story_viewer (story_id, viewer_id),
        KEY idx_story_views_story (story_id),
        KEY idx_story_views_viewer (viewer_id),
        CONSTRAINT fk_story_views_story FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
        CONSTRAINT fk_story_views_user FOREIGN KEY (viewer_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Tạo bảng story_reactions
    console.log('[Migration] Creating story_reactions table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS story_reactions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        story_id CHAR(36) NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        reaction VARCHAR(16) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_story_user_reaction (story_id, user_id),
        KEY idx_story_reactions_story (story_id),
        KEY idx_story_reactions_user (user_id),
        CONSTRAINT fk_story_reactions_story FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
        CONSTRAINT fk_story_reactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Tạo bảng story_close_friends
    console.log('[Migration] Creating story_close_friends table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS story_close_friends (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        friend_id BIGINT UNSIGNED NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_user_close_friend (user_id, friend_id),
        KEY idx_close_friends_user (user_id),
        KEY idx_close_friends_friend (friend_id),
        CONSTRAINT fk_close_friends_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_close_friends_friend FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await conn.commit();
    console.log('[Migration] Story Phase 1 migration completed successfully!');
  } catch (error) {
    await conn.rollback();
    console.error('[Migration] Failed:', error);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

runMigration();
```

- [x] **Step 2: Viết test kiểm tra schema migration**

Tạo file `backend/migrations/test_story_phase1_schema.js`:
```javascript
require('dotenv').config({ path: '../.env' });
const { pool } = require('../src/config/db.js');

async function verifySchema() {
  const [storyCols] = await pool.query('SHOW COLUMNS FROM stories');
  const storyColNames = storyCols.map(c => c.Field);
  if (!storyColNames.includes('views_count') || !storyColNames.includes('reactions_count')) {
    throw new Error('Missing columns in stories table');
  }

  const [viewTables] = await pool.query("SHOW TABLES LIKE 'story_views'");
  if (viewTables.length === 0) throw new Error('story_views table does not exist');

  const [reactTables] = await pool.query("SHOW TABLES LIKE 'story_reactions'");
  if (reactTables.length === 0) throw new Error('story_reactions table does not exist');

  const [friendTables] = await pool.query("SHOW TABLES LIKE 'story_close_friends'");
  if (friendTables.length === 0) throw new Error('story_close_friends table does not exist');

  console.log('PASS: All Story Phase 1 tables and columns verified successfully.');
  process.exit(0);
}

verifySchema().catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});
```

- [x] **Step 3: Chạy migration và xác nhận test pass**

Chạy: `node backend/migrations/20261011_story_phase1_schema.js`
Expected: `[Migration] Story Phase 1 migration completed successfully!`
Chạy: `node backend/migrations/test_story_phase1_schema.js`
Expected: `PASS: All Story Phase 1 tables and columns verified successfully.`

- [x] **Step 4: Commit**
```bash
git add backend/migrations/20261011_story_phase1_schema.js backend/migrations/test_story_phase1_schema.js
git commit -m "feat(backend): add story views reactions and close friends database migration"
```

---

### Task 2: Backend Story Controller & Routes Expansion

**Files:**
- Modify: `backend/src/controllers/core/story.controller.js`
- Modify: `backend/src/routes/core/story.routes.js`

**Interfaces:**
- Consumes: `pool` từ `db.js`, `getIO` từ `socket.js`, `uploadBufferToCloudinary`.
- Produces: Endpoints `GET /stories`, `POST /stories`, `POST /stories/:id/view`, `POST /stories/:id/react`, `GET /stories/:id/viewers`, `DELETE /stories/:id`, `GET /stories/close-friends`, `POST /stories/close-friends/toggle`.

- [x] **Step 1: Mở rộng `story.controller.js`**

Cập nhật `backend/src/controllers/core/story.controller.js`:
- `getActiveStories`:
  - Lọc theo Privacy: Cho phép xem story `public`, `friends`, `close_friends` (chỉ khi requester là author hoặc nằm trong `story_close_friends`), và `only_me` (chỉ author).
  - Lấy kèm thông tin `is_close_friend`, `has_viewed` (nếu requester đã xem), `my_reaction` (reaction của requester), `views_count`, `reactions_count`.
- `recordView`:
  - `INSERT IGNORE INTO story_views (story_id, viewer_id) VALUES (?, ?)`.
  - Cập nhật `views_count = (SELECT COUNT(*) FROM story_views WHERE story_id = ?)`.
  - Phát socket `story:viewed` tới chủ Story nếu là lượt xem mới.
- `reactToStory`:
  - Body: `{ reaction: string }`.
  - Nếu user đã thả đúng emoji đó -> Gỡ reaction (DELETE), giảm `reactions_count`.
  - Nếu khác emoji -> Upsert `INSERT INTO story_reactions (story_id, user_id, reaction) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)`.
  - Cập nhật `reactions_count`.
  - Phát socket `story:reacted`.
- `getStoryViewers`:
  - Kiểm tra xem requester có phải chủ sở hữu story không. Nếu không -> 403 Forbidden.
  - Query danh sách viewers từ `story_views` JOIN `users` LEFT JOIN `story_reactions`.
- `deleteStory`:
  - Xóa story nếu requester là chủ sở hữu.
  - Phát socket `story:deleted`.
- `getCloseFriends`:
  - Lấy danh sách friend IDs và thông tin user bạn thân của requester.
- `toggleCloseFriend`:
  - Body: `{ friend_id: number }`.
  - Nếu đã tồn tại -> Xóa; Nếu chưa -> Thêm mới.

- [x] **Step 2: Cập nhật `story.routes.js`**

Khai báo các route tương ứng trong `backend/src/routes/core/story.routes.js`:
```javascript
router.post('/', createStoryRateLimit, upload.single('media'), storyController.createStory);
router.get('/', storyController.getActiveStories);
router.post('/:id/view', storyController.recordView);
router.post('/:id/react', storyController.reactToStory);
router.post('/:id/reply', storyController.replyToStory);
router.get('/:id/viewers', storyController.getStoryViewers);
router.delete('/:id', storyController.deleteStory);
router.get('/close-friends', storyController.getCloseFriends);
router.post('/close-friends/toggle', storyController.toggleCloseFriend);
```

- [x] **Step 3: Viết test kiểm tra syntax và endpoints backend**
Chạy: `node -c backend/src/controllers/core/story.controller.js && node -c backend/src/routes/core/story.routes.js`
Expected: Cú pháp hợp lệ không có lỗi syntax.

- [x] **Step 4: Commit**
```bash
git add backend/src/controllers/core/story.controller.js backend/src/routes/core/story.routes.js
git commit -m "feat(backend): implement views reactions viewers list and close friends endpoints"
```

---

### Task 3: Backend Direct Chat Reply Bridge

**Files:**
- Modify: `backend/src/controllers/core/story.controller.js`
- Modify: `backend/src/controllers/core/conversation.controller.js` (hoặc tái sử dụng hàm tạo tin nhắn 1-1)

**Interfaces:**
- Consumes: `pool`, `getIO` từ `socket.js`.
- Produces: `replyToStory`: Tự động tìm/tạo cuộc trò chuyện 1-1 giữa viewer và author, tạo tin nhắn dạng `story_reply` chứa metadata (story thumbnail, text reply, hoặc emoji reaction), phát socket `message:new`.

- [x] **Step 1: Triển khai logic `replyToStory` trong `story.controller.js`**

```javascript
exports.replyToStory = async (req, res, next) => {
  try {
    const viewerId = req.user.id;
    const storyId = req.params.id;
    const { message, reaction } = req.body;

    if (!message && !reaction) {
      return res.status(400).json({ success: false, message: 'Message or reaction is required' });
    }

    // 1. Tìm thông tin story
    const [storyRows] = await pool.query(
      'SELECT id, user_id, media_url, media_type, text_content FROM stories WHERE id = ?',
      [storyId]
    );
    if (storyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Story not found or expired' });
    }
    const story = storyRows[0];
    const authorId = story.user_id;

    if (String(viewerId) === String(authorId)) {
      return res.status(400).json({ success: false, message: 'Cannot reply to your own story' });
    }

    // 2. Tìm hoặc tạo cuộc trò chuyện 1-1 giữa viewer và author
    let conversationId = null;
    const [existingConv] = await pool.query(`
      SELECT c.id FROM conversations c
      JOIN conversation_members cm1 ON c.id = cm1.conversation_id AND cm1.user_id = ?
      JOIN conversation_members cm2 ON c.id = cm2.conversation_id AND cm2.user_id = ?
      WHERE c.type = 'direct' LIMIT 1
    `, [viewerId, authorId]);

    if (existingConv.length > 0) {
      conversationId = existingConv[0].id;
    } else {
      const [newConvResult] = await pool.query(
        "INSERT INTO conversations (type, title) VALUES ('direct', '')"
      );
      conversationId = newConvResult.insertId;
      await pool.query(
        "INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?, ?, 'member'), (?, ?, 'member')",
        [conversationId, viewerId, conversationId, authorId]
      );
    }

    // 3. Tạo tin nhắn story_reply
    const content = message || (reaction ? `Đã thả cảm xúc ${reaction} vào story của bạn` : '');
    const metadata = JSON.stringify({
      type: 'story_reply',
      storyId: story.id,
      storyMediaUrl: story.media_url,
      storyMediaType: story.media_type,
      storyTextContent: story.text_content,
      reaction: reaction || null,
    });

    const [msgResult] = await pool.query(`
      INSERT INTO messages (conversation_id, sender_id, message_type, content, metadata, created_at)
      VALUES (?, ?, 'story_reply', ?, ?, NOW())
    `, [conversationId, viewerId, content, metadata]);

    const messageId = msgResult.insertId;

    // Lấy thông tin đầy đủ của tin nhắn vừa tạo để broadcast socket
    const [msgRows] = await pool.query(`
      SELECT m.*, u.full_name, u.display_name, u.avatar_url
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `, [messageId]);
    const createdMessage = msgRows[0];

    const io = getIO();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message:new', createdMessage);
      io.to(`user:${authorId}`).emit('conversation:message', {
        conversationId,
        message: createdMessage,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Story reply sent successfully',
      data: {
        conversationId,
        message: createdMessage,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

- [x] **Step 2: Chạy kiểm tra cú pháp**
Chạy: `node -c backend/src/controllers/core/story.controller.js`
Expected: Cú pháp hợp lệ.

- [x] **Step 3: Commit**
```bash
git add backend/src/controllers/core/story.controller.js
git commit -m "feat(backend): implement story reply direct chat bridge"
```

---

### Task 4: Frontend Types & Story API Client Updates

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/services/api/storyApi.ts`

**Interfaces:**
- Consumes: `apiFetch`, `requestJson` từ `src/services/api/apiClient.ts`.
- Produces: Các method `storyApi.recordView`, `storyApi.reactToStory`, `storyApi.replyToStory`, `storyApi.getStoryViewers`, `storyApi.deleteStory`, `storyApi.getCloseFriends`, `storyApi.toggleCloseFriend`.

- [x] **Step 1: Cập nhật Type definitions trong `src/types/index.ts`**

Mở rộng `StoryItem` và `UserStoryGroup`:
```typescript
export type StoryItem = {
  id: string
  media_url: string
  media_type: 'image' | 'video'
  text_content?: string | null
  privacy: 'public' | 'friends' | 'close_friends' | 'only_me'
  expires_at: string
  created_at: string
  is_close_friend?: boolean
  has_viewed?: boolean
  my_reaction?: string | null
  views_count?: number
  reactions_count?: number
}

export type StoryViewerItem = {
  id: number
  full_name: string
  display_name?: string
  avatar_url?: string
  viewed_at: string
  reaction?: string | null
}
```

- [x] **Step 2: Bổ sung các phương thức vào `src/services/api/storyApi.ts`**

Thêm các hàm gọi API:
- `recordView(storyId: string)`
- `reactToStory(storyId: string, reaction: string)`
- `replyToStory(storyId: string, message: string, reaction?: string)`
- `getStoryViewers(storyId: string)`
- `deleteStory(storyId: string)`
- `getCloseFriends()`
- `toggleCloseFriend(friendId: number)`

- [x] **Step 3: Kiểm tra TypeScript compiler**
Chạy: `npm run build` hoặc `npx tsc --noEmit`
Expected: Không có lỗi type.

- [x] **Step 4: Commit**
```bash
git add src/types/index.ts src/services/api/storyApi.ts
git commit -m "feat(frontend): extend story types and API client methods"
```

---

### Task 5: Đa Ngôn Ngữ i18n cho Story System

**Files:**
- Modify: `src/locales/vi.json`
- Modify: `src/locales/en.json`

**Interfaces:**
- Consumes: File từ khóa ngôn ngữ i18next `story`.
- Produces: Các khóa i18n mới: `closeFriends`, `manageCloseFriends`, `viewers`, `viewsCount`, `noViewersYet`, `replyStory`, `reactStory`, `deleteStoryConfirm`, `deleteStorySuccess`, `swipeUpToViewDetails`.

- [x] **Step 1: Bổ sung từ khóa vào `src/locales/vi.json`**
Thêm các key về bạn thân, người xem, cảm xúc, cử chỉ vào namespace `story`.

- [x] **Step 2: Bổ sung từ khóa tương ứng vào `src/locales/en.json`**
Thêm các key bản dịch tiếng Anh chuẩn.

- [x] **Step 3: Chạy build kiểm tra JSON parsing**
Chạy: `npm run build`
Expected: Build thành công, file JSON hợp lệ.

- [x] **Step 4: Commit**
```bash
git add src/locales/vi.json src/locales/en.json
git commit -m "feat(i18n): add comprehensive translations for story phase 1"
```

---

### Task 6: Frontend Close Friends Modal & Story Feed Updates

**Files:**
- Create: `src/components/story/CloseFriendsModal.tsx`
- Modify: `src/components/story/StoryFeed.tsx`
- Modify: `src/components/story/StoryCreatorModal.tsx`
- Create: `src/styles/story.css`
- Modify: `src/style.css`

**Interfaces:**
- Consumes: `storyApi.getCloseFriends`, `storyApi.toggleCloseFriend`, danh sách bạn bè từ `contactApi`.
- Produces: Modal quản lý bạn thân, viền xanh lá (Green ring) cho Story Bạn Thân trên `StoryFeed`, badge ngôi sao xanh nhận diện.

- [x] **Step 1: Tạo `src/styles/story.css` định nghĩa hiệu ứng Green Ring & Styling Story mới**
Bao gồm:
- `.story-circle.is-close-friend .story-avatar-wrap` với viền gradient emerald/lime (`#10b981`, `#84cc16`).
- `.story-circle.is-viewed` với viền xám mờ tinh tế.
- `.story-close-friend-badge` ngôi sao xanh lá.
- Hoạt ảnh nảy pop-in cho reaction.
- Bottom sheet slide-up animation cho viewer drawer.

- [x] **Step 2: Xây dựng `CloseFriendsModal.tsx`**
Cung cấp danh sách bạn bè với ô tìm kiếm nhanh, nút toggle thêm/bớt bạn thân, lưu trực tiếp qua `storyApi.toggleCloseFriend`.

- [x] **Step 3: Nâng cấp `StoryCreatorModal.tsx`**
Thêm tùy chọn quyền riêng tư: "Bạn thân (Close Friends)" có biểu tượng ngôi sao xanh lá.

- [x] **Step 4: Nâng cấp `StoryFeed.tsx`**
- Thêm nút quản lý Bạn Thân (icon Star hoặc UserCheck cạnh Tạo story).
- Áp dụng class `is-close-friend` và `is-viewed` dựa trên metadata của từng group.

- [x] **Step 5: Kiểm tra TypeScript build**
Chạy: `npm run build`
Expected: Build pass không lỗi.

- [x] **Step 6: Commit**
```bash
git add src/styles/story.css src/style.css src/components/story/CloseFriendsModal.tsx src/components/story/StoryFeed.tsx src/components/story/StoryCreatorModal.tsx
git commit -m "feat(frontend): add close friends modal and green ring story feed indicator"
```

---

### Task 7: Frontend Gesture & Preloaded Story Viewer Overlay

**Files:**
- Modify: `src/components/story/StoryViewerOverlay.tsx`

**Interfaces:**
- Consumes: `UserStoryGroup`, `storyApi.recordView`, `storyApi.deleteStory`.
- Produces: Trải nghiệm xem Story mượt mà: Chạm trái (quay lại), chạm phải (tiếp tục), giữ tay/chuột (Pause timer & video), phím mũi tên / Spacebar, preloading ngầm ảnh/video tiếp theo.

- [x] **Step 1: Triển khai bộ điều khiển cử chỉ (Pointer / Touch Gestures)**
- Thêm `handlePointerDown`: Dừng animationFrame timer, pause video thẻ `HTMLVideoElement`.
- Thêm `handlePointerUp`: Tiếp tục chạy timer và video.
- Thêm phím điều hướng `keydown` (`ArrowLeft`, `ArrowRight`, `Space`, `Escape`).

- [x] **Step 2: Triển khai Preloading Media ngầm**
- Tạo helper tải trước ảnh `new Image().src = nextItem.media_url` hoặc tạo video pre-fetch link để khi người dùng bấm chuyển sang story tiếp theo, hình ảnh/video xuất hiện ngay lập tức không chớp giật.

- [x] **Step 3: Ghi nhận lượt xem qua API `recordView`**
- Khi story được hiển thị > 800ms, tự động gọi `storyApi.recordView(currentItem.id)` để ghi nhận lượt xem vào database và kích hoạt realtime socket.

- [x] **Step 4: Kiểm tra build TypeScript**
Chạy: `npm run build`
Expected: Build pass.

- [x] **Step 5: Commit**
```bash
git add src/components/story/StoryViewerOverlay.tsx
git commit -m "feat(frontend): implement gestures keyboard controls and media preloading in story viewer"
```

---

### Task 8: Frontend Reaction Floating Bar với Ràng Buộc 1 Cảm Xúc Duy Nhất

**Files:**
- Create: `src/components/story/StoryReactionSelector.tsx`
- Modify: `src/components/story/StoryViewerOverlay.tsx`

**Interfaces:**
- Consumes: 6 emoji chuẩn Messenger: `['❤️', '😂', '😮', '😢', '😡', '👍']`.
- Produces: Floating Reaction Bar với hiệu ứng nảy (pop animation); logic đổi reaction mượt mà hoặc bấm lại để gỡ bỏ.

- [x] **Step 1: Tạo `StoryReactionSelector.tsx`**
Component thanh cảm xúc nổi:
- Hiển thị popover với 6 emoji lớn khi hover hoặc click.
- Đánh dấu emoji hiện tại của người dùng.
- Hoạt ảnh CSS pop-up phóng to 1.25x khi hover từng emoji.

- [x] **Step 2: Tích hợp vào `StoryViewerOverlay.tsx`**
- Gọi `storyApi.reactToStory(currentItem.id, emoji)`.
- Cập nhật state nội bộ ngay lập tức (optimistic UI update): Nếu chọn emoji khác -> đổi emoji; nếu bấm lại emoji hiện tại -> hủy reaction.
- Đồng thời gửi thông báo qua `storyApi.replyToStory` nếu muốn đẩy tin nhắn reaction vào chat 1-1.

- [x] **Step 3: Kiểm tra build**
Chạy: `npm run build`
Expected: PASS.

- [x] **Step 4: Commit**
```bash
git add src/components/story/StoryReactionSelector.tsx src/components/story/StoryViewerOverlay.tsx
git commit -m "feat(frontend): implement floating reaction selector with single-reaction constraint"
```

---

### Task 9: Frontend Viewer Analytics Bottom Sheet

**Files:**
- Create: `src/components/story/StoryViewerDrawer.tsx`
- Modify: `src/components/story/StoryViewerOverlay.tsx`

**Interfaces:**
- Consumes: `storyApi.getStoryViewers(storyId)`, `storyApi.deleteStory(storyId)`.
- Produces: Bottom Sheet trượt từ cạnh dưới cho tác giả Story: Hiển thị tổng lượt xem, tabs lọc theo từng reaction, danh sách người xem kèm thời gian và icon cảm xúc, nút xóa Story.

- [x] **Step 1: Tạo `StoryViewerDrawer.tsx`**
Bottom Sheet component:
- Header: Hiển thị icon mắt + số lượng người xem + nút đóng.
- Tabs lọc: `Tất cả (${viewers.length})`, các tab cảm xúc có người thả (ví dụ `❤️ ${count}`, `😂 ${count}`).
- Danh sách: Avatar, tên hiển thị, thời gian đã xem, badge emoji reaction.
- Footer: Nút Xóa Story có dialog xác nhận ("Bạn có chắc chắn muốn xóa story này?").

- [x] **Step 2: Tích hợp Drawer vào `StoryViewerOverlay.tsx`**
- Nếu người xem là chủ sở hữu (`user.id === currentGroup.user_id`):
  - Hiển thị nút biểu tượng con mắt + số lượt xem ở góc dưới bên trái.
  - Khi click nút hoặc vuốt từ dưới lên: Mở `StoryViewerDrawer`, đồng thời tự động tạm dừng bộ đếm thời gian của Story.
  - Khi đóng Drawer: Tiếp tục phát Story.
  - Khi xóa Story thành công: Đóng Drawer, gọi `onStoryDeleted(storyId)` để xóa khỏi danh sách items hoặc đóng Viewer nếu đã hết story.

- [x] **Step 3: Kiểm tra build**
Chạy: `npm run build`
Expected: PASS.

- [x] **Step 4: Commit**
```bash
git add src/components/story/StoryViewerDrawer.tsx src/components/story/StoryViewerOverlay.tsx
git commit -m "feat(frontend): add viewer analytics bottom sheet with reaction filters and story deletion"
```

---

### Task 10: Frontend Direct Chat Reply Bridge & Story Reply Card

**Files:**
- Create: `src/components/chat/StoryReplyCard.tsx`
- Modify: `src/components/panels/InboxPanel.tsx`
- Modify: `src/components/story/StoryViewerOverlay.tsx`

**Interfaces:**
- Consumes: Message type `story_reply` với metadata trích dẫn story.
- Produces: Khung hiển thị thẻ trích dẫn Story trong tin nhắn hội thoại 1-1; chức năng gửi bình luận trực tiếp từ Viewer đẩy vào cuộc trò chuyện 1-1.

- [x] **Step 1: Xây dựng `StoryReplyCard.tsx`**
Hiển thị thẻ trích dẫn tin nhắn Story trong chat:
- Thumbnail thu nhỏ của Story (ảnh hoặc icon video).
- Tiêu đề: "Đã phản hồi story của bạn" hoặc "Đã thả cảm xúc ❤️ vào story".
- Nội dung văn bản người xem đã gửi.
- Bấm vào thumbnail mở modal xem lại ảnh/video Story.

- [x] **Step 2: Cập nhật `InboxPanel.tsx` kết nối `onReply`**
Trong `InboxPanel.tsx`, khi `StoryViewerOverlay` kích hoạt `onReply`:
- Gọi `storyApi.replyToStory(storyId, text)` thay vì chỉ `console.log`.
- Hiển thị toast thông báo "Đã gửi phản hồi".

- [x] **Step 3: Kiểm tra hiển thị trong luồng chat**
Đảm bảo tin nhắn `story_reply` render đúng `StoryReplyCard` và không phá vỡ giao diện chat hiện có.

- [x] **Step 4: Kiểm tra build**
Chạy: `npm run build`
Expected: PASS.

- [x] **Step 5: Commit**
```bash
git add src/components/chat/StoryReplyCard.tsx src/components/panels/InboxPanel.tsx src/components/story/StoryViewerOverlay.tsx
git commit -m "feat(frontend): integrate story reply card into chat and connect story reply api"
```

---

### Task 11: End-to-End Testing & Verification

**Files:**
- Create: `backend/migrations/verify_story_core_e2e.js`

**Interfaces:**
- Consumes: Toàn bộ REST endpoints của Story và frontend build scripts.
- Produces: Báo cáo kiểm thử xác thực end-to-end hoạt động ổn định của Story Phase 1.

- [x] **Step 1: Viết kịch bản kiểm thử API Backend E2E**
Tạo file `backend/migrations/verify_story_core_e2e.js` kiểm tra:
1. Tạo story với quyền `friends` và `close_friends`.
2. Ghi nhận lượt xem chống trùng lặp.
3. Thả reaction: Thả lần 1 -> Cập nhật; Thả emoji khác -> Đổi emoji; Thả lại emoji cũ -> Gỡ bỏ.
4. Lấy danh sách viewers với tư cách chủ story -> Trả về đúng danh sách; Với tư cách người khác -> 403 Forbidden.
5. Thêm/xóa bạn thân trong `story_close_friends`.

- [x] **Step 2: Chạy kiểm thử Backend E2E**
Chạy: `node backend/migrations/verify_story_core_e2e.js`
Expected: Toàn bộ assertions pass (exit code 0).

- [x] **Step 3: Chạy toàn bộ build kiểm thử Frontend**
Chạy: `npm run build`
Expected: Vite build thành công không có bất kỳ warning/error nào.

- [x] **Step 4: Commit**
```bash
git add backend/migrations/verify_story_core_e2e.js
git commit -m "test(story): add comprehensive e2e verification script for story core platform"
```
