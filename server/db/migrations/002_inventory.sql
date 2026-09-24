-- Migration 002: Products, Inventory Movements, and Sales

CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sku` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `min_threshold` INT NOT NULL DEFAULT 5,
  `unit` VARCHAR(30) DEFAULT 'bottle',
  `cost_price` DECIMAL(10,2) DEFAULT 0.00,
  `selling_price` DECIMAL(10,2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory_movements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `movement_type` ENUM('stock_in', 'stock_out', 'damaged', 'adjustment') NOT NULL,
  `quantity` INT NOT NULL,
  `reason` VARCHAR(255) NULL,
  `performed_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_movement_product_m2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_movement_user_m2` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `service_name` VARCHAR(150) NOT NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `transaction_date` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sales_booking_m2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
