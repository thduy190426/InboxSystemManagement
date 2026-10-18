import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Settings,
  Shield,
  UserRound,
  Users,
  X
  // Moon,
  // Sun
} from 'lucide-react'
import type { AuthUser } from '../../services/api/authApi'
import type { AppView } from '../../types'
import type { SavedAccount } from '../../services/storage/authStorage'
import { AccountSwitcherMenu } from '../auth/AccountSwitcherMenu'
import { useTranslation } from 'react-i18next'

type NavItemDef = {
  value: AppView | 'more'
  icon: typeof MessageCircle
  desktopOnly?: boolean
  mobileOnly?: boolean
}

const navItemsConfig: NavItemDef[] = [
  { value: 'chat', icon: MessageCircle },
  { value: 'contacts', icon: Users },
  { value: 'profile', icon: UserRound },
  { value: 'admin', icon: Shield, desktopOnly: true },
  { value: 'settings', icon: Settings, desktopOnly: true },
  { value: 'notifications', icon: Bell },
  { value: 'more', icon: MoreHorizontal, mobileOnly: true },
]

type NavRailProps = {
  activeView: AppView
  currentUser: AuthUser | null
  isOpen: boolean
  notificationCount?: number
  onChangeView: (view: AppView) => void
  onToggleOpen: () => void
  onLogout: () => void
  onUserChange: (user: AuthUser) => void
  onSwitchAccount?: (account: SavedAccount) => void
  onAddAccount?: () => void
}

