import { ArrowLeft, Database, Eye, LockKeyhole, ShieldCheck } from 'lucide-react'

const privacySections = [
  {
    title: '1. Dữ liệu chúng tôi thu thập',
    body: 'Hệ thống có thể lưu thông tin tài khoản như họ tên, email, số điện thoại, ảnh đại diện, trạng thái, nội dung hội thoại, tệp đính kèm và lịch sử phiên đăng nhập.',
  },
  {
    title: '2. Mục đích sử dụng dữ liệu',
    body: 'Dữ liệu được dùng để xác thực tài khoản, hiển thị hồ sơ, vận hành nhắn tin, đồng bộ trạng thái trực tuyến, gửi thông báo và bảo vệ hệ thống khỏi truy cập trái phép.',
  },
  {
    title: '3. Bảo mật tài khoản',
    body: 'Mật khẩu được lưu dưới dạng mã hóa một chiều. Bạn nên đặt mật khẩu mạnh, không chia sẻ thông tin đăng nhập và đăng xuất khỏi thiết bị không còn sử dụng.',
  },
  {
    title: '4. Chia sẻ dữ liệu',
    body: 'Chúng tôi không bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ khi cần vận hành dịch vụ, tuân thủ yêu cầu pháp lý hoặc xử lý sự cố bảo mật.',
  },
  {
    title: '5. Lưu trữ và xóa dữ liệu',
    body: 'Dữ liệu được lưu trong thời gian cần thiết cho mục đích vận hành. Khi tài khoản bị vô hiệu hóa hoặc xóa, dữ liệu liên quan có thể được xử lý theo chính sách lưu trữ của hệ thống.',
  },
  {
    title: '6. Quyền của bạn',
    body: 'Bạn có thể cập nhật hồ sơ, đổi mật khẩu, đăng xuất khỏi phiên hiện tại và liên hệ quản trị viên để yêu cầu hỗ trợ về dữ liệu cá nhân.',
  },
]

export function PrivacyPolicyPage() {
  return (
    <main className="legal-shell">
      <article className="legal-document" aria-labelledby="privacy-title">
        <a className="legal-back-link" href="/register">
          <ArrowLeft size={18} />
          Quay lại đăng ký
        </a>

        <header className="legal-hero">
          <div className="legal-icon">
            <LockKeyhole size={30} />
          </div>
          <div>
            <span className="section-kicker">Inbox System Management</span>
            <h1 id="privacy-title">Chính sách bảo mật</h1>
            <p>
              Cách hệ thống thu thập, sử dụng và bảo vệ dữ liệu cá nhân khi bạn
              làm việc với tài khoản, hội thoại và tệp đính kèm.
            </p>
          </div>
        </header>

        <section className="legal-summary" aria-label="Tóm tắt">
          <div>
            <ShieldCheck size={18} />
            <span>Cập nhật gần nhất: 23/06/2026</span>
          </div>
          <div>
            <Database size={18} />
            <span>Dữ liệu được dùng để vận hành và bảo vệ dịch vụ</span>
          </div>
          <div>
            <Eye size={18} />
            <span>Không bán dữ liệu cá nhân</span>
          </div>
        </section>

        <div className="legal-section-list">
          {privacySections.map((section) => (
            <section className="legal-section" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  )
}
