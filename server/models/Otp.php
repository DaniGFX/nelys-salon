<?php
/**
 * Nely's Salon Management System
 * OTP (One-Time Password) Model
 * Handles cryptographically secure 6-digit verification codes for 2FA / Login via Email & SMS.
 */

require_once dirname(__DIR__) . '/config/database.php';

class Otp {
    private static bool $schemaChecked = false;

    public static function ensureSchema(): void {
        if (self::$schemaChecked) return;
        self::$schemaChecked = true;
        try {
            $pdo = Database::getConnection();
            $pdo->exec("CREATE TABLE IF NOT EXISTS `otps` (
                `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
                `user_id` INT NULL,
                `identifier` VARCHAR(191) NOT NULL,
                `channel` ENUM('email', 'sms') NOT NULL DEFAULT 'email',
                `code_hash` VARCHAR(255) NOT NULL,
                `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
                `max_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 3,
                `expires_at` INT NOT NULL,
                `is_used` TINYINT(1) NOT NULL DEFAULT 0,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_otp_identifier` (`identifier`, `expires_at`),
                INDEX `idx_otp_user` (`user_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // Occasional garbage collection of expired / used OTP records (1 in 30)
            if (mt_rand(1, 30) === 1) {
                $cutoff = time() - 3600; // Older than 1 hour
                $pdo->exec("DELETE FROM `otps` WHERE `expires_at` < {$cutoff} OR `is_used` = 1");
            }
        } catch (Throwable $e) {
            error_log('Otp::ensureSchema Notice: ' . $e->getMessage());
        }
    }

    /**
     * Generate and store a new 6-digit OTP code for an identifier (email or phone)
     * 
     * @param string $identifier Email or phone number
     * @param string $channel 'email' | 'sms'
     * @param int|null $userId Optional User ID
     * @param int $ttlSeconds Time-to-live in seconds (default: 300 = 5 minutes)
     * @return string The raw 6-digit OTP code to be sent via Email/SMS
     */
    public static function generate(string $identifier, string $channel = 'email', ?int $userId = null, int $ttlSeconds = 300): string {
        self::ensureSchema();
        $pdo = Database::getConnection();

        // Invalidate any previous unexpired OTPs for this identifier to prevent replay
        $stmtInvalidate = $pdo->prepare("UPDATE `otps` SET `is_used` = 1 WHERE `identifier` = :ident AND `is_used` = 0");
        $stmtInvalidate->execute([':ident' => $identifier]);

        // Cryptographically secure 6-digit code (100000 - 999999)
        $code = (string)random_int(100000, 999999);
        $codeHash = password_hash($code, PASSWORD_BCRYPT);
        $expiresAt = time() + $ttlSeconds;

        $stmt = $pdo->prepare("
            INSERT INTO `otps` (`user_id`, `identifier`, `channel`, `code_hash`, `attempts`, `max_attempts`, `expires_at`, `is_used`)
            VALUES (:uid, :ident, :channel, :hash, 0, 3, :exp, 0)
        ");
        $stmt->execute([
            ':uid'     => $userId,
            ':ident'   => $identifier,
            ':channel' => $channel === 'sms' ? 'sms' : 'email',
            ':hash'    => $codeHash,
            ':exp'     => $expiresAt,
        ]);

        return $code;
    }

    /**
     * Verify an entered 6-digit OTP code
     * 
     * @param string $identifier Email or phone number
     * @param string $code 6-digit code entered by user
     * @return array ['valid' => bool, 'user_id' => int|null, 'message' => string]
     */
    public static function verify(string $identifier, string $code): array {
        self::ensureSchema();
        $pdo = Database::getConnection();
        $now = time();

        $stmt = $pdo->prepare("
            SELECT * FROM `otps` 
            WHERE `identifier` = :ident AND `is_used` = 0 
            ORDER BY `id` DESC LIMIT 1
        ");
        $stmt->execute([':ident' => $identifier]);
        $otp = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$otp) {
            return [
                'valid'   => false,
                'user_id' => null,
                'message' => 'No active OTP verification code found. Please request a new code.'
            ];
        }

        // Check if expired
        if ((int)$otp['expires_at'] < $now) {
            $pdo->prepare("UPDATE `otps` SET `is_used` = 1 WHERE `id` = :id")->execute([':id' => $otp['id']]);
            return [
                'valid'   => false,
                'user_id' => $otp['user_id'] ? (int)$otp['user_id'] : null,
                'message' => 'Verification code has expired. Please request a new code.'
            ];
        }

        // Check max attempts
        if ((int)$otp['attempts'] >= (int)$otp['max_attempts']) {
            $pdo->prepare("UPDATE `otps` SET `is_used` = 1 WHERE `id` = :id")->execute([':id' => $otp['id']]);
            return [
                'valid'   => false,
                'user_id' => $otp['user_id'] ? (int)$otp['user_id'] : null,
                'message' => 'Too many failed verification attempts. Please request a new code.'
            ];
        }

        // Verify PIN hash
        if (!password_verify($code, $otp['code_hash'])) {
            $newAttempts = (int)$otp['attempts'] + 1;
            $pdo->prepare("UPDATE `otps` SET `attempts` = :att WHERE `id` = :id")->execute([
                ':att' => $newAttempts,
                ':id'  => $otp['id']
            ]);
            $remaining = (int)$otp['max_attempts'] - $newAttempts;
            return [
                'valid'   => false,
                'user_id' => $otp['user_id'] ? (int)$otp['user_id'] : null,
                'message' => "Invalid verification code. {$remaining} attempt(s) remaining."
            ];
        }

        // Mark OTP as used
        $pdo->prepare("UPDATE `otps` SET `is_used` = 1 WHERE `id` = :id")->execute([':id' => $otp['id']]);

        return [
            'valid'   => true,
            'user_id' => $otp['user_id'] ? (int)$otp['user_id'] : null,
            'message' => 'Verification successful.'
        ];
    }
}
