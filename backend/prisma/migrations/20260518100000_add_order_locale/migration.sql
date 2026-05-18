-- Locale của khách tại thời điểm đặt đơn → dùng cho email status sau này.
ALTER TABLE `orders`
  ADD COLUMN `locale` VARCHAR(2) NOT NULL DEFAULT 'de';
