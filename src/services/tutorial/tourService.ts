import type { TourKey } from '../../stores/tutorialStore'
import { useTutorialStore } from '../../stores/tutorialStore'
import { TOUR_DEFINITIONS } from '../../features/tutorial/tourSteps'
import { readAppRouteFromLocation, toAppPath } from '../core/appRoutes'
import type { AppView } from '../../types'
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

export const TOUR_VIEW_MAP: Record<TourKey, AppView> = {
  chat: 'chat',
  story: 'chat',
  profile: 'profile',
  settings: 'settings',
}

function waitForTourElements(selectors: string[], timeout = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    if (!selectors.length) return resolve(false)

    if (selectors.some((sel) => document.querySelector(sel) !== null)) {
      return resolve(true)
    }

    const startTime = Date.now()
    const checkInterval = setInterval(() => {
      if (selectors.some((sel) => document.querySelector(sel) !== null)) {
        clearInterval(checkInterval)
        resolve(true)
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval)
        resolve(false)
      }
    }, 50)
  })
}

export async function navigateToTour(
  tourKey: TourKey,
  navigate?: (view: AppView) => void,
  options: { force?: boolean } = { force: true },
) {
  const targetView = TOUR_VIEW_MAP[tourKey]
  const currentRoute = readAppRouteFromLocation()
  const isCurrentViewTarget = currentRoute.view === targetView

  useTutorialStore.getState().setPendingTour(tourKey)

  if (!isCurrentViewTarget) {
    if (navigate) {
      navigate(targetView)
    } else {
      window.history.pushState(null, '', toAppPath({ view: targetView }))
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  const defs = TOUR_DEFINITIONS[tourKey]
  const selectors = defs ? defs.map((d) => d.element) : []

  const isReady = await waitForTourElements(selectors, 4000)
  if (!isReady) {
    console.warn(`[Tour] Elements for tour '${tourKey}' did not mount in time.`)
    useTutorialStore.getState().setPendingTour(null)
    return false
  }

  await new Promise((resolve) => setTimeout(resolve, 250))

  const firstEl = document.querySelector(selectors[0])
  if (firstEl) {
    firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  await startTour(tourKey, options)
  useTutorialStore.getState().setPendingTour(null)
  return true
}
