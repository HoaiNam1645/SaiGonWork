import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

/**
 * Sinh password tạm 12 ký tự, dễ đọc (loại bỏ ký tự gây nhầm: 0/O, 1/l/I).
 * Dùng cho seed admin tạo staff mới — admin show password cho staff đổi sau.
 */
export function generateTempPassword(length = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ' + 'abcdefghjkmnpqrstuvwxyz' + '23456789'
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}

export async function hashPassword(plain: string, cost = 12): Promise<string> {
  return bcrypt.hash(plain, cost)
}
