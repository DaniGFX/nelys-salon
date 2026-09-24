<?php
/**
 * Nely's Salon Management System
 * Notification Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class Notification {
    public static function findByUser(int $userId): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM notifications WHERE user_id = :uid ORDER BY created_at DESC");
        $stmt->execute(['uid' => $userId]);
        return $stmt->fetchAll();
    }

    public static function all(int $limit = 50): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT n.*, u.email as user_email, cp.full_name as customer_name
            FROM notifications n
            JOIN users u ON n.user_id = u.id
            LEFT JOIN customer_profiles cp ON u.id = cp.user_id
            ORDER BY n.created_at DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public static function updateStatus(int $id, string $status): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE notifications SET status = :status, sent_at = NOW() WHERE id = :id");
        return $stmt->execute(['status' => $status, 'id' => $id]);
    }
}
