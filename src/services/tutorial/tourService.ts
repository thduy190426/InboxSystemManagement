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
      doneBtnText: i18n.t('tutorial.buttons.done', { defaultValue: 'Hoàn tất' }),
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
