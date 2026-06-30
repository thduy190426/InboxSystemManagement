const { MailtrapClient } = require('mailtrap')

function getMailtrapClient() {
  const token = process.env.MAILTRAP_TOKEN

  if (!token) {
    return null
  }

  return new MailtrapClient({
    token,
  })
}

function getSender() {
  return {
    email: process.env.MAILTRAP_SENDER_EMAIL || 'InboxSystem@tduymessage.com',
    name: process.env.MAILTRAP_SENDER_NAME || 'Inbox System',
  }
}

async function sendPasswordResetCode({ email, fullName, code }) {
  const client = getMailtrapClient()

  if (!client) {
    if (process.env.NODE_ENV === 'production') {
      const error = new Error('Dịch vụ gửi Email chưa được cấu hình!')
      error.statusCode = 503
      throw error
    }
    return {
      skipped: true,
    }
  }

  await client.send({
  from: getSender(),
  to: [{ email }],
  subject: 'Mã đặt lại mật khẩu của bạn',
  text: `Mã đặt lại mật khẩu của bạn là: ${code}`,
  html: `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <title>Yêu cầu đặt lại mật khẩu</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
      <style>
        * {
          font-family: 'Inter', sans-serif !important;
        }
        @media (prefers-color-scheme: dark) {
          .email-bg { background-color: #0b0f19 !important; }
          .email-card { background-color: #161b26 !important; border-color: #262e3d !important; }
          .email-heading { color: #f3f4f6 !important; }
          .email-text { color: #b0b8c4 !important; }
          .email-footer { color: #6b7280 !important; }
          .code-box { background-color: #1f2937 !important; border-color: #2d374a !important; }
          .code-text { color: #ffffff !important; }
          .divider { border-color: #262e3d !important; }
          .notice-box { background-color: #2a2410 !important; }
          .notice-text { color: #fcd34d !important; }
        }
        @media screen and (max-width: 600px) {
          .container { width: 100% !important; }
          .card-padding { padding: 28px 20px !important; }
          .code-text { font-size: 28px !important; letter-spacing: 4px !important; }
          .heading-text { font-size: 20px !important; }
        }
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; }
      </style>
    </head>
    <body class="email-bg" style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Inter', sans-serif !important; -webkit-font-smoothing: antialiased; width: 100% !important;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-bg" style="background-color: #f3f4f6; padding: 48px 16px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" class="container" style="max-width: 480px;">

              <!-- Logo / Brand -->
              <tr>
                <td align="center" style="padding-bottom: 24px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="48" height="48" style="width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
                    <tr>
                      <td align="center" valign="middle" style="width: 48px; height: 48px;">
                        <!-- Shield/lock vector mark -->
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L4 5V11C4 16.0 7.4 20.7 12 22C16.6 20.7 20 16.0 20 11V5L12 2Z" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" fill="none"/>
                          <path d="M9 12.2L11 14.2L15.2 10" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        </svg>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Main Card -->
              <tr>
                <td class="email-card" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 10px 30px -10px rgba(0,0,0,0.08); border: 1px solid #eceef1;">

                  <!-- Top accent bar -->
                  <tr><td style="height: 4px; background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%); line-height: 4px; font-size: 0;">&nbsp;</td></tr>

                  <tr>
                    <td class="card-padding" style="padding: 36px 32px 32px 32px;">

                      <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0;">
                        <tr>
                          <td valign="middle" style="padding-right: 10px;">
                            <!-- Lock vector icon next to heading -->
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect x="5" y="10.5" width="14" height="10" rx="2.2" stroke="#6366f1" stroke-width="1.7"/>
                              <path d="M8 10.5V7.5C8 5.01 9.79 3 12 3C14.21 3 16 5.01 16 7.5V10.5" stroke="#6366f1" stroke-width="1.7" stroke-linecap="round"/>
                              <circle cx="12" cy="14.8" r="1.4" fill="#6366f1"/>
                              <path d="M12 16.2V18" stroke="#6366f1" stroke-width="1.6" stroke-linecap="round"/>
                            </svg>
                          </td>
                          <td valign="middle">
                            <h2 class="email-heading heading-text" style="margin: 0; color: #111827; font-size: 22px; font-weight: 700; text-align: left; letter-spacing: -0.3px;">
                              Đặt lại mật khẩu
                            </h2>
                          </td>
                        </tr>
                      </table>

                      <p class="email-text" style="margin: 0 0 12px 0; color: #4b5563; font-size: 15px; line-height: 24px;">
                        Xin chào <strong style="color: #1f2937;">${fullName || 'bạn'}</strong>,
                      </p>

                      <p class="email-text" style="margin: 0 0 28px 0; color: #4b5563; font-size: 15px; line-height: 24px;">
                        Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Sử dụng mã xác thực bên dưới để hoàn tất:
                      </p>

                      <!-- Code box -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                        <tr>
                          <td align="center" class="code-box" style="background: linear-gradient(135deg, #f5f3ff 0%, #fdf4ff 100%); border: 1px dashed #c4b5fd; border-radius: 12px; padding: 20px;">
                            <span class="code-text" style="font-family: 'SF Mono', 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; color: #111827; letter-spacing: 8px; display: inline-block;">${code}</span>
                          </td>
                        </tr>
                      </table>

                      <!-- Expiry notice -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                        <tr>
                          <td class="notice-box" style="background-color: #fffbeb; border-radius: 8px; padding: 12px 14px;">
                            <table border="0" cellpadding="0" cellspacing="0">
                              <tr>
                                <td valign="middle" style="padding-right: 8px;">
                                  <!-- Clock vector icon -->
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="9" stroke="#b45309" stroke-width="1.8"/>
                                    <path d="M12 7.5V12L15.2 14.2" stroke="#b45309" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                                  </svg>
                                </td>
                                <td valign="middle">
                                  <p class="notice-text" style="margin: 0; color: #92400e; font-size: 13px; line-height: 20px;">
                                    Mã này có hiệu lực trong <strong>30 phút</strong>.
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p class="email-text" style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 21px;">
                        Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua Email này — tài khoản của bạn vẫn an toàn!
                      </p>

                    </td>
                  </tr>

                  <!-- Footer inside card -->
                  <tr>
                    <td style="padding: 0 32px 28px 32px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" class="divider" style="border-top: 1px solid #f0f1f3; padding-top: 18px;">
                        <tr>
                          <td class="email-footer" style="color: #9ca3af; font-size: 12px; text-align: center; line-height: 18px;">
                            © 2026 Inbox System. All rights reserved.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </td>
              </tr>

              <!-- Outer footer -->
              <tr>
                <td align="center" style="padding-top: 24px;">
                  <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 18px;">
                    Email này được gửi tự động, vui lòng không phản hồi lại Email này!
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,
  category: 'Password Reset'
});

  return {
    skipped: false,
  }
}

async function sendEmailVerificationCode({ email, fullName, code }) {
  const client = getMailtrapClient()

  if (!client) {
    if (process.env.NODE_ENV === 'production') {
      const error = new Error('Dịch vụ gửi Email chưa được cấu hình!')
      error.statusCode = 503
      throw error
    }
    return {
      skipped: true,
    }
  }

  await client.send({
    from: getSender(),
    to: [{ email }],
    subject: 'Mã xác thực Email của bạn',
    text: `Mã xác thực Email của bạn là: ${code}`,
    html: `
      <!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Xác thực Email</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * {
      font-family: 'Inter', sans-serif !important;
    }
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #0b0f19 !important; }
      .email-card { background-color: #161b26 !important; border-color: #262e3d !important; }
      .email-heading { color: #f3f4f6 !important; }
      .email-text { color: #b0b8c4 !important; }
      .code-box { background-color: #0d2420 !important; border-color: #14463c !important; }
      .code-text { color: #5eead4 !important; }
      .divider { border-color: #262e3d !important; }
    }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .card-padding { padding: 28px 20px !important; }
      .code-text { font-size: 28px !important; letter-spacing: 4px !important; }
      .heading-text { font-size: 20px !important; }
    }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; }
  </style>
</head>
<body class="email-bg" style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Inter', sans-serif !important; -webkit-font-smoothing: antialiased; width: 100% !important;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-bg" style="background-color: #f3f4f6; padding: 48px 16px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="container" style="max-width: 480px;">

          <!-- Logo / Brand -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="48" height="48" style="width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, #0f9f8e 0%, #0d7d70 100%);">
                <tr>
                  <td align="center" valign="middle" style="width: 48px; height: 48px;">
                    <!-- Envelope-check vector mark -->
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="5.5" width="18" height="13" rx="2.2" stroke="#ffffff" stroke-width="1.6"/>
                      <path d="M4 7L12 13L20 7" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    </svg>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td class="email-card" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 10px 30px -10px rgba(0,0,0,0.08); border: 1px solid #eceef1;">

              <!-- Top accent bar -->
              <tr><td style="height: 4px; background: linear-gradient(90deg, #0f9f8e 0%, #14b8a6 50%, #5eead4 100%); line-height: 4px; font-size: 0;">&nbsp;</td></tr>

              <tr>
                <td class="card-padding" style="padding: 36px 32px 32px 32px;">

                  <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0;">
                    <tr>
                      <td valign="middle" style="padding-right: 10px;">
                        <!-- Shield-check vector icon next to heading -->
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L4 5V11C4 16.0 7.4 20.7 12 22C16.6 20.7 20 16.0 20 11V5L12 2Z" stroke="#0f9f8e" stroke-width="1.7" stroke-linejoin="round" fill="none"/>
                          <path d="M9 12.2L11 14.2L15.2 10" stroke="#0f9f8e" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        </svg>
                      </td>
                      <td valign="middle">
                        <h1 class="email-heading heading-text" style="margin: 0; color: #111827; font-size: 22px; font-weight: 700; text-align: left; letter-spacing: -0.3px;">
                          Xác thực Email
                        </h1>
                      </td>
                    </tr>
                  </table>

                  <p class="email-text" style="margin: 0 0 28px 0; color: #4b5563; font-size: 15px; line-height: 24px;">
                    Xin chào <strong style="color: #1f2937;">${fullName || 'bạn'}</strong>, hãy nhập mã bên dưới để kích hoạt tài khoản <strong style="color: #1f2937;">Inbox System</strong>.
                  </p>

                  <!-- Code box -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                    <tr>
                      <td align="center" class="code-box" style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%); border: 1px dashed #5eead4; border-radius: 12px; padding: 20px;">
                        <span class="code-text" style="font-family: 'SF Mono', 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; color: #0d7d70; letter-spacing: 8px; display: inline-block;">${code}</span>
                      </td>
                    </tr>
                  </table>

                  <!-- Expiry notice -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 4px;">
                    <tr>
                      <td>
                        <table border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td valign="middle" style="padding-right: 6px;">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="9" stroke="#9ca3af" stroke-width="1.8"/>
                                <path d="M12 7.5V12L15.2 14.2" stroke="#9ca3af" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>
                            </td>
                            <td valign="middle">
                              <p class="email-text" style="margin: 0; color: #6b7280; font-size: 13px; line-height: 20px;">
                                Mã này có hiệu lực trong <strong>30 phút!</strong>.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p class="email-text" style="margin: 8px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 21px;">
                    Nếu bạn không tạo tài khoản, vui lòng bỏ qua Email này!
                  </p>

                </td>
              </tr>

              <!-- Footer inside card -->
              <tr>
                <td style="padding: 0 32px 28px 32px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" class="divider" style="border-top: 1px solid #f0f1f3; padding-top: 18px;">
                    <tr>
                      <td style="color: #9ca3af; font-size: 12px; text-align: center; line-height: 18px;">
                        © 2026 Inbox System. All rights reserved.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </td>
          </tr>

          <!-- Outer footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 18px;">
                Email này được gửi tự động, vui lòng không phản hồi lại Email này!
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    category: 'Email Verification',
  })

  return {
    skipped: false,
  }
}

module.exports = {
  sendEmailVerificationCode,
  sendPasswordResetCode,
}
