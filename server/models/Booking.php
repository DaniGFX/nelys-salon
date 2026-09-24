<?php
/**
 * Nely's Salon Management System
 * Booking Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class Booking {
    public static function create(array $data): int {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO bookings (
                reference_no, customer_id, service_id, staff_id,
                booking_date, booking_time, visit_type, home_address,
                status, notes, total_price
            ) VALUES (
                :ref, :customer_id, :service_id, :staff_id,
                :date, :time, :visit_type, :address,
                :status, :notes, :total
            )
        ");
        $stmt->execute([
            'ref'         => $data['reference_no'],
            'customer_id' => $data['customer_id'],
            'service_id'  => $data['service_id'],
            'staff_id'    => $data['staff_id'] ?? null,
            'date'        => $data['booking_date'],
            'time'        => $data['booking_time'],
            'visit_type'  => $data['visit_type'] ?? 'salon',
            'address'     => $data['home_address'] ?? null,
            'status'      => $data['status'] ?? 'pending',
            'notes'       => $data['notes'] ?? null,
            'total'       => $data['total_price'],
        ]);

        return (int)$pdo->lastInsertId();
    }

    public static function findById(int $id): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT b.*, 
                   s.name as service_name, s.code as service_code, s.category as service_category, s.duration_minutes,
                   u.email as customer_email, u.phone as customer_phone,
                   cp.full_name as customer_name,
                   st.name as staff_name,
                   p.payment_method, p.status as payment_status, p.reference_number as payment_ref
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users u ON b.customer_id = u.id
            LEFT JOIN customer_profiles cp ON u.id = cp.user_id
            LEFT JOIN staff st ON b.staff_id = st.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE b.id = :id
        ");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public static function findByReference(string $referenceNo): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT b.*, 
                   s.name as service_name, s.code as service_code, s.category as service_category,
                   cp.full_name as customer_name, u.phone as customer_phone,
                   p.payment_method, p.status as payment_status
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users u ON b.customer_id = u.id
            LEFT JOIN customer_profiles cp ON u.id = cp.user_id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE b.reference_no = :ref
        ");
        $stmt->execute(['ref' => $referenceNo]);
        return $stmt->fetch() ?: null;
    }

    public static function findByCustomer(int $customerId, ?string $status = null): array {
        $pdo = Database::getConnection();
        $sql = "
            SELECT b.*, 
                   s.name as service_name, s.code as service_code, s.category as service_category,
                   cp.full_name as customer_name, u.phone as customer_phone,
                   st.name as staff_name, p.status as payment_status, p.payment_method
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users u ON b.customer_id = u.id
            LEFT JOIN customer_profiles cp ON u.id = cp.user_id
            LEFT JOIN staff st ON b.staff_id = st.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE b.customer_id = :cid
        ";
        $params = ['cid' => $customerId];

        if ($status) {
            $sql .= " AND b.status = :status";
            $params['status'] = $status;
        }

        $sql .= " ORDER BY b.booking_date DESC, b.booking_time DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function all(array $filters = []): array {
        $pdo = Database::getConnection();
        $sql = "
            SELECT b.*, 
                   s.name as service_name, s.code as service_code, s.category as service_category,
                   cp.full_name as customer_name, u.phone as customer_phone, u.email as customer_email,
                   st.name as staff_name,
                   p.status as payment_status, p.payment_method
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users u ON b.customer_id = u.id
            LEFT JOIN customer_profiles cp ON u.id = cp.user_id
            LEFT JOIN staff st ON b.staff_id = st.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($filters['status'])) {
            $sql .= " AND b.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['date'])) {
            $sql .= " AND b.booking_date = :date";
            $params['date'] = $filters['date'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (b.reference_no LIKE :s OR cp.full_name LIKE :s OR s.name LIKE :s)";
            $params['s'] = '%' . $filters['search'] . '%';
        }

        $sql .= " ORDER BY b.booking_date DESC, b.booking_time DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function updateStatus(int $id, string $status, ?string $cancelReason = null): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            UPDATE bookings 
            SET status = :status, cancel_reason = :reason
            WHERE id = :id
        ");
        return $stmt->execute([
            'status' => $status,
            'reason' => $cancelReason,
            'id'     => $id,
        ]);
    }
}
