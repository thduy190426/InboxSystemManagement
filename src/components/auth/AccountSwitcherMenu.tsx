import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, ExternalLink, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AuthUser } from '../../services/api/authApi'
import {
  getSavedAccounts,
  removeSavedAccount,
  type SavedAccount,
} from '../../services/storage/authStorage'

type AccountSwitcherMenuProps = {
  isOpen: boolean
  currentUser: AuthUser | null
  anchorEl?: HTMLElement | null
  onClose: () => void
  onSwitchAccount: (account: SavedAccount) => Promise<boolean> | void
  onAddAccount: () => void
  onViewProfile?: () => void
}

export function AccountSwitcherMenu({
  isOpen,
  currentUser,
  anchorEl,
  onClose,
  onSwitchAccount,
  onAddAccount,
  onViewProfile,
}: AccountSwitcherMenuProps) {
  const { t } = useTranslation()
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [accountToDelete, setAccountToDelete] = useState<SavedAccount | null>(null)
  const [switchingId, setSwitchingId] = useState<string | number | null>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Refresh saved accounts list whenever opened
  useEffect(() => {
    if (isOpen) {
      setSavedAccounts(getSavedAccounts())
      setAccountToDelete(null)
    }
  }, [isOpen])

  // Dynamically calculate viewport coordinates
  useEffect(() => {
    if (!isOpen) return

    function updateCoords() {
      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect()
        const isMobile = window.innerWidth < 640
        if (isMobile) {
          setCoords({
            left: 12,
            top: Math.min(rect.bottom + 8, window.innerHeight - 380),
          })
        } else {
          setCoords({
            left: rect.right + 12,
            top: Math.max(12, Math.min(rect.top, window.innerHeight - 450)),
          })
        }
      } else {
        setCoords({ top: 70, left: 86 })
      }
    }

    updateCoords()
    window.addEventListener('resize', updateCoords)
    window.addEventListener('scroll', updateCoords, true)
    return () => {
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords, true)
    }
  }, [isOpen, anchorEl])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 99999,
    ...(coords
      ? {
          left: `${coords.left}px`,
          top: `${coords.top}px`,
          ...(isMobile
            ? { right: '12px', maxWidth: 'calc(100vw - 24px)' }
            : { width: '320px' }),
        }
      : {
          top: '70px',
          left: '86px',
          width: '320px',
        }),
  }

  const otherAccounts = savedAccounts.filter(
    (acc) => String(acc.user.id) !== String(currentUser?.id) && acc.user.email !== currentUser?.email,
  )

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!accountToDelete) return
    removeSavedAccount(accountToDelete.user.id)
    setSavedAccounts(getSavedAccounts())
    setAccountToDelete(null)
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="account-switcher-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          background: 'rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Menu Card */}
      <div
        ref={menuRef}
        className="account-switcher-popover"
        style={{
          ...menuStyle,
          background: 'var(--color-bg-elevated, #1a232e)',
          color: 'var(--color-text-main, #e2e8f0)',
          borderRadius: '16px',
          border: '1px solid var(--color-border, rgba(255, 255, 255, 0.12))',
          boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          animation: 'accountSwitcherFadeIn 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        role="dialog"
        aria-label={t('accountSwitcher.title', { defaultValue: 'Chuyển tài khoản' })}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 18px 12px',
            borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              {t('accountSwitcher.title', { defaultValue: 'Chuyển tài khoản' })}
            </h3>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '12px',
                color: 'var(--color-text-muted, #94a3b8)',
              }}
            >
              {t('accountSwitcher.currentAccount', { defaultValue: 'Tài khoản hiện tại' })}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'grid',
              placeItems: 'center',
              transition: 'background 150ms ease, color 150ms ease',
            }}
            title={t('close', { defaultValue: 'Đóng' })}
          >
            <X size={18} />
          </button>
        </div>

        {/* Current User Card */}
        {currentUser && (
          <div
            style={{
              padding: '12px 14px',
              margin: '10px 12px 6px',
              background: 'rgba(20, 184, 166, 0.08)',
              border: '1px solid rgba(20, 184, 166, 0.25)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName || ''}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #14b8a6, #2563eb)',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                      fontSize: '16px',
                    }}
                  >
                    {currentUser.displayName?.[0] || currentUser.fullName?.[0] || 'U'}
                  </div>
                )}
                {/* Active Indicator Badge */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '0px',
                    right: '0px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '2px solid var(--color-bg-elevated, #1a232e)',
                    boxShadow: '0 0 6px #10b981',
                  }}
                  title={t('accountSwitcher.activeNow', { defaultValue: 'Đang hoạt động' })}
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '13.5px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentUser.displayName || currentUser.fullName}
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--color-text-muted, #94a3b8)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {currentUser.email}
                </div>
              </div>
            </div>

            {onViewProfile && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onViewProfile()
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: 'var(--color-text-main, #e2e8f0)',
                  cursor: 'pointer',
                  padding: '7px',
                  borderRadius: '8px',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  transition: 'background 150ms ease',
                }}
                title={t('accountSwitcher.viewProfile', { defaultValue: 'Xem trang cá nhân' })}
              >
                <ExternalLink size={15} />
              </button>
            )}
          </div>
        )}

        {/* Other Accounts Section */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '6px 12px',
          }}
        >
          {otherAccounts.length > 0 && (
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-text-muted, #94a3b8)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '8px 6px 4px',
              }}
            >
              {t('accountSwitcher.otherAccounts', { defaultValue: 'Tài khoản khác' })}
            </div>
          )}

          {otherAccounts.map((account) => {
            const isDeleting = accountToDelete?.user.id === account.user.id

            return (
              <div
                key={account.user.id}
                className="account-item-row"
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  margin: '3px 0',
                  borderRadius: '10px',
                  background: 'transparent',
                  cursor: switchingId ? 'wait' : 'pointer',
                  opacity: switchingId && switchingId !== account.user.id ? 0.6 : 1,
                  transition: 'background 150ms ease, transform 150ms ease',
                  border: '1px solid transparent',
                  pointerEvents: switchingId ? 'none' : 'auto',
                }}
                onClick={async () => {
                  if (!isDeleting && !switchingId) {
                    setSwitchingId(account.user.id)
                    try {
                      const success = await onSwitchAccount(account)
                      if (success !== false) {
                        onClose()
                      }
                    } finally {
                      setSwitchingId(null)
                    }
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {account.user.avatarUrl ? (
                    <img
                      src={account.user.avatarUrl}
                      alt={account.user.fullName || ''}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                        fontSize: '15px',
                        flexShrink: 0,
                      }}
                    >
                      {account.user.displayName?.[0] || account.user.fullName?.[0] || 'U'}
                    </div>
                  )}

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {account.user.displayName || account.user.fullName}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--color-text-muted, #94a3b8)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {account.user.email}
                    </div>
                  </div>
                </div>

                {switchingId === account.user.id ? (
                  <div style={{ padding: '6px', display: 'grid', placeItems: 'center', color: 'var(--color-primary, #14b8a6)' }}>
                    <RefreshCw size={14} className="animate-spin" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setAccountToDelete(account)
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-muted, #94a3b8)',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '6px',
                      display: 'grid',
                      placeItems: 'center',
                      opacity: 0.7,
                      transition: 'opacity 150ms ease, background 150ms ease, color 150ms ease',
                    }}
                    className="account-remove-btn"
                    title={t('accountSwitcher.removeAccount', { defaultValue: 'Xóa tài khoản khỏi thiết bị' })}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )
          })}

          {otherAccounts.length === 0 && (
            <div
              style={{
                padding: '16px 8px',
                textAlign: 'center',
                fontSize: '12px',
                color: 'var(--color-text-muted, #94a3b8)',
              }}
            >
              {t('accountSwitcher.noSavedAccounts', {
                defaultValue: 'Chưa có tài khoản phụ nào được lưu trên thiết bị.',
              })}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog Modal Overlay */}
        {accountToDelete && (
          <div
            style={{
              padding: '12px 14px',
              margin: '0 12px 10px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
            }}
          >
            <p
              style={{
                margin: '0 0 8px',
                fontSize: '12px',
                color: 'var(--color-text-main, #e2e8f0)',
                lineHeight: 1.4,
              }}
            >
              {t('accountSwitcher.removeAccountConfirm', {
                name: accountToDelete.user.displayName || accountToDelete.user.fullName,
                defaultValue: `Xóa tài khoản ${accountToDelete.user.displayName || accountToDelete.user.fullName} khỏi thiết bị?`,
              })}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setAccountToDelete(null)
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'var(--color-text-muted, #94a3b8)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {t('cancel', { defaultValue: 'Hủy' })}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('delete', { defaultValue: 'Xóa' })}
              </button>
            </div>
          </div>
        )}

        {/* Add Account Action Footer */}
        <div
          style={{
            padding: '10px 12px 14px',
            borderTop: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
          }}
        >
          <button
            type="button"
            onClick={() => {
              onClose()
              onAddAccount()
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(37, 99, 235, 0.15))',
              border: '1px dashed rgba(20, 184, 166, 0.4)',
              color: 'var(--color-text-main, #e2e8f0)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 160ms ease',
            }}
            className="account-add-btn"
          >
            <Plus size={16} />
            <span>{t('accountSwitcher.addAccount', { defaultValue: 'Đăng nhập bằng tài khoản khác' })}</span>
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
