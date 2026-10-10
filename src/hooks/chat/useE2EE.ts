import { useEffect } from 'react'
import { keyManager } from '../../lib/e2ee/KeyManager'

export function useE2EE() {
  useEffect(() => {
    keyManager.initializeKeysIfNeeded().catch((error) => {
      console.error('Failed to initialize E2EE keys:', error)
    })
  }, [])
}
