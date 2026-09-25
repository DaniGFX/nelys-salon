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
                   s.name as service_name, s.code as service_code, s.category as service_category, s.duration_minutes, s.price as service_price,
                   u.email as customer_email, u.phone as customer_phone,
                   COALESCE(cp.full_name, u.email, 'Valued Client') as customer_name,
                   st.name as staff_name,
                   p.payment_method, COALESCE(p.status, 'unpaid') as payment_status, p.reference_number as payment_ref
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
                   COALESCE(cp.full_name, u.email, 'Valued Client') as customer_name, u.phone as customer_phone,
                   p.payment_method, COALESCE(p.status, 'unpaid') as payment_status
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
                   COALESCE(cp.full_name, u.email, 'Valued Client') as customer_name, u.phone as customer_phone,
                   st.name as staff_name, COALESCE(p.status, 'unpaid') as payment_status, p.payment_method
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
                   COALESCE(cp.full_name, u.email, 'Valued Client') as customer_name, 
                   COALESCE(u.phone, '') as customer_phone, 
                   COALESCE(u.email, '') as customer_email,
                   st.name as staff_name,
                   COALESCE(p.status, 'unpaid') as payment_status, 
                   p.payment_method
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users u ON b.customer_id = u.id
            LEFT JOIN customer_profiles cp ON u.id = cp.user_id
            LEFT JOIN staff st ON b.staff_id = st.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $sql .= " AND b.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['date']) && $filters['date'] !== 'all') {
            $sql .= " AND b.booking_date = :date";
            $params['date'] = $filters['date'];
        }

        if (!empty($filters['staff_id']) && $filters['staff_id'] !== 'all') {
            $sql .= " AND b.staff_id = :staff_id";
            $params['staff_id'] = $filters['staff_id'];
        }

        if (!empty($filters['service_id']) && $filters['service_id'] !== 'all') {
            $sql .= " AND b.service_id = :service_id";
            $params['service_id'] = $filters['service_id'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (b.reference_no LIKE :s OR cp.full_name LIKE :s OR s.name LIKE :s OR u.email LIKE :s OR u.phone LIKE :s)";
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

    public static function update(int $id, array $data): bool {
        $pdo = Database::getConnection();
        $fields = [];
        $params = ['id' => $id];

        if (isset($data['service_id'])) {
            $fields[] = 'service_id = :service_id';
            $params['service_id'] = $data['service_id'];
        }
        if (isset($data['staff_id'])) {
            $fields[] = 'staff_id = :staff_id';
            $params['staff_id'] = $data['staff_id'];
        }
        if (isset($data['booking_date'])) {
            $fields[] = 'booking_date = :booking_date';
            $params['booking_date'] = $data['booking_date'];
        }
        if (isset($data['booking_time'])) {
            $fields[] = 'booking_time = :booking_time';
            $params['booking_time'] = $data['booking_time'];
        }
        if (isset($data['status'])) {
            $fields[] = 'status = :status';
            $params['status'] = $data['status'];
        }
        if (isset($data['notes'])) {
            $fields[] = 'notes = :notes';
            $params['notes'] = $data['notes'];
        }
        if (isset($data['total_price'])) {
            $fields[] = 'total_price = :total_price';
            $params['total_price'] = $data['total_price'];
        }

        if (empty($fields)) {
            return false;
        }

        $sql = "UPDATE bookings SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public static function delete(int $id): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("DELETE FROM bookings WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }
}
