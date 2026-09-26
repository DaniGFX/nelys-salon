<?php
/**
 * Nely's Salon Management System
 * PDO Database Connection Factory
 */

require_once __DIR__ . '/env.php';

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            // Check for connection URL first (Railway / Heroku style)
            $mysqlUrl = env('MYSQL_URL', env('DATABASE_URL'));

            $host = env('DB_HOST', env('MYSQLHOST', '127.0.0.1'));
            $port = env('DB_PORT', env('MYSQLPORT', '3306'));
            $db   = env('DB_DATABASE', env('MYSQLDATABASE', 'nelys_salon_db'));
            $user = env('DB_USERNAME', env('MYSQLUSER', 'root'));
            $pass = env('DB_PASSWORD', env('MYSQLPASSWORD', ''));

            if (!empty($mysqlUrl)) {
                $parsed = parse_url($mysqlUrl);
                if ($parsed) {
                    $host = $parsed['host'] ?? $host;
                    $port = $parsed['port'] ?? $port;
                    $user = $parsed['user'] ?? $user;
                    $pass = $parsed['pass'] ?? $pass;
                    if (!empty($parsed['path'])) {
                        $db = ltrim($parsed['path'], '/');
                    }
                }
            }

            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_TIMEOUT            => 5,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
                try {
                    self::$instance->exec("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
                } catch (Exception $ignored) {}
            } catch (PDOException $e) {
                error_log('[Nely\'s Salon] DB connection error: ' . $e->getMessage());
                if (php_sapi_name() === 'cli') {
                    throw $e;
                }
                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => false,
                    'message' => 'A database error occurred. Please try again later.'
                ]);
                exit;
            }
        }

        return self::$instance;
    }
}
