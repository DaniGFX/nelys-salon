<?php
/**
 * Nely's Salon Management System
 * Standard JSON API Response Helper
 */

class Response {
    public static function json($data = null, int $statusCode = 200, string $message = ''): void {
        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=utf-8');
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
            header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        }

        $payload = [
            'success'   => $statusCode >= 200 && $statusCode < 300,
            'status'    => ($statusCode >= 200 && $statusCode < 300) ? 'success' : 'error',
            'message'   => $message,
            'data'      => $data,
            'timestamp' => date('c'),
        ];

        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success($data = null, string $message = 'Success', int $statusCode = 200): void {
        self::json($data, $statusCode, $message);
    }

    public static function error(string $message = 'Bad Request', int $statusCode = 400, $errors = null): void {
        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=utf-8');
        }

        $payload = [
            'success'   => false,
            'status'    => 'error',
            'message'   => $message,
            'errors'    => $errors,
            'timestamp' => date('c'),
        ];

        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function unauthorized(string $message = 'Unauthorized'): void {
        self::error($message, 401);
    }

    public static function forbidden(string $message = 'Forbidden'): void {
        self::error($message, 403);
    }

    public static function notFound(string $message = 'Resource not found'): void {
        self::error($message, 404);
    }

    public static function serverError(string $message = 'Internal server error'): void {
        self::error($message, 500);
    }
}