export function NavRail({
  activeView,
  currentUser,
  isOpen,
  notificationCount = 0,
  onChangeView,
  onToggleOpen,
  onLogout,
  onSwitchAccount,
  onAddAccount,
}: NavRailProps) {
  const { t } = useTranslation('nav')
  const [isRinging, setIsRinging] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false)
  const avatarButtonRef = useRef<HTMLButtonElement>(null)
  const prevCountRef = useRef(notificationCount)

  useEffect(() => {
    if (notificationCount > prevCountRef.current) {
      setIsRinging(true)
      const timer = setTimeout(() => setIsRinging(false), 2500)
      return () => clearTimeout(timer)
    }
    prevCountRef.current = notificationCount
  }, [notificationCount])

  useEffect(() => {
    if (!isMoreSheetOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreSheetOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMoreSheetOpen])

  const [dragStartX, setDragStartX] = useState<number | null>(null)
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null)
  const asideRef = useRef<HTMLElement>(null)

  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return; 
    if (window.innerWidth <= 760) return;

    setDragStartX(e.clientX)
    setDragCurrentX(e.clientX)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragStartX !== null) {
      const currentX = e.clientX
      setDragCurrentX(currentX)
      const diffX = currentX - dragStartX

      if (Math.abs(diffX) > 5 && asideRef.current && !asideRef.current.hasPointerCapture(e.pointerId)) {
        asideRef.current.setPointerCapture(e.pointerId)
      }

      const appShell = document.querySelector('.app-shell') as HTMLElement | null
      if (appShell) {
        if (isOpen && diffX < 0) {
          appShell.style.setProperty('--sidebar-width', `${Math.max(76, 220 + diffX)}px`)
          appShell.style.transition = 'none'
        } else if (!isOpen && diffX > 0) {
          appShell.style.setProperty('--sidebar-width', `${Math.min(220, 76 + diffX)}px`)
          appShell.style.transition = 'none'
        }
      }
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (dragStartX !== null && dragCurrentX !== null) {
      const diffX = dragCurrentX - dragStartX
      if (isOpen && diffX < -40) {
        onToggleOpen()
      } else if (!isOpen && diffX > 40) {
        onToggleOpen()
      }
    }
    setDragStartX(null)
    setDragCurrentX(null)
    
    if (asideRef.current && asideRef.current.hasPointerCapture(e.pointerId)) {
      asideRef.current.releasePointerCapture(e.pointerId)
    }

    const appShell = document.querySelector('.app-shell') as HTMLElement | null
    if (appShell) {
      appShell.style.removeProperty('--sidebar-width')
      appShell.style.removeProperty('transition')
    }
  }

  return (
    <>
      <aside
      ref={asideRef}
      className={isOpen ? 'nav-rail is-open' : 'nav-rail'}
      data-tour="nav-rail"
      aria-label={t('mainNav')}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <button
        className="sidebar-toggle"
        onClick={onToggleOpen}
        title={isOpen ? t('collapseSidebar') : t('expandSidebar')}
        aria-label={isOpen ? t('collapseSidebar') : t('expandSidebar')}
        aria-expanded={isOpen}
        type="button"
      >
        {isOpen ? <ChevronLeft size={18} strokeWidth={2.2} /> : <ChevronRight size={18} strokeWidth={2.2} />}
        <span>{isOpen ? t('collapse') : t('expand')}</span>
      </button>

      <button
        ref={avatarButtonRef}
        className="profile-avatar-button"
        style={{ margin: '0 auto' }}
        onClick={() => setIsAccountMenuOpen((prev) => !prev)}
        title={t('accountSwitcher.title', { defaultValue: 'Chuyển tài khoản' })}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isAccountMenuOpen}
      >
        {currentUser?.avatarUrl ? (
          <img alt="" src={currentUser.avatarUrl} />
        ) : (
          <span>{currentUser?.displayName?.[0] || currentUser?.fullName?.[0] || 'I'}</span>
        )}
      </button>

      <AccountSwitcherMenu
        isOpen={isAccountMenuOpen}
        currentUser={currentUser}
        anchorEl={avatarButtonRef.current}
        onClose={() => setIsAccountMenuOpen(false)}
        onSwitchAccount={(account) => {
          setIsAccountMenuOpen(false)
          onSwitchAccount?.(account)
        }}
        onAddAccount={() => {
          setIsAccountMenuOpen(false)
          onAddAccount?.()
        }}
        onViewProfile={() => {
          setIsAccountMenuOpen(false)
          onChangeView('profile')
        }}
      />

      <nav className="nav-items">
        {navItemsConfig.map((item) => {
          if (item.value === 'admin' && currentUser?.role !== 'admin') {
            return null
          }

          const Icon = item.icon
          const badgeCount = item.value === 'notifications' ? notificationCount : 0
          const isActive = item.value === 'more'
            ? (activeView === 'admin' || activeView === 'settings' || isMoreSheetOpen)
            : activeView === item.value

          const itemClasses = [
            'nav-button',
            `nav-item--${item.value}`,
            item.desktopOnly ? 'nav-item--desktop-only' : '',
            item.mobileOnly ? 'nav-item--mobile-only' : '',
            isActive ? 'is-active' : '',
          ].filter(Boolean).join(' ')

          const handleClick = () => {
            if (item.value === 'more') {
              setIsMoreSheetOpen((prev) => !prev)
              return
            }
            setIsMoreSheetOpen(false)
            onChangeView(item.value as AppView)
          }

          return (
            <button
              className={itemClasses}
              key={item.value}
              onClick={handleClick}
              title={t(item.value)}
              type="button"
              aria-expanded={item.value === 'more' ? isMoreSheetOpen : undefined}
            >
              <Icon 
                size={22} 
                strokeWidth={2.1} 
                className={item.value === 'notifications' && isRinging ? 'animate-ring' : undefined} 
              />
              {badgeCount > 0 ? (
                <strong className="nav-count-badge" aria-label={t('newNotifications', { count: badgeCount })}>
                  {badgeCount > 99 ? '99+' : badgeCount}
                </strong>
              ) : null}
              <span>{t(item.value)}</span>
            </button>
          )
        })}
      </nav>
      <div className="nav-bottom-actions">
        <button
          className="nav-button nav-settings"
          onClick={onLogout}
          title={t('logout')}
          type="button"
        >
          <LogOut size={22} strokeWidth={2.1} />
          <span>{t('logout')}</span>
        </button>
      </div>
    </aside>

      {typeof document !== 'undefined' && createPortal(
        <div 
          className={`nav-mobile-sheet-overlay ${isMoreSheetOpen ? 'is-open' : ''}`}
          aria-hidden={!isMoreSheetOpen}
        >
          <div 
            className="nav-mobile-backdrop" 
            onClick={() => setIsMoreSheetOpen(false)} 
          />
          <div 
            className="nav-mobile-sheet" 
            role="dialog" 
            aria-modal="true" 
            aria-label={t('moreMenuTitle', { defaultValue: 'Tùy chọn mở rộng' })}
          >
            <div 
              className="nav-sheet-handle-bar" 
              onClick={() => setIsMoreSheetOpen(false)}
              role="presentation"
            >
              <div className="nav-sheet-handle" />
            </div>
            
            <div className="nav-sheet-header">
              <span className="nav-sheet-title">{t('moreMenuTitle', { defaultValue: 'Tùy chọn mở rộng' })}</span>
              <button 
                type="button" 
                className="nav-sheet-close-btn" 
                onClick={() => setIsMoreSheetOpen(false)}
                aria-label={t('closeMoreMenu', { defaultValue: 'Đóng menu' })}
              >
                <X size={18} />
              </button>
            </div>

            <div className="nav-sheet-user-card">
              <div className="nav-sheet-user-avatar">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="" />
                ) : (
                  <span>{currentUser?.displayName?.[0] || currentUser?.fullName?.[0] || 'U'}</span>
                )}
              </div>
              <div className="nav-sheet-user-info">
                <div className="nav-sheet-user-name-row">
                  <span className="nav-sheet-user-name">
                    {currentUser?.displayName || currentUser?.fullName || 'User'}
                  </span>
                  <span className={`nav-sheet-role-badge ${currentUser?.role === 'admin' ? 'is-admin' : ''}`}>
                    {currentUser?.role === 'admin' ? 'ADMIN' : 'MEMBER'}
                  </span>
                </div>
                <span className="nav-sheet-user-handle">
                  {currentUser?.handle ? `@${currentUser.handle}` : currentUser?.email || ''}
                </span>
              </div>
              <button
                type="button"
                className="nav-sheet-switch-btn"
                onClick={() => {
                  setIsMoreSheetOpen(false)
                  setIsAccountMenuOpen(true)
                }}
                title={t('switchAccounts', { defaultValue: 'Chuyển tài khoản' })}
              >
                <Users size={15} />
                <span>{t('switchAccounts', { defaultValue: 'Chuyển' })}</span>
              </button>
            </div>

            <div className="nav-sheet-menu-list">
              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  className={`nav-sheet-menu-item ${activeView === 'admin' ? 'is-active' : ''}`}
                  onClick={() => {
                    onChangeView('admin')
                    setIsMoreSheetOpen(false)
                  }}
                >
                  <div className="nav-sheet-menu-item-left">
                    <span className="nav-sheet-menu-icon is-admin">
                      <Shield size={20} />
                    </span>
                    <div className="nav-sheet-menu-text">
                      <span className="nav-sheet-menu-title">{t('admin')}</span>
                      <span className="nav-sheet-menu-desc">{t('adminDesc', { defaultValue: 'Quản trị hệ thống & phân quyền' })}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="nav-sheet-chevron" />
                </button>
              )}

              <button
                type="button"
                className={`nav-sheet-menu-item ${activeView === 'settings' ? 'is-active' : ''}`}
                onClick={() => {
                  onChangeView('settings')
                  setIsMoreSheetOpen(false)
                }}
              >
                <div className="nav-sheet-menu-item-left">
                  <span className="nav-sheet-menu-icon is-settings">
                    <Settings size={20} />
                  </span>
                  <div className="nav-sheet-menu-text">
                    <span className="nav-sheet-menu-title">{t('settings')}</span>
                    <span className="nav-sheet-menu-desc">{t('settingsDesc', { defaultValue: 'Bảo mật tài khoản & cài đặt' })}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="nav-sheet-chevron" />
              </button>

              <div className="nav-sheet-divider" />

              <button
                type="button"
                className="nav-sheet-logout-btn"
                onClick={() => {
                  setIsMoreSheetOpen(false)
                  onLogout()
                }}
              >
                <LogOut size={18} />
                <span>{t('logout')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
