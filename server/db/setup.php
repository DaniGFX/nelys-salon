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
    $adminPass  = 'admin123';
    // BCrypt hash for 'admin123'
    $adminHash  = '$2y$10$g3IfXvphKzMtGFww.PhwkuMqRJ5fvFSwdIhWeG493jsmxZW5Bsucu';

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
