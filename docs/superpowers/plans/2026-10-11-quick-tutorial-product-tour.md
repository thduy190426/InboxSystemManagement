# Quick Tutorial / Product Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai tính năng Quick Tutorial (Product Tour) bằng Driver.js với hỗ trợ React 19, điều hướng spotlight cho Chat, Story, Profile, Settings, hệ thống huy hiệu "✨ New", và khu vực xem lại/đặt lại trong Cài đặt.

**Architecture:** Sử dụng Zustand store `tutorialStore` lưu trạng thái theo từng `userId` vào `localStorage`. Tải Driver.js dạng dynamic import lazy-load khi kích hoạt tour để tối ưu dung lượng trang. Gắn `data-tour` vào các phần tử giao diện chính và hỗ trợ đa ngôn ngữ i18n đầy đủ.

**Tech Stack:** React 19, TypeScript, Driver.js, Zustand, Lucide-react, i18next, Vanilla CSS.

## Global Constraints
- React version: 19.2.7 (yêu cầu không dùng thư viện phụ thuộc peer dependency cứng như react-joyride).
- Dynamic import `driver.js` để tránh tăng bundle size ban đầu.
- Trạng thái tour phân tách theo `userId` trong `localStorage` với key `inbox_tutorial_state_${userId}`.
- Toàn bộ text nhãn phải đa ngôn ngữ qua i18n (vi/en).

---

### Task 1: Cài đặt thư viện `driver.js` & Xây dựng Styling Tour

**Files:**
- Modify: `package.json`
- Create: `src/styles/tour.css`
- Modify: `src/style.css`

**Interfaces:**
- Consumes: CSS custom properties (`--bg-primary`, `--text-primary`, `--primary`, `--border-color`).
- Produces: Class styling `.driver-popover`, `.driver-overlay` và hiệu ứng pulse cho badge.

- [ ] **Step 1: Cài đặt driver.js**
Run: `npm install driver.js`
Expected: driver.js được thêm vào dependencies trong `package.json`.

- [ ] **Step 2: Tạo file CSS tùy biến `src/styles/tour.css`**
Tạo file `src/styles/tour.css` định nghĩa các biến màu, bóng đổ, typography, nút điều hướng Driver.js phù hợp cả Light & Dark mode:
```css
/* Custom Driver.js Popover Styling */
.driver-popover.inbox-tour-popover {
  background: var(--bg-surface, #ffffff);
  color: var(--text-primary, #1e293b);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 16px;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 18px 20px;
  max-width: 360px;
  font-family: inherit;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 100000;
}

[data-theme='dark'] .driver-popover.inbox-tour-popover,
.dark .driver-popover.inbox-tour-popover {
  background: rgba(30, 41, 59, 0.95);
  color: #f1f5f9;
  border-color: rgba(255, 255, 255, 0.12);
}

.driver-popover.inbox-tour-popover .driver-popover-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--primary, #6366f1);
  display: flex;
  align-items: center;
  gap: 8px;
}

.driver-popover.inbox-tour-popover .driver-popover-description {
  font-size: 0.885rem;
  line-height: 1.55;
  color: var(--text-secondary, #64748b);
  margin-bottom: 16px;
}

[data-theme='dark'] .driver-popover.inbox-tour-popover .driver-popover-description {
  color: #94a3b8;
}

.driver-popover.inbox-tour-popover .driver-popover-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
}

.driver-popover.inbox-tour-popover .driver-popover-progress-text {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted, #94a3b8);
}

.driver-popover.inbox-tour-popover .driver-popover-navigation-btns {
  display: flex;
  align-items: center;
  gap: 6px;
}

.driver-popover.inbox-tour-popover button {
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.driver-popover.inbox-tour-popover .driver-popover-prev-btn {
  background: transparent;
  color: var(--text-secondary, #64748b);
  border-color: var(--border-color, #e2e8f0);
}

.driver-popover.inbox-tour-popover .driver-popover-prev-btn:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.05));
  color: var(--text-primary, #0f172a);
}

.driver-popover.inbox-tour-popover .driver-popover-next-btn {
  background: var(--primary, #6366f1);
  color: #ffffff;
}

.driver-popover.inbox-tour-popover .driver-popover-next-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.driver-popover.inbox-tour-popover .driver-popover-close-btn {
  color: var(--text-muted, #94a3b8);
  font-size: 1.1rem;
}

/* Feature Badge Pulse */
.feature-badge-new {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.35);
  animation: badge-pulse 2s infinite ease-in-out;
  cursor: default;
  user-select: none;
}

@keyframes badge-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(236, 72, 153, 0.35);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 4px 14px rgba(236, 72, 153, 0.6);
  }
}
```

