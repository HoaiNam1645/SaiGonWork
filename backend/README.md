# Sai Gon Wok — Backend

Express + TypeScript + Prisma backend cho [Sai Gon Wok](../README.md).

## Stack

- **Node.js + Express 4** — REST API
- **TypeScript 5** — strict mode
- **Prisma 5** — ORM cho MySQL 8
- **Socket.io 4** — realtime đơn hàng (staff dashboard + customer tracking)
- **JWT** + **httpOnly cookie** — auth (access 15m + refresh 7d)
- **Zod** — validate request body
- **bcryptjs** — hash password & OTP
- **helmet** + **cors** + **express-rate-limit** — security defaults

## Setup

### 1. Cài MySQL

Yêu cầu MySQL 8.0+. Tạo database trắng:

```bash
mysql -u root -p -e "CREATE DATABASE saigon_wok CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2. Cài dependencies

```bash
cd backend
npm install     # Prisma 5.22.0 pin chính xác để tránh v6/v7 break
```

### 3. Cấu hình env

```bash
cp .env.example .env
# Sửa DATABASE_URL, JWT_*_SECRET, MAIL_* (SMTP)
```

### 4. Apply migrations + seed initial data

```bash
npm run migrate:deploy   # apply tất cả migration trong prisma/migrations/
npm run seed             # seed admin user + store settings + menu (idempotent)
```

### 5. Chạy dev

```bash
npm run dev
# Server: http://localhost:4000
```

Admin login mặc định:
- `admin@saigonwok.local` / `admin123`
- `staff1@saigonwok.local` / `admin123`

(Đổi password sau khi seed lần đầu — qua admin UI hoặc `npm run set-password`.)

## Workflow chuẩn (Prisma-native, không bao giờ mất data)

### Khi sửa `prisma/schema.prisma` (thêm bảng, cột, index…)

```bash
# 1. Sửa schema.prisma
# 2. Tạo migration mới — KHÔNG reset data
npm run migrate -- --name <change_name>
#   vd: npm run migrate -- --name add_promotions_table

# 3. (Optional) Re-seed nếu cần
npm run seed
```

Lệnh `migrate` tự động chạy `prisma generate` nên không cần generate riêng.

### Khi muốn xem migration sẽ làm gì TRƯỚC khi apply

```bash
npm run migrate:create -- --name <change_name>   # tạo file SQL mà KHÔNG apply
# Mở prisma/migrations/<ts>_<name>/migration.sql review
npm run migrate:deploy                            # apply nếu OK
```

### Production deploy

```bash
npm run migrate:deploy   # ONLY forward-apply, KHÔNG bao giờ prompt reset
npm run seed             # idempotent — chạy nhiều lần OK
```

### Lệnh nguy hiểm (chỉ dùng khi dev hoàn toàn local + không có data quan trọng)

```bash
npm run db:reset:dangerous   # = prisma migrate reset — DROP toàn bộ DB + reapply migrations
```

## Scripts

| Lệnh | Tác dụng |
|---|---|
| `npm run dev`             | nodemon — hot reload |
| `npm run build`           | Compile TS → `dist/` |
| `npm start`               | Chạy bản build |
| `npm run migrate`         | Tạo migration mới từ schema diff + apply (dev) |
| `npm run migrate:deploy`  | Apply migration đã có (production-safe, không reset) |
| `npm run migrate:status`  | Show migrations applied vs pending |
| `npm run migrate:create`  | Tạo migration file mà không apply (review trước) |
| `npm run seed`            | `prisma db seed` — chạy `prisma/seed.ts` (idempotent UPSERT) |
| `npm run studio`          | Mở Prisma Studio (GUI) |
| `npm run generate`        | Regen Prisma Client thủ công (hiếm khi cần — migrate đã làm) |
| `npm run set-password`    | Đổi password user (CLI) |
| `npm run db:reset:dangerous` | ⚠️ DROP DB + reapply + seed |

## Sửa seed data

[prisma/seed.ts](prisma/seed.ts) chứa seed cho:
- 2 user (admin + staff) — UPSERT theo email, **giữ password đã đổi**
- `store_settings` (id=1) — UPSERT, **giữ admin's edits**
- 8 categories + ~34 dishes + dish_options + values — UPSERT theo slug

Sửa file đó rồi `npm run seed` để apply. Vì là UPSERT, gọi lại nhiều lần an toàn.

## Cấu trúc

```
backend/
├── prisma/
│   └── schema.prisma          # Prisma schema map MySQL
├── src/
│   ├── config/env.ts          # validate env vars bằng zod
│   ├── lib/
│   │   ├── prisma.ts          # PrismaClient singleton + BigInt patch
│   │   ├── jwt.ts             # sign/verify access/refresh/guest tokens
│   │   ├── cookies.ts         # setAuthCookies / clearAuthCookies
│   │   ├── asyncHandler.ts    # forward async errors tới errorHandler
│   │   └── errors.ts          # HttpError + helpers (BadRequest, Unauthorized…)
│   ├── i18n/                  # backend i18n (de + en) — đồng bộ frontend
│   │   ├── locales.ts
│   │   ├── dictionary.ts      # error/email/status/payment strings
│   │   └── index.ts           # middleware, translate(), t()
│   ├── middleware/
│   │   ├── auth.ts            # requireAuth, requireRole
│   │   └── error.ts           # central error handler + 404 (tự translate i18n keys)
│   ├── api/                   # request handlers — business logic + Zod validate
│   │   ├── auth.api.ts        # register, login, logout, refresh, me
│   │   ├── categories.api.ts  # list
│   │   ├── dishes.api.ts      # list, detail
│   │   ├── store.api.ts       # info
│   │   ├── health.api.ts      # status, db
│   │   └── i18n.api.ts        # meta, dict
│   ├── routes/                # wire URL → handler (chỉ routing, không có logic)
│   │   ├── index.ts           # gom router
│   │   ├── health.ts          # GET /api/health, /api/health/db
│   │   ├── auth.ts            # /api/auth/*
│   │   ├── categories.ts      # GET /api/categories
│   │   ├── dishes.ts          # GET /api/dishes, /api/dishes/:slug
│   │   ├── store.ts           # GET /api/store
│   │   └── i18n.ts            # GET /api/i18n, /api/i18n/:locale
│   ├── app.ts                 # Express app factory
│   └── server.ts              # HTTP + Socket.io bootstrap
├── .env.example
├── package.json
└── tsconfig.json
```

### Layering convention

- **`routes/`** — chỉ `router.METHOD('/path', ah(handler))`, không có business logic. Dễ đọc cấu trúc URL của cả app.
- **`api/`** — handler nhận `(req, res)`, parse + validate input (Zod), gọi Prisma, ném `HttpError` khi cần. Đây là nơi đặt logic.
- **`lib/`** — utilities thuần (không biết về Express request lifecycle), dùng được ở mọi nơi.
- **`middleware/`** — chỉ những middleware tái sử dụng đa route.

`ah()` (= `asyncHandler`) wrap mọi async handler để Promise rejection forward sang `errorHandler` — Express 4 không tự bắt async error. Lên Express 5 có thể bỏ.

## API Endpoints (MVP 1 — đã implement)

### Public

| Method | Path | Mô tả |
|---|---|---|
| GET  | `/api/health`        | health check |
| GET  | `/api/health/db`     | check kết nối Prisma → MySQL |
| GET  | `/api/store`         | thông tin cửa hàng + payment methods khả dụng |
| GET  | `/api/categories`    | list categories đang active |
| GET  | `/api/dishes`        | list dishes (`?category=`, `?featured=true`, `?q=`) |
| GET  | `/api/dishes/:slug`  | chi tiết dish kèm options |
| GET  | `/api/i18n`          | locale đã detect + danh sách locale hỗ trợ |
| GET  | `/api/i18n/:locale`  | toàn bộ dictionary server-side cho locale đó |

### Auth

| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/auth/register` | đăng ký customer (email + password) |
| POST | `/api/auth/login`    | đăng nhập, set httpOnly cookies |
| POST | `/api/auth/logout`   | clear cookies |
| POST | `/api/auth/refresh`  | refresh access token |
| GET  | `/api/auth/me`       | thông tin user hiện tại (cần auth) |

