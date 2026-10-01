<?php
/**
 * Nely's Salon Management System
 * Customer Profile Model
 */

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/models/User.php';

class CustomerProfile {
    private static bool $schemaChecked = false;

    public static function ensureSchema(): void {
        if (self::$schemaChecked) return;
        self::$schemaChecked = true;
        try {
            $pdo = Database::getConnection();
            $existingCols = $pdo->query("SHOW COLUMNS FROM `customer_profiles`")->fetchAll(PDO::FETCH_COLUMN);
            if (!in_array('city', $existingCols)) {
                $pdo->exec("ALTER TABLE `customer_profiles` ADD COLUMN `city` VARCHAR(100) DEFAULT 'Quezon City' AFTER `home_address`");
            }
            if (!in_array('dob', $existingCols)) {
                $pdo->exec("ALTER TABLE `customer_profiles` ADD COLUMN `dob` DATE NULL AFTER `city`");
            }
            if (!in_array('gender', $existingCols)) {
                $pdo->exec("ALTER TABLE `customer_profiles` ADD COLUMN `gender` ENUM('Female', 'Male', 'Other') DEFAULT 'Female' AFTER `dob`");
            }
            if (!in_array('status', $existingCols)) {
                $pdo->exec("ALTER TABLE `customer_profiles` ADD COLUMN `status` ENUM('Active', 'Inactive') DEFAULT 'Active' AFTER `gender`");
            }
            if (!in_array('notes', $existingCols)) {
                $pdo->exec("ALTER TABLE `customer_profiles` ADD COLUMN `notes` TEXT NULL AFTER `status`");
            }
        } catch (Throwable $e) {
            // Log/ignore silently if database user lacks ALTER permissions
        }
    }

    public static function findByUserId(int $userId): ?array {
        self::ensureSchema();
        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare("
                SELECT cp.*, u.email, u.phone, u.created_at as user_created_at
                FROM customer_profiles cp
                JOIN users u ON cp.user_id = u.id
                WHERE cp.user_id = :uid
            ");
            $stmt->execute(['uid' => $userId]);
            $res = $stmt->fetch();
            return $res ?: null;
        } catch (Throwable $e) {
            // Fallback for minimal user query
            $stmt = $pdo->prepare("SELECT id as user_id, email, phone, created_at as user_created_at FROM users WHERE id = :uid");
            $stmt->execute(['uid' => $userId]);
            $user = $stmt->fetch();
            if (!$user) return null;
            return [
                'user_id' => $user['id'],
                'full_name' => explode('@', $user['email'])[0] ?? 'Customer',
                'home_address' => '',
                'city' => 'Quezon City',
                'dob' => null,
                'gender' => 'Female',
                'status' => 'Active',
                'notes' => null,
                'email' => $user['email'],
                'phone' => $user['phone'],
                'user_created_at' => $user['user_created_at']
            ];
        }
    }

    public static function create(int $userId, string $fullName, ?string $homeAddress = null, ?string $dob = null, ?string $gender = 'Female', ?string $notes = null, ?string $status = 'Active', ?string $city = null): bool {
        self::ensureSchema();
        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare("
                INSERT INTO customer_profiles (user_id, full_name, home_address, dob, gender, notes, status, city)
                VALUES (:uid, :name, :address, :dob, :gender, :notes, :status, :city)
                ON DUPLICATE KEY UPDATE
                    full_name = VALUES(full_name),
                    home_address = VALUES(home_address),
                    city = VALUES(city),
                    dob = VALUES(dob),
                    gender = VALUES(gender),
                    notes = VALUES(notes),
                    status = VALUES(status)
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
        } catch (Throwable $e) {
            // Fallback for minimal schema
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO customer_profiles (user_id, full_name, home_address)
                    VALUES (:uid, :name, :address)
                    ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), home_address = VALUES(home_address)
                ");
                return $stmt->execute([
                    'uid'     => $userId,
                    'name'    => $fullName,
                    'address' => $homeAddress,
                ]);
            } catch (Throwable $e2) {
                return false;
            }
        }
    }

    public static function update(int $userId, array $data): bool {
        self::ensureSchema();
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

        try {
            $sql = "UPDATE customer_profiles SET " . implode(', ', $fields) . " WHERE user_id = :uid";
            $stmt = $pdo->prepare($sql);
            return $stmt->execute($params);
        } catch (Throwable $e) {
            // Fallback for minimal fields
            if (isset($data['full_name'])) {
                $stmt = $pdo->prepare("UPDATE customer_profiles SET full_name = :full_name WHERE user_id = :uid");
                return $stmt->execute(['full_name' => $data['full_name'], 'uid' => $userId]);
            }
            return false;
        }
    }

    public static function delete(int $userId): bool {
        $pdo = Database::getConnection();
        // Deleting the user will cascade delete customer_profiles, bookings, payments, notifications
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = :uid AND role = 'customer'");
        return $stmt->execute(['uid' => $userId]);
    }

    public static function all(int $limit = 50, int $offset = 0): array {
        self::ensureSchema();
        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->prepare("
                SELECT cp.*, u.email, u.phone, u.created_at as member_since,
                       (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id) as total_appointments
                FROM users u
                LEFT JOIN customer_profiles cp ON cp.user_id = u.id
                WHERE u.role = 'customer'
                ORDER BY u.created_at DESC
                LIMIT :limit OFFSET :offset
            ");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetchAll();
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
        } catch (Throwable $e) {
            // Robust fallback query if any column or subquery causes an issue
            try {
                $sqlFallback = "
                    SELECT 
                        u.id as user_id,
                        u.email,
                        u.phone,
                        u.created_at as user_created_at,
                        cp.id as profile_id,
                        COALESCE(cp.full_name, SUBSTRING_INDEX(u.email, '@', 1)) as name,
                        cp.home_address,
                        'Quezon City' as city,
                        NULL as dob,
                        'Female' as gender,
                        'Active' as status,
                        NULL as notes,
                        0 as total_appointments,
                        0 as completed_appointments,
                        0 as cancelled_appointments,
                        0 as pending_appointments,
                        0 as total_spent,
                        NULL as last_visit_raw
                    FROM users u
                    LEFT JOIN customer_profiles cp ON u.id = cp.user_id
                    WHERE u.role = 'customer'
                    ORDER BY u.created_at DESC
                ";
                return $pdo->query($sqlFallback)->fetchAll();
            } catch (Throwable $e2) {
                return [];
            }
        }
    }

    public static function getSummaryMetrics(): array {
        $pdo = Database::getConnection();
        $currentMonthPrefix = date('Y-m');
        $today = date('Y-m-d');

        try {
            $total = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();
            
            $stmtNew = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role = 'customer' AND DATE_FORMAT(created_at, '%Y-%m') = :mprefix");
            $stmtNew->execute([':mprefix' => $currentMonthPrefix]);
            $newThisMonth = (int)$stmtNew->fetchColumn();
            
            $stmtUpcoming = $pdo->prepare("
                SELECT COUNT(DISTINCT customer_id) 
                FROM bookings 
                WHERE status IN ('pending', 'confirmed') AND booking_date >= :today
            ");
            $stmtUpcoming->execute([':today' => $today]);
            $withUpcoming = (int)$stmtUpcoming->fetchColumn();

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
        } catch (Throwable $e) {
            return [
                'total'        => 0,
                'newThisMonth' => 0,
                'withUpcoming' => 0,
                'returning'    => 0,
            ];
        }
    }

    public static function findWithHistory(int $userId): ?array {
        self::ensureSchema();
        $pdo = Database::getConnection();
        try {
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
        } catch (Throwable $e) {
            return null;
        }
    }
}