- [ ] **Step 3: Import tour.css vào `src/style.css`**
Thêm `@import './styles/tour.css';` ở đầu file `src/style.css`.

- [ ] **Step 4: Commit**
Run:
`git add package.json package-lock.json src/styles/tour.css src/style.css; git commit -m "feat(tutorial): install driver.js and add tour styling"`

---

### Task 2: Triển khai Zustand Store `tutorialStore`

**Files:**
- Create: `src/stores/tutorialStore.ts`

**Interfaces:**
- Produces: `useTutorialStore` hook với state `completedTours`, `interactedFeatures`, `isRunningTour`, `initForUser`, `completeTour`, `resetTour`, `resetAllTours`, `markFeatureInteracted`.

- [ ] **Step 1: Viết store `tutorialStore.ts`**
```ts
import { create } from 'zustand'

export type TourKey = 'chat' | 'story' | 'profile' | 'settings'
export type FeatureKey = 'story' | 'emojiReaction' | 'poll' | 'pinnedMessages' | 'linkPreview'

type TutorialState = {
  userId: string | number | null
  completedTours: Record<TourKey, boolean>
  interactedFeatures: Record<FeatureKey, boolean>
  isRunningTour: boolean
  currentTourKey: TourKey | null
  
  initForUser: (userId: string | number) => void
  completeTour: (key: TourKey) => void
  resetTour: (key: TourKey) => void
  resetAllTours: () => void
  markFeatureInteracted: (key: FeatureKey) => void
  isTourCompleted: (key: TourKey) => boolean
  isFeatureInteracted: (key: FeatureKey) => boolean
  setRunningTour: (isRunning: boolean, key?: TourKey | null) => void
}

const STORAGE_PREFIX = 'inbox_tutorial_state_'

function loadStateFromStorage(userId: string | number | null) {
  if (!userId) {
    return {
      completedTours: { chat: false, story: false, profile: false, settings: false },
      interactedFeatures: { story: false, emojiReaction: false, poll: false, pinnedMessages: false, linkPreview: false },
    }
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        completedTours: { chat: false, story: false, profile: false, settings: false, ...parsed.completedTours },
        interactedFeatures: { story: false, emojiReaction: false, poll: false, pinnedMessages: false, linkPreview: false, ...parsed.interactedFeatures },
      }
    }
  } catch (err) {
    console.error('Failed to parse tutorial state from localStorage', err)
  }

  return {
    completedTours: { chat: false, story: false, profile: false, settings: false },
    interactedFeatures: { story: false, emojiReaction: false, poll: false, pinnedMessages: false, linkPreview: false },
  }
}

function saveStateToStorage(userId: string | number | null, completedTours: Record<TourKey, boolean>, interactedFeatures: Record<FeatureKey, boolean>) {
  if (!userId) return
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${userId}`,
      JSON.stringify({ completedTours, interactedFeatures })
    )
  } catch (err) {
    console.error('Failed to save tutorial state to localStorage', err)
  }
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  userId: null,
  completedTours: { chat: false, story: false, profile: false, settings: false },
  interactedFeatures: { story: false, emojiReaction: false, poll: false, pinnedMessages: false, linkPreview: false },
  isRunningTour: false,
  currentTourKey: null,

  initForUser: (userId) => {
    const loaded = loadStateFromStorage(userId)
    set({
      userId,
      completedTours: loaded.completedTours,
      interactedFeatures: loaded.interactedFeatures,
    })
  },

  completeTour: (key) => {
    const { userId, completedTours, interactedFeatures } = get()
    const nextCompleted = { ...completedTours, [key]: true }
    set({ completedTours: nextCompleted, isRunningTour: false, currentTourKey: null })
    saveStateToStorage(userId, nextCompleted, interactedFeatures)
  },

  resetTour: (key) => {
    const { userId, completedTours, interactedFeatures } = get()
    const nextCompleted = { ...completedTours, [key]: false }
    set({ completedTours: nextCompleted })
    saveStateToStorage(userId, nextCompleted, interactedFeatures)
  },

  resetAllTours: () => {
    const { userId } = get()
    const nextCompleted: Record<TourKey, boolean> = { chat: false, story: false, profile: false, settings: false }
    const nextFeatures: Record<FeatureKey, boolean> = { story: false, emojiReaction: false, poll: false, pinnedMessages: false, linkPreview: false }
    set({
      completedTours: nextCompleted,
      interactedFeatures: nextFeatures,
      isRunningTour: false,
      currentTourKey: null,
    })
    saveStateToStorage(userId, nextCompleted, nextFeatures)
  },

  markFeatureInteracted: (key) => {
    const { userId, completedTours, interactedFeatures } = get()
    if (interactedFeatures[key]) return
    const nextFeatures = { ...interactedFeatures, [key]: true }
    set({ interactedFeatures: nextFeatures })
    saveStateToStorage(userId, completedTours, nextFeatures)
  },

  isTourCompleted: (key) => {
    return Boolean(get().completedTours[key])
  },

  isFeatureInteracted: (key) => {
    return Boolean(get().interactedFeatures[key])
  },

  setRunningTour: (isRunning, key = null) => {
    set({ isRunningTour: isRunning, currentTourKey: key })
  },
}))
```

- [ ] **Step 2: Commit**
Run:
`git add src/stores/tutorialStore.ts; git commit -m "feat(tutorial): implement tutorialStore with per-user LocalStorage persistence"`

---

### Task 3: Định nghĩa cấu hình các bước `tourSteps.ts` & Dịch vụ `tourService.ts`

**Files:**
- Create: `src/features/tutorial/tourSteps.ts`
- Create: `src/services/tutorial/tourService.ts`

**Interfaces:**
- Consumes: `useTutorialStore`, `i18n` translation strings.
- Produces: `startTour(key: TourKey, options?: { force?: boolean })` helper function.

- [ ] **Step 1: Tạo `src/features/tutorial/tourSteps.ts`**
Định nghĩa danh sách các step target bằng `[data-tour="..."]` cùng hàm helper sinh cấu hình theo ngôn ngữ hiện tại của i18n:
```ts
import type { TourKey } from '../../stores/tutorialStore'
import i18n from '../../i18n'

