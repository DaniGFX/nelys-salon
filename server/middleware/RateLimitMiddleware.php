<?php
/**
 * Nely's Salon Management System
 * Rate Limiting Middleware
 * Protects against brute-force attacks, credential stuffing, and spamming.
 */

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/helpers/Response.php';

class RateLimitMiddleware {
    private static bool $schemaChecked = false;

    public static function ensureSchema(): void {
        if (self::$schemaChecked) return;
        self::$schemaChecked = true;
        try {
            $pdo = Database::getConnection();
            $pdo->exec("CREATE TABLE IF NOT EXISTS `rate_limits` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `key_hash` VARCHAR(64) NOT NULL,
                `action` VARCHAR(50) NOT NULL,
                `hits` INT NOT NULL DEFAULT 1,
                `reset_at` INT NOT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY `uk_key_action` (`key_hash`, `action`),
                INDEX `idx_reset_at` (`reset_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // Occasional garbage collection of expired rate limits (1 in 50 requests)
            if (mt_rand(1, 50) === 1) {
                $now = time();
                $pdo->exec("DELETE FROM `rate_limits` WHERE `reset_at` < {$now}");
            }
        } catch (Throwable $e) {
            error_log('RateLimitMiddleware::ensureSchema Notice: ' . $e->getMessage());
        }
    }

    /**
     * Check if the current client request exceeds the rate limit
     *
     * @param string $action Action name (e.g., 'login', 'register', 'booking')
     * @param int $maxAttempts Maximum allowed requests in the window
     * @param int $decaySeconds Duration of the rate window in seconds
     * @param string|null $identifier Optional specific user or email identifier
     */
    public static function check(string $action, int $maxAttempts = 5, int $decaySeconds = 300, ?string $identifier = null): void {
        self::ensureSchema();

        $clientIp = self::getClientIp();
        $keySource = $clientIp . ':' . ($identifier ?? '');
        $keyHash = hash('sha256', $keySource);
        $now = time();

        try {
            $pdo = Database::getConnection();

            // Fetch current record
            $stmt = $pdo->prepare("SELECT * FROM `rate_limits` WHERE `key_hash` = :kh AND `action` = :act LIMIT 1");
            $stmt->execute([':kh' => $keyHash, ':act' => $action]);
            $record = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($record) {
                if ($record['reset_at'] < $now) {
                    // Window expired, reset window
                    $resetAt = $now + $decaySeconds;
                    $upStmt = $pdo->prepare("UPDATE `rate_limits` SET `hits` = 1, `reset_at` = :rst WHERE `id` = :id");
                    $upStmt->execute([':rst' => $resetAt, ':id' => $record['id']]);
                    self::setRateLimitHeaders($maxAttempts, $maxAttempts - 1, $decaySeconds);
                    return;
                }

                if ((int)$record['hits'] >= $maxAttempts) {
                    $retryAfter = max(1, $record['reset_at'] - $now);
                    self::setRateLimitHeaders($maxAttempts, 0, $retryAfter);
                    
                    if (!headers_sent()) {
                        header('Retry-After: ' . $retryAfter);
                    }
                    
                    $minutes = ceil($retryAfter / 60);
                    $timeMsg = $minutes > 1 ? "{$minutes} minutes" : "{$retryAfter} seconds";
                    Response::error("Too many attempts for {$action}. Please wait {$timeMsg} before trying again.", 429, [
                        'retry_after' => $retryAfter
                    ]);
                    exit;
                }

                // Increment hit count
                $upStmt = $pdo->prepare("UPDATE `rate_limits` SET `hits` = `hits` + 1 WHERE `id` = :id");
                $upStmt->execute([':id' => $record['id']]);
                
                $remaining = max(0, $maxAttempts - ((int)$record['hits'] + 1));
                $retryAfter = max(1, $record['reset_at'] - $now);
                self::setRateLimitHeaders($maxAttempts, $remaining, $retryAfter);
            } else {
                // First hit in window
                $resetAt = $now + $decaySeconds;
                $insStmt = $pdo->prepare("INSERT INTO `rate_limits` (`key_hash`, `action`, `hits`, `reset_at`) VALUES (:kh, :act, 1, :rst)");
                $insStmt->execute([':kh' => $keyHash, ':act' => $action, ':rst' => $resetAt]);
                self::setRateLimitHeaders($maxAttempts, $maxAttempts - 1, $decaySeconds);
            }
        } catch (Throwable $e) {
            // If rate limiting storage has a temporary error, log and allow request through
            error_log('RateLimitMiddleware error: ' . $e->getMessage());
        }
    }

    /**
     * Clear rate limit for an action upon successful authentication
     */
    public static function clear(string $action, ?string $identifier = null): void {
        self::ensureSchema();
        $clientIp = self::getClientIp();
        $keySource = $clientIp . ':' . ($identifier ?? '');
        $keyHash = hash('sha256', $keySource);

        try {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("DELETE FROM `rate_limits` WHERE `key_hash` = :kh AND `action` = :act");
            $stmt->execute([':kh' => $keyHash, ':act' => $action]);
        } catch (Throwable $e) {
            error_log('RateLimitMiddleware::clear notice: ' . $e->getMessage());
        }
    }

    public static function getClientIp(): string {
        $ipSources = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'REMOTE_ADDR'
        ];
        foreach ($ipSources as $source) {
            if (!empty($_SERVER[$source])) {
                $ips = explode(',', $_SERVER[$source]);
                $ip = trim($ips[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }
        return '127.0.0.1';
    }

    private static function setRateLimitHeaders(int $limit, int $remaining, int $reset): void {
        if (!headers_sent()) {
            header("X-RateLimit-Limit: {$limit}");
            header("X-RateLimit-Remaining: {$remaining}");
            header("X-RateLimit-Reset: {$reset}");
        }
    }
}
