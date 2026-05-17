import { t, type Locale } from '@/i18n'
import { env } from '@/config/env'

export interface OtpEmail {
  subject: string
  text: string
  html: string
}

export interface PlainEmail {
  subject: string
  text:    string
  html:    string
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

/** Email báo deactivation (kèm lý do). */
export function renderAccountDeactivatedEmail(
  locale: Locale,
  opts: { name: string; reason: string },
): PlainEmail {
  const subject = t(locale, 'email.account_deactivated.subject')
  const heading = t(locale, 'email.account_deactivated.heading')
  const body    = t(locale, 'email.account_deactivated.body', { name: opts.name })
  const reasonLabel = t(locale, 'email.account_deactivated.reason_label')
  const contact = t(locale, 'email.account_deactivated.contact')
  const sig     = t(locale, 'email.signature')
  const footer  = t(locale, 'email.footer.address')

  const text =
    `${heading}\n\n` +
    `${body}\n\n` +
    `${reasonLabel}\n${opts.reason}\n\n` +
    `${contact}\n\n` +
    `${sig}\n\n${footer}`

  const html = renderAccountStatusHtml({
    locale, heading, body,
    accent: '#c43e1c',
    reasonBlock: { label: reasonLabel, value: opts.reason },
    extraText: contact, sig, footer,
  })
  return { subject, text, html }
}

/** Email báo reactivation. */
export function renderAccountReactivatedEmail(
  locale: Locale,
  opts: { name: string },
): PlainEmail {
  const subject = t(locale, 'email.account_reactivated.subject')
  const heading = t(locale, 'email.account_reactivated.heading')
  const body    = t(locale, 'email.account_reactivated.body', { name: opts.name })
  const sig     = t(locale, 'email.signature')
  const footer  = t(locale, 'email.footer.address')

  const text = `${heading}\n\n${body}\n\n${sig}\n\n${footer}`

  const html = renderAccountStatusHtml({
    locale, heading, body, accent: '#1a8d4d', sig, footer,
  })
  return { subject, text, html }
}

function renderAccountStatusHtml(opts: {
  locale:    Locale
  heading:   string
  body:      string
  accent:    string
  reasonBlock?: { label: string; value: string }
  extraText?: string
  sig:       string
  footer:    string
}): string {
  const reasonHtml = opts.reasonBlock ? `
                <div style="margin:20px 0;padding:14px 16px;background:#fff;border-left:3px solid ${opts.accent};border-radius:6px;">
                  <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(61,31,10,0.6);font-family:Arial,sans-serif;font-weight:600;margin-bottom:6px;">
                    ${escapeHtml(opts.reasonBlock.label)}
                  </div>
                  <div style="font-size:14px;line-height:1.5;color:#3D1F0A;font-family:Arial,sans-serif;white-space:pre-wrap;">
                    ${escapeHtml(opts.reasonBlock.value)}
                  </div>
                </div>` : ''

  const extraHtml = opts.extraText ? `
                <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:rgba(61,31,10,0.7);font-family:Arial,sans-serif;">
                  ${escapeHtml(opts.extraText)}
                </p>` : ''

  return `<!doctype html>
<html lang="${opts.locale}">
  <body style="margin:0;padding:0;background:#f5f4ed;font-family:Georgia,'Times New Roman',serif;color:#3D1F0A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FBF6E9;border-radius:24px;padding:36px 32px;box-shadow:0 1px 0 rgba(60,35,10,0.08);">
          <tr><td>
            <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${opts.accent};font-family:Arial,sans-serif;font-weight:600;margin-bottom:10px;">
              Sài Gòn Wok
            </div>
            <h1 style="margin:0 0 14px;font-size:24px;font-weight:500;line-height:1.25;color:#3D1F0A;">
              ${escapeHtml(opts.heading)}
            </h1>
            <p style="margin:0;font-size:15px;line-height:1.6;color:rgba(61,31,10,0.78);font-family:Arial,sans-serif;">
              ${escapeHtml(opts.body)}
            </p>
            ${reasonHtml}
            ${extraHtml}
            <hr style="border:none;border-top:1px solid rgba(60,35,10,0.12);margin:28px 0;" />
            <p style="margin:0;font-size:13px;line-height:1.6;color:rgba(61,31,10,0.6);font-family:Arial,sans-serif;white-space:pre-line;">
              ${escapeHtml(opts.sig)}
            </p>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:rgba(61,31,10,0.45);font-family:Arial,sans-serif;">
          ${escapeHtml(opts.footer)}
        </p>
      </td></tr>
    </table>
  </body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
