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
      interactedFeatures: {
        story: false,
        emojiReaction: false,
        poll: false,
        pinnedMessages: false,
        linkPreview: false,
      },
    }
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        completedTours: {
          chat: false,
          story: false,
          profile: false,
          settings: false,
          ...(parsed.completedTours || {}),
        },
        interactedFeatures: {
          story: false,
          emojiReaction: false,
          poll: false,
          pinnedMessages: false,
          linkPreview: false,
          ...(parsed.interactedFeatures || {}),
        },
      }
    }
  } catch (err) {
    console.error('Failed to parse tutorial state from localStorage', err)
  }

  return {
    completedTours: { chat: false, story: false, profile: false, settings: false },
    interactedFeatures: {
      story: false,
      emojiReaction: false,
      poll: false,
      pinnedMessages: false,
      linkPreview: false,
    },
  }
}

function saveStateToStorage(
  userId: string | number | null,
  completedTours: Record<TourKey, boolean>,
  interactedFeatures: Record<FeatureKey, boolean>,
) {
  if (!userId) return
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${userId}`,
      JSON.stringify({ completedTours, interactedFeatures }),
    )
  } catch (err) {
    console.error('Failed to save tutorial state to localStorage', err)
  }
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  userId: null,
  completedTours: { chat: false, story: false, profile: false, settings: false },
  interactedFeatures: {
    story: false,
    emojiReaction: false,
    poll: false,
    pinnedMessages: false,
    linkPreview: false,
  },
  isRunningTour: false,
  currentTourKey: null,

  initForUser: (userId) => {
    // Only reload if user changed or uninitialized
    if (get().userId === userId) return
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
    const nextCompleted: Record<TourKey, boolean> = {
      chat: false,
      story: false,
      profile: false,
      settings: false,
    }
    const nextFeatures: Record<FeatureKey, boolean> = {
      story: false,
      emojiReaction: false,
      poll: false,
      pinnedMessages: false,
      linkPreview: false,
    }
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
