import React, { useState } from 'react'
import { setup2FA, verifySetup2FA, disable2FA } from '../../services/api/authApi'
import { ShieldCheck, Trash2 } from 'lucide-react'

export function TwoFactorSettings({
  isEnabled,
  onEnabled,
  onDisabled,
  pushToast
}: {
  isEnabled: boolean
  onEnabled: () => void
  onDisabled: () => void
  pushToast: (msg: string, tone?: 'info'|'error') => void
}) {
  const [setupData, setSetupData] = useState<{ secret: string, qrCodeUrl: string } | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  
  const [showDisable, setShowDisable] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableToken, setDisableToken] = useState('')

  async function handleSetup() {
    setIsSubmitting(true)
    try {
      const res = await setup2FA()
      setSetupData(res)
    } catch (err: any) {
      pushToast(err.message || 'Lỗi khi cài đặt 2FA', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!setupData || !verifyCode) return
    setIsSubmitting(true)
    try {
      const res = await verifySetup2FA({ secret: setupData.secret, token: verifyCode })
      setBackupCodes(res.backupCodes)
      pushToast('Kích hoạt 2FA thành công!', 'info')
      onEnabled()
    } catch (err: any) {
      pushToast(err.message || 'Mã xác thực không đúng', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault()
    if (!disableToken || !disablePassword) return
    setIsSubmitting(true)
    try {
      await disable2FA({ token: disableToken, password: disablePassword })
      pushToast('Đã tắt 2FA', 'info')
      setShowDisable(false)
      onDisabled()
    } catch (err: any) {
      pushToast(err.message || 'Lỗi khi tắt 2FA', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (backupCodes.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '16px', background: 'var(--sp-success-bg, #e6f4ea)', borderRadius: '8px', color: 'var(--sp-success, #137333)' }}>
          <strong>Lưu lại mã dự phòng (Backup Codes)</strong>
          <p>Mã dự phòng này chỉ được hiển thị 1 lần. Hãy lưu trữ cẩn thận để khôi phục tài khoản nếu bạn mất thiết bị 2FA.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {backupCodes.map((code) => (
            <div key={code} style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>
              {code}
            </div>
          ))}
        </div>
        <button className="sp-btn sp-btn--primary" onClick={() => setBackupCodes([])} style={{ alignSelf: 'flex-start' }}>
          Đã lưu mã dự phòng
        </button>
      </div>
    )
  }

  if (isEnabled) {
    if (showDisable) {
      return (
        <form onSubmit={handleDisable} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>Nhập mật khẩu và mã 2FA hiện tại để tắt Xác thực 2 bước.</p>
          <input
            type="password"
            placeholder="Mật khẩu"
            className="sp-input"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-color)' }}
          />
          <input
            type="text"
            placeholder="Mã 2FA (6 số)"
            className="sp-input"
            value={disableToken}
            onChange={(e) => setDisableToken(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-color)' }}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="sp-btn sp-btn--danger" type="submit" disabled={isSubmitting}>
              Tắt 2FA
            </button>
            <button className="sp-btn" type="button" onClick={() => setShowDisable(false)} disabled={isSubmitting}>
              Hủy
            </button>
          </div>
        </form>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: 'var(--sp-success, #137333)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} /> Đang bảo vệ bằng 2FA
        </p>
        <button className="sp-btn sp-btn--danger" onClick={() => setShowDisable(true)} style={{ alignSelf: 'flex-start' }}>
          <Trash2 size={16} /> Tắt Xác thực 2 bước
        </button>
      </div>
    )
  }

  if (setupData) {
    return (
      <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p>1. Quét mã QR này bằng ứng dụng Google Authenticator hoặc Authy.</p>
        <img src={setupData.qrCodeUrl} alt="QR Code" style={{ width: '200px', height: '200px', alignSelf: 'center', background: '#fff', padding: '12px', borderRadius: '8px' }} />
        <p>2. Nhập mã 6 số hiện trên ứng dụng để xác nhận.</p>
        <input
          type="text"
          placeholder="Nhập mã 6 số"
          value={verifyCode}
          onChange={(e) => setVerifyCode(e.target.value)}
          required
          maxLength={6}
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-color)', textAlign: 'center', fontSize: '18px', letterSpacing: '4px' }}
        />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="sp-btn sp-btn--primary" type="submit" disabled={isSubmitting}>
            Xác nhận
          </button>
          <button className="sp-btn" type="button" onClick={() => setSetupData(null)} disabled={isSubmitting}>
            Hủy
          </button>
        </div>
      </form>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p>Xác thực 2 bước (2FA) giúp bảo vệ tài khoản của bạn khỏi việc truy cập trái phép bằng cách yêu cầu mã bảo mật từ ứng dụng bên thứ 3 (Google Authenticator, Authy, v.v.).</p>
      <button className="sp-btn sp-btn--primary" onClick={handleSetup} disabled={isSubmitting} style={{ alignSelf: 'flex-start' }}>
        Thiết lập 2FA
      </button>
    </div>
  )
}