export type TourStepDef = {
  element: string
  titleKey: string
  descKey: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

export const TOUR_DEFINITIONS: Record<TourKey, TourStepDef[]> = {
  chat: [
    {
      element: '[data-tour="nav-rail"]',
      titleKey: 'tutorial.chat.navRailTitle',
      descKey: 'tutorial.chat.navRailDesc',
      side: 'right',
      align: 'start',
    },
    {
      element: '[data-tour="inbox-search-filter"]',
      titleKey: 'tutorial.chat.searchFilterTitle',
      descKey: 'tutorial.chat.searchFilterDesc',
      side: 'bottom',
      align: 'start',
    },
    {
      element: '[data-tour="inbox-conversation-list"]',
      titleKey: 'tutorial.chat.conversationListTitle',
      descKey: 'tutorial.chat.conversationListDesc',
      side: 'right',
      align: 'center',
    },
    {
      element: '[data-tour="chat-header-actions"]',
      titleKey: 'tutorial.chat.headerActionsTitle',
      descKey: 'tutorial.chat.headerActionsDesc',
      side: 'bottom',
      align: 'end',
    },
    {
      element: '[data-tour="chat-message-input"]',
      titleKey: 'tutorial.chat.messageInputTitle',
      descKey: 'tutorial.chat.messageInputDesc',
      side: 'top',
      align: 'center',
    },
  ],
  story: [
    {
      element: '[data-tour="story-feed"]',
      titleKey: 'tutorial.story.feedTitle',
      descKey: 'tutorial.story.feedDesc',
      side: 'bottom',
      align: 'center',
    },
    {
      element: '[data-tour="create-story-btn"]',
      titleKey: 'tutorial.story.createBtnTitle',
      descKey: 'tutorial.story.createBtnDesc',
      side: 'right',
      align: 'center',
    },
  ],
  profile: [
    {
      element: '[data-tour="profile-avatar-cover"]',
      titleKey: 'tutorial.profile.avatarCoverTitle',
      descKey: 'tutorial.profile.avatarCoverDesc',
      side: 'bottom',
      align: 'center',
    },
    {
      element: '[data-tour="profile-info-fields"]',
      titleKey: 'tutorial.profile.infoFieldsTitle',
      descKey: 'tutorial.profile.infoFieldsDesc',
      side: 'top',
      align: 'center',
    },
    {
      element: '[data-tour="profile-privacy-toggles"]',
      titleKey: 'tutorial.profile.privacyTitle',
      descKey: 'tutorial.profile.privacyDesc',
      side: 'top',
      align: 'center',
    },
  ],
  settings: [
    {
      element: '[data-tour="settings-theme"]',
      titleKey: 'tutorial.settings.themeTitle',
      descKey: 'tutorial.settings.themeDesc',
      side: 'bottom',
      align: 'start',
    },
    {
      element: '[data-tour="settings-security-2fa"]',
      titleKey: 'tutorial.settings.securityTitle',
      descKey: 'tutorial.settings.securityDesc',
      side: 'bottom',
      align: 'start',
    },
    {
      element: '[data-tour="settings-sessions"]',
      titleKey: 'tutorial.settings.sessionsTitle',
      descKey: 'tutorial.settings.sessionsDesc',
      side: 'top',
      align: 'start',
    },
    {
      element: '[data-tour="settings-tutorial-replay"]',
      titleKey: 'tutorial.settings.replayTitle',
      descKey: 'tutorial.settings.replayDesc',
      side: 'top',
      align: 'center',
    },
  ],
}
```

- [ ] **Step 2: Tạo `src/services/tutorial/tourService.ts`**
Triển khai hàm `startTour` nạp driver.js dạng lazy load và kiểm tra DOM an toàn:
```ts
import type { TourKey } from '../../stores/tutorialStore'
import { useTutorialStore } from '../../stores/tutorialStore'
import { TOUR_DEFINITIONS } from '../../features/tutorial/tourSteps'
import i18n from '../../i18n'

let activeDriverInstance: any = null

export async function startTour(tourKey: TourKey, options: { force?: boolean } = {}) {
  const store = useTutorialStore.getState()
  if (!options.force && store.isTourCompleted(tourKey)) {
    return
  }

  const defs = TOUR_DEFINITIONS[tourKey]
  if (!defs || defs.length === 0) return

  // Filter valid DOM elements
  const validSteps = defs
    .filter(def => {
      const el = document.querySelector(def.element)
      return el !== null
    })
    .map(def => ({
      element: def.element,
      popover: {
        title: i18n.t(def.titleKey),
        description: i18n.t(def.descKey),
        side: def.side || 'bottom',
        align: def.align || 'start',
      },
    }))

  if (validSteps.length === 0) {
    return
  }

  try {
    // Dynamic import Driver.js
    const { driver } = await import('driver.js')
    await import('driver.js/dist/driver.css')

    if (activeDriverInstance) {
      activeDriverInstance.destroy()
      activeDriverInstance = null
    }

    store.setRunningTour(true, tourKey)

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: 'rgba(0, 0, 0, 0.65)',
      overlayOpacity: 0.7,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: 'inbox-tour-popover',
      nextBtnText: i18n.t('tutorial.buttons.next', { defaultValue: 'Tiếp tục' }),
      prevBtnText: i18n.t('tutorial.buttons.prev', { defaultValue: 'Quay lại' }),
      doneBtnText: i18n.t('tutorial.buttons.done', { defaultValue: 'Hoàn thành' }),
      progressText: '{{current}} / {{total}}',
      onDestroyStarted: () => {
        store.completeTour(tourKey)
        driverObj.destroy()
        activeDriverInstance = null
      },
      steps: validSteps,
    })

    activeDriverInstance = driverObj
    driverObj.drive()
  } catch (error) {
    console.error('Failed to initialize Driver.js tour', error)
    store.setRunningTour(false, null)
  }
}

