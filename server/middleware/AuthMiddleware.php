<?php
/**
 * Nely's Salon Management System
 * Authentication Middleware
 */

require_once dirname(__DIR__) . '/helpers/Response.php';

class AuthMiddleware {
    public static function check(): array {
        $user = self::checkOptional();
        if ($user) {
            return $user;
        }

        Response::unauthorized('Authentication required to access this resource.');
        exit;
    }

    public static function checkOptional(): ?array {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        // 1. Check PHP Session
        if (!empty($_SESSION['user_id']) && !empty($_SESSION['user_role'])) {
            return [
                'id'    => (int)$_SESSION['user_id'],
                'email' => $_SESSION['user_email'] ?? '',
                'role'  => $_SESSION['user_role'],
            ];
        }

        // 2. Check Authorization Bearer header from all possible sources
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] 
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] 
            ?? '';

        if (empty($authHeader)) {
            $headers = self::getRequestHeaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        if (str_starts_with($authHeader, 'Bearer ')) {
            $token = trim(substr($authHeader, 7));
            $decoded = self::validateToken($token);
            if ($decoded) {
                return $decoded;
            }
        }

        return null;
    }

    private static function validateToken(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        // Verify HMAC-SHA256 signature before trusting payload
        require_once dirname(__DIR__) . '/config/env.php';
        $secret = env('JWT_SECRET');
        if (!$secret) {
            return null; // JWT_SECRET not configured — reject all tokens
        }
        $expectedSig = hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", $secret);
        if (!hash_equals($expectedSig, $parts[2])) {
            return null; // Signature mismatch — token tampered or forged
        }

        // Signature valid — decode payload
        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
        if (!is_array($payload) || empty($payload['uid']) || empty($payload['role'])) {
            return null;
        }

        // Check expiry
        if (!empty($payload['exp']) && $payload['exp'] < time()) {
            return null; // Expired
        }

        return [
            'id'    => (int)$payload['uid'],
            'email' => $payload['email'] ?? '',
            'role'  => $payload['role'],
        ];
    }

    private static function getRequestHeaders(): array {
        if (function_exists('getallheaders')) {
            return getallheaders() ?: [];
        }
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (str_starts_with($name, 'HTTP_')) {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}
