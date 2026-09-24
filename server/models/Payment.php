<?php
/**
 * Nely's Salon Management System
 * Payment Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class Payment {
    public static function allWithDetails(array $filters = []): array {
        $pdo = Database::getConnection();

        $sql = "SELECT p.*,
                       COALESCE(cp.full_name, u.email, 'Walk-in Client') AS customer_name,
                       COALESCE(u.phone, '') AS customer_phone,
                       u.email AS customer_email,
                       COALESCE(s.name, 'Salon Service') AS service_name,
                       s.category AS service_category,
                       b.reference_no AS booking_reference,
                       b.booking_date,
                       b.booking_time,
                       b.status AS booking_status,
                       b.notes AS booking_notes,
                       st.name AS staff_name
                FROM payments p
                LEFT JOIN bookings b ON b.id = p.booking_id
                LEFT JOIN users u ON u.id = COALESCE(p.customer_id, b.customer_id)
                LEFT JOIN customer_profiles cp ON cp.user_id = u.id
                LEFT JOIN services s ON s.id = COALESCE(p.service_id, b.service_id)
                LEFT JOIN staff st ON st.id = b.staff_id
                ORDER BY p.id DESC";

        $rows = $pdo->query($sql)->fetchAll();
        return array_map([self::class, 'formatRow'], $rows);
    }

    public static function getSummaryMetrics(): array {
        $pdo = Database::getConnection();

        // 1. Today's Revenue & Visits
        $stmtToday = $pdo->query("
            SELECT COALESCE(SUM(amount), 0) AS total_today, COUNT(id) AS visits_today
            FROM payments
            WHERE status IN ('paid', 'partial')
              AND DATE(COALESCE(paid_at, created_at)) = CURRENT_DATE
        ");
        $todayData = $stmtToday->fetch();
        $todayRevenue = (float)($todayData['total_today'] ?? 0);
        $todayVisits = (int)($todayData['visits_today'] ?? 0);

        // 2. Month's Revenue
        $stmtMonth = $pdo->query("
            SELECT COALESCE(SUM(amount), 0) AS total_month
            FROM payments
            WHERE status IN ('paid', 'partial')
              AND YEAR(COALESCE(paid_at, created_at)) = YEAR(CURRENT_DATE)
              AND MONTH(COALESCE(paid_at, created_at)) = MONTH(CURRENT_DATE)
        ");
        $monthRevenue = (float)($stmtMonth->fetchColumn() ?? 0);

        // 3. Paid & Pending Total
        $paidRevenue = (float)$pdo->query("
            SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid'
        ")->fetchColumn();

        $pendingRevenue = (float)$pdo->query("
            SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status IN ('pending', 'partial')
        ")->fetchColumn();

        // 4. Weekly Breakdown (Current Week Mon-Sun)
        $stmtWeekly = $pdo->query("
            SELECT 
                DAYOFWEEK(COALESCE(paid_at, created_at)) AS day_num,
                DATE_FORMAT(COALESCE(paid_at, created_at), '%a') AS day_name,
                DATE(COALESCE(paid_at, created_at)) AS date_str,
                COALESCE(SUM(amount), 0) AS daily_total
            FROM payments
            WHERE status IN ('paid', 'partial')
              AND YEARWEEK(COALESCE(paid_at, created_at), 1) = YEARWEEK(CURRENT_DATE, 1)
            GROUP BY date_str, day_num, day_name
            ORDER BY date_str ASC
        ");
        $weeklyRows = $stmtWeekly->fetchAll();

        // Map 7 days
        $daysOfWeek = [
            'Mon' => ['label' => 'Monday', 'day' => 'Mon', 'amount' => 0],
            'Tue' => ['label' => 'Tuesday', 'day' => 'Tue', 'amount' => 0],
            'Wed' => ['label' => 'Wednesday', 'day' => 'Wed', 'amount' => 0],
            'Thu' => ['label' => 'Thursday', 'day' => 'Thu', 'amount' => 0],
            'Fri' => ['label' => 'Friday', 'day' => 'Fri', 'amount' => 0],
            'Sat' => ['label' => 'Saturday', 'day' => 'Sat', 'amount' => 0],
            'Sun' => ['label' => 'Sunday', 'day' => 'Sun', 'amount' => 0],
        ];

        $weeklyTotal = 0;
        $highestDay = 'Mon';
        $highestAmount = 0;

        foreach ($weeklyRows as $w) {
            $dayKey = $w['day_name'];
            $amt = (float)$w['daily_total'];
            if (isset($daysOfWeek[$dayKey])) {
                $daysOfWeek[$dayKey]['amount'] = $amt;
            }
            $weeklyTotal += $amt;
            if ($amt > $highestAmount) {
                $highestAmount = $amt;
                $highestDay = $dayKey;
            }
        }

        $dailyAvg = count($weeklyRows) > 0 ? round($weeklyTotal / 7, 2) : 0;

        // 5. Payment Methods Breakdown
        $stmtMethods = $pdo->query("
            SELECT payment_method, COUNT(id) AS count, COALESCE(SUM(amount), 0) AS total
            FROM payments
            WHERE status IN ('paid', 'partial')
            GROUP BY payment_method
            ORDER BY total DESC
        ");
        $methodRows = $stmtMethods->fetchAll();

        $topMethod = 'Cash';
        $topMethodPct = 0;
        $allMethodsTotal = array_sum(array_column($methodRows, 'total'));
        if ($allMethodsTotal > 0 && !empty($methodRows)) {
            $topRow = $methodRows[0];
            $methodNames = [
                'cash'          => 'Cash',
                'gcash'         => 'GCash',
                'bank_transfer' => 'Bank Transfer'
            ];
            $topMethod = $methodNames[$topRow['payment_method']] ?? ucfirst($topRow['payment_method']);
            $topMethodPct = round(((float)$topRow['total'] / $allMethodsTotal) * 100);
        }

        return [
            'today_revenue'      => $todayRevenue,
            'today_visits'       => $todayVisits,
            'month_revenue'      => $monthRevenue,
            'paid_revenue'       => $paidRevenue,
            'pending_revenue'    => $pendingRevenue,
            'weekly_revenue'     => array_values($daysOfWeek),
            'weekly_total'       => $weeklyTotal,
            'highest_day'        => $highestDay,
            'highest_amount'     => $highestAmount,
            'daily_average'      => $dailyAvg,
            'top_payment_method' => $topMethod,
            'top_payment_pct'    => $topMethodPct,
        ];
    }

    public static function findByIdWithDetails(int $id): ?array {
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare("
            SELECT p.*,
                   COALESCE(cp.full_name, u.email, 'Walk-in Client') AS customer_name,
                   COALESCE(u.phone, '') AS customer_phone,
                   u.email AS customer_email,
                   COALESCE(s.name, 'Salon Service') AS service_name,
                   s.category AS service_category,
                   b.reference_no AS booking_reference,
                   b.booking_date,
                   b.booking_time,
                   b.status AS booking_status,
                   b.notes AS booking_notes,
                   st.name AS staff_name
            FROM payments p
            LEFT JOIN bookings b ON b.id = p.booking_id
            LEFT JOIN users u ON u.id = COALESCE(p.customer_id, b.customer_id)
            LEFT JOIN customer_profiles cp ON cp.user_id = u.id
            LEFT JOIN services s ON s.id = COALESCE(p.service_id, b.service_id)
            LEFT JOIN staff st ON st.id = b.staff_id
            WHERE p.id = :id
        ");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::formatRow($row) : null;
    }

    public static function create(array $data): int {
        $pdo = Database::getConnection();

        $bookingId = !empty($data['booking_id']) ? (int)$data['booking_id'] : null;
        $customerId = !empty($data['customer_id']) ? (int)$data['customer_id'] : null;
        $serviceId = !empty($data['service_id']) ? (int)$data['service_id'] : null;
        $amount = (float)($data['amount'] ?? 0);
        $method = strtolower(str_replace(' ', '_', $data['payment_method'] ?? 'cash'));
        if (!in_array($method, ['cash', 'gcash', 'bank_transfer'])) {
            $method = 'cash';
        }

        $ref = !empty($data['reference_number']) ? trim($data['reference_number']) : null;
        if (empty($ref)) {
            $ref = 'PAY-' . str_pad((string)mt_rand(1000, 99999), 5, '0', STR_PAD_LEFT);
        }

        $receipt = !empty($data['receipt_file']) ? trim($data['receipt_file']) : null;
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;
        $status = strtolower(trim($data['status'] ?? 'paid'));
        if (!in_array($status, ['pending', 'paid', 'partial', 'refunded'])) {
            $status = 'paid';
        }

        $paidAt = ($status === 'paid' || $status === 'partial') ? date('Y-m-d H:i:s') : null;

        $stmt = $pdo->prepare("
            INSERT INTO payments (booking_id, customer_id, service_id, amount, payment_method, reference_number, receipt_file, notes, status, paid_at)
            VALUES (:booking_id, :customer_id, :service_id, :amount, :method, :ref, :receipt, :notes, :status, :paid_at)
        ");

        $stmt->execute([
            'booking_id'  => $bookingId,
            'customer_id' => $customerId,
            'service_id'  => $serviceId,
            'amount'      => $amount,
            'method'      => $method,
            'ref'         => $ref,
            'receipt'     => $receipt,
            'notes'       => $notes,
            'status'      => $status,
            'paid_at'     => $paidAt,
        ]);

        $paymentId = (int)$pdo->lastInsertId();

        // If linked to booking and paid, update booking status
        if ($bookingId && $status === 'paid') {
            $pdo->prepare("UPDATE bookings SET status = 'completed' WHERE id = :bid AND status = 'confirmed'")->execute(['bid' => $bookingId]);
        }

        return $paymentId;
    }

    public static function update(int $id, array $data): bool {
        $pdo = Database::getConnection();

        $amount = isset($data['amount']) ? (float)$data['amount'] : null;
        $method = isset($data['payment_method']) ? strtolower(str_replace(' ', '_', $data['payment_method'])) : null;
        if ($method && !in_array($method, ['cash', 'gcash', 'bank_transfer'])) {
            $method = 'cash';
        }

        $ref = isset($data['reference_number']) ? trim($data['reference_number']) : null;
        $notes = isset($data['notes']) ? trim($data['notes']) : null;
        $status = isset($data['status']) ? strtolower(trim($data['status'])) : null;

        $fields = [];
        $params = ['id' => $id];

        if ($amount !== null) {
            $fields[] = "amount = :amount";
            $params['amount'] = $amount;
        }
        if ($method !== null) {
            $fields[] = "payment_method = :method";
            $params['method'] = $method;
        }
        if ($ref !== null) {
            $fields[] = "reference_number = :ref";
            $params['ref'] = $ref;
        }
        if ($notes !== null) {
            $fields[] = "notes = :notes";
            $params['notes'] = $notes;
        }
        if ($status !== null && in_array($status, ['pending', 'paid', 'partial', 'refunded'])) {
            $fields[] = "status = :status";
            $params['status'] = $status;

            if ($status === 'paid' || $status === 'partial') {
                $fields[] = "paid_at = COALESCE(paid_at, NOW())";
            } elseif ($status === 'pending' || $status === 'refunded') {
                $fields[] = "paid_at = NULL";
            }
        }

        if (empty($fields)) {
            return false;
        }

        $sql = "UPDATE payments SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public static function refund(int $id): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE payments SET status = 'refunded', paid_at = NULL WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    private static function formatRow(array $row): array {
        $methodMap = [
            'cash'          => 'Cash',
            'gcash'         => 'GCash',
            'bank_transfer' => 'Bank Transfer'
        ];

        $statusMap = [
            'paid'     => 'Paid',
            'pending'  => 'Unpaid',
            'partial'  => 'Partial',
            'refunded' => 'Refunded'
        ];

        $dt = new DateTime($row['created_at']);
        $rawStatus = strtolower($row['status'] ?? 'pending');
        $displayStatus = $statusMap[$rawStatus] ?? ucfirst($rawStatus);

        $methodRaw = strtolower($row['payment_method'] ?? 'cash');
        $displayMethod = $methodMap[$methodRaw] ?? ucfirst($methodRaw);

        $dateFormatted = $dt->format('M j');
        $fullDate = $dt->format('F j, Y');
        $timeFormatted = $dt->format('g:i A');

        $appointmentSched = 'Direct Payment';
        if (!empty($row['booking_date'])) {
            $bDt = new DateTime($row['booking_date'] . ' ' . ($row['booking_time'] ?? '09:00:00'));
            $appointmentSched = $bDt->format('F j, Y — g:i A');
        }

        $refNo = $row['reference_number'] ?: ('PAY-' . str_pad((string)$row['id'], 4, '0', STR_PAD_LEFT));

        return [
            'id'                  => (int)$row['id'],
            'transaction_code'    => $refNo,
            'booking_id'          => $row['booking_id'] ? (int)$row['booking_id'] : null,
            'booking_reference'   => $row['booking_reference'] ?? '',
            'customer'            => $row['customer_name'] ?: 'Customer',
            'customerPhone'       => $row['customer_phone'] ?: '',
            'customerEmail'       => $row['customer_email'] ?: '',
            'service'             => $row['service_name'] ?: 'Salon Service',
            'amount'              => (float)$row['amount'],
            'method'              => $displayMethod,
            'raw_method'          => $methodRaw,
            'status'              => $displayStatus,
            'raw_status'          => $rawStatus,
            'date'                => $dateFormatted,
            'fullDate'            => $fullDate,
            'transactionTime'     => $timeFormatted,
            'appointmentSchedule' => $appointmentSched,
            'notes'               => $row['notes'] ?: ($row['booking_notes'] ?: 'Counter payment settlement at Nely’s Salon.'),
            'paid_at'             => $row['paid_at'],
            'created_at'          => $row['created_at'],
            'staff_name'          => $row['staff_name'] ?? ''
        ];
    }
}
