<?php
/**
 * Nely's Salon Management System
 * Customer Profile Model
 */

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/models/User.php';

class CustomerProfile {
    public static function findByUserId(int $userId): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT cp.*, u.email, u.phone, u.created_at as user_created_at
            FROM customer_profiles cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.user_id = :uid
        ");
        $stmt->execute(['uid' => $userId]);
        return $stmt->fetch() ?: null;
    }

    public static function create(int $userId, string $fullName, ?string $homeAddress = null, ?string $dob = null, ?string $gender = 'Female', ?string $notes = null, ?string $status = 'Active', ?string $city = null): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO customer_profiles (user_id, full_name, home_address, dob, gender, notes, status, city)
            VALUES (:uid, :name, :address, :dob, :gender, :notes, :status, :city)
        ");
        return $stmt->execute([
            'uid'     => $userId,
            'name'    => $fullName,
            'address' => $homeAddress,
            'dob'     => !empty($dob) ? $dob : null,
            'gender'  => !empty($gender) ? $gender : 'Female',
            'notes'   => $notes,
            'status'  => !empty($status) ? $status : 'Active',
            'city'    => $city,
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
        if (isset($data['city'])) {
            $fields[] = "city = :city";
            $params['city'] = $data['city'];
        }
        if (isset($data['dob'])) {
            $fields[] = "dob = :dob";
            $params['dob'] = !empty($data['dob']) ? $data['dob'] : null;
        }
        if (isset($data['gender'])) {
            $fields[] = "gender = :gender";
            $params['gender'] = $data['gender'];
        }
        if (isset($data['notes'])) {
            $fields[] = "notes = :notes";
            $params['notes'] = $data['notes'];
        }
        if (isset($data['status'])) {
            $fields[] = "status = :status";
            $params['status'] = $data['status'];
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

    public static function delete(int $userId): bool {
        $pdo = Database::getConnection();
        // Deleting the user will cascade delete customer_profiles, bookings, payments, notifications
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = :uid AND role = 'customer'");
        return $stmt->execute(['uid' => $userId]);
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

    public static function allWithMetrics(): array {
        $pdo = Database::getConnection();
        $sql = "
            SELECT 
                u.id as user_id,
                u.email,
                u.phone,
                u.created_at as user_created_at,
                cp.id as profile_id,
                COALESCE(cp.full_name, SUBSTRING_INDEX(u.email, '@', 1)) as name,
                cp.home_address,
                COALESCE(cp.city, 'Quezon City') as city,
                cp.dob,
                COALESCE(cp.gender, 'Female') as gender,
                COALESCE(cp.status, 'Active') as status,
                cp.notes,
                (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id) as total_appointments,
                (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id AND b.status = 'completed') as completed_appointments,
                (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id AND b.status IN ('cancelled', 'no_show')) as cancelled_appointments,
                (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id AND b.status IN ('pending', 'confirmed')) as pending_appointments,
                COALESCE((
                    SELECT SUM(total_price) 
                    FROM bookings b 
                    WHERE b.customer_id = u.id AND b.status = 'completed'
                ), 0) as total_spent,
                (
                    SELECT CONCAT(b.booking_date, ' ', b.booking_time)
                    FROM bookings b 
                    WHERE b.customer_id = u.id 
                    ORDER BY b.booking_date DESC, b.booking_time DESC 
                    LIMIT 1
                ) as last_visit_raw
            FROM users u
            LEFT JOIN customer_profiles cp ON u.id = cp.user_id
            WHERE u.role = 'customer'
            ORDER BY u.created_at DESC
        ";
        return $pdo->query($sql)->fetchAll();
    }

    public static function getSummaryMetrics(): array {
        $pdo = Database::getConnection();
        $currentMonthPrefix = date('Y-m');
        $today = date('Y-m-d');

        $total = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();
        $newThisMonth = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer' AND DATE_FORMAT(created_at, '%Y-%m') = '$currentMonthPrefix'")->fetchColumn();
        
        $withUpcoming = (int)$pdo->query("
            SELECT COUNT(DISTINCT customer_id) 
            FROM bookings 
            WHERE status IN ('pending', 'confirmed') AND booking_date >= '$today'
        ")->fetchColumn();

        $returning = (int)$pdo->query("
            SELECT COUNT(*) FROM (
                SELECT customer_id 
                FROM bookings 
                GROUP BY customer_id 
                HAVING COUNT(*) > 1
            ) as rep
        ")->fetchColumn();

        return [
            'total'        => $total,
            'newThisMonth' => $newThisMonth,
            'withUpcoming' => $withUpcoming,
            'returning'    => $returning,
        ];
    }

    public static function findWithHistory(int $userId): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT 
                u.id as user_id,
                u.email,
                u.phone,
                u.created_at as user_created_at,
                cp.id as profile_id,
                COALESCE(cp.full_name, SUBSTRING_INDEX(u.email, '@', 1)) as name,
                cp.home_address,
                COALESCE(cp.city, 'Quezon City') as city,
                cp.dob,
                COALESCE(cp.gender, 'Female') as gender,
                COALESCE(cp.status, 'Active') as status,
                cp.notes,
                (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id) as total_appointments,
                (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id AND b.status = 'completed') as completed_appointments,
                (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id AND b.status IN ('cancelled', 'no_show')) as cancelled_appointments,
                (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id AND b.status IN ('pending', 'confirmed')) as pending_appointments,
                COALESCE((
                    SELECT SUM(total_price) 
                    FROM bookings b 
                    WHERE b.customer_id = u.id AND b.status = 'completed'
                ), 0) as total_spent
            FROM users u
            LEFT JOIN customer_profiles cp ON u.id = cp.user_id
            WHERE u.id = :uid AND u.role = 'customer'
        ");
        $stmt->execute(['uid' => $userId]);
        $customer = $stmt->fetch();
        if (!$customer) return null;

        // Fetch bookings history
        $historyStmt = $pdo->prepare("
            SELECT 
                b.id,
                b.reference_no,
                b.booking_date,
                b.booking_time,
                b.total_price as amount,
                b.status,
                s.name as service_name,
                COALESCE(st.name, 'Unassigned') as staff_name
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            LEFT JOIN staff st ON b.staff_id = st.id
            WHERE b.customer_id = :uid
            ORDER BY b.booking_date DESC, b.booking_time DESC
        ");
        $historyStmt->execute(['uid' => $userId]);
        $customer['history'] = $historyStmt->fetchAll();

        return $customer;
    }
}

