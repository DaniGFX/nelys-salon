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
            
            // Automatically sync/update official 13 services and price list
            $officialServices = [
                ['rebonding', 'Hair Rebonding', 'Hair Services', null, 180, 'Pin-straight permanent thermal rebonding therapy with glossy silk finish (Consultation-based).'],
                ['brazilian', 'Brazilian Treatment', 'Hair Services', 1999.00, 120, 'Transformative keratin smoothing treatment eliminating frizz with mirror-like shine.'],
                ['hair-dye', 'Hair Dye', 'Hair Services', 699.00, 90, 'Full rich dimensional coloration or grey coverage customized to your skin tone.'],
                ['power-dose', 'Power Dose', 'Hair Services', 499.00, 45, 'Instant high-potency restorative ampoule treatment reviving brittle, lifeless ends.'],
                ['cold-wave', 'Cold Wave Perm', 'Hair Services', 699.00, 90, 'Volumizing texture wave or defined bounce curls with lasting curl retention.'],
                ['bonacure', 'Bonacure Repair', 'Hair Services', 499.00, 60, 'Advanced cellular hair repair infusion rebuilding elasticity and keratin bonds.'],
                ['keratine-treatment', 'Keratine Treatment', 'Hair Services', 499.00, 60, 'Intensive protein replacement therapy delivering silky softness and strength.'],
                ['footspa', 'Footspa with Scrub', 'Nail & Foot Care', 199.00, 45, 'Aromatic sea-salt soak, exfoliating callus buffing, and warm soothing massage.'],
                ['manicure', 'Classic Manicure', 'Nail & Foot Care', 149.00, 30, 'Full cuticle grooming, nail shaping, and regular lacquer polish of your choice.'],
                ['pedicure', 'Classic Pedicure', 'Nail & Foot Care', 149.00, 40, 'Rejuvenating foot bath, cut and file grooming, and vibrant color coating.'],
                ['trim', 'Haircut & Trim', 'Hair Services', 149.00, 30, 'Precision aesthetic trim and styling tailored to your face silhouette.'],
                ['gel-manicure', 'Gel Manicure', 'Nail & Foot Care', 499.00, 60, 'Long-lasting chip-free UV LED gel polish with meticulous nail bed preparation.'],
                ['gel-pedicure', 'Gel Pedicure', 'Nail & Foot Care', 499.00, 60, 'Durable high-gloss gel lacquer application with cuticle renewal care.']
            ];

            $svcStmt = $pdo->prepare("
                INSERT INTO `services` (`code`, `name`, `category`, `price`, `duration_minutes`, `description`, `is_active`)
                VALUES (:code, :name, :category, :price, :duration, :description, 1)
                ON DUPLICATE KEY UPDATE
                    `name` = VALUES(`name`),
                    `category` = VALUES(`category`),
                    `price` = VALUES(`price`),
                    `duration_minutes` = VALUES(`duration_minutes`),
                    `description` = VALUES(`description`),
                    `is_active` = 1
            ");

            foreach ($officialServices as $svc) {
                $svcStmt->execute([
                    ':code'        => $svc[0],
                    ':name'        => $svc[1],
                    ':category'    => $svc[2],
                    ':price'       => $svc[3],
                    ':duration'    => $svc[4],
                    ':description' => $svc[5]
                ]);
            }
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
