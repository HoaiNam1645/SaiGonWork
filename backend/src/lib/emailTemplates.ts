import { t, type Locale } from '@/i18n'
import { env } from '@/config/env'

export interface OtpEmail {
  subject: string
  text: string
  html: string
}

/** Email gồm OTP 6 số — gửi cho register / guest_checkout / reset_password. */
export function renderOtpEmail(locale: Locale, code: string): OtpEmail {
  const minutes  = env.OTP_TTL_MINUTES
  const subject  = t(locale, 'email.otp.subject')
  const heading  = t(locale, 'email.otp.heading')
  const body     = t(locale, 'email.otp.body',     { minutes })
  const warning  = t(locale, 'email.otp.warning')
  const sig      = t(locale, 'email.signature')
  const footer   = t(locale, 'email.footer.address')

  const text =
    `${heading}\n\n` +
    `${body}\n\n` +
    `    ${code}\n\n` +
    `${warning}\n\n` +
    `${sig}\n\n` +
    `${footer}`

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:0;background:#f5f4ed;font-family:Georgia,'Times New Roman',serif;color:#3D1F0A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FBF6E9;border-radius:24px;padding:36px 32px;box-shadow:0 1px 0 rgba(60,35,10,0.08);">
            <tr>
              <td>
                <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#E8650A;font-family:Arial,sans-serif;font-weight:600;margin-bottom:10px;">
                  Sài Gòn Wok
                </div>
                <h1 style="margin:0 0 14px;font-size:26px;font-weight:500;line-height:1.2;color:#3D1F0A;">
                  ${escapeHtml(heading)}
                </h1>
                <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:rgba(61,31,10,0.7);font-family:Arial,sans-serif;">
                  ${escapeHtml(body)}
                </p>
                <div style="text-align:center;margin:28px 0;">
                  <div style="display:inline-block;background:#fff;border-radius:14px;padding:18px 28px;font-family:'Courier New',monospace;font-size:34px;letter-spacing:10px;color:#3D1F0A;font-weight:600;box-shadow:inset 0 0 0 1px rgba(60,35,10,0.12),0 0 0 4px rgba(201,150,58,0.18);">
                    ${escapeHtml(code)}
                  </div>
                </div>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:rgba(61,31,10,0.55);font-family:Arial,sans-serif;">
                  ${escapeHtml(warning)}
                </p>
                <hr style="border:none;border-top:1px solid rgba(60,35,10,0.12);margin:28px 0;" />
                <p style="margin:0;font-size:13px;line-height:1.6;color:rgba(61,31,10,0.6);font-family:Arial,sans-serif;white-space:pre-line;">
                  ${escapeHtml(sig)}
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:11px;color:rgba(61,31,10,0.45);font-family:Arial,sans-serif;">
            ${escapeHtml(footer)}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, text, html }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
