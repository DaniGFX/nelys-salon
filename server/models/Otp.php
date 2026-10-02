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
     * @param int $ttlSeconds Time-to-live in seconds (default: 600 = 10 minutes)
     * @return string The raw 6-digit OTP code to be sent via Email/SMS
     */
    public static function generate(string $identifier, string $channel = 'email', ?int $userId = null, int $ttlSeconds = 600): string {
        self::ensureSchema();
        $pdo = Database::getConnection();

        // Invalidate older OTPs older than 15 minutes to keep active pool clean
        $cutoff = time() - 900;
        $stmtInvalidate = $pdo->prepare("UPDATE `otps` SET `is_used` = 1 WHERE `identifier` = :ident AND `created_at` < FROM_UNIXTIME(:cutoff)");
        $stmtInvalidate->execute([':ident' => $identifier, ':cutoff' => $cutoff]);

        // Cryptographically secure 6-digit code (100000 - 999999)
        $code = (string)random_int(100000, 999999);
        $codeHash = password_hash($code, PASSWORD_BCRYPT);
        $expiresAt = time() + max(600, $ttlSeconds); // Minimum 10 minutes validity

        $stmt = $pdo->prepare("
            INSERT INTO `otps` (`user_id`, `identifier`, `channel`, `code_hash`, `attempts`, `max_attempts`, `expires_at`, `is_used`)
            VALUES (:uid, :ident, :channel, :hash, 0, 5, :exp, 0)
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
     * Verify an entered 6-digit OTP code against all active unexpired codes for this identifier
     * 
     * @param string $identifier Email or phone number
     * @param string $code 6-digit code entered by user
     * @return array ['valid' => bool, 'user_id' => int|null, 'message' => string]
     */
    public static function verify(string $identifier, string $code): array {
        self::ensureSchema();
        $pdo = Database::getConnection();
        $now = time();

        // Retrieve all active unexpired OTP records for this identifier (newest first)
        $stmt = $pdo->prepare("
            SELECT * FROM `otps` 
            WHERE `identifier` = :ident AND `is_used` = 0 AND `expires_at` >= :now
            ORDER BY `id` DESC
        ");
        $stmt->execute([':ident' => $identifier, ':now' => $now]);
        $otps = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($otps)) {
            return [
                'valid'   => false,
                'user_id' => null,
                'message' => 'No active verification code found. Please request a new code.'
            ];
        }

        $matchedOtp = null;
        foreach ($otps as $otp) {
            if ((int)$otp['attempts'] >= (int)$otp['max_attempts']) {
                continue;
            }

            if (password_verify($code, $otp['code_hash'])) {
                $matchedOtp = $otp;
                break;
            }
        }

        if ($matchedOtp) {
            // Mark the matched OTP and all older OTPs for this identifier as used
            $pdo->prepare("UPDATE `otps` SET `is_used` = 1 WHERE `identifier` = :ident AND `id` <= :id")
                ->execute([':ident' => $identifier, ':id' => $matchedOtp['id']]);

            return [
                'valid'   => true,
                'user_id' => $matchedOtp['user_id'] ? (int)$matchedOtp['user_id'] : null,
                'message' => 'Verification successful.'
            ];
        }

        // Increment attempts on the most recent OTP
        $latest = $otps[0];
        $newAttempts = (int)$latest['attempts'] + 1;
        $pdo->prepare("UPDATE `otps` SET `attempts` = :att WHERE `id` = :id")->execute([
            ':att' => $newAttempts,
            ':id'  => $latest['id']
        ]);
        $remaining = max(0, (int)$latest['max_attempts'] - $newAttempts);

        return [
            'valid'   => false,
            'user_id' => $latest['user_id'] ? (int)$latest['user_id'] : null,
            'message' => $remaining > 0 
                ? "Invalid verification code. {$remaining} attempt(s) remaining."
                : "Too many failed attempts. Please request a new code."
        ];
    }
}
