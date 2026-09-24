<?php
/**
 * Nely's Salon Management System
 * Notification Dispatch & Queue Service
 */

require_once dirname(__DIR__) . '/config/database.php';

class NotificationService {
    public static function create(int $userId, string $title, string $message, ?int $bookingId = null, string $channel = 'email'): int {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, booking_id, title, message, channel, status)
            VALUES (:user_id, :booking_id, :title, :message, :channel, 'sent')
        ");
        $stmt->execute([
            'user_id'    => $userId,
            'booking_id' => $bookingId,
            'title'      => $title,
            'message'    => $message,
            'channel'    => $channel,
        ]);

        return (int)$pdo->lastInsertId();
    }

    public static function getUserNotifications(int $userId, int $limit = 20): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM notifications WHERE user_id = :uid ORDER BY created_at DESC LIMIT :limit");
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
