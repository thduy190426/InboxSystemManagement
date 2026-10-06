import { useState, useEffect, useRef } from 'react'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageCircle,
  Settings,
  Shield,
  UserRound,
  Users
  // Moon,
  // Sun
} from 'lucide-react'
import type { AuthUser } from '../../services/api/authApi'
import type { AppView } from '../../types'
// import { useTheme } from '../providers/ThemeProvider'

const navItems = [
  { label: 'Tin nhắn', value: 'chat' as const, icon: MessageCircle },
  { label: 'Danh bạ', value: 'contacts' as const, icon: Users },
  { label: 'Hồ sơ', value: 'profile' as const, icon: UserRound },
  { label: 'Quản trị', value: 'admin' as const, icon: Shield },
  { label: 'Cài đặt', value: 'settings' as const, icon: Settings },
  { label: 'Thông báo', value: 'notifications' as const, icon: Bell },
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
}

export function NavRail({
  activeView,
  currentUser,
  isOpen,
  notificationCount = 0,
  onChangeView,
  onToggleOpen,
  onLogout,
}: NavRailProps) {
  // const { theme, toggleTheme } = useTheme()
  const [isRinging, setIsRinging] = useState(false)
  const prevCountRef = useRef(notificationCount)

  useEffect(() => {
    if (notificationCount > prevCountRef.current) {
      setIsRinging(true)
      const timer = setTimeout(() => setIsRinging(false), 2500)
      return () => clearTimeout(timer)
    }
    prevCountRef.current = notificationCount
  }, [notificationCount])

  const [dragStartX, setDragStartX] = useState<number | null>(null)
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null)
  const asideRef = useRef<HTMLElement>(null)

  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return; 

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
    <aside
      ref={asideRef}
      className={isOpen ? 'nav-rail is-open' : 'nav-rail'}
      aria-label="Điều hướng chính"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <button
        className="sidebar-toggle"
        onClick={onToggleOpen}
        title={isOpen ? 'Thu gọn sidebar' : 'Mở rộng sidebar'}
        type="button"
      >
        {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        <span>{isOpen ? 'Thu gọn' : 'Mở rộng'}</span>
      </button>

      <button
        className="profile-avatar-button"
        style={{ margin: '0 auto' }}
        onClick={() => onChangeView('profile')}
        title="Chỉnh sửa hồ sơ"
        type="button"
      >
        {currentUser?.avatarUrl ? (
          <img alt="" src={currentUser.avatarUrl} />
        ) : (
          <span>{currentUser?.displayName?.[0] || currentUser?.fullName?.[0] || 'I'}</span>
        )}
      </button>

      <nav className="nav-items">
        {navItems.map((item) => {
          if (item.value === 'admin' && currentUser?.role !== 'admin') {
            return null
          }

          const Icon = item.icon
          const badgeCount = item.value === 'notifications' ? notificationCount : 0

          return (
            <button
              className={item.value === activeView ? 'nav-button is-active' : 'nav-button'}
              key={item.value}
              onClick={() => onChangeView(item.value)}
              title={item.label}
              type="button"
            >
              <Icon 
                size={22} 
                strokeWidth={2.1} 
                className={item.value === 'notifications' && isRinging ? 'animate-ring' : undefined} 
              />
              {badgeCount > 0 ? (
                <strong className="nav-count-badge" aria-label={`${badgeCount} thông báo mới!`}>
                  {badgeCount > 99 ? '99+' : badgeCount}
                </strong>
              ) : null}
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="nav-bottom-actions">
        {/* Nút chuyển đổi giao diện sáng/tối đang tạm ẩn
        <button
          className="nav-button nav-settings"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
          type="button"
        >
          {theme === 'dark' ? (
            <Sun size={22} strokeWidth={2.1} />
          ) : (
            <Moon size={22} strokeWidth={2.1} />
          )}
          <span>{theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}</span>
        </button>
        */}
        <button
          className="nav-button nav-settings"
          onClick={onLogout}
          title="Đăng xuất"
          type="button"
        >
          <LogOut size={22} strokeWidth={2.1} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  )
}
