<?php
/**
 * Nely's Salon Management System
 * Database Initialization & Account Setup Script
 *
 * Can be run via CLI: php server/db/setup.php [--force]
 * Or via web: /api/setup
 */

require_once dirname(__DIR__) . '/config/database.php';

if (php_sapi_name() !== 'cli') {
    header('Content-Type: text/plain; charset=utf-8');
}

echo "========================================\n";
echo " Nely's Salon - Database Setup Runner\n";
echo "========================================\n";

try {
    $pdo = Database::getConnection();
    echo "[OK] Connected to database successfully.\n";

    $adminEmail = 'admin@gmail.com';
    $adminPass  = 'Admin123';
    // BCrypt hash for 'Admin123'
    $adminHash  = '$2y$10$08ATlRbtlfhqHL6HA4ywz.yLMFnKw7FQ2jZ6PyOQYdIIdH88USdNS';

    // Check if tables already exist
    $checkStmt = $pdo->query("SHOW TABLES LIKE 'users'");
    $hasUsers = $checkStmt->fetch();

    $force = in_array('--force', $argv ?? []);

    if (!$hasUsers || $force) {
        $schemaFile = __DIR__ . '/schema.sql';
        $seedsFile  = __DIR__ . '/seeds.sql';

        if (!file_exists($schemaFile)) {
            throw new Exception("schema.sql not found at {$schemaFile}");
        }

        echo "[INFO] Reading schema.sql...\n";
        $schemaSql = file_get_contents($schemaFile);

        // Strip CREATE DATABASE and USE statements for cloud MySQL compatibility
        $schemaSql = preg_replace('/^\s*CREATE\s+DATABASE[^;]+;/mi', '', $schemaSql);
        $schemaSql = preg_replace('/^\s*USE\s+[^;]+;/mi', '', $schemaSql);

        echo "[INFO] Executing schema.sql statements...\n";
        $pdo->exec($schemaSql);
        echo "[OK] Tables and constraints created successfully.\n";

        if (file_exists($seedsFile)) {
            echo "[INFO] Reading seeds.sql...\n";
            $seedsSql = file_get_contents($seedsFile);
            $seedsSql = preg_replace('/^\s*USE\s+[^;]+;/mi', '', $seedsSql);

            echo "[INFO] Executing seeds.sql statements...\n";
            $pdo->exec($seedsSql);
            echo "[OK] Initial seed data inserted successfully.\n";
        }
    } else {
        echo "[INFO] Tables already exist in database.\n";
    }

    // Move `role` right after `id` so it appears in the front columns of the table
    try {
        $pdo->exec("ALTER TABLE `users` MODIFY COLUMN `role` ENUM('admin', 'customer') NOT NULL DEFAULT 'customer' AFTER `id`");
        echo "[OK] Reordered `role` column right after `id` (visible at the front).\n";
    } catch (Exception $e) {
        // Ignored if already reordered
    }

    // Ensure notifications table has `category` and `is_read` columns
    try {
        $pdo->exec("ALTER TABLE `notifications` ADD COLUMN `category` VARCHAR(50) DEFAULT 'system' AFTER `title`");
        echo "[OK] Added `category` column to notifications table.\n";
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE `notifications` ADD COLUMN `is_read` TINYINT(1) DEFAULT 0 AFTER `status`");
        echo "[OK] Added `is_read` column to notifications table.\n";
    } catch (Exception $e) {}

    // Ensure customer_profiles table has city, dob, gender, status, notes columns
    try {
        $pdo->exec("ALTER TABLE `customer_profiles` ADD COLUMN `city` VARCHAR(100) DEFAULT 'Quezon City' AFTER `home_address`");
        echo "[OK] Added `city` column to customer_profiles table.\n";
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE `customer_profiles` ADD COLUMN `dob` DATE NULL AFTER `city`");
        echo "[OK] Added `dob` column to customer_profiles table.\n";
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE `customer_profiles` ADD COLUMN `gender` ENUM('Female', 'Male', 'Other') DEFAULT 'Female' AFTER `dob`");
        echo "[OK] Added `gender` column to customer_profiles table.\n";
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE `customer_profiles` ADD COLUMN `status` ENUM('Active', 'Inactive') DEFAULT 'Active' AFTER `gender`");
        echo "[OK] Added `status` column to customer_profiles table.\n";
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE `customer_profiles` ADD COLUMN `notes` TEXT NULL AFTER `status`");
        echo "[OK] Added `notes` column to customer_profiles table.\n";
    } catch (Exception $e) {}

    // Ensure services table allows NULL for price
    try {
        $pdo->exec("ALTER TABLE `services` MODIFY COLUMN `price` DECIMAL(10,2) NULL DEFAULT NULL");
        echo "[OK] Updated services.price column to allow NULL.\n";
    } catch (Exception $e) {}

    // Sync official 13 services and price list
    try {
        $officialServices = [
            ['rebonding', 'Hair Rebonding', 'Hair Services', null, 180, 'Pin-straight permanent thermal rebonding therapy with glossy silk finish (Consultation-based).'],
            ['brazilian', 'Brazilian Treatment', 'Hair Services', 1999.00, 120, 'Transformative keratin smoothing treatment eliminating frizz with mirror-like shine.'],
            ['hair-dye', 'Hair Dye', 'Hair Services', 699.00, 90, 'Full rich dimensional coloration or grey coverage customized to your skin tone.'],
            ['power-dose', 'Power Dose', 'Hair Services', 499.00, 45, 'Instant high-potency restorative ampoule treatment reviving brittle, lifeless ends.'],
            ['cold-wave', 'Cold Wave Perm', 'Hair Services', 699.00, 90, 'Volumizing texture wave or defined bounce curls with lasting curl retention.'],
            ['bonacure', 'Bonacure Repair', 'Hair Services', 499.00, 60, 'Advanced cellular hair repair infusion rebuilding elasticity and keratin bonds.'],
            ['keratine-treatment', 'Keratine Treatment', 'Hair Services', 499.00, 60, 'Intensive protein replacement therapy delivering silky softness and strength.'],
            ['footspa', 'Footspa with Scrub', 'Nail & Foot Care', 199.00, 45, 'Aromatic sea-salt soak, exfoliating callus buffing, and warm soothing massage.'],
            ['manicure', 'Classic Manicure', 'Nail & Foot Care', 149.00, 30, 'Full cuticle grooming, nail shaping, and regular lacquer polish of your choice.'],
            ['pedicure', 'Classic Pedicure', 'Nail & Foot Care', 149.00, 40, 'Rejuvenating foot bath, cut and file grooming, and vibrant color coating.'],
            ['trim', 'Haircut & Trim', 'Hair Services', 149.00, 30, 'Precision aesthetic trim and styling tailored to your face silhouette.'],
            ['gel-manicure', 'Gel Manicure', 'Nail & Foot Care', 499.00, 60, 'Long-lasting chip-free UV LED gel polish with meticulous nail bed preparation.'],
            ['gel-pedicure', 'Gel Pedicure', 'Nail & Foot Care', 499.00, 60, 'Durable high-gloss gel lacquer application with cuticle renewal care.']
        ];

        $svcStmt = $pdo->prepare("
            INSERT INTO `services` (`code`, `name`, `category`, `price`, `duration_minutes`, `description`, `is_active`)
            VALUES (:code, :name, :category, :price, :duration, :description, 1)
            ON DUPLICATE KEY UPDATE
                `name` = VALUES(`name`),
                `category` = VALUES(`category`),
                `price` = VALUES(`price`),
                `duration_minutes` = VALUES(`duration_minutes`),
                `description` = VALUES(`description`),
                `is_active` = 1
        ");

        foreach ($officialServices as $svc) {
            $svcStmt->execute([
                ':code'        => $svc[0],
                ':name'        => $svc[1],
                ':category'    => $svc[2],
                ':price'       => $svc[3],
                ':duration'    => $svc[4],
                ':description' => $svc[5]
            ]);
        }
        echo "[OK] Synced official 13 services and prices.\n";
    } catch (Exception $e) {}

    // Seed sample bookings for today if none exist
    try {
        $todayStr = date('Y-m-d');
        $checkToday = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE booking_date = '$todayStr'")->fetchColumn();
        if ($checkToday === 0) {
            $pdo->exec("
                INSERT INTO `bookings` (`reference_no`, `customer_id`, `service_id`, `staff_id`, `booking_date`, `booking_time`, `visit_type`, `status`, `total_price`, `notes`)
                VALUES 
                ('NS-" . date('Ymd') . "-0101', 2, 1, 1, '$todayStr', '10:00:00', 'salon', 'confirmed', 1999.00, 'Brazilian treatment with consultation'),
                ('NS-" . date('Ymd') . "-0202', 2, 2, 2, '$todayStr', '13:30:00', 'salon', 'pending', 699.00, 'Hair dye ash brown tone'),
                ('NS-" . date('Ymd') . "-0303', 2, 12, 3, '$todayStr', '15:00:00', 'home', 'completed', 499.00, 'Home service gel manicure')
                ON DUPLICATE KEY UPDATE `reference_no` = `reference_no`
            ");
            echo "[OK] Seeded live sample bookings for today ({$todayStr}).\n";
        }
    } catch (Exception $e) {}

    // Always ensure the requested admin credentials and role identifier are synced
    echo "[INFO] Syncing admin account ({$adminEmail})...\n";
    $syncAdmin = $pdo->prepare("
        INSERT INTO `users` (`id`, `email`, `phone`, `password_hash`, `role`)
        VALUES (1, :email, '09171234567', :hash, 'admin')
        ON DUPLICATE KEY UPDATE 
            `email` = :email_update,
            `password_hash` = :hash_update,
            `role` = 'admin'
    ");
    $syncAdmin->execute([
        ':email'        => $adminEmail,
        ':hash'         => $adminHash,
        ':email_update' => $adminEmail,
        ':hash_update'  => $adminHash,
    ]);

    // If an old admin account existed with admin@nelyssalon.com, update it to admin@gmail.com
    $updateOld = $pdo->prepare("UPDATE `users` SET `email` = :email, `password_hash` = :hash, `role` = 'admin' WHERE `email` = 'admin@nelyssalon.com'");
    $updateOld->execute([':email' => $adminEmail, ':hash' => $adminHash]);

    echo "[OK] Account role identifier verified: role = 'admin'\n";

    echo "\n========================================\n";
    echo " Database setup & admin sync complete!\n";
    echo " Admin Account Credentials:\n";
    echo "   Role:     admin (Administrator)\n";
    echo "   Email:    {$adminEmail}\n";
    echo "   Password: {$adminPass}\n";
    echo "\n Customer Account Credentials:\n";
    echo "   Role:     customer (Client Portal)\n";
    echo "   Email:    maria@email.com\n";
    echo "   Password: password123\n";
    echo "========================================\n";

} catch (PDOException $e) {
    echo "\n[ERROR] Database Error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "\n[ERROR] Setup Error: " . $e->getMessage() . "\n";
    exit(1);
}
