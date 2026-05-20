import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { createApp } from './app'
import { env } from './config/env'
import { setIo } from './lib/socket'
import { verifyAccess, verifyGuest, type AccessTokenPayload, type GuestTokenPayload } from './lib/jwt'
import { isOriginAllowed } from './lib/corsOrigin'

const app = createApp()
const httpServer = createServer(app)

// =====================================================================
// Socket.io setup
// =====================================================================

interface SocketAuthData {
  user?:  AccessTokenPayload
  guest?: GuestTokenPayload
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const io: SocketServer = new SocketServer(httpServer, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (isOriginAllowed(origin)) return cb(null, true)
      cb(new Error(`Socket CORS: origin not allowed: ${origin}`))
    },
    credentials: true,
  },
})
setIo(io)

// Type-safe data accessor — Socket.data là DefaultEventsMap mặc định nên cast khi đọc
function authData(socket: { data: unknown }): SocketAuthData {
  return socket.data as SocketAuthData
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const pair of header.split(';')) {
    const [k, ...v] = pair.trim().split('=')
    if (!k) continue
    out[k] = decodeURIComponent(v.join('='))
  }
  return out
}

// Handshake middleware: verify access_token cookie + (optional) guestToken qua auth payload
io.use((socket, next) => {
  const data    = authData(socket)
  const cookies = parseCookies(socket.handshake.headers.cookie)
  const access  = cookies['access_token']
  if (access) {
    try { data.user = verifyAccess(access) } catch { /* anonymous */ }
  }
  const guestToken =
    (socket.handshake.auth as { guestToken?: string } | undefined)?.guestToken ??
    (typeof socket.handshake.query?.guestToken === 'string' ? socket.handshake.query.guestToken : undefined)
  if (guestToken && guestToken.length > 0) {
    try { data.guest = verifyGuest(guestToken) } catch { /* ignore */ }
  }
  next()
})

io.on('connection', (socket) => {
  // staff/admin room — chỉ join nếu JWT có role staff/admin
  socket.on('join:staff', () => {
    const role = authData(socket).user?.role
    if (role === 'staff' || role === 'admin') {
      void socket.join('staff:orders')
      socket.emit('joined:staff', { ok: true })
    } else {
      socket.emit('joined:staff', { ok: false, reason: 'forbidden' })
    }
  })

  // order:{code} room — staff/admin, hoặc guest có token khớp orderCode
  // Customer owner: cần lookup DB → tạm forbid, FE customer fetch REST thay vì socket
  socket.on('join:order', (payload: { code: string }) => {
    if (!payload?.code) return
    const data  = authData(socket)
    const role  = data.user?.role
    const guest = data.guest
    const allowed =
      role === 'staff' || role === 'admin' ||
      (guest != null && guest.orderCode === payload.code)
    if (allowed) {
      void socket.join(`order:${payload.code}`)
      socket.emit('joined:order', { ok: true, code: payload.code })
    } else {
      socket.emit('joined:order', { ok: false, reason: 'forbidden' })
    }
  })
})

httpServer.listen(env.PORT, () => {
  console.log(`[server] http://localhost:${env.PORT} (${env.NODE_ENV})`)
})
