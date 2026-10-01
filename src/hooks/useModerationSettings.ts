import { useState, useEffect } from 'react'

export type ModerationSettings = {
  bannedWords: string[]
  bannedWordAction: 'mask' | 'block'
  blockedFileTypes: string[]
}

const DEFAULT_SETTINGS: ModerationSettings = {
  bannedWords: ['vl', 'đm', 'dm', 'fuck', 'shit'],
  bannedWordAction: 'mask',
  blockedFileTypes: ['.exe', '.bat', '.sh', '.cmd', '.msi'],
}

const STORAGE_KEY = 'inbox_moderation_settings'

export function useModerationSettings() {
  const [settings, setSettings] = useState<ModerationSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load moderation settings', e)
    }
    return DEFAULT_SETTINGS
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      console.error('Failed to save moderation settings', e)
    }
  }, [settings])

  const updateSettings = (newSettings: Partial<ModerationSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  const applyModerationToText = (text: string): { original: string, modified: string, isBlocked: boolean } => {
    if (!text || settings.bannedWords.length === 0) {
      return { original: text, modified: text, isBlocked: false }
    }

    const regex = new RegExp(`\\\\b(${settings.bannedWords.join('|')})\\\\b`, 'gi')
    const containsBanned = regex.test(text)
    
    if (containsBanned && settings.bannedWordAction === 'block') {
      return { original: text, modified: text, isBlocked: true }
    }

    const modified = text.replace(regex, '***')
    return { original: text, modified, isBlocked: false }
  }

  const isFileBlocked = (fileName: string): boolean => {
    if (settings.blockedFileTypes.length === 0) return false
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
    return settings.blockedFileTypes.includes(ext)
  }

  return { settings, updateSettings, applyModerationToText, isFileBlocked }
}