export function stopActiveTour() {
  if (activeDriverInstance) {
    activeDriverInstance.destroy()
    activeDriverInstance = null
  }
  useTutorialStore.getState().setRunningTour(false, null)
}
```

- [ ] **Step 3: Commit**
Run:
`git add src/features/tutorial/tourSteps.ts src/services/tutorial/tourService.ts; git commit -m "feat(tutorial): add tour steps configuration and dynamic tour runner service"`

---

### Task 4: Bổ sung đa ngôn ngữ i18n cho Tour trong `vi.json` & `en.json`

**Files:**
- Modify: `src/locales/vi.json`
- Modify: `src/locales/en.json`

**Interfaces:**
- Produces: Bản dịch đầy đủ cho `tutorial.buttons`, `tutorial.chat`, `tutorial.story`, `tutorial.profile`, `tutorial.settings`.

- [ ] **Step 1: Cập nhật `src/locales/vi.json`**
Thêm block `tutorial` vào `vi.json`:
```json
"tutorial": {
  "badge": "✨ New",
  "buttons": {
    "next": "Tiếp tục",
    "prev": "Quay lại",
    "done": "Hoàn tất",
    "skip": "Bỏ qua"
  },
  "chat": {
    "navRailTitle": "Thanh Điều Hướng Nhanh",
    "navRailDesc": "Chuyển đổi tức thì giữa các phân hệ: Tin nhắn, Danh bạ bạn bè, Hồ sơ cá nhân, Cài đặt và Thông báo hệ thống.",
    "searchFilterTitle": "Tìm Kiếm & Bộ Lọc",
    "searchFilterDesc": "Tìm nhanh người dùng, tin nhắn và lọc theo trạng thái: Chưa đọc hoặc Đã ghim.",
    "conversationListTitle": "Danh Sách Trò Chuyện",
    "conversationListDesc": "Xem tin nhắn mới nhất, ghim hội thoại quan trọng và trạng thái hoạt động của bạn bè.",
    "headerActionsTitle": "Tương Tác Cuộc Trò Chuyện",
    "headerActionsDesc": "Thực hiện cuộc gọi thoại, gọi video chất lượng cao hoặc ghim và xem thông tin hội thoại.",
    "messageInputTitle": "Soạn Thảo & Đính Kèm",
    "messageInputDesc": "Gửi tin nhắn, đính kèm file/hình ảnh, chọn Emoji cảm xúc và tạo cuộc bình chọn (Poll) nhóm."
  },
  "story": {
    "feedTitle": "Story Bạn Bè (24 Giờ)",
    "feedDesc": "Khám phá các khoảnh khắc và cập nhật mới nhất từ bạn bè của bạn trong vòng 24 giờ qua.",
    "createBtnTitle": "Tạo Story Mới",
    "createBtnDesc": "Chia sẻ khoảnh khắc với ảnh, văn bản và màu nền độc đáo với bạn bè."
  },
  "profile": {
    "avatarCoverTitle": "Ảnh Đại Diện & Ảnh Bìa",
    "avatarCoverDesc": "Cập nhật ảnh đại diện và ảnh bìa để tạo dấu ấn cá nhân trong cộng đồng.",
    "infoFieldsTitle": "Thông Tin Cá Nhân",
    "infoFieldsDesc": "Chỉnh sửa tên hiển thị, tiểu sử, ngày sinh và số điện thoại liên hệ.",
    "privacyTitle": "Quyền Riêng Tư",
    "privacyDesc": "Kiểm soát việc hiển thị trạng thái online, thông tin cá nhân và thông báo đã xem."
  },
  "settings": {
    "themeTitle": "Giao Diện & Ngôn Ngữ",
    "themeDesc": "Lựa chọn chế độ Sáng / Tối và thay đổi ngôn ngữ hiển thị của ứng dụng.",
    "securityTitle": "Bảo Mật Hai Lớp (2FA)",
    "securityDesc": "Bật xác thực hai yếu tố (2FA) và đổi mật khẩu để bảo vệ tài khoản tối đa.",
    "sessionsTitle": "Quản Lý Phiên Đăng Nhập",
    "sessionsDesc": "Theo dõi danh sách thiết bị đang đăng nhập và đăng xuất từ xa khi cần.",
    "replayTitle": "Hướng Dẫn & Trợ Giúp",
    "replayDesc": "Xem lại hướng dẫn cho từng trang hoặc đặt lại toàn bộ trạng thái hướng dẫn bất kỳ lúc nào."
  },
  "helpSection": {
    "cardTitle": "Hướng dẫn sử dụng & Khám phá (Product Tour)",
    "cardDesc": "Trải nghiệm lại các bước hướng dẫn trực quan hoặc đặt lại trạng thái khám phá của hệ thống.",
    "replayChat": "Hướng dẫn Chat",
    "replayStory": "Hướng dẫn Story",
    "replayProfile": "Hướng dẫn Hồ sơ",
    "replaySettings": "Hướng dẫn Cài đặt",
    "resetAll": "Đặt lại tất cả hướng dẫn",
    "resetSuccess": "Đã đặt lại trạng thái hướng dẫn thành công!"
  }
}
```

- [ ] **Step 2: Cập nhật `src/locales/en.json`**
Thêm bản dịch tiếng Anh tương ứng vào `en.json`.

- [ ] **Step 3: Commit**
Run:
`git add src/locales/vi.json src/locales/en.json; git commit -m "feat(tutorial): add i18n translation keys for tutorial and product tour"`

---

### Task 5: Tạo Component `FeatureBadge` & Tích Hợp Huy Hiệu "✨ New"

**Files:**
- Create: `src/components/ui/FeatureBadge.tsx`
- Modify: `src/components/story/StoryFeed.tsx`
- Modify: `src/components/panels/MessageInput.tsx`

**Interfaces:**
- Produces: `<FeatureBadge featureId="story" />` tự động ẩn khi tính năng được xem/tương tác.

- [ ] **Step 1: Viết `src/components/ui/FeatureBadge.tsx`**
```tsx
import { useTutorialStore, type FeatureKey } from '../../stores/tutorialStore'
import { useTranslation } from 'react-i18next'

