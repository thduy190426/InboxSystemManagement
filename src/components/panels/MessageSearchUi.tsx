import type { ConversationMember } from '../../types'
import type { MessageSearchType } from '../../services/api/chatApi'
import { Search, Filter, ChevronUp, ChevronDown, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type MessageSearchUiProps = {
  messageSearch: string
  setMessageSearch: (s: string) => void
  isSearchFilterOpen: boolean
  setIsSearchFilterOpen: (fn: (current: boolean) => boolean) => void
  searchDateFrom: string
  setSearchDateFrom: (s: string) => void
  searchDateTo: string
  setSearchDateTo: (s: string) => void
  searchSenderId: string
  setSearchSenderId: (s: string) => void
  searchType: MessageSearchType
  setSearchType: (s: MessageSearchType) => void
  members: ConversationMember[]
  hasSearchFilters: boolean
  isSearchingMessages: boolean
  runAdvancedSearch: () => Promise<void>
  searchMatchesLength: number
  activeSearchIndex: number
  moveSearchResult: (direction: 'next' | 'previous') => Promise<void>
  clearSearch: () => void
}

export function MessageSearchUi({
  messageSearch,
  setMessageSearch,
  isSearchFilterOpen,
  setIsSearchFilterOpen,
  searchDateFrom,
  setSearchDateFrom,
  searchDateTo,
  setSearchDateTo,
  searchSenderId,
  setSearchSenderId,
  searchType,
  setSearchType,
  members,
  hasSearchFilters,
  isSearchingMessages,
  runAdvancedSearch,
  searchMatchesLength,
  activeSearchIndex,
  moveSearchResult,
  clearSearch
}: MessageSearchUiProps) {
  const { t } = useTranslation('panels')

  return (
    <div className="message-search">
      <label className="message-search-field">
        <Search size={16} />
        <input
          aria-label={t('messageSearchAria')}
          onChange={(event) => setMessageSearch(event.target.value)}
          placeholder={t('messageSearchPlaceholder')}
          type="search"
          value={messageSearch}
        />
      </label>
      <span className="message-search-filter-wrap">
        <button
          className={isSearchFilterOpen ? 'message-search-button is-active' : 'message-search-button'}
          onClick={() => setIsSearchFilterOpen((current) => !current)}
          title={t('filterTitle')}
          type="button"
        >
          <Filter size={16} />
        </button>
        {isSearchFilterOpen ? (
          <span className="message-search-filter-popover">
            <input
              aria-label={t('dateFromAria')}
              className="message-search-date"
              onChange={(event) => setSearchDateFrom(event.target.value)}
              type="date"
              value={searchDateFrom}
            />
            <input
              aria-label={t('dateToAria')}
              className="message-search-date"
              onChange={(event) => setSearchDateTo(event.target.value)}
              type="date"
              value={searchDateTo}
            />
            <select
              aria-label={t('senderAria')}
              className="message-search-select"
              onChange={(event) => setSearchSenderId(event.target.value)}
              value={searchSenderId}
            >
              <option value="">{t('everyoneOption')}</option>
              {members.map((member) => (
                <option key={member.id} value={String(member.userId)}>
                  {member.nickname || member.fullName}
                </option>
              ))}
            </select>
            <select
              aria-label={t('messageTypeAria')}
              className="message-search-select"
              onChange={(event) => setSearchType(event.target.value as MessageSearchType)}
              value={searchType}
            >
              <option value="all">{t('typeAll')}</option>
              <option value="text">{t('typeText')}</option>
              <option value="image">{t('typeImage')}</option>
              <option value="audio">{t('typeAudio')}</option>
              <option value="attachment">{t('typeAttachment')}</option>
            </select>
          </span>
        ) : null}
      </span>
      <button
        className="message-search-button"
        disabled={!hasSearchFilters || isSearchingMessages}
        onClick={() => runAdvancedSearch().catch(() => undefined)}
        title={t('searchTitle')}
        type="button"
      >
        <Search size={16} />
      </button>
      {hasSearchFilters ? (
        <>
          <span className="message-search-count">
            {searchMatchesLength
              ? `${activeSearchIndex + 1}/${searchMatchesLength}`
              : t('noSearchResultCount')}
          </span>
          <button
            className="message-search-button"
            disabled={searchMatchesLength === 0 || isSearchingMessages}
            onClick={() => moveSearchResult('previous').catch(() => undefined)}
            title={t('prevResultTitle')}
            type="button"
          >
            <ChevronUp size={16} />
          </button>
          <button
            className="message-search-button"
            disabled={searchMatchesLength === 0 || isSearchingMessages}
            onClick={() => moveSearchResult('next').catch(() => undefined)}
            title={t('nextResultTitle')}
            type="button"
          >
            <ChevronDown size={16} />
          </button>
          <button
            className="message-search-button"
            onClick={clearSearch}
            title={t('clearSearchTitle')}
            type="button"
          >
            <X size={16} />
          </button>
        </>
      ) : null}
    </div>
  )
}
