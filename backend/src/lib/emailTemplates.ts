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

// =====================================================================
// Order emails: confirm / payment_confirmed / delivering / cancelled
// =====================================================================

export interface OrderEmailItem {
  name:      string
  quantity:  number
  lineTotal: number
}

export interface OrderEmailContext {
  code:          string
  name:          string
  subtotal:      number
  deliveryFee:   number
  total:         number
  currency:      string  // ISO code (EUR)
  paymentMethod: 'cash_on_delivery' | 'bank_qr_image' | 'paypal'
  items:         OrderEmailItem[]
  trackingUrl:   string
}

function fmtMoney(locale: Locale, amount: number, currency: string): string {
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    style: 'currency', currency,
  }).format(amount)
}

function paymentMethodLabel(locale: Locale, method: OrderEmailContext['paymentMethod']): string {
  return t(locale, `payment.${method}` as 'payment.cash_on_delivery')
}

/** Email khi đơn vừa được tạo (status=pending_payment). */
export function renderOrderConfirmEmail(locale: Locale, ctx: OrderEmailContext): PlainEmail {
  const subject = t(locale, 'email.order_confirm.subject', { code: ctx.code })
  const heading = t(locale, 'email.order_confirm.heading')
  const hello   = t(locale, 'email.order.hello', { name: ctx.name })
  const body    = t(locale, 'email.order_confirm.body')
  const payNoteKey =
    ctx.paymentMethod === 'cash_on_delivery' ? 'email.order_confirm.cash_note'   :
    ctx.paymentMethod === 'bank_qr_image'    ? 'email.order_confirm.bank_note'   :
                                                'email.order_confirm.paypal_note'
  const payNote = t(locale, payNoteKey, { code: ctx.code })

  return composeOrderEmail({
    locale, subject, heading, hello, intro: body,
    extra: payNote, ctx, accent: '#c96442',
  })
}

/** Email khi admin xác nhận đã nhận tiền (paid). */
export function renderPaymentConfirmedEmail(locale: Locale, ctx: OrderEmailContext): PlainEmail {
  const subject = t(locale, 'email.payment_confirmed.subject', { code: ctx.code })
  const heading = t(locale, 'email.payment_confirmed.heading')
  const hello   = t(locale, 'email.order.hello', { name: ctx.name })
  const body    = t(locale, 'email.payment_confirmed.body')

  return composeOrderEmail({
    locale, subject, heading, hello, intro: body,
    ctx, accent: '#1a8d4d',
  })
}

/** Email khi đơn chuyển sang delivering. */
export function renderOrderDeliveringEmail(locale: Locale, ctx: OrderEmailContext): PlainEmail {
  const subject = t(locale, 'email.delivering.subject', { code: ctx.code })
  const heading = t(locale, 'email.delivering.heading')
  const hello   = t(locale, 'email.order.hello', { name: ctx.name })
  const body    = t(locale, 'email.delivering.body')

  return composeOrderEmail({
    locale, subject, heading, hello, intro: body,
    ctx, accent: '#c96442',
  })
}

/** Email khi đơn bị cancel (kèm reason + refund note). */
export function renderOrderCancelledEmail(
  locale: Locale,
  ctx: OrderEmailContext & { reason: string; wasPaid: boolean },
): PlainEmail {
  const subject = t(locale, 'email.cancelled.subject', { code: ctx.code })
  const heading = t(locale, 'email.cancelled.heading')
  const hello   = t(locale, 'email.order.hello', { name: ctx.name })
  const body    = t(locale, 'email.cancelled.body')
  const reasonLabel = t(locale, 'email.cancelled.reason_label')
  const refund      = t(locale, ctx.wasPaid ? 'email.cancelled.refund_paid' : 'email.cancelled.refund_cash')

  return composeOrderEmail({
    locale, subject, heading, hello, intro: body,
    reasonBlock: { label: reasonLabel, value: ctx.reason },
    extra: refund, ctx, accent: '#c43e1c',
    omitTrackLink: true,
  })
}

// ---------- internal ----------

