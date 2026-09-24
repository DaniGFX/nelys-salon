<?php
/**
 * Nely's Salon Management System
 * Inventory & Stock Tracking Service
 */

require_once dirname(__DIR__) . '/config/database.php';

class InventoryService {
    public static function recordMovement(int $productId, string $movementType, int $quantity, ?string $reason = null, ?int $userId = null): bool {
        $pdo = Database::getConnection();
        $pdo->beginTransaction();

        try {
            // 1. Insert Movement Record
            $stmt = $pdo->prepare("
                INSERT INTO inventory_movements (product_id, movement_type, quantity, reason, performed_by)
                VALUES (:product_id, :movement_type, :quantity, :reason, :performed_by)
            ");
            $stmt->execute([
                'product_id'    => $productId,
                'movement_type' => $movementType,
                'quantity'      => $quantity,
                'reason'        => $reason,
                'performed_by'  => $userId,
            ]);

            // 2. Adjust Product Quantity
            $sign = in_array($movementType, ['stock_in', 'adjustment'], true) ? '+' : '-';
            $updateStmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity {$sign} :qty WHERE id = :id");
            $updateStmt->execute(['qty' => $quantity, 'id' => $productId]);

            $pdo->commit();
            return true;
        } catch (Exception $e) {
            $pdo->rollBack();
            return false;
        }
    }

    public static function getLowStockAlerts(): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("SELECT * FROM products WHERE stock_quantity <= min_threshold ORDER BY stock_quantity ASC");
        return $stmt->fetchAll();
    }
}