type FeatureBadgeProps = {
  featureId: FeatureKey
  label?: string
  className?: string
  onClick?: () => void
}

export function FeatureBadge({ featureId, label, className = '', onClick }: FeatureBadgeProps) {
  const { t } = useTranslation()
  const isInteracted = useTutorialStore(state => state.isFeatureInteracted(featureId))
  const markFeatureInteracted = useTutorialStore(state => state.markFeatureInteracted)

  if (isInteracted) return null

  function handleClick(e: React.MouseEvent) {
    markFeatureInteracted(featureId)
    onClick?.()
  }

  return (
    <span
      className={`feature-badge-new ${className}`}
      onClick={handleClick}
      title={t('tutorial.badge', { defaultValue: '✨ New' })}
    >
      {label || t('tutorial.badge', { defaultValue: '✨ New' })}
    </span>
  )
}
```

- [ ] **Step 2: Gắn badge vào `StoryFeed.tsx` & `MessageInput.tsx`**
* Trong `StoryFeed.tsx`, gắn `<FeatureBadge featureId="story" />` cạnh nút "Tạo story".
* Trong `MessageInput.tsx`, gắn `<FeatureBadge featureId="poll" />` cạnh icon tạo Bình chọn (Poll).

- [ ] **Step 3: Commit**
Run:
`git add src/components/ui/FeatureBadge.tsx src/components/story/StoryFeed.tsx src/components/panels/MessageInput.tsx; git commit -m "feat(tutorial): add FeatureBadge component and integrate on Story and Poll"`

---

### Task 6: Gắn thuộc tính `data-tour` & Hook tự động chạy tour `useAutoTour`

**Files:**
- Create: `src/hooks/tutorial/useAutoTour.ts`
- Modify: `src/components/layout/NavRail.tsx`
- Modify: `src/components/panels/InboxPanel.tsx`
- Modify: `src/components/panels/ChatPanel.tsx`
- Modify: `src/components/story/StoryFeed.tsx`
- Modify: `src/components/views/ProfilePage.tsx`
- Modify: `src/components/views/SettingsPage.tsx`
- Modify: `src/components/views/ChatApp.tsx`

**Interfaces:**
- Produces: `useAutoTour(tourKey, activeView, userId)` tự động chạy tour khi người dùng vào view lần đầu.

- [ ] **Step 1: Viết hook `src/hooks/tutorial/useAutoTour.ts`**
```ts
import { useEffect } from 'react'
import type { TourKey } from '../../stores/tutorialStore'
import { useTutorialStore } from '../../stores/tutorialStore'
import { startTour } from '../../services/tutorial/tourService'

