<?php
/**
 * Nely's Salon Management System
 * Input Sanitizer Helper
 */

class Sanitizer {
    public static function cleanString(?string $value): string {
        if ($value === null) return '';
        $value = trim($value);
        return htmlspecialchars(strip_tags($value), ENT_QUOTES, 'UTF-8');
    }

    public static function cleanEmail(?string $email): string {
        if ($email === null) return '';
        return filter_var(trim($email), FILTER_SANITIZE_EMAIL) ?: '';
    }

    public static function cleanPhone(?string $phone): string {
        if ($phone === null) return '';
        // Keep digits, +, and space
        return preg_replace('/[^\d+ ]/', '', trim($phone));
    }

    public static function cleanArray(array $data): array {
        $cleaned = [];
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $cleaned[$key] = self::cleanArray($value);
            } elseif (is_string($value)) {
                $cleaned[$key] = self::cleanString($value);
            } else {
                $cleaned[$key] = $value;
            }
        }
        return $cleaned;
    }
}
