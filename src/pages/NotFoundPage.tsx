import { ArrowLeft, Home, MessageCircleWarning, Compass, ShieldAlert } from 'lucide-react'

type NotFoundPageProps = {
  isAuthenticated?: boolean
  onGoHome: () => void
  onGoBack: () => void
}

export function NotFoundPage({
  isAuthenticated = false,
  onGoHome,
  onGoBack,
}: NotFoundPageProps) {
  return (
    <main className="not-found-shell">
      <section className="not-found-panel" aria-labelledby="not-found-title">
        <div className="not-found-visual" aria-hidden="true">
          <div className="not-found-code">404</div>
          <div className="visual-icon-wrapper">
            <MessageCircleWarning size={64} strokeWidth={1.5} color="#ffffff" />
          </div>
        </div>

        <div className="not-found-content-wrapper">
          <div className="not-found-copy">
            <span className="section-kicker">
              <ShieldAlert size={18} /> Lỗi 404 - Không tìm thấy
            </span>
            <h1 id="not-found-title">Trang này đã rời khỏi cuộc trò chuyện!</h1>
            <p>
              Đường dẫn bạn mở không tồn tại hoặc đã được chuyển đi. Hãy quay lại khu vực
              chính để tiếp tục quản lý hội thoại nhé!
            </p>
          </div>
          
          <div className="not-found-suggestions">
            <div className="suggestion-item">
              <Compass size={18} />
              <span>Kiểm tra lại đường dẫn URL xem có chính xác không.</span>
            </div>
          </div>

          <div className="not-found-actions">
            <button className="auth-primary" onClick={onGoHome} type="button">
              <Home size={18} />
              {isAuthenticated ? 'Về hộp thư chính' : 'Về trang đăng nhập'}
            </button>
            <button className="not-found-secondary" onClick={onGoBack} type="button">
              <ArrowLeft size={18} />
              Quay lại trang trước
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
