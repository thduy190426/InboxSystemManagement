# Profile Page Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement robust, comprehensive client-side validations for `ProfilePage.tsx` and its child components (`AboutTab`, `TimelineTab`, `ProfileCover`, `ProfileHeader`), covering profile edit form inputs, avatar/cover photo upload constraints, and timeline post/comment length constraints.

**Architecture:** A centralized utility module `src/utils/profileValidation.ts` defining validation limits, regexes, and pure validator functions. Component integration via inline form error states in `AboutTab.tsx` and toast feedback in `ProfilePage.tsx` and `TimelineTab.tsx`.

**Tech Stack:** React 19, TypeScript, `react-i18next`, `lucide-react`.

## Global Constraints

- Retain existing design tokens, CSS styling, and responsive layout without breaking changes.
- Provide bilingual-ready default Vietnamese messages via `t(key, { defaultValue: '...' })`.
- Pure functions for validation logic to ensure deterministic behavior and easy unit testing.
- Verify TypeScript compilation without errors with `npx tsc --noEmit`.

---

### Task 1: Create Validation Utility Module (`src/utils/profileValidation.ts`)

**Files:**
- Create: `src/utils/profileValidation.ts`

**Interfaces:**
- Produces:
  - `PROFILE_LIMITS`
  - `ALLOWED_IMAGE_MIME_TYPES`
  - `validateImageFile(file: File, options?: { maxSizeBytes?: number; allowedTypes?: string[] }): { isValid: boolean; error?: string }`
  - `validateProfileForm(form: ProfilePayload, t?: (key: string, options?: any) => string): { isValid: boolean; errors: Partial<Record<keyof ProfilePayload, string>> }`
  - `validatePostContent(content: string, mediaCount: number, t?: (key: string, options?: any) => string): { isValid: boolean; error?: string }`
  - `validateCommentContent(content: string, t?: (key: string, options?: any) => string): { isValid: boolean; error?: string }`

- [ ] **Step 1: Write `src/utils/profileValidation.ts`**
Implement the limits, regex patterns, and validation functions.

- [ ] **Step 2: Verify TypeScript compiles**
Run: `npx tsc --noEmit`

---

### Task 2: Integrate Form Validation in `AboutTab.tsx`

**Files:**
- Modify: `src/components/profile/AboutTab.tsx`

**Interfaces:**
- Consumes: `validateProfileForm` from `src/utils/profileValidation.ts`

- [ ] **Step 1: Import `validateProfileForm` and constants**
Import `validateProfileForm` and `PROFILE_LIMITS`.

- [ ] **Step 2: Update `handleSubmit` and field error states**
Replace existing basic validation in `handleSubmit` with `validateProfileForm(form, t)`.
Add inline error displays and character counters/hints for `phone`, `birthDate`, `address`, `bio`, and `statusMessage`.

- [ ] **Step 3: Verify TypeScript compiles**
Run: `npx tsc --noEmit`

---

### Task 3: Integrate File Upload Validation in `ProfilePage.tsx`

**Files:**
- Modify: `src/components/views/ProfilePage.tsx`

**Interfaces:**
- Consumes: `validateImageFile`, `PROFILE_LIMITS` from `src/utils/profileValidation.ts`

- [ ] **Step 1: Import `validateImageFile` and `PROFILE_LIMITS`**
Import validators in `src/components/views/ProfilePage.tsx`.

- [ ] **Step 2: Validate in `handleCoverChange`**
Before calling `uploadCoverPhoto`, validate `file` size (<= 10MB) and type. If invalid, display toast error and abort.

- [ ] **Step 3: Validate in `handleAvatarSelect`**
Before calling `uploadAvatar` or setting `cropImageSrc`, validate `file` size (<= 5MB) and type. If invalid, display toast error and abort.

- [ ] **Step 4: Verify TypeScript compiles**
Run: `npx tsc --noEmit`

---

### Task 4: Integrate Timeline Post & Comment Validation in `TimelineTab.tsx`

**Files:**
- Modify: `src/components/profile/TimelineTab.tsx`

**Interfaces:**
- Consumes: `validatePostContent`, `validateCommentContent`, `validateImageFile`, `PROFILE_LIMITS` from `src/utils/profileValidation.ts`

- [ ] **Step 1: Import validators in `TimelineTab.tsx`**
Import `validatePostContent`, `validateCommentContent`, `validateImageFile`, `PROFILE_LIMITS`.

- [ ] **Step 2: Validate media uploads in `handleImageSelect`**
Ensure uploaded files are valid image types, <= 5MB each, and maximum 10 images total per post.

- [ ] **Step 3: Validate post content in `handleComposerSubmit`**
Validate post content length (<= 2000 chars) and non-empty post criteria. Show toast on invalid.

- [ ] **Step 4: Validate comment content in `handleSendComment`**
Validate comment length (<= 500 chars) and non-whitespace content.

- [ ] **Step 5: Verify TypeScript compiles**
Run: `npx tsc --noEmit`

---

### Task 5: Final Verification & Type Check

- [ ] **Step 1: Run TypeScript compiler**
Run `npx tsc --noEmit` to verify all components compile cleanly.

- [ ] **Step 2: Test building the app**
Run `npm run build` to ensure the entire bundle compiles without syntax or typing issues.
