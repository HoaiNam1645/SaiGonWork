# Sai Gon Wok — Database Schema

> MySQL 8.0+ · InnoDB · `utf8mb4_unicode_ci`
> Backend: Node.js + Express · Realtime: Socket.io · Frontend: Next.js 16

---

## 1. Tổng quan

Nhà hàng **Sai Gon Wok** đặt tại **Stuttgart, Đức** — phục vụ thị trường Đức, tiền tệ chính **EUR**. Hệ thống có 3 role: `customer`, `staff`, `admin`. Cho phép **guest checkout** (không cần đăng ký tài khoản) nhưng **bắt buộc nhập đầy đủ thông tin liên hệ** ở bước checkout. Email guest được xác minh bằng OTP để chống spam đơn; SĐT bắt buộc nhập nhưng không gửi OTP (do hạn chế gửi SMS quốc tế tới Đức).

### Quy ước

- Tất cả bảng dùng `BIGINT AUTO_INCREMENT` cho khóa chính.
- Timestamp: `created_at`, `updated_at` mặc định `CURRENT_TIMESTAMP`.
- Tiền tệ mặc định **EUR**, `DECIMAL(12,2)` (vẫn đủ cho các tiền tệ khác nếu cần).
- Snapshot dữ liệu (tên món, giá, địa chỉ, công thức ship) tại thời điểm đặt đơn để đơn cũ không bị thay đổi khi admin sửa menu/phí ship.
- Ràng buộc FK luôn khai báo `ON DELETE` tường minh.

### Validation rules áp dụng ở cả frontend và backend

| Field | Rule |
|---|---|
| `email` | RFC 5322, max 191 ký tự, lowercase trước khi lưu |
| `phone` | E.164, ưu tiên DE (`+49...`) — regex `^\+?[0-9]{8,15}$`, bắt buộc khi checkout |
| `full_name` / `recipient` | 2–100 ký tự, trim, không cho phép chuỗi rỗng |
| `address.line` | 5–255 ký tự |
| `address.city` | bắt buộc |
| `address.postal_code` | bắt buộc với DE (5 chữ số) |
| `password` | min 8, có chữ + số (chỉ áp dụng cho user đăng ký) |
| `quantity` | int ≥ 1, ≤ 99 |
| `customer_note` | max 500 ký tự |

---

## 2. Sơ đồ quan hệ (ERD logic)

```
users ─┬─< addresses
       ├─< orders ─┬─< order_items >── dishes >── categories
       │           ├─< order_status_history
       │           └─< email_otps
       └─< (paid_confirmed_by) orders

dishes ─< dish_options ─< dish_option_values

store_settings (single row)
promotions ─── (referenced by orders.promotion_id)
```

---

## 3. Schema SQL

### 3.1 Users & Auth

