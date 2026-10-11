import type { TourKey } from '../../stores/tutorialStore'

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
