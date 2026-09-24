<?php
/**
 * Nely's Salon Management System
 * Business Settings Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class Setting {
    public static function all(): array {
        $pdo = Database::getConnection();
        return $pdo->query("SELECT setting_key, setting_value FROM business_settings")->fetchAll(PDO::FETCH_KEY_PAIR);
    }

    public static function get(string $key, ?string $default = null): ?string {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT setting_value FROM business_settings WHERE setting_key = :k LIMIT 1");
        $stmt->execute(['k' => $key]);
        $val = $stmt->fetchColumn();
        return $val !== false ? $val : $default;
    }

    public static function set(string $key, string $value): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO business_settings (setting_key, setting_value)
            VALUES (:k, :v)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        ");
        return $stmt->execute(['k' => $key, 'v' => $value]);
    }
}
