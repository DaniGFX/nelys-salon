<?php
/**
 * Nely's Salon Management System
 * Product Model (Inventory)
 */

require_once dirname(__DIR__) . '/config/database.php';

class Product {
    public static function all(): array {
        $pdo = Database::getConnection();
        return $pdo->query("SELECT * FROM products ORDER BY category ASC, name ASC")->fetchAll();
    }

    public static function findById(int $id): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public static function create(array $data): int {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO products (sku, name, category, stock_quantity, min_threshold, unit, cost_price, selling_price)
            VALUES (:sku, :name, :category, :stock, :min, :unit, :cost, :selling)
        ");
        $stmt->execute([
            'sku'      => $data['sku'],
            'name'     => $data['name'],
            'category' => $data['category'],
            'stock'    => $data['stock_quantity'] ?? 0,
            'min'      => $data['min_threshold'] ?? 5,
            'unit'     => $data['unit'] ?? 'bottle',
            'cost'     => $data['cost_price'] ?? 0.00,
            'selling'  => $data['selling_price'] ?? 0.00,
        ]);
        return (int)$pdo->lastInsertId();
    }

    public static function update(int $id, array $data): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            UPDATE products
            SET name = :name, category = :category, min_threshold = :min,
                unit = :unit, cost_price = :cost, selling_price = :selling
            WHERE id = :id
        ");
        return $stmt->execute([
            'name'    => $data['name'],
            'category'=> $data['category'],
            'min'     => $data['min_threshold'],
            'unit'    => $data['unit'],
            'cost'    => $data['cost_price'],
            'selling' => $data['selling_price'],
            'id'      => $id,
        ]);
    }
}
