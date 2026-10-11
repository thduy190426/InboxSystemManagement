import { useTranslation } from 'react-i18next'

type StoryReactionSelectorProps = {
  currentReaction: string | null
  onReact: (emoji: string) => void
  isOpen: boolean
}

export const STORY_REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '🔥']

export function StoryReactionSelector({ currentReaction, onReact, isOpen }: StoryReactionSelectorProps) {
  const { t } = useTranslation('story')

  if (!isOpen) return null

  return (
    <div 
      className="story-floating-reactions-bar"
      onClick={e => e.stopPropagation()}
    >
      {STORY_REACTION_EMOJIS.map(emoji => {
        const isSelected = currentReaction === emoji
        return (
          <button
            key={emoji}
            type="button"
            className={isSelected ? 'is-selected' : ''}
            onClick={() => onReact(emoji)}
            title={t('reactTooltip', { emoji })}
          >
            {emoji}
          </button>
        )
      })}
    </div>
  )
}
