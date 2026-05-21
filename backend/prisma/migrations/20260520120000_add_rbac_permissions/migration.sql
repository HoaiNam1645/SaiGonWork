-- =====================================================================
-- RBAC: roles, permissions, role_permissions, user_roles
-- =====================================================================

CREATE TABLE `app_roles` (
    `id`          BIGINT       NOT NULL AUTO_INCREMENT,
    `key`         VARCHAR(50)  NOT NULL,
    `name`        VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_system`   BOOLEAN      NOT NULL DEFAULT false,
    `created_at`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`  DATETIME(3)  NOT NULL,

    UNIQUE INDEX `app_roles_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `permissions` (
    `id`            BIGINT       NOT NULL AUTO_INCREMENT,
    `key`           VARCHAR(100) NOT NULL,
    `method`        VARCHAR(10)  NOT NULL,
    `path`          VARCHAR(255) NOT NULL,
    `module`        VARCHAR(50)  NULL,
    `description`   VARCHAR(255) NULL,
    `is_deprecated` BOOLEAN      NOT NULL DEFAULT false,
    `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at`    DATETIME(3)  NOT NULL,

    UNIQUE INDEX `permissions_key_key`(`key`),
    INDEX        `permissions_module_idx`(`module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `role_permissions` (
    `role_id`       BIGINT      NOT NULL,
    `permission_id` BIGINT      NOT NULL,
    `created_at`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_permission_id_idx`(`permission_id`),
    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_role_id_fkey`
  FOREIGN KEY (`role_id`) REFERENCES `app_roles`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_permission_id_fkey`
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `user_roles` (
    `user_id`    BIGINT      NOT NULL,
    `role_id`    BIGINT      NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_roles_role_id_idx`(`role_id`),
    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_role_id_fkey`
  FOREIGN KEY (`role_id`) REFERENCES `app_roles`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
