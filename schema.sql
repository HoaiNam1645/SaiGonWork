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

-- Categories
INSERT INTO categories (slug, name_vi, name_en, display_order) VALUES
  ('com',       'Cơm',         'Rice dishes',  1),
  ('pho-bun',   'Phở & Bún',   'Pho & Noodles', 2),
  ('do-an-vat', 'Đồ ăn vặt',   'Snacks',        3),
  ('do-uong',   'Đồ uống',     'Drinks',        4);

-- Dishes mẫu (giá EUR)
INSERT INTO dishes (category_id, slug, name_vi, name_en, description_vi, price, image_url, is_featured, prep_time_min, spicy_level) VALUES
  (1, 'com-tam-suon',   'Cơm tấm sườn',     'Broken rice with grilled pork', 'Cơm tấm sườn nướng truyền thống Sài Gòn', 12.90, '/menu/com-tam.jpg',     TRUE,  15, 1),
  (1, 'com-ga-xoi-mo',  'Cơm gà xối mỡ',    'Crispy chicken rice',           'Gà chiên giòn ăn kèm cơm',                  13.50, '/menu/com-ga.jpg',      TRUE,  18, 0),
  (2, 'pho-bo',         'Phở bò',           'Beef pho',                      'Phở bò tái nạm',                            11.90, '/menu/pho-bo.jpg',      TRUE,  10, 0),
  (2, 'bun-bo-hue',     'Bún bò Huế',       'Hue spicy beef noodle',         'Bún bò Huế cay nồng',                       12.50, '/menu/bun-bo.jpg',      FALSE, 12, 2),
  (3, 'banh-trang-tron','Bánh tráng trộn',  'Mixed rice paper salad',        'Đặc sản Sài Gòn',                            7.90, '/menu/banh-trang.jpg', FALSE,  8, 1),
  (4, 'tra-da',         'Trà đá',           'Iced tea',                      NULL,                                          2.50, NULL,                   FALSE,  2, 0),
  (4, 'cafe-sua-da',    'Cà phê sữa đá',    'Vietnamese iced coffee',        'Cà phê phin truyền thống',                   4.50, '/menu/cafe.jpg',       TRUE,   5, 0);

-- Options mẫu cho Cơm tấm sườn (price_delta EUR)
INSERT INTO dish_options (dish_id, name_vi, name_en, type, is_required, display_order) VALUES
  (1, 'Phần ăn', 'Portion', 'single', TRUE, 1),
  (1, 'Thêm',    'Extras',  'multi',  FALSE, 2);

INSERT INTO dish_option_values (dish_option_id, label_vi, label_en, price_delta, display_order) VALUES
  (1, 'Thường',     'Regular',       0.00, 1),
  (1, 'Đặc biệt',   'Large',         2.50, 2),
  (2, 'Trứng ốp la','Fried egg',     1.50, 1),
  (2, 'Chả',        'Pork loaf',     2.00, 2),
  (2, 'Bì',         'Shredded skin', 1.00, 3);

-- Promotion mẫu (EUR)
INSERT INTO promotions (code, description, type, value, min_order, ends_at, is_active) VALUES
  ('WELCOME10', 'Giảm 10% đơn đầu tiên',     'percent',   10,    15.00, DATE_ADD(NOW(), INTERVAL 90 DAY), TRUE),
  ('FREESHIP',  'Miễn phí giao hàng',         'free_ship',  0,    20.00, DATE_ADD(NOW(), INTERVAL 30 DAY), TRUE),
  ('SAVE5',     'Giảm 5€ cho đơn từ 30€',     'fixed',      5,    30.00, DATE_ADD(NOW(), INTERVAL 30 DAY), TRUE);
