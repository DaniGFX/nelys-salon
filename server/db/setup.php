<?php
/**
 * Nely's Salon Management System
 * Database Initialization & Migration Script
 *
 * Can be run via CLI: php server/db/setup.php [--force]
 */

require_once dirname(__DIR__) . '/config/database.php';

echo "========================================\n";
echo " Nely's Salon - Database Setup Runner\n";
echo "========================================\n";

try {
    $pdo = Database::getConnection();
    echo "[OK] Connected to database successfully.\n";

    // Check if tables already exist
    $checkStmt = $pdo->query("SHOW TABLES LIKE 'users'");
    $hasUsers = $checkStmt->fetch();

    $force = in_array('--force', $argv ?? []);

    if ($hasUsers && !$force) {
        echo "[INFO] Tables already exist. Database is initialized and ready.\n";
        echo "       (Pass --force to drop and re-import schema & seed data).\n";
        exit(0);
    }

    $schemaFile = __DIR__ . '/schema.sql';
    $seedsFile  = __DIR__ . '/seeds.sql';

    if (!file_exists($schemaFile)) {
        throw new Exception("schema.sql not found at {$schemaFile}");
    }

    echo "[INFO] Reading schema.sql...\n";
    $schemaSql = file_get_contents($schemaFile);

    // Strip CREATE DATABASE and USE statements to ensure compatibility with cloud MySQL DBs (e.g., Railway 'railway' db)
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

    echo "\n========================================\n";
    echo " Database setup completed successfully!\n";
    echo " Default Admin Account:\n";
    echo "   Email:    admin@nelyssalon.com\n";
    echo "   Password: password123\n";
    echo "========================================\n";

} catch (PDOException $e) {
    echo "\n[ERROR] Database Error: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "\n[ERROR] Setup Error: " . $e->getMessage() . "\n";
    exit(1);
}
