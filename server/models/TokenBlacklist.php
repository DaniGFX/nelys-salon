<?php
/**
 * Nely's Salon Management System
 * Token Blacklist Model
 * Manages revoked authentication tokens to prevent replay attacks after logout.
 */

require_once dirname(__DIR__) . '/config/database.php';

class TokenBlacklist {
    private static bool $schemaChecked = false;

    public static function ensureSchema(): void {
        if (self::$schemaChecked) return;
        self::$schemaChecked = true;
        try {
            $pdo = Database::getConnection();
            $pdo->exec("CREATE TABLE IF NOT EXISTS `token_blacklist` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `token_hash` VARCHAR(64) NOT NULL UNIQUE,
                `user_id` INT NULL,
                `expires_at` INT NOT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_token_hash` (`token_hash`),
                INDEX `idx_expires_at` (`expires_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // Occasional garbage collection of expired tokens (1 in 50)
            if (mt_rand(1, 50) === 1) {
                $now = time();
                $pdo->exec("DELETE FROM `token_blacklist` WHERE `expires_at` < {$now}");
            }
        } catch (Throwable $e) {
            error_log('TokenBlacklist::ensureSchema Notice: ' . $e->getMessage());
        }
    }

    /**
     * Blacklist / revoke a JWT token
     */
    public static function revoke(string $token, ?int $userId = null, int $expiresAt = 0): bool {
        self::ensureSchema();
        if (empty($token)) return false;

        $tokenHash = hash('sha256', $token);
        if ($expiresAt <= 0) {
            $expiresAt = time() + 86400; // Default 24 hours
        }

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("
                INSERT INTO `token_blacklist` (`token_hash`, `user_id`, `expires_at`) 
                VALUES (:th, :uid, :exp)
                ON DUPLICATE KEY UPDATE `expires_at` = VALUES(`expires_at`)
            ");
            return $stmt->execute([
                ':th'  => $tokenHash,
                ':uid' => $userId,
                ':exp' => $expiresAt
            ]);
        } catch (Throwable $e) {
            error_log('TokenBlacklist::revoke Error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if a token is blacklisted / revoked
     */
    public static function isRevoked(string $token): bool {
        self::ensureSchema();
        if (empty($token)) return false;

        $tokenHash = hash('sha256', $token);
        $now = time();

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("SELECT id FROM `token_blacklist` WHERE `token_hash` = :th AND `expires_at` > :now LIMIT 1");
            $stmt->execute([':th' => $tokenHash, ':now' => $now]);
            return (bool)$stmt->fetchColumn();
        } catch (Throwable $e) {
            error_log('TokenBlacklist::isRevoked Error: ' . $e->getMessage());
            return false;
        }
    }
}