export function useAutoTour(tourKey: TourKey, isActive: boolean, userId: string | number | null | undefined) {
  const initForUser = useTutorialStore(state => state.initForUser)
  const isTourCompleted = useTutorialStore(state => state.isTourCompleted)
  const isRunningTour = useTutorialStore(state => state.isRunningTour)

  useEffect(() => {
    if (userId) {
      initForUser(userId)
    }
  }, [userId, initForUser])

  useEffect(() => {
    if (!isActive || !userId || isRunningTour) return
    if (isTourCompleted(tourKey)) return

    // Allow DOM to stabilize
    const timer = setTimeout(() => {
      startTour(tourKey)
    }, 700)

    return () => clearTimeout(timer)
  }, [tourKey, isActive, userId, isTourCompleted, isRunningTour])
}
```

- [ ] **Step 2: Gắn `data-tour` vào các component giao diện**
* `NavRail.tsx`: `data-tour="nav-rail"` trên `<aside>`.
* `InboxPanel.tsx`: `data-tour="inbox-search-filter"` trên thanh search, `data-tour="inbox-conversation-list"` trên list hội thoại.
* `ChatPanel.tsx`: `data-tour="chat-header-actions"` trên header, `data-tour="chat-message-input"` trên ô soạn thảo.
* `StoryFeed.tsx`: `data-tour="story-feed"` trên feed container, `data-tour="create-story-btn"` trên nút tạo story.
* `ProfilePage.tsx`: `data-tour="profile-avatar-cover"` trên khu vực cover/avatar, `data-tour="profile-info-fields"` trên form thông tin cá nhân, `data-tour="profile-privacy-toggles"` trên toggle quyền riêng tư.
* `SettingsPage.tsx`: `data-tour="settings-theme"` trên thẻ cài đặt giao diện, `data-tour="settings-security-2fa"` trên thẻ 2FA, `data-tour="settings-sessions"` trên thẻ phiên đăng nhập, `data-tour="settings-tutorial-replay"` trên thẻ Trợ giúp.

- [ ] **Step 3: Tích hợp `useAutoTour` vào các view trong `ChatApp.tsx`, `ProfilePage.tsx`, `SettingsPage.tsx`**

- [ ] **Step 4: Commit**
Run:
`git add src/hooks/tutorial/useAutoTour.ts src/components/layout/NavRail.tsx src/components/panels/InboxPanel.tsx src/components/panels/ChatPanel.tsx src/components/story/StoryFeed.tsx src/components/views/ProfilePage.tsx src/components/views/SettingsPage.tsx src/components/views/ChatApp.tsx; git commit -m "feat(tutorial): add data-tour attributes and useAutoTour hook"`

---

### Task 7: Thêm Khu vực "Hướng dẫn sử dụng & Khám phá" vào `SettingsPage`

**Files:**
- Modify: `src/components/views/SettingsPage.tsx`

**Interfaces:**
- Consumes: `startTour`, `resetAllTours`, `pushToast`.
- Produces: Card Replay tour với các nút xem lại trực quan và đặt lại tour.

- [ ] **Step 1: Thêm Card Hướng dẫn vào `SettingsPage.tsx`**
```tsx
<Card
  id="tutorial-settings"
  icon={<Compass className="sp-card-icon" />}
  title={t('tutorial.helpSection.cardTitle', { defaultValue: 'Hướng dẫn sử dụng & Khám phá (Product Tour)' })}
  description={t('tutorial.helpSection.cardDesc', { defaultValue: 'Trải nghiệm lại các bước hướng dẫn trực quan hoặc đặt lại trạng thái khám phá của hệ thống.' })}
