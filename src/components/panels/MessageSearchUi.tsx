import type { ConversationMember } from '../../types'
import type { MessageSearchType } from '../../services/api/chatApi'
import { Search, Filter, ChevronUp, ChevronDown, X } from 'lucide-react'

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
  return (
    <div className="message-search">
      <label className="message-search-field">
        <Search size={16} />
        <input
          aria-label="Tìm trong hội thoại đã nhắn"
          onChange={(event) => setMessageSearch(event.target.value)}
          placeholder="Tìm trong tin nhắn đã gửi"
          type="search"
          value={messageSearch}
        />
      </label>
      <span className="message-search-filter-wrap">
        <button
          className={isSearchFilterOpen ? 'message-search-button is-active' : 'message-search-button'}
          onClick={() => setIsSearchFilterOpen((current) => !current)}
          title="Bo loc"
          type="button"
        >
          <Filter size={16} />
        </button>
        {isSearchFilterOpen ? (
          <span className="message-search-filter-popover">
            <input
              aria-label="Từ ngày"
              className="message-search-date"
              onChange={(event) => setSearchDateFrom(event.target.value)}
              type="date"
              value={searchDateFrom}
            />
            <input
              aria-label="Đến ngày"
              className="message-search-date"
              onChange={(event) => setSearchDateTo(event.target.value)}
              type="date"
              value={searchDateTo}
            />
            <select
              aria-label="Người gửi"
              className="message-search-select"
              onChange={(event) => setSearchSenderId(event.target.value)}
              value={searchSenderId}
            >
              <option value="">Mọi người</option>
              {members.map((member) => (
                <option key={member.id} value={String(member.userId)}>
                  {member.nickname || member.fullName}
                </option>
              ))}
            </select>
            <select
              aria-label="Loại tin"
              className="message-search-select"
              onChange={(event) => setSearchType(event.target.value as MessageSearchType)}
              value={searchType}
            >
              <option value="all">Tất cả</option>
              <option value="text">Văn bản</option>
              <option value="image">Ảnh</option>
              <option value="audio">Âm thanh</option>
              <option value="attachment">Đính kèm</option>
            </select>
          </span>
        ) : null}
      </span>
      <button
        className="message-search-button"
        disabled={!hasSearchFilters || isSearchingMessages}
        onClick={() => runAdvancedSearch().catch(() => undefined)}
        title="Tìm"
        type="button"
      >
        <Search size={16} />
      </button>
      {hasSearchFilters ? (
        <>
          <span className="message-search-count">
            {searchMatchesLength
              ? `${activeSearchIndex + 1}/${searchMatchesLength}`
              : '0 kết quả'}
          </span>
          <button
            className="message-search-button"
            disabled={searchMatchesLength === 0 || isSearchingMessages}
            onClick={() => moveSearchResult('previous').catch(() => undefined)}
            title="Kết quả trước"
            type="button"
          >
            <ChevronUp size={16} />
          </button>
          <button
            className="message-search-button"
            disabled={searchMatchesLength === 0 || isSearchingMessages}
            onClick={() => moveSearchResult('next').catch(() => undefined)}
            title="Kết quả tiếp theo"
            type="button"
          >
            <ChevronDown size={16} />
          </button>
          <button
            className="message-search-button"
            onClick={clearSearch}
            title="Xóa tìm kiếm"
            type="button"
          >
            <X size={16} />
          </button>
        </>
      ) : null}
    </div>
  )
}
