/**
 * Set / reset password cho user. Hash bằng bcrypt cost 12 — khớp với register handler.
 *
 * Usage:
 *   npx tsx scripts/setPassword.ts <email> <password>
 *
 * Hoặc qua npm:
 *   npm run set-password -- admin@saigonwok.local admin123
 */
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

async function main() {
  const [, , email, password] = process.argv

  if (!email || !password) {
    console.error('Usage: tsx scripts/setPassword.ts <email> <password>')
    process.exit(1)
  }

  if (password.length < 8) {
    console.warn('[warn] password < 8 ký tự — register thường yêu cầu min 8, login vẫn OK')
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`[error] User không tồn tại: ${email}`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const updated = await prisma.user.update({
    where: { email },
    data: {
      passwordHash,
      // Auto-verify email cho seed account
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
    select: { id: true, email: true, fullName: true, role: true, emailVerifiedAt: true },
  })

  console.log('✓ Password updated')
  console.log({
    id:              updated.id.toString(),
    email:           updated.email,
    fullName:        updated.fullName,
    role:            updated.role,
    emailVerifiedAt: updated.emailVerifiedAt,
  })
}

main()
  .catch(e => {
    console.error('[failed]', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