### OTP

| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/otp/send`   | gửi mã 6 số qua email (`{ email, purpose: 'register'\|'guest_checkout' }`). Cooldown 60s, max 3 mã / 15 phút / email, IP limit 30 req / 15 phút |
| POST | `/api/otp/verify` | verify mã (`{ email, purpose, code }`). Đúng → mark `consumedAt`, side-effect theo purpose: register → set `users.emailVerifiedAt`, guest_checkout → trả guest token |

## Còn lại (chưa implement)

- Orders (create, list, detail, cancel)
- Address CRUD (customer)
- OTP gửi/verify (Resend)
- Staff endpoints: confirm payment, change status
- Admin endpoints: CRUD menu, store settings, users, promotions
- Socket.io events emit khi đơn đổi trạng thái
- Audit logs

Xem [FEATURES.md](../FEATURES.md) cho roadmap chi tiết.

## i18n

Đồng bộ với frontend: 2 locale **`de`** và **`en`**, default **`de`**.

**Detection order** (cao → thấp):
1. Query `?lang=de`
2. Header `X-Locale: de`
3. Cookie `locale=de`
4. Header `Accept-Language` (tag chính)
5. `DEFAULT_LOCALE`

**Trong route handler** — dùng `req.t()`:
```ts
router.get('/x', (req, res) => {
  res.json({ msg: req.t('order.created', { code: 'SGW-260510-0042' }) })
})
```

**Throw lỗi i18n** — pass key vào `HttpError`, error handler tự translate theo `req.locale`:
```ts
import { Unauthorized } from '@/lib/errors'
throw Unauthorized('auth.invalid_credentials')
// → DE: "E-Mail oder Passwort ist falsch."
// → EN: "Incorrect email or password."
```

**Ngoài request context** (cron, socket, email template):
```ts
import { t, localeFromCountry } from '@/i18n'
const subject = t('en', 'email.order_confirm.subject', { code: 'ABC' })
const userLocale = localeFromCountry(order.addressSnapshot.country)
```

Server-side strings (lỗi, email, status, payment names) đặt ở [src/i18n/dictionary.ts](src/i18n/dictionary.ts).
UI strings nằm ở frontend [../src/i18n/dictionary.ts](../src/i18n/dictionary.ts).
