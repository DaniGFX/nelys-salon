<?php
/**
 * Nely's Salon Management System
 * Inventory Movement Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class InventoryMovement {
    public static function findByProduct(int $productId): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT im.*, u.email as user_email
            FROM inventory_movements im
            LEFT JOIN users u ON im.performed_by = u.id
            WHERE im.product_id = :pid
            ORDER BY im.created_at DESC
        ");
        $stmt->execute(['pid' => $productId]);
        return $stmt->fetchAll();
    }

    public static function recent(int $limit = 50): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT im.*, p.name as product_name, p.sku, u.email as user_email
            FROM inventory_movements im
            JOIN products p ON im.product_id = p.id
            LEFT JOIN users u ON im.performed_by = u.id
            ORDER BY im.created_at DESC
            LIMIT :limit
        ");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
