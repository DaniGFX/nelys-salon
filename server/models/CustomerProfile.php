<?php
/**
 * Nely's Salon Management System
 * Customer Profile Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class CustomerProfile {
    public static function findByUserId(int $userId): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT cp.*, u.email, u.phone 
            FROM customer_profiles cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.user_id = :uid
        ");
        $stmt->execute(['uid' => $userId]);
        return $stmt->fetch() ?: null;
    }

    public static function create(int $userId, string $fullName, ?string $homeAddress = null): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO customer_profiles (user_id, full_name, home_address)
            VALUES (:uid, :name, :address)
        ");
        return $stmt->execute([
            'uid'     => $userId,
            'name'    => $fullName,
            'address' => $homeAddress,
        ]);
    }

    public static function update(int $userId, array $data): bool {
        $pdo = Database::getConnection();
        $fields = [];
        $params = ['uid' => $userId];

        if (isset($data['full_name'])) {
            $fields[] = "full_name = :full_name";
            $params['full_name'] = $data['full_name'];
        }
        if (isset($data['home_address'])) {
            $fields[] = "home_address = :home_address";
            $params['home_address'] = $data['home_address'];
        }
        if (isset($data['notification_preference'])) {
            $fields[] = "notification_preference = :notif_pref";
            $params['notif_pref'] = $data['notification_preference'];
        }

        if (empty($fields)) return false;

        $sql = "UPDATE customer_profiles SET " . implode(', ', $fields) . " WHERE user_id = :uid";
        $stmt = $pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public static function all(int $limit = 50, int $offset = 0): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT cp.*, u.email, u.phone, u.created_at as member_since,
                   (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id) as total_appointments
            FROM customer_profiles cp
            JOIN users u ON cp.user_id = u.id
            WHERE u.role = 'customer'
            ORDER BY cp.created_at DESC
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