function composeOrderEmail(opts: {
  locale:         Locale
  subject:        string
  heading:        string
  hello:          string
  intro:          string
  extra?:         string
  reasonBlock?:   { label: string; value: string }
  ctx:            OrderEmailContext
  accent:         string
  omitTrackLink?: boolean
}): PlainEmail {
  const { locale, ctx } = opts
  const sig    = t(locale, 'email.signature')
  const footer = t(locale, 'email.footer.address')
  const itemsHeader = t(locale, 'email.order.items_header')
  const subLabel    = t(locale, 'email.order.subtotal')
  const dlvLabel    = t(locale, 'email.order.delivery_fee')
  const totalLabel  = t(locale, 'email.order.total_label')
  const payLabel    = t(locale, 'email.order.payment_label')
  const trackLabel  = t(locale, 'email.order.track_link')
  const payMethod   = paymentMethodLabel(locale, ctx.paymentMethod)

  const subStr   = fmtMoney(locale, ctx.subtotal,    ctx.currency)
  const dlvStr   = fmtMoney(locale, ctx.deliveryFee, ctx.currency)
  const totalStr = fmtMoney(locale, ctx.total,       ctx.currency)

  // --- TEXT ---
  const itemsText = ctx.items
    .map(i => `  ${i.quantity}× ${i.name} — ${fmtMoney(locale, i.lineTotal, ctx.currency)}`)
    .join('\n')
  const text =
    `${opts.heading}\n\n` +
    `${opts.hello}\n\n` +
    `${opts.intro}\n\n` +
    (opts.reasonBlock ? `${opts.reasonBlock.label}\n${opts.reasonBlock.value}\n\n` : '') +
    (opts.extra ? `${opts.extra}\n\n` : '') +
    `${itemsHeader} (${ctx.code}):\n${itemsText}\n\n` +
    `${subLabel}: ${subStr}\n${dlvLabel}: ${dlvStr}\n${totalLabel}: ${totalStr}\n` +
    `${payLabel}: ${payMethod}\n\n` +
    (opts.omitTrackLink ? '' : `${trackLabel}: ${ctx.trackingUrl}\n\n`) +
    `${sig}\n\n${footer}`

  // --- HTML ---
  const itemsHtml = ctx.items.map(i => `
    <tr>
      <td style="padding:6px 0;font-size:14px;color:#3D1F0A;font-family:Arial,sans-serif;">
        <span style="display:inline-block;min-width:32px;font-weight:600;">${i.quantity}×</span>
        ${escapeHtml(i.name)}
      </td>
      <td style="padding:6px 0;font-size:14px;color:#3D1F0A;font-family:Arial,sans-serif;text-align:right;white-space:nowrap;">
        ${escapeHtml(fmtMoney(locale, i.lineTotal, ctx.currency))}
      </td>
    </tr>`).join('')

  const reasonHtml = opts.reasonBlock ? `
    <div style="margin:20px 0;padding:14px 16px;background:#fff;border-left:3px solid ${opts.accent};border-radius:6px;">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(61,31,10,0.6);font-family:Arial,sans-serif;font-weight:600;margin-bottom:6px;">
        ${escapeHtml(opts.reasonBlock.label)}
      </div>
      <div style="font-size:14px;line-height:1.5;color:#3D1F0A;font-family:Arial,sans-serif;white-space:pre-wrap;">
        ${escapeHtml(opts.reasonBlock.value)}
      </div>
    </div>` : ''

  const extraHtml = opts.extra ? `
    <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:rgba(61,31,10,0.75);font-family:Arial,sans-serif;">
      ${escapeHtml(opts.extra)}
    </p>` : ''

  const trackHtml = opts.omitTrackLink ? '' : `
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${escapeHtml(ctx.trackingUrl)}" style="display:inline-block;background:${opts.accent};color:#FBF6E9;text-decoration:none;font-family:Arial,sans-serif;font-weight:600;font-size:14px;padding:12px 26px;border-radius:10px;">
        ${escapeHtml(trackLabel)}
      </a>
    </div>`

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:0;background:#f5f4ed;font-family:Georgia,'Times New Roman',serif;color:#3D1F0A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FBF6E9;border-radius:24px;padding:36px 32px;box-shadow:0 1px 0 rgba(60,35,10,0.08);">
          <tr><td>
            <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${opts.accent};font-family:Arial,sans-serif;font-weight:600;margin-bottom:6px;">
              Sài Gòn Wok · ${escapeHtml(ctx.code)}
            </div>
            <h1 style="margin:0 0 12px;font-size:24px;font-weight:500;line-height:1.25;color:#3D1F0A;">
              ${escapeHtml(opts.heading)}
            </h1>
            <p style="margin:0;font-size:14px;color:rgba(61,31,10,0.65);font-family:Arial,sans-serif;">
              ${escapeHtml(opts.hello)}
            </p>
            <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:rgba(61,31,10,0.85);font-family:Arial,sans-serif;">
              ${escapeHtml(opts.intro)}
            </p>
            ${reasonHtml}
            ${extraHtml}

            <div style="margin:24px 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(61,31,10,0.55);font-family:Arial,sans-serif;font-weight:600;">
              ${escapeHtml(itemsHeader)}
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid rgba(60,35,10,0.12);">
              ${itemsHtml}
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;border-top:1px solid rgba(60,35,10,0.12);">
              <tr><td style="padding:6px 0;font-size:13px;color:rgba(61,31,10,0.7);font-family:Arial,sans-serif;">${escapeHtml(subLabel)}</td><td style="padding:6px 0;font-size:13px;color:rgba(61,31,10,0.7);font-family:Arial,sans-serif;text-align:right;">${escapeHtml(subStr)}</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:rgba(61,31,10,0.7);font-family:Arial,sans-serif;">${escapeHtml(dlvLabel)}</td><td style="padding:6px 0;font-size:13px;color:rgba(61,31,10,0.7);font-family:Arial,sans-serif;text-align:right;">${escapeHtml(dlvStr)}</td></tr>
              <tr><td style="padding:8px 0;font-size:15px;font-weight:600;color:#3D1F0A;font-family:Arial,sans-serif;border-top:1px solid rgba(60,35,10,0.12);">${escapeHtml(totalLabel)}</td><td style="padding:8px 0;font-size:15px;font-weight:600;color:#3D1F0A;font-family:Arial,sans-serif;text-align:right;border-top:1px solid rgba(60,35,10,0.12);">${escapeHtml(totalStr)}</td></tr>
              <tr><td style="padding:6px 0 0;font-size:12px;color:rgba(61,31,10,0.6);font-family:Arial,sans-serif;">${escapeHtml(payLabel)}</td><td style="padding:6px 0 0;font-size:12px;color:rgba(61,31,10,0.6);font-family:Arial,sans-serif;text-align:right;">${escapeHtml(payMethod)}</td></tr>
            </table>

            ${trackHtml}

            <hr style="border:none;border-top:1px solid rgba(60,35,10,0.12);margin:28px 0 16px;" />
            <p style="margin:0;font-size:13px;line-height:1.6;color:rgba(61,31,10,0.6);font-family:Arial,sans-serif;white-space:pre-line;">
              ${escapeHtml(sig)}
            </p>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:rgba(61,31,10,0.45);font-family:Arial,sans-serif;">
          ${escapeHtml(footer)}
        </p>
      </td></tr>
    </table>
  </body>
</html>`

  return { subject: opts.subject, text, html }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
