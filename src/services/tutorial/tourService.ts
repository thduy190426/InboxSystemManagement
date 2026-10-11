import type { TourKey } from '../../stores/tutorialStore'
import { useTutorialStore } from '../../stores/tutorialStore'
import { TOUR_DEFINITIONS } from '../../features/tutorial/tourSteps'
import i18n from '../../i18n'

type ActiveDriverInstance = {
  drive: () => void
  destroy: () => void
  hasNextStep?: () => boolean
  hasPreviousStep?: () => boolean
} | null

let activeDriverInstance: ActiveDriverInstance = null
let scrollLockCleanups: (() => void) | null = null

export function enableTourScrollLock() {
  if (scrollLockCleanups || typeof window === 'undefined') return

  const preventScrollEvent = (e: Event) => {
    const target = e.target as HTMLElement | null
    // Cho phép cuộn nội dung bên trong popover nếu nội dung quá dài
    if (target?.closest('.driver-popover')) {
      return
    }
    if (e.cancelable) {
      e.preventDefault()
    }
  }

  const preventScrollKeys = (e: KeyboardEvent) => {
    const scrollKeys = ['Space', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown']
    if (scrollKeys.includes(e.code)) {
      const target = e.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable ||
        target?.closest('.driver-popover')
      ) {
        return
      }
      if (e.cancelable) {
        e.preventDefault()
      }
    }
  }

  const originalBodyOverflow = document.body.style.overflow
  const originalHtmlOverflow = document.documentElement.style.overflow
  const originalBodyOverscroll = document.body.style.overscrollBehavior

  document.body.style.overflow = 'hidden'
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overscrollBehavior = 'none'
  document.body.classList.add('tour-scroll-locked')

  window.addEventListener('wheel', preventScrollEvent, { passive: false, capture: true })
  window.addEventListener('touchmove', preventScrollEvent, { passive: false, capture: true })
  window.addEventListener('keydown', preventScrollKeys, { passive: false, capture: true })

  scrollLockCleanups = () => {
    window.removeEventListener('wheel', preventScrollEvent, { capture: true })
    window.removeEventListener('touchmove', preventScrollEvent, { capture: true })
    window.removeEventListener('keydown', preventScrollKeys, { capture: true })

    document.body.style.overflow = originalBodyOverflow
    document.documentElement.style.overflow = originalHtmlOverflow
    document.body.style.overscrollBehavior = originalBodyOverscroll
    document.body.classList.remove('tour-scroll-locked')
    scrollLockCleanups = null
  }
}

export function disableTourScrollLock() {
  if (scrollLockCleanups) {
    scrollLockCleanups()
  }
}

// Đồng bộ tự động với trạng thái isRunningTour trong Zustand store
useTutorialStore.subscribe((state, prevState) => {
  if (state.isRunningTour && !prevState.isRunningTour) {
    enableTourScrollLock()
  } else if (!state.isRunningTour && prevState.isRunningTour) {
    disableTourScrollLock()
  }
})

export async function startTour(tourKey: TourKey, options: { force?: boolean } = {}) {
  const store = useTutorialStore.getState()
  if (!options.force && store.isTourCompleted(tourKey)) {
    return
  }

  const defs = TOUR_DEFINITIONS[tourKey]
  if (!defs || defs.length === 0) return

  // Filter only elements that are present in the DOM
  const validSteps = defs
    .filter((def) => {
      const el = document.querySelector(def.element)
      return el !== null
    })
    .map((def) => ({
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
    // Dynamic import Driver.js & css
    const { driver } = await import('driver.js')
    await import('driver.js/dist/driver.css')

    if (activeDriverInstance) {
      activeDriverInstance.destroy()
      activeDriverInstance = null
    }

    enableTourScrollLock()
    store.setRunningTour(true, tourKey)

    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowScroll: false,
      overlayColor: 'rgba(0, 0, 0, 0.65)',
      overlayOpacity: 0.7,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: 'inbox-tour-popover',
      nextBtnText: i18n.t('tutorial.buttons.next', { defaultValue: 'Tiếp tục' }),
      prevBtnText: i18n.t('tutorial.buttons.prev', { defaultValue: 'Quay lại' }),
      doneBtnText: i18n.t('tutorial.buttons.done', { defaultValue: 'Hoàn tất' }),
      progressText: '{{current}} / {{total}}',
      onDestroyStarted: () => {
        disableTourScrollLock()
        store.completeTour(tourKey)
        driverObj.destroy()
        activeDriverInstance = null
      },
      onDestroyed: () => {
        disableTourScrollLock()
      },
      steps: validSteps,
    })

    activeDriverInstance = driverObj
    driverObj.drive()
  } catch (error) {
    console.error('Failed to initialize Driver.js tour', error)
    disableTourScrollLock()
    store.setRunningTour(false, null)
  }
}

export function stopActiveTour() {
  disableTourScrollLock()
  if (activeDriverInstance) {
    activeDriverInstance.destroy()
    activeDriverInstance = null
  }
  useTutorialStore.getState().setRunningTour(false, null)
}
