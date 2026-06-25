import { ArrowLeft, CheckCircle2, FileText, ShieldCheck } from 'lucide-react'

const termsSections = [
  {
    title: '1. Chấp nhận điều khoản',
    body: 'Khi tạo tài khoản hoặc sử dụng hệ thống Inbox System Management, bạn đồng ý tuân thủ các điều khoản này. Nếu bạn không đồng ý, vui lòng không tiếp tục sử dụng dịch vụ.',
  },
  {
    title: '2. Tài khoản người dùng',
    body: 'Bạn chịu trách nhiệm bảo mật thông tin đăng nhập, mật khẩu và mọi hoạt động diễn ra trong tài khoản của mình. Hãy thông báo cho quản trị viên nếu phát hiện truy cập bất thường.',
  },
  {
    title: '3. Sử dụng hợp lệ',
    body: 'Không sử dụng hệ thống để gửi nội dung vi phạm pháp luật, spam, lừa đảo, quấy rối, phát tán mã độc hoặc xâm phạm quyền riêng tư của người khác.',
  },
  {
    title: '4. Nội dung và dữ liệu',
    body: 'Bạn giữ quyền đối với nội dung do mình tạo, nhưng cho phép hệ thống xử lý dữ liệu đó để vận hành các tính năng như nhắn tin, quản lý hội thoại, thông báo và hỗ trợ khách hàng.',
  },
  {
    title: '5. Tạm ngưng hoặc chấm dứt truy cập',
    body: 'Chúng tôi có thể tạm ngưng hoặc chấm dứt quyền truy cập nếu tài khoản vi phạm điều khoản, gây rủi ro bảo mật hoặc ảnh hưởng đến trải nghiệm của người dùng khác.',
  },
  {
    title: '6. Thay đổi điều khoản',
    body: 'Điều khoản có thể được cập nhật khi sản phẩm thay đổi. Phiên bản mới sẽ có hiệu lực khi được đăng tải trong hệ thống.',
  },
]

export function TermsPage() {
  return (
    <main className="legal-shell">
      <article className="legal-document" aria-labelledby="terms-title">
        <a className="legal-back-link" href="/register">
          <ArrowLeft size={18} />
          Quay lại đăng ký
        </a>

        <header className="legal-hero">
          <div className="legal-icon">
            <FileText size={30} />
          </div>
          <div>
            <span className="section-kicker">Inbox System Management</span>
            <h1 id="terms-title">Điều khoản sử dụng</h1>
            <p>
              Các nguyên tắc cơ bản khi bạn tạo tài khoản, quản lý hội thoại và sử
              dụng các tính năng trong hệ thống.
            </p>
          </div>
        </header>

        <section className="legal-summary" aria-label="Tóm tắt">
          <div>
            <ShieldCheck size={18} />
            <span>Cập nhật gần nhất: 23/06/2026</span>
          </div>
          <div>
            <CheckCircle2 size={18} />
            <span>Áp dụng cho tất cả người dùng đã đăng ký</span>
          </div>
        </section>

        <div className="legal-section-list">
          {termsSections.map((section) => (
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