>
  <div data-tour="settings-tutorial-replay" className="tutorial-replay-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
      <button
        type="button"
        className="button-ghost"
        style={{ padding: '10px 14px', borderRadius: '10px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
        onClick={() => {
          props.pushToast?.(t('tutorial.helpSection.launchingChat', { defaultValue: 'Đang mở hướng dẫn Chat...' }))
          // Switch to chat or start tour
        }}
      >
        <MessageSquare size={16} />
        {t('tutorial.helpSection.replayChat', { defaultValue: 'Hướng dẫn Chat' })}
      </button>
      <button
        type="button"
        className="button-ghost"
        style={{ padding: '10px 14px', borderRadius: '10px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
        onClick={() => startTour('story', { force: true })}
      >
        <Sparkles size={16} />
        {t('tutorial.helpSection.replayStory', { defaultValue: 'Hướng dẫn Story' })}
      </button>
      <button
        type="button"
        className="button-ghost"
        style={{ padding: '10px 14px', borderRadius: '10px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
        onClick={() => startTour('profile', { force: true })}
      >
        <UserRound size={16} />
        {t('tutorial.helpSection.replayProfile', { defaultValue: 'Hướng dẫn Hồ sơ' })}
      </button>
      <button
        type="button"
        className="button-ghost"
        style={{ padding: '10px 14px', borderRadius: '10px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
        onClick={() => startTour('settings', { force: true })}
      >
        <Settings size={16} />
        {t('tutorial.helpSection.replaySettings', { defaultValue: 'Hướng dẫn Cài đặt' })}
      </button>
    </div>
    
    <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))' }}>
      <button
        type="button"
        className="button-ghost text-danger"
        style={{ padding: '8px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
        onClick={() => {
          useTutorialStore.getState().resetAllTours()
          props.pushToast?.(t('tutorial.helpSection.resetSuccess', { defaultValue: 'Đã đặt lại trạng thái hướng dẫn thành công!' }))
        }}
      >
        <RotateCcw size={15} />
        {t('tutorial.helpSection.resetAll', { defaultValue: 'Đặt lại tất cả hướng dẫn' })}
      </button>
    </div>
  </div>
</Card>
```

- [ ] **Step 2: Commit**
Run:
`git add src/components/views/SettingsPage.tsx; git commit -m "feat(tutorial): add quick tutorial & help card with replay and reset in SettingsPage"`

---

### Task 8: Kiểm thử & Xác thực toàn diện (Build & Runtime Verification)

**Files:**
- Test via build: `package.json`

- [ ] **Step 1: Chạy build kiểm tra TypeScript & Vite**
Run: `npm run build`
Expected: Quá trình build tsc & vite hoàn tất 0 lỗi (`built in ...ms`).

- [ ] **Step 2: Xác thực các trường hợp kiểm thử**
* Đăng nhập lần đầu: Kiểm tra tour kích hoạt mượt mà trên Chat.
* Chuyển sang Cài đặt: Kiểm tra hiển thị Card Trợ giúp và các nút Replay hoạt động chuẩn xác.
* Bấm "Đặt lại tất cả hướng dẫn": Trạng thái `localStorage` được xóa và các tour sẵn sàng hiển thị lại.
* Huy hiệu `✨ New`: Hiển thị và tự động ẩn khi người dùng tương tác.

- [ ] **Step 3: Commit hoàn tất**
Run:
`git commit --allow-empty -m "chore(tutorial): complete testing and build verification"`
