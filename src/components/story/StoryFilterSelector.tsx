import { useTranslation } from 'react-i18next'

export interface StoryFilter {
  id: string
  nameKey: string
  defaultName: string
  className: string
}

export const STORY_FILTERS: StoryFilter[] = [
  { id: 'normal', nameKey: 'filters.normal', defaultName: 'Gốc', className: 'story-filter-normal' },
  { id: 'warm', nameKey: 'filters.warm', defaultName: 'Ấm áp', className: 'story-filter-warm' },
  { id: 'cool', nameKey: 'filters.cool', defaultName: 'Tươi mát', className: 'story-filter-cool' },
  { id: 'vintage', nameKey: 'filters.vintage', defaultName: 'Cổ điển', className: 'story-filter-vintage' },
  { id: 'noir', nameKey: 'filters.noir', defaultName: 'Đen trắng', className: 'story-filter-noir' },
  { id: 'vivid', nameKey: 'filters.vivid', defaultName: 'Rực rỡ', className: 'story-filter-vivid' },
  { id: 'cyberpunk', nameKey: 'filters.cyberpunk', defaultName: 'Cyber', className: 'story-filter-cyberpunk' },
  { id: 'dreamy', nameKey: 'filters.dreamy', defaultName: 'Mơ mộng', className: 'story-filter-dreamy' },
]

interface StoryFilterSelectorProps {
  selectedFilter: string
  onSelectFilter: (filterId: string) => void
  previewUrl?: string
}

export function StoryFilterSelector({
  selectedFilter,
  onSelectFilter,
  previewUrl,
}: StoryFilterSelectorProps) {
  const { t } = useTranslation('story')

  const fallbackThumb =
    'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=150&q=80'

  return (
    <div className="story-filter-selector" role="toolbar" aria-label="Bộ lọc màu">
      {STORY_FILTERS.map(filter => {
        const isSelected = selectedFilter === filter.id
        return (
          <button
            key={filter.id}
            type="button"
            className={`story-filter-thumb-item ${isSelected ? 'is-selected' : ''}`}
            onClick={() => onSelectFilter(filter.id)}
            title={t(filter.nameKey, { defaultValue: filter.defaultName })}
          >
            <div className="story-filter-thumb-preview">
              <img
                src={previewUrl || fallbackThumb}
                alt={filter.id}
                className={filter.className}
                loading="lazy"
              />
            </div>
            <span className="story-filter-thumb-label">
              {t(filter.nameKey, { defaultValue: filter.defaultName })}
            </span>
          </button>
        )
      })}
    </div>
  )
}
