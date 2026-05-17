import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '@/config/env'

let cached: Transporter | null = null

function buildTransport(): Transporter {
  const secure = env.MAIL_ENCRYPTION === 'ssl'

  return nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure,
    requireTLS: env.MAIL_ENCRYPTION === 'tls',
    auth:
      env.MAIL_USERNAME && env.MAIL_PASSWORD
        ? { user: env.MAIL_USERNAME, pass: env.MAIL_PASSWORD }
        : undefined,
  })
}

export function transporter(): Transporter {
  if (!cached) cached = buildTransport()
  return cached
}

const fromAddress =
  env.MAIL_FROM_ADDRESS ?? env.MAIL_USERNAME ?? 'no-reply@saigonwok.local'
const fromHeader  = `"${env.MAIL_FROM_NAME}" <${fromAddress}>`

export interface SendMailInput {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendMail({ to, subject, text, html }: SendMailInput) {
  // In dev, nếu chưa cấu hình SMTP thì log ra console để dev vẫn đọc được OTP
  if (env.NODE_ENV !== 'production' && (!env.MAIL_USERNAME || !env.MAIL_PASSWORD)) {
    console.log(
      `\n[mailer:DEV] (SMTP chưa cấu hình, log ra console)\n` +
      `  to:      ${to}\n` +
      `  subject: ${subject}\n` +
      `  ───────\n${text}\n  ───────\n`,
    )
    return { messageId: 'dev-noop' }
  }

  const info = await transporter().sendMail({
    from: fromHeader,
    to,
    subject,
    text,
    html,
  })
  if (env.NODE_ENV !== 'production') {
    console.log(`[mailer] sent to ${to} — ${info.messageId}`)
  }
  return info
}
