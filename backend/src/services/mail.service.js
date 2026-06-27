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
    email: process.env.MAILTRAP_SENDER_EMAIL || 'InboxSystem@demomailtrap.co',
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

    console.info(`Password reset code for ${email}: ${code}`)
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
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Yêu cầu đặt lại mật khẩu</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; width: 100% !important;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; padding: 40px 16px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
              <tr>
                <td style="padding: 32px 24px;">
                  <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 22px; font-weight: 700; text-align: left;">Đặt lại mật khẩu</h2>
                  
                  <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                    Xin chào ${fullName || 'bạn'},
                  </p>
                  
                  <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                    Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã xác thực dưới đây để hoàn tất:
                  </p>
                  
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                    <tr>
                      <td align="center" style="background-color: #f3f4f6; border-radius: 8px; padding: 16px;">
                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; color: #111827; letter-spacing: 6px; display: inline-block;">${code}</span>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 15px; line-height: 24px;">
                    Mã này có hiệu lực trong <strong>30 phút</strong>.
                  </p>
                  
                  <p style="margin: 0 0 0 0; color: #9ca3af; font-size: 14px; line-height: 22px;">
                    Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này!
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 24px 32px 24px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <tr>
                      <td style="color: #9ca3af; font-size: 12px; text-align: center; line-height: 18px;">
                        © 2026 Inbox System. All rights reserved.
                      </td>
                    </tr>
                  </table>
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

module.exports = {
  sendPasswordResetCode,
}
