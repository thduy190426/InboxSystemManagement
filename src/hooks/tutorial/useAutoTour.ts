import { useEffect } from 'react'
import type { TourKey } from '../../stores/tutorialStore'
import { useTutorialStore } from '../../stores/tutorialStore'
import { startTour } from '../../services/tutorial/tourService'

export function useAutoTour(
  tourKey: TourKey,
  isActive: boolean,
  userId: string | number | null | undefined,
) {
  const initForUser = useTutorialStore((state) => state.initForUser)
  const isTourCompleted = useTutorialStore((state) => state.isTourCompleted)
  const isRunningTour = useTutorialStore((state) => state.isRunningTour)

  useEffect(() => {
    if (userId) {
      initForUser(userId)
    }
  }, [userId, initForUser])

  useEffect(() => {
    if (!isActive || !userId || isRunningTour) return
    if (isTourCompleted(tourKey)) return

    // Allow DOM to stabilize before starting tour
    const timer = window.setTimeout(() => {
      startTour(tourKey)
    }, 700)

    return () => window.clearTimeout(timer)
  }, [tourKey, isActive, userId, isTourCompleted, isRunningTour])
}