```sql
CREATE TABLE users (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  email         VARCHAR(191) NOT NULL UNIQUE,
  phone         VARCHAR(20)  NULL,
  password_hash VARCHAR(255) NULL,                      -- NULL = chưa từng đăng ký (chỉ guest), hoặc OAuth-only
  full_name     VARCHAR(100) NOT NULL,
  role          ENUM('customer','staff','admin') NOT NULL DEFAULT 'customer',
  email_verified_at DATETIME NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role_active (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.2 Addresses (chỉ user đã đăng ký)

```sql
CREATE TABLE addresses (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT NOT NULL,
  recipient   VARCHAR(100) NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  line        VARCHAR(255) NOT NULL,
  ward        VARCHAR(100) NULL,
  district    VARCHAR(100) NULL,
  city        VARCHAR(100) NOT NULL,
  country     VARCHAR(2)   NOT NULL DEFAULT 'DE',       -- ISO 3166-1 alpha-2
  postal_code VARCHAR(20)  NULL,
  lat         DECIMAL(10,7) NULL,
  lng         DECIMAL(10,7) NULL,
  note        VARCHAR(255) NULL,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_default (user_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.3 Email OTP (chống spam đơn guest)

```sql
CREATE TABLE email_otps (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  email        VARCHAR(191) NOT NULL,
  code_hash    VARCHAR(255) NOT NULL,                   -- bcrypt/argon2 hash của OTP 6 số
  purpose      ENUM('guest_checkout','login','register','reset_password') NOT NULL,
  attempts     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5,
  expires_at   DATETIME NOT NULL,                       -- TTL 10 phút
  consumed_at  DATETIME NULL,                           -- đã verify thành công thì set, không tái dùng
  ip_address   VARCHAR(45) NULL,
  user_agent   VARCHAR(255) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_purpose (email, purpose, expires_at),
  INDEX idx_cleanup (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **Cleanup job**: cron mỗi giờ `DELETE FROM email_otps WHERE expires_at < NOW() - INTERVAL 1 DAY`.

### 3.4 Categories

```sql
CREATE TABLE categories (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  slug          VARCHAR(100) NOT NULL UNIQUE,
  name_vi       VARCHAR(150) NOT NULL,
  name_en       VARCHAR(150) NULL,
  description_vi TEXT NULL,
  description_en TEXT NULL,
  image_url     VARCHAR(500) NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active_order (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.5 Dishes

```sql
CREATE TABLE dishes (
  id             BIGINT PRIMARY KEY AUTO_INCREMENT,
  category_id    BIGINT NOT NULL,
  slug           VARCHAR(150) NOT NULL UNIQUE,
  name_vi        VARCHAR(200) NOT NULL,
  name_en        VARCHAR(200) NULL,
  description_vi TEXT NULL,
  description_en TEXT NULL,
  price          DECIMAL(12,2) NOT NULL,
  currency       VARCHAR(3) NOT NULL DEFAULT 'EUR',     -- ISO 4217
  image_url      VARCHAR(500) NULL,
  is_available   BOOLEAN NOT NULL DEFAULT TRUE,         -- hết món tạm thời
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,        -- popular dishes
  prep_time_min  INT NULL,                              -- thời gian chế biến ước tính (phút)
  calories       INT NULL,
  spicy_level    TINYINT NOT NULL DEFAULT 0,            -- 0..3
  display_order  INT NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_category_avail (category_id, is_available, display_order),
  INDEX idx_featured (is_featured, is_available),
  CHECK (price >= 0),
  CHECK (spicy_level BETWEEN 0 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.6 Dish options (size, topping…)

```sql
CREATE TABLE dish_options (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  dish_id     BIGINT NOT NULL,
  name_vi     VARCHAR(100) NOT NULL,                    -- "Size", "Topping"
  name_en     VARCHAR(100) NULL,
  type        ENUM('single','multi') NOT NULL DEFAULT 'single',
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
  INDEX idx_dish (dish_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dish_option_values (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  dish_option_id  BIGINT NOT NULL,
  label_vi        VARCHAR(100) NOT NULL,                -- "Lớn", "Thêm trứng"
  label_en        VARCHAR(100) NULL,
  price_delta     DECIMAL(10,2) NOT NULL DEFAULT 0,
  display_order   INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (dish_option_id) REFERENCES dish_options(id) ON DELETE CASCADE,
  INDEX idx_option (dish_option_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.7 Orders

```sql
CREATE TABLE orders (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  code                VARCHAR(20) NOT NULL UNIQUE,      -- "SGW-260510-0042"
  user_id             BIGINT NULL,                      -- NULL nếu guest

  -- Snapshot thông tin liên hệ (BẮT BUỘC điền đủ ở checkout, kể cả guest)
  contact_name        VARCHAR(100) NOT NULL,
  contact_email       VARCHAR(191) NOT NULL,
  contact_phone       VARCHAR(20)  NOT NULL,
  email_verified_at   DATETIME NULL,                    -- set khi OTP guest pass

  -- Địa chỉ giao hàng (snapshot)
  address_snapshot    JSON NOT NULL,
  /* shape:
     {
       "recipient": "Max Mustermann",
       "phone": "+4915112345678",
       "line": "Königstraße 12",
       "city": "Stuttgart",
       "country": "DE",
       "postal_code": "70173",
       "lat": 48.7758,
       "lng": 9.1829,
       "note": "Klingel: Mustermann"
     }

     delivery_fee_breakdown shape (snapshot công thức ship lúc đặt):
     {
       "distance_km": 4.7,
       "duration_minutes": 12,
       "price_per_km": 2.00,
       "free_shipping_threshold": 25.00,
       "free_shipping_applied": false,
       "promo_free_ship": false,
       "kitchen_prep_minutes": 25,
       "estimated_delivery_at": "2026-05-10T14:55:00Z",
       "store_lat": 48.7843,
       "store_lng": 9.1928,
       "routing_provider": "osrm",
       "calculated_at": "2026-05-10T14:23:00Z"
     } */

  -- Tiền
  subtotal            DECIMAL(12,2) NOT NULL,
  delivery_fee        DECIMAL(12,2) NOT NULL DEFAULT 0,
  distance_km         DECIMAL(6,2)  NULL,               -- khoảng cách đường lái xe (OSRM)
  duration_minutes    INT           NULL,               -- thời gian đi xe ước tính (OSRM)
  delivery_fee_breakdown JSON       NULL,               -- snapshot công thức tính ship (xem dưới)
  discount            DECIMAL(12,2) NOT NULL DEFAULT 0,
  total               DECIMAL(12,2) NOT NULL,
  currency            VARCHAR(3) NOT NULL DEFAULT 'EUR',
  promotion_id        BIGINT NULL,
  promotion_code_snapshot VARCHAR(50) NULL,

  -- Trạng thái
  status              ENUM('pending_payment','paid','preparing','delivering','completed','cancelled')
                       NOT NULL DEFAULT 'pending_payment',

  -- Thanh toán (3 phương thức cho thị trường Đức)
  payment_method      ENUM('cash_on_delivery','paypal','bank_qr_image') NOT NULL,
  payment_reference   VARCHAR(100) NULL,                -- nội dung CK kỳ vọng / tx_id PayPal
  bank_tx_id          VARCHAR(100) NULL,                -- mã giao dịch staff nhập khi đối soát
  paid_at             DATETIME NULL,
  paid_confirmed_by   BIGINT NULL,                      -- staff user_id

  -- Khác
  customer_note       VARCHAR(500) NULL,
  cancelled_reason    VARCHAR(255) NULL,
  cancelled_at        DATETIME NULL,
  cancelled_by        BIGINT NULL,                      -- user_id (customer hoặc staff)
  estimated_ready_at  DATETIME NULL,
  delivered_at        DATETIME NULL,

  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id)            REFERENCES users(id)      ON DELETE SET NULL,
  FOREIGN KEY (paid_confirmed_by)  REFERENCES users(id)      ON DELETE SET NULL,
  FOREIGN KEY (cancelled_by)       REFERENCES users(id)      ON DELETE SET NULL,
  FOREIGN KEY (promotion_id)       REFERENCES promotions(id) ON DELETE SET NULL,

  INDEX idx_status_created (status, created_at),
  INDEX idx_user_created   (user_id, created_at),
  INDEX idx_email_lookup   (contact_email, created_at),
  INDEX idx_phone_lookup   (contact_phone, created_at),
  CHECK (total >= 0),
  CHECK (subtotal >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **Sinh `code`**: format `SGW-{YYMMDD}-{seq4}` — `seq4` reset theo ngày, lấy từ counter row hoặc `MAX(id)` cùng ngày.

### 3.8 Order items

```sql
CREATE TABLE order_items (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id      BIGINT NOT NULL,
  dish_id       BIGINT NOT NULL,

  -- Snapshot tại thời điểm đặt
  dish_name     VARCHAR(200) NOT NULL,
  dish_image_url VARCHAR(500) NULL,
  unit_price    DECIMAL(12,2) NOT NULL,
  quantity      INT NOT NULL,
  options_json  JSON NULL,
  /* shape: [
       { "option_name": "Size", "value_label": "Lớn", "price_delta": 10000 },
       { "option_name": "Topping", "value_label": "Thêm trứng", "price_delta": 5000 }
     ] */
  line_total    DECIMAL(12,2) NOT NULL,                 -- (unit_price + sum(price_delta)) * quantity
  note          VARCHAR(255) NULL,

  FOREIGN KEY (order_id) REFERENCES orders(id)  ON DELETE CASCADE,
  FOREIGN KEY (dish_id)  REFERENCES dishes(id)  ON DELETE RESTRICT,
  INDEX idx_order (order_id),
  CHECK (quantity >= 1 AND quantity <= 99),
  CHECK (line_total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.9 Order status history (audit + timeline)

```sql
CREATE TABLE order_status_history (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id    BIGINT NOT NULL,
  from_status VARCHAR(30) NULL,
  to_status   VARCHAR(30) NOT NULL,
  changed_by  BIGINT NULL,                              -- NULL = hệ thống tự động
  source      ENUM('customer','staff','admin','system','webhook') NOT NULL DEFAULT 'system',
  note        VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)  ON DELETE SET NULL,
  INDEX idx_order_time (order_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.10 Promotions

```sql
CREATE TABLE promotions (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  code         VARCHAR(50) NOT NULL UNIQUE,
  description  VARCHAR(255) NULL,
  type         ENUM('percent','fixed','free_ship') NOT NULL,
  value        DECIMAL(12,2) NOT NULL,                  -- percent (0..100) hoặc số tiền
  min_order    DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_discount DECIMAL(12,2) NULL,
  starts_at    DATETIME NULL,
  ends_at      DATETIME NULL,
  usage_limit  INT NULL,                                -- tổng lượt dùng tối đa (NULL = không giới hạn)
  per_user_limit INT NULL,                              -- mỗi user/email được dùng mấy lần
  used_count   INT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active_window (is_active, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.11 Store settings (single row, id=1)

```sql
CREATE TABLE store_settings (
  id                     INT PRIMARY KEY DEFAULT 1,
  name                   VARCHAR(150) NOT NULL,
  hotline                VARCHAR(20)  NULL,
  email                  VARCHAR(150) NULL,
  address                VARCHAR(255) NULL,
  lat                    DECIMAL(10,7) NULL,
  lng                    DECIMAL(10,7) NULL,
  open_hours_json        JSON NULL,
  /* shape: { "mon":["11:00","22:00"], "tue":["11:00","22:00"], ... , "sun":null } */
  is_open                BOOLEAN NOT NULL DEFAULT TRUE,
  closed_message         VARCHAR(255) NULL,

  -- Thanh toán (DE market)
  paypal_email           VARCHAR(191) NULL,             -- email PayPal nhận tiền
  paypal_me_link         VARCHAR(255) NULL,             -- vd https://paypal.me/saigonwok
  bank_qr_image_url      VARCHAR(500) NULL,             -- ảnh QR chụp từ app ngân hàng (admin upload)
  bank_account_name      VARCHAR(100) NULL,             -- "Sai Gon Wok GmbH"
  bank_account_no        VARCHAR(50)  NULL,             -- IBAN: "DE89 3704 0044 0532 0130 00"
  bank_name              VARCHAR(100) NULL,             -- "Sparkasse", "N26"...

  -- Giao hàng (EUR, đường lái xe qua OSRM)
  delivery_radius_km     DECIMAL(5,2)  NOT NULL DEFAULT 15,
  delivery_base_fee      DECIMAL(10,2) NOT NULL DEFAULT 0,       -- Đức: thường 0, chỉ tính per_km
  delivery_per_km        DECIMAL(10,2) NOT NULL DEFAULT 2.00,    -- 2 €/km
  free_ship_threshold    DECIMAL(10,2) NULL DEFAULT 25.00,       -- free ship khi subtotal ≥ 25 €
  kitchen_prep_minutes   INT NOT NULL DEFAULT 25,                -- thời gian chế biến mặc định
  routing_provider       VARCHAR(30) NOT NULL DEFAULT 'osrm',    -- 'osrm' | 'google' | 'mapbox'

  default_currency       VARCHAR(3) NOT NULL DEFAULT 'EUR',
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.12 Audit log (admin actions, optional nhưng khuyến nghị)

```sql
CREATE TABLE audit_logs (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_id    BIGINT NULL,
  actor_role  VARCHAR(30) NULL,
  action      VARCHAR(100) NOT NULL,                    -- "dish.create", "order.confirm_payment"
  entity_type VARCHAR(50)  NOT NULL,                    -- "dish", "order", "user"
  entity_id   BIGINT NULL,
  diff_json   JSON NULL,                                -- { "before": {...}, "after": {...} }
  ip_address  VARCHAR(45) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_entity (entity_type, entity_id, created_at),
  INDEX idx_actor (actor_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. State machine cho `orders.status`

```
pending_payment ──(staff confirm CK)──► paid
pending_payment ──(timeout 30min / customer cancel)──► cancelled

paid ──(staff bắt đầu chế biến)──► preparing
paid ──(staff/admin cancel + refund)──► cancelled

preparing ──(giao cho shipper)──► delivering
delivering ──(shipper xác nhận giao)──► completed
delivering ──(thất bại giao)──► cancelled
```

Mọi chuyển trạng thái → INSERT vào `order_status_history`.

---

## 5. Validation tổng hợp tại checkout

Backend phải reject nếu thiếu **bất kỳ** field nào dưới đây:

```ts
{
  contact_name:  string (2-100),
  contact_email: string (RFC 5322),
  contact_phone: string (E.164 / VN / DE),
  address: {
    recipient: string (2-100),
    phone:     string (E.164),
    line:      string (5-255),
    city:      string (required),
    country:   'VN' | 'DE' | ...,
    // ward, district, postal_code, lat, lng, note: optional
  },
  items: Array<{ dish_id, quantity (1-99), options? }> (length >= 1),
  payment_method: 'vietqr' | 'sepa_qr' | 'cash_on_delivery' | 'stripe',
  // guest only:
  otp_code: string (6 digits, required nếu user_id == null)
}
```

Backend tính lại `subtotal`, `delivery_fee`, `discount`, `total` từ DB — **không tin frontend**.

---

## 6. Indexes & performance notes

- `orders(status, created_at)` — staff dashboard query "đơn pending hôm nay"
- `orders(contact_email, created_at)` & `orders(contact_phone, created_at)` — guest tra cứu đơn
- `dishes(category_id, is_available, display_order)` — render menu nhanh
- `email_otps(expires_at)` — cleanup job
- JSON fields (`address_snapshot`, `options_json`, `open_hours_json`): nếu cần query bên trong → tạo generated column + index, còn không thì để nguyên.

---

## 7. Seed data tối thiểu

```sql
-- Admin gốc
INSERT INTO users (email, full_name, password_hash, role, email_verified_at)
VALUES ('admin@saigonwok.local', 'Super Admin', '$2b$12$...', 'admin', NOW());

-- Store settings (Stuttgart, EUR)
INSERT INTO store_settings (id, name, hotline, address, lat, lng, default_currency,
  delivery_radius_km, delivery_per_km, free_ship_threshold, kitchen_prep_minutes)
VALUES (1, 'Sài Gòn Wok', '+4971112345678', 'Kanalstraße 10, 70182 Stuttgart',
  48.7843, 9.1928, 'EUR', 15.00, 2.00, 25.00, 25);

-- Categories mẫu
INSERT INTO categories (slug, name_vi, name_en, display_order) VALUES
  ('com',     'Cơm',           'Rice dishes',  1),
  ('pho',     'Phở & Bún',     'Pho & Noodles', 2),
  ('do-an-vat','Đồ ăn vặt',    'Snacks',        3),
  ('do-uong', 'Đồ uống',       'Drinks',        4);
```

> File [schema.sql](schema.sql) đã có seed data đầy đủ kèm dishes mẫu giá EUR và promotion.

---

## 8. Migration strategy

- Dùng `mysql2` + một trong: **Knex.js migrations**, **Prisma migrate**, hoặc **TypeORM**.
- Đề xuất: **Prisma** — schema-first, type-safe cho cả Express backend lẫn Next.js (nếu sau này muốn share types).
- Mỗi migration là 1 file timestamped, không sửa migration đã chạy production.

---

## 9. Backup & retention

- Daily `mysqldump` toàn DB, giữ 30 ngày.
- `email_otps`: cleanup mỗi giờ (đã nói ở 3.3).
- `audit_logs`: archive sau 1 năm.
- `orders` không bao giờ xóa cứng — chỉ chuyển `status='cancelled'`.
