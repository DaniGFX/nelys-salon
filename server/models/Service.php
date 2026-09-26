<?php
/**
 * Nely's Salon Management System
 * Service Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class Service {
    private static bool $schemaChecked = false;

    public static function ensureSchema(): void {
        if (self::$schemaChecked) return;
        self::$schemaChecked = true;
        try {
            $pdo = Database::getConnection();
            $pdo->exec("ALTER TABLE `services` MODIFY COLUMN `price` DECIMAL(10,2) NULL DEFAULT NULL");
        } catch (Throwable $e) {}
    }

    public static function all(bool $activeOnly = false): array {
        self::ensureSchema();
        $pdo = Database::getConnection();
        try {
            $sql = "SELECT * FROM services";
            if ($activeOnly) {
                $sql .= " WHERE is_active = 1";
            }
            $sql .= " ORDER BY id ASC";
            return $pdo->query($sql)->fetchAll();
        } catch (Throwable $e) {
            return [];
        }
    }

    public static function allWithMetrics(): array {
        self::ensureSchema();
        $pdo = Database::getConnection();
        try {
            $sql = "
                SELECT 
                    s.*, 
                    (SELECT COUNT(*) FROM bookings b WHERE b.service_id = s.id) AS total_bookings,
                    (SELECT COUNT(*) FROM bookings b WHERE b.service_id = s.id AND b.status = 'completed') AS completed_bookings
                FROM services s
                ORDER BY s.id ASC
            ";
            return $pdo->query($sql)->fetchAll();
        } catch (Throwable $e) {
            return self::all();
        }
    }

    public static function getSummaryMetrics(): array {
        self::ensureSchema();
        $pdo = Database::getConnection();
        try {
            $total = (int)$pdo->query("SELECT COUNT(*) FROM services")->fetchColumn();
            $active = (int)$pdo->query("SELECT COUNT(*) FROM services WHERE is_active = 1")->fetchColumn();
            $inactive = (int)$pdo->query("SELECT COUNT(*) FROM services WHERE is_active = 0")->fetchColumn();
            
            $categoriesStmt = $pdo->query("SELECT category, COUNT(*) as count FROM services GROUP BY category");
            $categories = $categoriesStmt ? $categoriesStmt->fetchAll() : [];

            return [
                'total' => $total,
                'active' => $active,
                'inactive' => $inactive,
                'categories' => $categories
            ];
        } catch (Throwable $e) {
            return [
                'total' => 0,
                'active' => 0,
                'inactive' => 0,
                'categories' => []
            ];
        }
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

    public static function generateUniqueCode(string $name, ?int $excludeId = null): string {
        $pdo = Database::getConnection();
        $baseCode = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name), '-'));
        if (empty($baseCode)) {
            $baseCode = 'service';
        }
        
        $code = $baseCode;
        $counter = 1;
        while (true) {
            $sql = "SELECT id FROM services WHERE code = :code";
            if ($excludeId !== null) {
                $sql .= " AND id != :excludeId";
            }
            $stmt = $pdo->prepare($sql);
            $params = ['code' => $code];
            if ($excludeId !== null) {
                $params['excludeId'] = $excludeId;
            }
            $stmt->execute($params);
            if (!$stmt->fetch()) {
                return $code;
            }
            $code = $baseCode . '-' . $counter;
            $counter++;
        }
    }

    public static function create(array $data): int {
        $pdo = Database::getConnection();
        
        $code = !empty($data['code']) ? $data['code'] : self::generateUniqueCode($data['name']);
        $price = isset($data['price']) && $data['price'] !== '' && $data['price'] !== null ? (float)$data['price'] : null;
        $duration = isset($data['duration_minutes']) ? (int)$data['duration_minutes'] : 60;
        $isActive = isset($data['is_active']) ? (int)(bool)$data['is_active'] : 1;

        $stmt = $pdo->prepare("
            INSERT INTO services (code, name, category, price, duration_minutes, description, is_active)
            VALUES (:code, :name, :category, :price, :duration, :desc, :active)
        ");
        $stmt->execute([
            'code'      => $code,
            'name'      => $data['name'],
            'category'  => $data['category'],
            'price'     => $price,
            'duration'  => $duration,
            'desc'      => $data['description'] ?? '',
            'active'    => $isActive,
        ]);
        return (int)$pdo->lastInsertId();
    }

    public static function update(int $id, array $data): bool {
        $pdo = Database::getConnection();
        $price = isset($data['price']) && $data['price'] !== '' && $data['price'] !== null ? (float)$data['price'] : null;
        $duration = isset($data['duration_minutes']) ? (int)$data['duration_minutes'] : 60;
        $isActive = isset($data['is_active']) ? (int)(bool)$data['is_active'] : 1;

        $stmt = $pdo->prepare("
            UPDATE services 
            SET name = :name, category = :category, price = :price, 
                duration_minutes = :duration, description = :desc, is_active = :active
            WHERE id = :id
        ");
        return $stmt->execute([
            'name'      => $data['name'],
            'category'  => $data['category'],
            'price'     => $price,
            'duration'  => $duration,
            'desc'      => $data['description'] ?? '',
            'active'    => $isActive,
            'id'        => $id,
        ]);
    }

    public static function toggleActive(int $id): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE services SET is_active = NOT is_active WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    public static function delete(int $id): array {
        $pdo = Database::getConnection();
        
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM bookings WHERE service_id = :id");
        $stmt->execute(['id' => $id]);
        $bookingsCount = (int)$stmt->fetchColumn();

        if ($bookingsCount > 0) {
            return [
                'success' => false,
                'message' => "Cannot permanently delete this service because {$bookingsCount} appointment(s) are linked to it. You can mark it Inactive instead."
            ];
        }

        $stmt = $pdo->prepare("DELETE FROM services WHERE id = :id");
        $deleted = $stmt->execute(['id' => $id]);
        return [
            'success' => $deleted,
            'message' => $deleted ? 'Service deleted successfully.' : 'Failed to delete service.'
        ];
    }
}
