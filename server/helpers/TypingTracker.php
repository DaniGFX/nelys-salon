<?php
/**
 * Nely's Salon Management System
 * Ephemeral Typing Indicator Tracker
 */

class TypingTracker {
    private const TTL_SECONDS = 3.5;

    private static function getCacheDir(): string {
        $dir = dirname(__DIR__, 2) . '/storage/cache/typing';
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        return $dir;
    }

    private static function getFilePath(int $userId, string $role): string {
        return self::getCacheDir() . "/typing_{$userId}_{$role}.json";
    }

    /**
     * Update the typing status for a user/role
     */
    public static function setTyping(int $userId, string $role, bool $isTyping): void {
        if ($userId <= 0) return;
        $file = self::getFilePath($userId, $role);

        if (!$isTyping) {
            if (file_exists($file)) {
                @unlink($file);
            }
            return;
        }

        $payload = [
            'is_typing' => true,
            'timestamp' => microtime(true)
        ];
        @file_put_contents($file, json_encode($payload), LOCK_EX);
    }

    /**
     * Check if a specific role is currently typing in the conversation
     */
    public static function isTyping(int $userId, string $role): bool {
        if ($userId <= 0) return false;
        $file = self::getFilePath($userId, $role);

        if (!file_exists($file)) {
            return false;
        }

        $content = @file_get_contents($file);
        if (!$content) return false;

        $data = json_decode($content, true);
        if (!$data || empty($data['is_typing'])) return false;

        $elapsed = microtime(true) - (float)($data['timestamp'] ?? 0);
        if ($elapsed > self::TTL_SECONDS) {
            @unlink($file);
            return false;
        }

        return true;
    }

    /**
     * Get all customer user IDs who are currently typing
     */
    public static function getTypingCustomerIds(): array {
        $dir = self::getCacheDir();
        $files = @glob($dir . '/typing_*_customer.json');
        if (!$files) return [];

        $typingIds = [];
        $now = microtime(true);

        foreach ($files as $file) {
            if (preg_match('/typing_(\d+)_customer\.json$/', $file, $matches)) {
                $content = @file_get_contents($file);
                if ($content) {
                    $data = json_decode($content, true);
                    if (!empty($data['is_typing']) && ($now - (float)($data['timestamp'] ?? 0)) <= self::TTL_SECONDS) {
                        $typingIds[] = (int)$matches[1];
                        continue;
                    }
                }
                @unlink($file);
            }
        }

        return $typingIds;
    }
}
