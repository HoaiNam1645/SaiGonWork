-- =====================================================================
-- Sai Gon Wok — MySQL Schema
-- MySQL 8.0+ · InnoDB · utf8mb4_unicode_ci
-- Usage:
--   mysql -u root -p < schema.sql
-- =====================================================================

DROP DATABASE IF EXISTS saigon_wok;
CREATE DATABASE saigon_wok
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE saigon_wok;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- 1. USERS
-- =====================================================================
CREATE TABLE users (
  id                BIGINT PRIMARY KEY AUTO_INCREMENT,
  email             VARCHAR(191) NOT NULL UNIQUE,
  phone             VARCHAR(20)  NULL,
  password_hash     VARCHAR(255) NULL,
  full_name         VARCHAR(100) NOT NULL,
  role              ENUM('customer','staff','admin') NOT NULL DEFAULT 'customer',
  email_verified_at DATETIME NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at     DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role_active (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 2. ADDRESSES (chỉ cho user đã đăng ký)
-- =====================================================================
CREATE TABLE addresses (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT NOT NULL,
  recipient   VARCHAR(100) NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  line        VARCHAR(255) NOT NULL,
  ward        VARCHAR(100) NULL,
  district    VARCHAR(100) NULL,
  city        VARCHAR(100) NOT NULL,
  country     VARCHAR(2)   NOT NULL DEFAULT 'DE',
  postal_code VARCHAR(20)  NULL,
  lat         DECIMAL(10,7) NULL,
  lng         DECIMAL(10,7) NULL,
  note        VARCHAR(255) NULL,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_default (user_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 3. EMAIL OTP
-- =====================================================================
CREATE TABLE email_otps (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  email        VARCHAR(191) NOT NULL,
  code_hash    VARCHAR(255) NOT NULL,
  purpose      ENUM('guest_checkout','login','register','reset_password') NOT NULL,
  attempts     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5,
  expires_at   DATETIME NOT NULL,
  consumed_at  DATETIME NULL,
  ip_address   VARCHAR(45)  NULL,
  user_agent   VARCHAR(255) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_purpose (email, purpose, expires_at),
  INDEX idx_cleanup (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 4. CATEGORIES
-- =====================================================================
CREATE TABLE categories (
  id             BIGINT PRIMARY KEY AUTO_INCREMENT,
  slug           VARCHAR(100) NOT NULL UNIQUE,
  name_vi        VARCHAR(150) NOT NULL,
  name_en        VARCHAR(150) NULL,
  description_vi TEXT NULL,
  description_en TEXT NULL,
  image_url      VARCHAR(500) NULL,
  display_order  INT NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active_order (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 5. DISHES
-- =====================================================================
CREATE TABLE dishes (
  id             BIGINT PRIMARY KEY AUTO_INCREMENT,
  category_id    BIGINT NOT NULL,
  slug           VARCHAR(150) NOT NULL UNIQUE,
  name_vi        VARCHAR(200) NOT NULL,
  name_en        VARCHAR(200) NULL,
  description_vi TEXT NULL,
  description_en TEXT NULL,
  price          DECIMAL(12,2) NOT NULL,
  currency       VARCHAR(3) NOT NULL DEFAULT 'EUR',
  image_url      VARCHAR(500) NULL,
  is_available   BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,
  prep_time_min  INT NULL,
  calories       INT NULL,
  spicy_level    TINYINT NOT NULL DEFAULT 0,
  display_order  INT NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dish_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_category_avail (category_id, is_available, display_order),
  INDEX idx_featured (is_featured, is_available),
  CONSTRAINT chk_price       CHECK (price >= 0),
  CONSTRAINT chk_spicy_level CHECK (spicy_level BETWEEN 0 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 6. DISH OPTIONS
-- =====================================================================
CREATE TABLE dish_options (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  dish_id       BIGINT NOT NULL,
  name_vi       VARCHAR(100) NOT NULL,
  name_en       VARCHAR(100) NULL,
  type          ENUM('single','multi') NOT NULL DEFAULT 'single',
  is_required   BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_opt_dish FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
  INDEX idx_dish (dish_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dish_option_values (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  dish_option_id  BIGINT NOT NULL,
  label_vi        VARCHAR(100) NOT NULL,
  label_en        VARCHAR(100) NULL,
  price_delta     DECIMAL(10,2) NOT NULL DEFAULT 0,
  display_order   INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_optval_opt FOREIGN KEY (dish_option_id) REFERENCES dish_options(id) ON DELETE CASCADE,
  INDEX idx_option (dish_option_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 7. PROMOTIONS (declare trước ORDERS vì ORDERS có FK tới promotions)
-- =====================================================================
CREATE TABLE promotions (
  id             BIGINT PRIMARY KEY AUTO_INCREMENT,
  code           VARCHAR(50) NOT NULL UNIQUE,
  description    VARCHAR(255) NULL,
  type           ENUM('percent','fixed','free_ship') NOT NULL,
  value          DECIMAL(12,2) NOT NULL,
  min_order      DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_discount   DECIMAL(12,2) NULL,
  starts_at      DATETIME NULL,
  ends_at        DATETIME NULL,
  usage_limit    INT NULL,
  per_user_limit INT NULL,
  used_count     INT NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active_window (is_active, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 8. ORDERS
-- =====================================================================
CREATE TABLE orders (
  id                       BIGINT PRIMARY KEY AUTO_INCREMENT,
  code                     VARCHAR(20) NOT NULL UNIQUE,
  user_id                  BIGINT NULL,

  -- Contact (BẮT BUỘC, kể cả guest)
  contact_name             VARCHAR(100) NOT NULL,
  contact_email            VARCHAR(191) NOT NULL,
  contact_phone            VARCHAR(20)  NOT NULL,
  email_verified_at        DATETIME NULL,

  -- Address snapshot
  address_snapshot         JSON NOT NULL,

  -- Tiền
  subtotal                 DECIMAL(12,2) NOT NULL,
  delivery_fee             DECIMAL(12,2) NOT NULL DEFAULT 0,
  distance_km              DECIMAL(6,2) NULL,
  duration_minutes         INT NULL,
  delivery_fee_breakdown   JSON NULL,
  discount                 DECIMAL(12,2) NOT NULL DEFAULT 0,
  total                    DECIMAL(12,2) NOT NULL,
  currency                 VARCHAR(3) NOT NULL DEFAULT 'EUR',
  promotion_id             BIGINT NULL,
  promotion_code_snapshot  VARCHAR(50) NULL,

  -- Trạng thái
  status                   ENUM('pending_payment','paid','preparing','delivering','completed','cancelled')
                           NOT NULL DEFAULT 'pending_payment',

  -- Thanh toán
  payment_method           ENUM('cash_on_delivery','paypal','bank_qr_image') NOT NULL,
  payment_reference        VARCHAR(100) NULL,
  bank_tx_id               VARCHAR(100) NULL,
  paid_at                  DATETIME NULL,
  paid_confirmed_by        BIGINT NULL,

  -- Khác
  customer_note            VARCHAR(500) NULL,
  cancelled_reason         VARCHAR(255) NULL,
  cancelled_at             DATETIME NULL,
  cancelled_by             BIGINT NULL,
  estimated_ready_at       DATETIME NULL,
  delivered_at             DATETIME NULL,
  scheduled_at             DATETIME NULL,                   -- Khách hẹn giao vào thời điểm cụ thể (NULL = giao ngay)

  created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_order_user        FOREIGN KEY (user_id)           REFERENCES users(id)      ON DELETE SET NULL,
  CONSTRAINT fk_order_paid_by     FOREIGN KEY (paid_confirmed_by) REFERENCES users(id)      ON DELETE SET NULL,
  CONSTRAINT fk_order_cancel_by   FOREIGN KEY (cancelled_by)      REFERENCES users(id)      ON DELETE SET NULL,
  CONSTRAINT fk_order_promo       FOREIGN KEY (promotion_id)      REFERENCES promotions(id) ON DELETE SET NULL,

  INDEX idx_status_created (status, created_at),
  INDEX idx_user_created   (user_id, created_at),
  INDEX idx_email_lookup   (contact_email, created_at),
  INDEX idx_phone_lookup   (contact_phone, created_at),

  CONSTRAINT chk_total    CHECK (total >= 0),
  CONSTRAINT chk_subtotal CHECK (subtotal >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 9. ORDER ITEMS
-- =====================================================================
CREATE TABLE order_items (
  id             BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id       BIGINT NOT NULL,
  dish_id        BIGINT NOT NULL,
  dish_name      VARCHAR(200) NOT NULL,
  dish_image_url VARCHAR(500) NULL,
  unit_price     DECIMAL(12,2) NOT NULL,
  quantity       INT NOT NULL,
  options_json   JSON NULL,
  line_total     DECIMAL(12,2) NOT NULL,
  note           VARCHAR(255) NULL,
  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders(id)  ON DELETE CASCADE,
  CONSTRAINT fk_item_dish  FOREIGN KEY (dish_id)  REFERENCES dishes(id)  ON DELETE RESTRICT,
  INDEX idx_order (order_id),
  CONSTRAINT chk_qty      CHECK (quantity >= 1 AND quantity <= 99),
  CONSTRAINT chk_linetotal CHECK (line_total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 10. ORDER STATUS HISTORY
-- =====================================================================
CREATE TABLE order_status_history (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id    BIGINT NOT NULL,
  from_status VARCHAR(30) NULL,
  to_status   VARCHAR(30) NOT NULL,
  changed_by  BIGINT NULL,
  source      ENUM('customer','staff','admin','system','webhook') NOT NULL DEFAULT 'system',
  note        VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hist_order FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_hist_user  FOREIGN KEY (changed_by) REFERENCES users(id)  ON DELETE SET NULL,
  INDEX idx_order_time (order_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 11. STORE SETTINGS (single row, id=1)
-- =====================================================================
CREATE TABLE store_settings (
  id                     INT PRIMARY KEY DEFAULT 1,
  name                   VARCHAR(150) NOT NULL,
  hotline                VARCHAR(20)  NULL,
  email                  VARCHAR(150) NULL,
  address                VARCHAR(255) NULL,
  lat                    DECIMAL(10,7) NULL,
  lng                    DECIMAL(10,7) NULL,
  open_hours_json        JSON NULL,
  is_open                BOOLEAN NOT NULL DEFAULT TRUE,
  closed_message         VARCHAR(255) NULL,

  -- Thanh toán
  paypal_email           VARCHAR(191) NULL,
  paypal_me_link         VARCHAR(255) NULL,
  bank_qr_image_url      VARCHAR(500) NULL,                -- ảnh QR chụp từ app ngân hàng
  bank_account_name      VARCHAR(100) NULL,                -- hiển thị cùng QR cho khách đối chiếu
  bank_account_no        VARCHAR(50)  NULL,
  bank_name              VARCHAR(100) NULL,                -- "Sparkasse", "N26", ...

  -- Giao hàng
  delivery_radius_km     DECIMAL(5,2)  NOT NULL DEFAULT 15,
  delivery_base_fee      DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_per_km        DECIMAL(10,2) NOT NULL DEFAULT 2.00,
  free_ship_threshold    DECIMAL(10,2) NULL DEFAULT 25.00,
  kitchen_prep_minutes   INT NOT NULL DEFAULT 25,
  routing_provider       VARCHAR(30) NOT NULL DEFAULT 'osrm',

  default_currency       VARCHAR(3) NOT NULL DEFAULT 'EUR',
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 11.5. CARTS — server-side cart cho customer đã login
-- Guest/anonymous vẫn dùng localStorage; khi login merge vào server cart.
-- =====================================================================
CREATE TABLE carts (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id    BIGINT NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cart_items (
  id                   BIGINT PRIMARY KEY AUTO_INCREMENT,
  cart_id              BIGINT NOT NULL,
  dish_id              BIGINT NOT NULL,
  quantity             INT NOT NULL DEFAULT 1,
  options_json         JSON NULL,                       -- canonical: array sorted by (option_id, value_id)
  options_hash         VARCHAR(64) NOT NULL DEFAULT '', -- SHA-1 hex của canonical options_json để dedup
  snapshot_unit_price  DECIMAL(12,2) NOT NULL,          -- giá tại thời điểm add (so sánh với giá live)
  note                 VARCHAR(255) NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_citem_cart FOREIGN KEY (cart_id) REFERENCES carts(id)  ON DELETE CASCADE,
  CONSTRAINT fk_citem_dish FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_cart_dish_options (cart_id, dish_id, options_hash),
  INDEX idx_cart (cart_id),
  CONSTRAINT chk_cart_qty CHECK (quantity >= 1 AND quantity <= 99)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 11.7. NOTIFICATIONS — push thông báo realtime cho staff/admin (và customer
-- trong tương lai). user_id NULL = broadcast cho mọi staff/admin.
-- Per-user read state qua bảng notification_reads để hỗ trợ multi-staff.
-- =====================================================================
CREATE TABLE notifications (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT NULL,
  type        ENUM(
    'order_created',
    'order_status_changed',
    'order_cancelled',
    'payment_received',
    'low_stock',
    'new_customer',
    'system'
  ) NOT NULL,
  metadata    JSON NULL,
  entity_type VARCHAR(50)  NULL,
  entity_id   BIGINT       NULL,
  action_url  VARCHAR(500) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_type_created (type, created_at),
  INDEX idx_entity       (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification_reads (
  notification_id BIGINT NOT NULL,
  user_id         BIGINT NOT NULL,
  read_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id, user_id),
  CONSTRAINT fk_notif_read_notif FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_read_user  FOREIGN KEY (user_id)         REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 12. AUDIT LOGS
-- =====================================================================
CREATE TABLE audit_logs (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_id    BIGINT NULL,
  actor_role  VARCHAR(30) NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50)  NOT NULL,
  entity_id   BIGINT NULL,
  diff_json   JSON NULL,
  ip_address  VARCHAR(45) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_entity (entity_type, entity_id, created_at),
  INDEX idx_actor  (actor_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- SEED DATA
-- =====================================================================

-- Admin gốc (đổi password_hash trước khi chạy production!)
-- Mật khẩu mặc định: "admin123" — bcrypt hash bên dưới chỉ dùng cho dev.
INSERT INTO users (email, phone, password_hash, full_name, role, email_verified_at) VALUES
  ('admin@saigonwok.local', '+4971112345678',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/Gn3LdGOLC',
   'Super Admin', 'admin', NOW()),
  ('staff1@saigonwok.local', '+4971112345679',
   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/Gn3LdGOLC',
   'Nhân viên 1', 'staff', NOW());

-- Store settings
INSERT INTO store_settings (
  id, name, hotline, email, address, lat, lng,
  open_hours_json,
  paypal_email, paypal_me_link, bank_qr_image_url, bank_account_name, bank_account_no, bank_name,
  delivery_radius_km, delivery_base_fee, delivery_per_km, free_ship_threshold,
  kitchen_prep_minutes, routing_provider, default_currency
) VALUES (
  1, 'Sài Gòn Wok', '+4971112345678', 'contact@saigonwok.de',
  'Kanalstraße 10, 70182 Stuttgart', 48.7843000, 9.1928000,
  JSON_OBJECT(
    'mon', JSON_ARRAY('11:00','22:00'),
    'tue', JSON_ARRAY('11:00','22:00'),
    'wed', JSON_ARRAY('11:00','22:00'),
    'thu', JSON_ARRAY('11:00','22:00'),
    'fri', JSON_ARRAY('11:00','23:00'),
    'sat', JSON_ARRAY('12:00','23:00'),
    'sun', JSON_ARRAY('12:00','22:00')
  ),
  'pay@saigonwok.de', 'https://paypal.me/saigonwok',
  '/payment/bank-qr.png', 'Sai Gon Wok GmbH', 'DE89 3704 0044 0532 0130 00', 'Sparkasse',
  15.00, 0.00, 2.00, 25.00,
  25, 'osrm', 'EUR'
);

-- =====================================================================
-- MENU SEED — đồng bộ với src/data/menu.ts (frontend "Our dishes")
-- 8 categories · 34 dishes · 12 dishes có variants (options + values)
-- =====================================================================

-- Categories
INSERT INTO categories (slug, name_vi, name_en, display_order) VALUES
  ('vorspeisen',    'Vorspeisen',    'Starters',       1),
  ('suppen',        'Suppen',        'Soups',          2),
  ('salate',        'Salate',        'Salads',         3),
  ('hauptgerichte', 'Hauptgerichte', 'Main dishes',    4),
  ('wok-gerichte',  'Wok-Gerichte',  'Wok dishes',     5),
  ('reis-nudeln',   'Reis & Nudeln', 'Rice & Noodles', 6),
  ('kinder',        'Kinder Menu',   'Kids menu',      7),
  ('desserts',      'Desserts',      'Desserts',       8);

-- Dishes (German names in name_vi, descriptions in description_vi; English fields NULL — admin sẽ bổ sung)
INSERT INTO dishes (category_id, slug, name_vi, description_vi, price, image_url, is_featured, display_order) VALUES
  -- ────── Vorspeisen ──────
  (1, 'wantan',             'Knusprig gebackene Wan-Tan',  '5 Stk. — Gefüllte Teigtaschen mit süß-sauer Sauce',                                                       4.50,  'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&auto=format&fit=crop&q=75', TRUE,  1),
  (1, 'gyoza',              'Gyoza',                       '5 Stk. — Frittierte Teigtaschen mit Hähnchenfleisch und Gemüsefüllung, mit süß-saurem Dip',              4.50,  'https://images.unsplash.com/photo-1625938144755-652e08e359b7?w=800&auto=format&fit=crop&q=75', FALSE, 2),
  (1, 'gyoza-veggie',       'Gyoza Veggie',                '5 Stk. — Vegetarische Gyoza mit Gemüsefüllung',                                                           4.50,  'https://images.unsplash.com/photo-1625938144755-652e08e359b7?w=800&auto=format&fit=crop&q=75', FALSE, 3),
  (1, 'mini-rollen',        'Mini-Rollen',                 '7 Stk. — Tofu, Karotten, Sojasprossen, Reisnudeln (vegetarisch)',                                         4.50,  'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=800&auto=format&fit=crop&q=75', FALSE, 4),
  (1, 'nem-chay',           'Nem Chay',                    '3 Stk. — Hausgemachte vietnamesische Frühlingsrollen, vegane Füllung mit Glasnudeln, Pilzen, Karotten — süß-sauer Dip', 4.50, 'https://images.unsplash.com/photo-1606471191009-63994c53433b?w=800&auto=format&fit=crop&q=75', FALSE, 5),
  (1, 'edamame',            'Edamame',                     'Grüne Bohnen mit Meersalz',                                                                                 4.50,  'https://images.unsplash.com/photo-1599056504888-fc8d72bf6ec0?w=800&auto=format&fit=crop&q=75', FALSE, 6),
  (1, 'pommes',             'Pommes Frites',               'Knusprige Pommes Frites',                                                                                   4.50,  'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&auto=format&fit=crop&q=75', FALSE, 7),
  (1, 'yakitori',           'Yakitori',                    '2 Stk. — Hähnchen Yakitori, Teriyaki mit Tamarinden Soße',                                                  4.50,  'https://images.unsplash.com/photo-1535473895227-bdecb20fb157?w=800&auto=format&fit=crop&q=75', TRUE,  8),
  (1, 'sommerrollen',       'Sommerrollen mit Salat',      'Reisnudeln, geröstete Schalotten, Gurke, Reispapier mit süß-sauer Soße',                                    4.50,  'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=800&auto=format&fit=crop&q=75', FALSE, 9),
  (1, 'gebratene-garnelen', 'Gebratene Garnelen',          '2 Stk. — Grüne Reisflöckchen, Garnelen, süß-sauer Soße',                                                    6.50,  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&auto=format&fit=crop&q=75', TRUE,  10),
  (1, 'vorspeise-platte',   'Gemischte Vorspeise-Platte',  '2 Sommerrollen · 2 Nem Chay · 2 Gebratene Garnelen · 5 Gyoza · 4 Wan-Tan',                                  15.90, 'https://images.unsplash.com/photo-1547928576-b822bc410bdf?w=800&auto=format&fit=crop&q=75', TRUE,  11),

  -- ────── Suppen ──────
  (2, 'peking-suppe', 'Peking-Suppe',  'Sauer-scharf',                                            4.90, 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&auto=format&fit=crop&q=75', TRUE,  1),
  (2, 'wantan-suppe', 'Wantan Suppe',  '4 Stk. — Hähnchenfleisch, Garnelen, Zucchini, Brokkoli',  4.90, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=75', FALSE, 2),
  (2, 'tom-yum',      'Tom Yum Suppe', 'Tomyum, Zucchini, Brokkoli, Karotten, Champignon',        4.90, 'https://images.unsplash.com/photo-1569059078571-d0a1bd0d6c1e?w=800&auto=format&fit=crop&q=75', TRUE,  3),

  -- ────── Salate ──────
  (3, 'gemischter-salat', 'Gemischter Salat',      NULL, 6.50, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=75', FALSE, 1),
  (3, 'tomatensalat',     'Tomatensalat',          NULL, 6.50, 'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=800&auto=format&fit=crop&q=75', FALSE, 2),
  (3, 'haehnchen-salat',  'Hähnchenfleisch-Salat', NULL, 7.50, 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=800&auto=format&fit=crop&q=75', FALSE, 3),
  (3, 'garnelen-salat',   'Garnelen-Salat',        NULL, 7.50, 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=800&auto=format&fit=crop&q=75', TRUE,  4),

  -- ────── Hauptgerichte ──────
  (4, 'pho',           'Pho',           'Traditionelle 5-Kräuter-Brühe, Reisbandnudel-Suppe mit frischem Koriander, Frühlingszwiebeln und Sojasprossen',          12.00, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=75', TRUE,  1),
  (4, 'pho-xao',       'Pho Xao',       'Gebratene Reisbandnudeln mit Gemüse',                                                                                    12.00, 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800&auto=format&fit=crop&q=75', FALSE, 2),
  (4, 'bun-bo-nam-bo', 'Bun Bo Nam Bo', 'Reisnudeln, Salat, hausgemachte Soße, geröstete Schalotten, Erdnüsse, Gurke, Koriander, Sojasprossen, Rindfleisch',      14.00, 'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=800&auto=format&fit=crop&q=75', TRUE,  3),
  (4, 'bun-vegan',     'Bun Vegan',     'Vegane Frühlingsrollen auf warmen Reisnudeln mit Wildkräuter-Salat, Koriander, gerösteten Zwiebeln, Erdnüssen, Sojasoße', 13.00, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=75', FALSE, 4),
  (4, 'bun-tofu',      'Bun Tofu',      'Im Wok gebratener Bio-Tofu auf warmen Reisnudeln mit Sojasprossen, Karotten, Wildkräuter-Salat, Koriander, Erdnüssen, Sojasoße', 13.00, 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&auto=format&fit=crop&q=75', FALSE, 5),

  -- ────── Wok-Gerichte (cùng 5 variants: Tofu/Hähnchen/Frittiertes 10.90, Ente/Rind 12.90) ──────
  (5, 'thai-curry',   'Thai Curry',                'Gemüse, Chili, Salat, Zitronengras — zu Reis', 10.90, 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&auto=format&fit=crop&q=75', TRUE,  1),
  (5, 'kung-pao',     'Kung Pao Soße',             'Grüne Gemüse, Reis',                            10.90, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=75', FALSE, 2),
  (5, 'suess-sauer',  'Süß-sauer Soße mit Ananas', 'Grüne Gemüse, Reis',                            10.90, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&auto=format&fit=crop&q=75', FALSE, 3),
  (5, 'saigon-sosse', 'Saigon Soße',               'Grüne Gemüse, Reis',                            10.90, 'https://images.unsplash.com/photo-1633237308525-cd587cf71926?w=800&auto=format&fit=crop&q=75', FALSE, 4),

  -- ────── Reis & Nudeln ──────
  (6, 'gebratene-eier-reis', 'Gebratene Eier-Reis Gerichte', 'Gebratener Reis mit Ei, Sojasprossen und Zwiebeln',                              8.90,  'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=75', FALSE, 1),
  (6, 'gebratene-nudeln',    'Gebratene Nudelgerichte',      'Gebratene Nudeln mit Ei, Sojasprossen und Zwiebeln',                             8.90,  'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800&auto=format&fit=crop&q=75', TRUE,  2),
  (6, 'yaki-udon',           'Yaki Udon',                    'Mit Gemüse, Karotten, Sojasprossen, Frühlingszwiebeln, Paprika',                  11.00, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800&auto=format&fit=crop&q=75', FALSE, 3),
  (6, 'bibimbap',            'Bibimbap',                     'Reis, Karotten, Gurken, Zucchini, Sojasprossen, Mais, Erbsen, Sesam, Wakame, Ei', 11.90, 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=800&auto=format&fit=crop&q=75', TRUE,  4),

  -- ────── Kinder Menu ──────
  (7, 'kinder-huehnchen', 'Panierte Hühnerbrustfilet', NULL, 6.90, 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&auto=format&fit=crop&q=75', FALSE, 1),
  (7, 'kinder-reis',      'Gebratene Duftreis',        NULL, 6.90, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=75', FALSE, 2),

  -- ────── Desserts ──────
  (8, 'chuoi-chien', 'Chuối Chiên', 'Gebackene Banane mit Honig und Schokoladensoße', 4.50, 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800&auto=format&fit=crop&q=75', TRUE, 1);

-- =====================================================================
-- Dish options + values cho 12 dishes có variants
-- Mỗi dish: 1 option "Auswahl" (Selection), required, single-choice
-- price_delta = variant_price - dishes.price (base = giá thấp nhất)
-- =====================================================================

-- Sommerrollen — 3 × 4.50
INSERT INTO dish_options (dish_id, name_vi, name_en, type, is_required, display_order)
  SELECT id, 'Auswahl', 'Selection', 'single', TRUE, 1 FROM dishes WHERE slug='sommerrollen';
SET @opt := LAST_INSERT_ID();
INSERT INTO dish_option_values (dish_option_id, label_vi, label_en, price_delta, display_order) VALUES
  (@opt, 'Tofu',            'Tofu',    0.00, 1),
  (@opt, 'Hähnchenfleisch', 'Chicken', 0.00, 2),
  (@opt, 'Garnelen',        'Shrimp',  0.00, 3);

-- Tom Yum — 3 × 4.90
INSERT INTO dish_options (dish_id, name_vi, name_en, type, is_required, display_order)
  SELECT id, 'Auswahl', 'Selection', 'single', TRUE, 1 FROM dishes WHERE slug='tom-yum';
SET @opt := LAST_INSERT_ID();
INSERT INTO dish_option_values (dish_option_id, label_vi, label_en, price_delta, display_order) VALUES
  (@opt, 'Tofu',            'Tofu',    0.00, 1),
  (@opt, 'Hähnchenfleisch', 'Chicken', 0.00, 2),
  (@opt, 'Garnelen',        'Shrimp',  0.00, 3);

-- Pho — Tofu 12 / Hähnchen 13 / Rind 14 (deltas 0/1/2 from base 12.00)
INSERT INTO dish_options (dish_id, name_vi, name_en, type, is_required, display_order)
  SELECT id, 'Auswahl', 'Selection', 'single', TRUE, 1 FROM dishes WHERE slug='pho';
SET @opt := LAST_INSERT_ID();
INSERT INTO dish_option_values (dish_option_id, label_vi, label_en, price_delta, display_order) VALUES
  (@opt, 'Tofu',            'Tofu',    0.00, 1),
  (@opt, 'Hähnchenfleisch', 'Chicken', 1.00, 2),
  (@opt, 'Rindfleisch',     'Beef',    2.00, 3);

-- Pho Xao — same variants as Pho
INSERT INTO dish_options (dish_id, name_vi, name_en, type, is_required, display_order)
  SELECT id, 'Auswahl', 'Selection', 'single', TRUE, 1 FROM dishes WHERE slug='pho-xao';
SET @opt := LAST_INSERT_ID();
INSERT INTO dish_option_values (dish_option_id, label_vi, label_en, price_delta, display_order) VALUES
  (@opt, 'Tofu',            'Tofu',    0.00, 1),
  (@opt, 'Hähnchenfleisch', 'Chicken', 1.00, 2),
  (@opt, 'Rindfleisch',     'Beef',    2.00, 3);

-- Wok dishes (Thai Curry, Kung Pao, Süß-sauer, Saigon) — 5 variants: Tofu/Hähnchen/Frittiertes 10.90, Ente/Rind 12.90
-- (delta 0/0/0/2/2 from base 10.90)

INSERT INTO dish_options (dish_id, name_vi, name_en, type, is_required, display_order)
  SELECT id, 'Auswahl', 'Selection', 'single', TRUE, 1 FROM dishes WHERE slug='thai-curry';
SET @opt := LAST_INSERT_ID();
INSERT INTO dish_option_values (dish_option_id, label_vi, label_en, price_delta, display_order) VALUES
  (@opt, 'Tofu',                       'Tofu',           0.00, 1),
  (@opt, 'Hähnchen',                   'Chicken',        0.00, 2),
  (@opt, 'Frittiertes Hähnchen',       'Fried chicken',  0.00, 3),
  (@opt, 'Knusprig gebratene Ente',    'Crispy duck',    2.00, 4),
  (@opt, 'Gebratenes Rindfleisch',     'Roasted beef',   2.00, 5);

INSERT INTO dish_options (dish_id, name_vi, name_en, type, is_required, display_order)
  SELECT id, 'Auswahl', 'Selection', 'single', TRUE, 1 FROM dishes WHERE slug='kung-pao';
SET @opt := LAST_INSERT_ID();
INSERT INTO dish_option_values (dish_option_id, label_vi, label_en, price_delta, display_order) VALUES
  (@opt, 'Tofu',                       'Tofu',           0.00, 1),
  (@opt, 'Hähnchen',                   'Chicken',        0.00, 2),
  (@opt, 'Frittiertes Hähnchen',       'Fried chicken',  0.00, 3),
  (@opt, 'Knusprig gebratene Ente',    'Crispy duck',    2.00, 4),
  (@opt, 'Gebratenes Rindfleisch',     'Roasted beef',   2.00, 5);

INSERT INTO dish_options (dish_id, name_vi, name_en, type, is_required, display_order)
  SELECT id, 'Auswahl', 'Selection', 'single', TRUE, 1 FROM dishes WHERE slug='suess-sauer';
SET @opt := LAST_INSERT_ID();
INSERT INTO dish_option_values (dish_option_id, label_vi, label_en, price_delta, display_order) VALUES
  (@opt, 'Tofu',                       'Tofu',           0.00, 1),
  (@opt, 'Hähnchen',                   'Chicken',        0.00, 2),
  (@opt, 'Frittiertes Hähnchen',       'Fried chicken',  0.00, 3),
  (@opt, 'Knusprig gebratene Ente',    'Crispy duck',    2.00, 4),
  (@opt, 'Gebratenes Rindfleisch',     'Roasted beef',   2.00, 5);

INSERT INTO dish_options (dish_id, name_vi, name_en, type, is_required, display_order)
  SELECT id, 'Auswahl', 'Selection', 'single', TRUE, 1 FROM dishes WHERE slug='saigon-sosse';
SET @opt := LAST_INSERT_ID();
INSERT INTO dish_option_values (dish_option_id, label_vi, label_en, price_delta, display_order) VALUES
  (@opt, 'Tofu',                       'Tofu',           0.00, 1),
  (@opt, 'Hähnchen',                   'Chicken',        0.00, 2),
  (@opt, 'Frittiertes Hähnchen',       'Fried chicken',  0.00, 3),
  (@opt, 'Knusprig gebratene Ente',    'Crispy duck',    2.00, 4),
  (@opt, 'Gebratenes Rindfleisch',     'Roasted beef',   2.00, 5);

-- Gebratene Eier-Reis / Gebratene Nudeln — 6 variants: Tofu/Gemüse 8.90, Hähnchen/Hühnerbrust 10.90, Ente/Rind 12.90
-- (deltas 0/0/2/2/4/4 from base 8.90)

INSERT INTO dish_options (dish_id, name_vi, name_en, type, is_required, display_order)
  SELECT id, 'Auswahl', 'Selection', 'single', TRUE, 1 FROM dishes WHERE slug='gebratene-eier-reis';
SET @opt := LAST_INSERT_ID();
INSERT INTO dish_option_values (dish_option_id, label_vi, label_en, price_delta, display_order) VALUES
  (@opt, 'Tofu',                    'Tofu',             0.00, 1),
  (@opt, 'Gemüse',                  'Vegetables',       0.00, 2),
  (@opt, 'Hähnchen',                'Chicken',          2.00, 3),
  (@opt, 'Panierte Hühnerbrust',    'Breaded chicken',  2.00, 4),
  (@opt, 'Knusprig Ente',           'Crispy duck',      4.00, 5),
  (@opt, 'Rindfleisch',             'Beef',             4.00, 6);

INSERT INTO dish_options (dish_id, name_vi, name_en, type, is_required, display_order)
  SELECT id, 'Auswahl', 'Selection', 'single', TRUE, 1 FROM dishes WHERE slug='gebratene-nudeln';
SET @opt := LAST_INSERT_ID();
INSERT INTO dish_option_values (dish_option_id, label_vi, label_en, price_delta, display_order) VALUES
  (@opt, 'Tofu',                    'Tofu',             0.00, 1),
  (@opt, 'Gemüse',                  'Vegetables',       0.00, 2),
  (@opt, 'Hähnchen',                'Chicken',          2.00, 3),
  (@opt, 'Panierte Hühnerbrust',    'Breaded chicken',  2.00, 4),
  (@opt, 'Knusprig Ente',           'Crispy duck',      4.00, 5),
  (@opt, 'Rindfleisch',             'Beef',             4.00, 6);

-- Yaki Udon — 6 variants: 11/11/13/13/15/15 (deltas 0/0/2/2/4/4 from base 11.00)
INSERT INTO dish_options (dish_id, name_vi, name_en, type, is_required, display_order)
  SELECT id, 'Auswahl', 'Selection', 'single', TRUE, 1 FROM dishes WHERE slug='yaki-udon';
SET @opt := LAST_INSERT_ID();
INSERT INTO dish_option_values (dish_option_id, label_vi, label_en, price_delta, display_order) VALUES
  (@opt, 'Tofu',                    'Tofu',             0.00, 1),
  (@opt, 'Gemüse',                  'Vegetables',       0.00, 2),
  (@opt, 'Hähnchen',                'Chicken',          2.00, 3),
  (@opt, 'Panierte Hühnerbrust',    'Breaded chicken',  2.00, 4),
  (@opt, 'Knusprig Ente',           'Crispy duck',      4.00, 5),
  (@opt, 'Rindfleisch',             'Beef',             4.00, 6);

-- Bibimbap — 4 variants: Tofu/Hähnchen 11.90, Rind/Garnelen 13.90 (deltas 0/0/2/2 from base 11.90)
INSERT INTO dish_options (dish_id, name_vi, name_en, type, is_required, display_order)
  SELECT id, 'Auswahl', 'Selection', 'single', TRUE, 1 FROM dishes WHERE slug='bibimbap';
SET @opt := LAST_INSERT_ID();
INSERT INTO dish_option_values (dish_option_id, label_vi, label_en, price_delta, display_order) VALUES
  (@opt, 'Tofu',            'Tofu',     0.00, 1),
  (@opt, 'Hähnchen',        'Chicken',  0.00, 2),
  (@opt, 'Rindfleisch',     'Beef',     2.00, 3),
  (@opt, 'Garnelen',        'Shrimp',   2.00, 4);

-- Promotion mẫu (EUR)
INSERT INTO promotions (code, description, type, value, min_order, ends_at, is_active) VALUES
  ('WELCOME10', 'Giảm 10% đơn đầu tiên',     'percent',   10,    15.00, DATE_ADD(NOW(), INTERVAL 90 DAY), TRUE),
  ('FREESHIP',  'Miễn phí giao hàng',         'free_ship',  0,    20.00, DATE_ADD(NOW(), INTERVAL 30 DAY), TRUE),
  ('SAVE5',     'Giảm 5€ cho đơn từ 30€',     'fixed',      5,    30.00, DATE_ADD(NOW(), INTERVAL 30 DAY), TRUE);
