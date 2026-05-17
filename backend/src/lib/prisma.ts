import { PrismaClient } from '@prisma/client'
import { env } from '@/config/env'

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
})

// BigInt JSON serialization — Express trả res.json() sẽ throw nếu gặp BigInt
// Fix bằng cách monkey-patch BigInt.prototype.toJSON
;(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString()
}
