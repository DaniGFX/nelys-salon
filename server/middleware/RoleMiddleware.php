<?php
/**
 * Nely's Salon Management System
 * Role-Based Access Control Middleware
 */

require_once __DIR__ . '/AuthMiddleware.php';
require_once dirname(__DIR__) . '/helpers/Response.php';

class RoleMiddleware {
    public static function requireRole(string $requiredRole): array {
        $user = AuthMiddleware::check();

        if ($user['role'] !== $requiredRole) {
            Response::forbidden("Access denied. This endpoint requires {$requiredRole} privileges.");
        }

        return $user;
    }

    public static function requireAdmin(): array {
        return self::requireRole('admin');
    }

    public static function requireCustomer(): array {
        return self::requireRole('customer');
    }
}
