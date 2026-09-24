<?php
/**
 * Nely's Salon Management System
 * Service Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class Service {
    public static function all(bool $activeOnly = true): array {
        $pdo = Database::getConnection();
        $sql = "SELECT * FROM services";
        if ($activeOnly) {
            $sql .= " WHERE is_active = 1";
        }
        $sql .= " ORDER BY category ASC, id ASC";
        return $pdo->query($sql)->fetchAll();
    }

    public static function findById(int $id): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM services WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public static function findByCode(string $code): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM services WHERE code = :code");
        $stmt->execute(['code' => $code]);
        return $stmt->fetch() ?: null;
    }

    public static function create(array $data): int {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO services (code, name, category, price, duration_minutes, description, is_active)
            VALUES (:code, :name, :category, :price, :duration, :desc, :active)
        ");
        $stmt->execute([
            'code'      => $data['code'],
            'name'      => $data['name'],
            'category'  => $data['category'],
            'price'     => $data['price'],
            'duration'  => $data['duration_minutes'] ?? 60,
            'desc'      => $data['description'] ?? '',
            'active'    => $data['is_active'] ?? 1,
        ]);
        return (int)$pdo->lastInsertId();
    }

    public static function update(int $id, array $data): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            UPDATE services 
            SET name = :name, category = :category, price = :price, 
                duration_minutes = :duration, description = :desc, is_active = :active
            WHERE id = :id
        ");
        return $stmt->execute([
            'name'      => $data['name'],
            'category'  => $data['category'],
            'price'     => $data['price'],
            'duration'  => $data['duration_minutes'],
            'desc'      => $data['description'] ?? '',
            'active'    => $data['is_active'] ?? 1,
            'id'        => $id,
        ]);
    }

    public static function toggleActive(int $id): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE services SET is_active = NOT is_active WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }
}
