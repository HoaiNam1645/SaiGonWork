-- Add 'order_lookup' to email_otps.purpose ENUM (guest tra cứu đơn theo email)
ALTER TABLE `email_otps`
  MODIFY COLUMN `purpose` ENUM('guest_checkout','login','register','reset_password','order_lookup') NOT NULL;
