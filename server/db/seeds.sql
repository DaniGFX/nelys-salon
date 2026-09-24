-- Nely's Salon Management System
-- Initial Seed Data

USE `nelys_salon_db`;

-- 1. Default Users (password is 'password123')
INSERT INTO `users` (`id`, `email`, `phone`, `password_hash`, `role`) VALUES
(1, 'admin@nelyssalon.com', '09171234567', '$2y$10$RsV0QKdMFYQmHQC8su9L..YYEC9Q3L2Y.3pdDymk28EfK4ZWPfSkK', 'admin'),
(2, 'maria@email.com', '09178889999', '$2y$10$RsV0QKdMFYQmHQC8su9L..YYEC9Q3L2Y.3pdDymk28EfK4ZWPfSkK', 'customer')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- 2. Customer Profiles
INSERT INTO `customer_profiles` (`user_id`, `full_name`, `home_address`, `notification_preference`) VALUES
(2, 'Maria Santos', 'Blk 12 Lot 4, Lagro Subd., Quezon City', 'all')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- 3. Staff Members (3 Core Specialists)
INSERT INTO `staff` (`id`, `name`, `role`, `specialties`, `avatar`, `is_active`) VALUES
(1, 'Nely', 'Master Stylist / Director', 'Hair Coloring, Rebonding, Precision Cuts', 'director.jpg', 1),
(2, 'Ana', 'Senior Nail Artist & Stylist', 'Nail Art, Gel Manicure/Pedicure, Hair Treatments', 'sculptor.jpg', 1),
(3, 'Elena', 'Spa & Treatment Specialist', 'Footspa, Deep Conditioning, Keratin Therapy', 'spa-specialist.jpg', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 4. 13 Salon Services
INSERT INTO `services` (`id`, `code`, `name`, `category`, `price`, `duration_minutes`, `description`, `is_active`) VALUES
(1, 'brazilian', 'Brazilian Treatment', 'Hair Services', 1999.00, 120, 'Transformative keratin smoothing treatment eliminating frizz with mirror-like shine.', 1),
(2, 'hair-dye', 'Hair Dye', 'Hair Services', 699.00, 90, 'Full rich dimensional coloration or grey coverage customized to your skin tone.', 1),
(3, 'power-dose', 'Power Dose', 'Hair Services', 499.00, 45, 'Instant high-potency restorative ampoule treatment reviving brittle, lifeless ends.', 1),
(4, 'cold-wave', 'Cold Wave Perm', 'Hair Services', 799.00, 90, 'Volumizing texture wave or defined bounce curls with lasting curl retention.', 1),
(5, 'bonacure', 'Bonacure Repair', 'Hair Services', 899.00, 60, 'Advanced cellular hair repair infusion rebuilding elasticity and keratin bonds.', 1),
(6, 'keratine-treatment', 'Keratine Treatment', 'Hair Services', 499.00, 60, 'Intensive protein replacement therapy delivering silky softness and strength.', 1),
(7, 'trim', 'Haircut & Trim', 'Hair Services', 150.00, 30, 'Precision aesthetic trim and styling tailored to your face silhouette.', 1),
(8, 'rebonding', 'Hair Rebonding', 'Hair Services', 1499.00, 180, 'Pin-straight permanent thermal rebonding therapy with glossy silk finish.', 1),
(9, 'footspa', 'Footspa with Scrub', 'Nail & Foot Care', 350.00, 45, 'Aromatic sea-salt soak, exfoliating callus buffing, and warm soothing massage.', 1),
(10, 'manicure', 'Classic Manicure', 'Nail & Foot Care', 150.00, 30, 'Full cuticle grooming, nail shaping, and regular lacquer polish of your choice.', 1),
(11, 'pedicure', 'Classic Pedicure', 'Nail & Foot Care', 180.00, 40, 'Rejuvenating foot bath, cut and file grooming, and vibrant color coating.', 1),
(12, 'gel-manicure', 'Gel Manicure', 'Nail & Foot Care', 499.00, 60, 'Long-lasting chip-free UV LED gel polish with meticulous nail bed preparation.', 1),
(13, 'gel-pedicure', 'Gel Pedicure', 'Nail & Foot Care', 549.00, 60, 'Durable high-gloss gel lacquer application with cuticle renewal care.', 1)
ON DUPLICATE KEY UPDATE `code` = VALUES(`code`);

-- 5. Business Settings
INSERT INTO `business_settings` (`setting_key`, `setting_value`) VALUES
('salon_name', 'Nely''s Salon'),
('salon_tagline', 'Your Beauty is Our Duty'),
('salon_address', 'BLK 42 Lot 59 Ascension Rd, Lagro, Quezon City'),
('salon_phone', '0917 123 4567'),
('opening_hour', '09:00:00'),
('closing_hour', '20:00:00'),
('operating_days', 'Monday - Sunday'),
('cancellation_cutoff_hours', '24'),
('gcash_account_name', 'Nely''s Salon Atelier'),
('gcash_number', '0917 123 4567'),
('bank_name', 'BDO Unibank'),
('bank_account_name', 'Nely''s Hair & Beauty Salon'),
('bank_account_number', '0012 3456 7890')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- 6. Products Catalog
INSERT INTO `products` (`id`, `sku`, `name`, `category`, `stock_quantity`, `min_threshold`, `unit`, `cost_price`, `selling_price`) VALUES
(1, 'PRD-BRZ-01', 'Keratin Smoothing Complex 1000ml', 'Chemicals', 12, 4, 'bottle', 1200.00, 1999.00),
(2, 'PRD-COL-01', 'Permanent Hair Color - Ash Brown 100ml', 'Hair Color', 24, 6, 'tube', 220.00, 699.00),
(3, 'PRD-GEL-01', 'UV LED Base & Top Gel Coat Duo', 'Nail Care', 18, 5, 'set', 350.00, 550.00),
(4, 'PRD-FSP-01', 'Peppermint Foot Scrub 500g', 'Spa Care', 8, 3, 'jar', 180.00, 350.00)
ON DUPLICATE KEY UPDATE `sku` = VALUES(`sku`);

-- 7. Sample Initial Bookings for Demo
INSERT INTO `bookings` (`id`, `reference_no`, `customer_id`, `service_id`, `staff_id`, `booking_date`, `booking_time`, `visit_type`, `status`, `total_price`) VALUES
(1, 'NS-20260925-0814', 2, 1, 2, '2026-09-25', '10:00:00', 'salon', 'confirmed', 1999.00),
(2, 'NS-20260910-0321', 2, 2, 1, '2026-09-10', '13:30:00', 'home', 'completed', 699.00),
(3, 'NS-20260822-0112', 2, 12, 2, '2026-08-22', '15:00:00', 'salon', 'completed', 499.00)
ON DUPLICATE KEY UPDATE `reference_no` = VALUES(`reference_no`);

-- 8. Sample Payments
INSERT INTO `payments` (`id`, `booking_id`, `amount`, `payment_method`, `reference_number`, `status`, `paid_at`) VALUES
(1, 1, 1999.00, 'gcash', 'GCASH-982347102938', 'paid', '2026-09-23 11:20:00'),
(2, 2, 699.00, 'cash', 'CASH-20260910', 'paid', '2026-09-10 15:00:00'),
(3, 3, 499.00, 'gcash', 'GCASH-881290312389', 'paid', '2026-08-22 16:00:00')
ON DUPLICATE KEY UPDATE `booking_id` = VALUES(`booking_id`);

-- 9. Sample Sales
INSERT INTO `sales` (`id`, `booking_id`, `amount`, `service_name`, `customer_name`, `payment_method`, `transaction_date`) VALUES
(1, 2, 699.00, 'Hair Dye', 'Maria Santos', 'Cash', '2026-09-10'),
(2, 3, 499.00, 'Gel Manicure', 'Maria Santos', 'GCash', '2026-08-22')
ON DUPLICATE KEY UPDATE `booking_id` = VALUES(`booking_id`);
