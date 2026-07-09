-- AlterTable
ALTER TABLE `store_settings` ADD COLUMN `delivery_fee_mode` VARCHAR(20) NOT NULL DEFAULT 'per_km',
    ADD COLUMN `delivery_flat_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `free_delivery_radius_km` DECIMAL(5, 2) NOT NULL DEFAULT 0;
