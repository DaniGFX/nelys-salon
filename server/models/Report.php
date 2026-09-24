<?php
/**
 * Nely's Salon Management System
 * Report Model
 * Computes business analytics, revenue timeline, appointment breakdown,
 * popular services, customer growth statistics, staff performance, and
 * service revenue breakdown across different date ranges.
 */

require_once dirname(__DIR__) . '/config/database.php';

class Report {
    public static function generate(string $range = 'this_month'): array {
        $pdo = Database::getConnection();

        // 1. Resolve date boundaries
        $boundaries = self::getDateBoundaries($range);
        $startDate = $boundaries['start'];
        $endDate = $boundaries['end'];
        $prevStartDate = $boundaries['prev_start'];
        $prevEndDate = $boundaries['prev_end'];
        $label = $boundaries['label'];

        // 2. Summary KPIs
        // Total Revenue in period
        $stmtRev = $pdo->prepare("
            SELECT COALESCE(SUM(amount), 0) AS total_rev
            FROM payments
            WHERE status IN ('paid', 'partial')
              AND COALESCE(paid_at, created_at) >= :start
              AND COALESCE(paid_at, created_at) <= :end
        ");
        $stmtRev->execute(['start' => $startDate, 'end' => $endDate]);
        $totalRevenue = (float)$stmtRev->fetchColumn();

        // Previous Revenue
        $stmtPrevRev = $pdo->prepare("
            SELECT COALESCE(SUM(amount), 0) AS prev_rev
            FROM payments
            WHERE status IN ('paid', 'partial')
              AND COALESCE(paid_at, created_at) >= :start
              AND COALESCE(paid_at, created_at) <= :end
        ");
        $stmtPrevRev->execute(['start' => $prevStartDate, 'end' => $prevEndDate]);
        $prevRevenue = (float)$stmtPrevRev->fetchColumn();
        $revenueGrowth = self::calculateGrowth($totalRevenue, $prevRevenue);

        // Appointments in period
        $stmtAppt = $pdo->prepare("
            SELECT COUNT(id) AS total_appt,
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_appt,
                   SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_appt,
                   SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_appt,
                   SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_appt
            FROM bookings
            WHERE booking_date >= DATE(:start) AND booking_date <= DATE(:end)
        ");
        $stmtAppt->execute(['start' => $startDate, 'end' => $endDate]);
        $apptData = $stmtAppt->fetch() ?: [];

        $totalAppointments = (int)($apptData['total_appt'] ?? 0);
        $completedServices = (int)($apptData['completed_appt'] ?? 0);
        $confirmedAppt = (int)($apptData['confirmed_appt'] ?? 0);
        $pendingAppt = (int)($apptData['pending_appt'] ?? 0);
        $cancelledAppt = (int)($apptData['cancelled_appt'] ?? 0);

        // Previous Appointments for growth
        $stmtPrevAppt = $pdo->prepare("
            SELECT COUNT(id) AS prev_appt
            FROM bookings
            WHERE booking_date >= DATE(:start) AND booking_date <= DATE(:end)
        ");
        $stmtPrevAppt->execute(['start' => $prevStartDate, 'end' => $prevEndDate]);
        $prevAppointments = (int)$stmtPrevAppt->fetchColumn();
        $appointmentGrowth = self::calculateGrowth($totalAppointments, $prevAppointments);

        // Customers stats
        $totalCustomers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();
        
        $stmtNewCust = $pdo->prepare("
            SELECT COUNT(*) FROM users
            WHERE role = 'customer' AND created_at >= :start AND created_at <= :end
        ");
        $stmtNewCust->execute(['start' => $startDate, 'end' => $endDate]);
        $newCustomers = (int)$stmtNewCust->fetchColumn();

        $completionRate = $totalAppointments > 0 
            ? round(($completedServices / $totalAppointments) * 100, 1) 
            : 100.0;

        // Daily average revenue
        $daysCount = max(1, (int)((strtotime($endDate) - strtotime($startDate)) / 86400) + 1);
        $avgDailyRevenue = $daysCount > 0 ? round($totalRevenue / $daysCount, 2) : $totalRevenue;

        // 3. Revenue Chart Points
        $chartResult = self::generateChartPoints($range, $startDate, $endDate);
        $chartPoints = $chartResult['points'];
        $chartTotal = $chartResult['total'];
        $chartAverage = $chartResult['average'];
        $chartHighest = $chartResult['highest'];

        // 4. Appointments Donut Breakdown
        $appointmentsBreakdown = [
          'total'     => $totalAppointments,
          'completed' => $completedServices,
          'confirmed' => $confirmedAppt,
          'pending'   => $pendingAppt,
          'cancelled' => $cancelledAppt,
          'completed_pct' => $totalAppointments > 0 ? round(($completedServices / $totalAppointments) * 100) : 0,
          'confirmed_pct' => $totalAppointments > 0 ? round(($confirmedAppt / $totalAppointments) * 100) : 0,
          'pending_pct'   => $totalAppointments > 0 ? round(($pendingAppt / $totalAppointments) * 100) : 0,
          'cancelled_pct' => $totalAppointments > 0 ? round(($cancelledAppt / $totalAppointments) * 100) : 0,
        ];

        // 5. Popular Services (Top 5)
        $stmtPopular = $pdo->prepare("
            SELECT s.id, s.name AS service, s.category,
                   COUNT(b.id) AS bookings,
                   COALESCE(SUM(p.amount), COUNT(b.id) * COALESCE(s.price, 0)) AS revenue
            FROM services s
            LEFT JOIN bookings b ON b.service_id = s.id AND b.booking_date >= DATE(:start) AND b.booking_date <= DATE(:end)
            LEFT JOIN payments p ON p.booking_id = b.id AND p.status IN ('paid', 'partial')
            GROUP BY s.id, s.name, s.category
            ORDER BY bookings DESC, revenue DESC
            LIMIT 5
        ");
        $stmtPopular->execute(['start' => $startDate, 'end' => $endDate]);
        $popularRaw = $stmtPopular->fetchAll();

        $popularServices = [];
        $rank = 1;
        foreach ($popularRaw as $row) {
            $popularServices[] = [
                'rank'     => $rank++,
                'service'  => $row['service'],
                'category' => $row['category'] ?: 'General',
                'bookings' => (int)$row['bookings'],
                'revenue'  => (float)$row['revenue']
            ];
        }

        // 6. Customer Statistics & Monthly Growth (Jan – Dec of current year)
        $stmtGrowth = $pdo->query("
            SELECT 
                MONTH(created_at) AS month_num,
                DATE_FORMAT(created_at, '%b') AS month_name,
                COUNT(id) AS new_count
            FROM users
            WHERE role = 'customer' AND YEAR(created_at) = YEAR(CURRENT_DATE)
            GROUP BY month_num, month_name
            ORDER BY month_num ASC
        ");
        $growthRows = $stmtGrowth->fetchAll();

        $monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        $currentMonthNum = (int)date('n');
        $growthMap = [];
        foreach ($growthRows as $gr) {
            $growthMap[(int)$gr['month_num']] = (int)$gr['new_count'];
        }

        $customerGrowth = [];
        $cumulativeCount = 0;
        for ($m = 1; $m <= $currentMonthNum; $m++) {
            $cumulativeCount += ($growthMap[$m] ?? 0);
            $customerGrowth[] = [
                'month'      => $monthNames[$m - 1],
                'count'      => $cumulativeCount,
                'barPercent' => 0
            ];
        }
        $maxCount = max(1, ...array_column($customerGrowth, 'count'));
        foreach ($customerGrowth as &$cg) {
            $cg['barPercent'] = max(10, round(($cg['count'] / $maxCount) * 100));
        }
        unset($cg);

        // Returning vs Inactive customers
        $stmtReturning = $pdo->query("
            SELECT COUNT(DISTINCT customer_id) 
            FROM bookings 
            GROUP BY customer_id 
            HAVING COUNT(id) >= 2
        ");
        $returningCount = (int)$stmtReturning->rowCount();

        $stmtInactive = $pdo->query("
            SELECT COUNT(u.id)
            FROM users u
            WHERE u.role = 'customer'
              AND u.id NOT IN (
                  SELECT DISTINCT customer_id FROM bookings WHERE booking_date >= DATE_SUB(CURRENT_DATE, INTERVAL 60 DAY)
              )
        ");
        $inactiveCount = (int)$stmtInactive->fetchColumn();

        $retentionRate = $totalCustomers > 0 ? round(($returningCount / $totalCustomers) * 100, 1) : 0;

        $customerStats = [
            'total'          => $totalCustomers,
            'new'            => $newCustomers,
            'returning'      => $returningCount,
            'inactive'       => $inactiveCount,
            'retention_rate' => $retentionRate,
            'growth_bars'    => $customerGrowth
        ];

        // 7. Staff Performance
        $stmtStaff = $pdo->prepare("
            SELECT st.id, st.name AS staff, st.role,
                   COUNT(b.id) AS appointments,
                   SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) AS completed,
                   COALESCE(SUM(p.amount), 0) AS revenue
            FROM staff st
            LEFT JOIN bookings b ON b.staff_id = st.id AND b.booking_date >= DATE(:start) AND b.booking_date <= DATE(:end)
            LEFT JOIN payments p ON p.booking_id = b.id AND p.status IN ('paid', 'partial')
            GROUP BY st.id, st.name, st.role
            ORDER BY revenue DESC, appointments DESC
        ");
        $stmtStaff->execute(['start' => $startDate, 'end' => $endDate]);
        $staffPerformance = array_map(function($st) {
            return [
                'id'           => (int)$st['id'],
                'staff'        => $st['staff'],
                'role'         => $st['role'] ?: 'Stylist',
                'appointments' => (int)$st['appointments'],
                'completed'    => (int)$st['completed'],
                'revenue'      => (float)$st['revenue']
            ];
        }, $stmtStaff->fetchAll());

        // 8. Service Revenue Breakdown (All services)
        $stmtAllServices = $pdo->prepare("
            SELECT s.id, s.name AS service, s.price,
                   COUNT(b.id) AS bookings,
                   COALESCE(SUM(p.amount), 0) AS revenue
            FROM services s
            LEFT JOIN bookings b ON b.service_id = s.id AND b.booking_date >= DATE(:start) AND b.booking_date <= DATE(:end)
            LEFT JOIN payments p ON p.booking_id = b.id AND p.status IN ('paid', 'partial')
            GROUP BY s.id, s.name, s.price
            ORDER BY bookings DESC, revenue DESC
        ");
        $stmtAllServices->execute(['start' => $startDate, 'end' => $endDate]);
        $serviceBreakdown = array_map(function($sr) {
            $price = $sr['price'] !== null ? (float)$sr['price'] : null;
            return [
                'id'           => (int)$sr['id'],
                'service'      => $sr['service'],
                'price'        => $price,
                'priceDisplay' => $price !== null ? ('₱' . number_format($price, 0)) : 'Price not set',
                'bookings'     => (int)$sr['bookings'],
                'revenue'      => (float)$sr['revenue']
            ];
        }, $stmtAllServices->fetchAll());

        return [
            'range'                  => $range,
            'label'                  => $label,
            'start_date'             => $startDate,
            'end_date'               => $endDate,
            'summary'                => [
                'total_revenue'      => $totalRevenue,
                'revenue_growth'     => $revenueGrowth,
                'total_appointments' => $totalAppointments,
                'appointment_growth' => $appointmentGrowth,
                'total_customers'    => $totalCustomers,
                'new_customers'      => $newCustomers,
                'completed_services' => $completedServices,
                'completion_rate'    => $completionRate . '%',
                'avg_daily_revenue'  => $avgDailyRevenue,
            ],
            'revenue_chart'          => [
                'points'             => $chartPoints,
                'total'              => $chartTotal,
                'average'            => $chartAverage,
                'highest'            => $chartHighest
            ],
            'appointments'           => $appointmentsBreakdown,
            'popular_services'       => $popularServices,
            'customer_stats'         => $customerStats,
            'staff_performance'      => $staffPerformance,
            'service_breakdown'      => $serviceBreakdown
        ];
    }

    private static function getDateBoundaries(string $range): array {
        $now = new DateTime();
        
        switch ($range) {
            case 'today':
                $start = $now->format('Y-m-d 00:00:00');
                $end = $now->format('Y-m-d 23:59:59');
                $prevStart = (clone $now)->modify('-1 day')->format('Y-m-d 00:00:00');
                $prevEnd = (clone $now)->modify('-1 day')->format('Y-m-d 23:59:59');
                $label = 'Today (' . $now->format('F j, Y') . ')';
                break;

            case 'this_week':
                $start = (clone $now)->modify('this week monday 00:00:00')->format('Y-m-d H:i:s');
                $end = (clone $now)->modify('this week sunday 23:59:59')->format('Y-m-d H:i:s');
                $prevStart = (clone $now)->modify('last week monday 00:00:00')->format('Y-m-d H:i:s');
                $prevEnd = (clone $now)->modify('last week sunday 23:59:59')->format('Y-m-d H:i:s');
                $label = 'This Week (' . date('M j', strtotime($start)) . ' – ' . date('M j, Y', strtotime($end)) . ')';
                break;

            case 'last_month':
                $start = (clone $now)->modify('first day of last month 00:00:00')->format('Y-m-d H:i:s');
                $end = (clone $now)->modify('last day of last month 23:59:59')->format('Y-m-d H:i:s');
                $prevStart = (clone $now)->modify('first day of -2 month 00:00:00')->format('Y-m-d H:i:s');
                $prevEnd = (clone $now)->modify('last day of -2 month 23:59:59')->format('Y-m-d H:i:s');
                $label = 'Last Month (' . date('F Y', strtotime($start)) . ')';
                break;

            case 'this_year':
                $start = (clone $now)->format('Y-01-01 00:00:00');
                $end = (clone $now)->format('Y-12-31 23:59:59');
                $prevStart = (clone $now)->modify('-1 year')->format('Y-01-01 00:00:00');
                $prevEnd = (clone $now)->modify('-1 year')->format('Y-12-31 23:59:59');
                $label = 'This Year (' . $now->format('Y') . ' YTD)';
                break;

            case 'this_month':
            default:
                $start = (clone $now)->format('Y-m-01 00:00:00');
                $end = (clone $now)->modify('last day of this month 23:59:59')->format('Y-m-d H:i:s');
                $prevStart = (clone $now)->modify('first day of last month 00:00:00')->format('Y-m-d H:i:s');
                $prevEnd = (clone $now)->modify('last day of last month 23:59:59')->format('Y-m-d H:i:s');
                $label = 'This Month (' . $now->format('F Y') . ')';
                break;
        }

        return [
            'start'      => $start,
            'end'        => $end,
            'prev_start' => $prevStart,
            'prev_end'   => $prevEnd,
            'label'      => $label,
        ];
    }

    private static function calculateGrowth(float $current, float $previous): string {
        if ($previous <= 0) {
            return $current > 0 ? '+100%' : '+0%';
        }
        $diff = (($current - $previous) / $previous) * 100;
        $sign = $diff >= 0 ? '+' : '';
        return $sign . round($diff, 1) . '%';
    }

    private static function generateChartPoints(string $range, string $startDate, string $endDate): array {
        $pdo = Database::getConnection();

        $points = [];
        $total = 0;
        $highestPoint = '—';
        $highestAmount = 0;

        if ($range === 'today') {
            $hours = [
                '9 AM'  => ['start' => '09:00:00', 'end' => '10:59:59', 'amount' => 0],
                '11 AM' => ['start' => '11:00:00', 'end' => '12:59:59', 'amount' => 0],
                '1 PM'  => ['start' => '13:00:00', 'end' => '14:59:59', 'amount' => 0],
                '3 PM'  => ['start' => '15:00:00', 'end' => '16:59:59', 'amount' => 0],
                '5 PM'  => ['start' => '17:00:00', 'end' => '18:59:59', 'amount' => 0],
                '7 PM'  => ['start' => '19:00:00', 'end' => '21:00:00', 'amount' => 0]
            ];

            $stmt = $pdo->prepare("
                SELECT TIME(COALESCE(paid_at, created_at)) AS p_time, amount
                FROM payments
                WHERE status IN ('paid', 'partial')
                  AND DATE(COALESCE(paid_at, created_at)) = CURRENT_DATE
            ");
            $stmt->execute();
            $rows = $stmt->fetchAll();

            foreach ($rows as $r) {
                $t = $r['p_time'];
                $amt = (float)$r['amount'];
                foreach ($hours as $key => &$h) {
                    if ($t >= $h['start'] && $t <= $h['end']) {
                        $h['amount'] += $amt;
                        break;
                    }
                }
                unset($h);
            }

            foreach ($hours as $label => $data) {
                $points[] = ['day' => $label, 'amount' => $data['amount']];
                $total += $data['amount'];
                if ($data['amount'] > $highestAmount) {
                    $highestAmount = $data['amount'];
                    $highestPoint = $label . ' (₱' . number_format($data['amount'], 0) . ')';
                }
            }

        } elseif ($range === 'this_year') {
            $months = [
                1 => ['day' => 'Jan', 'amount' => 0],
                2 => ['day' => 'Feb', 'amount' => 0],
                3 => ['day' => 'Mar', 'amount' => 0],
                4 => ['day' => 'Apr', 'amount' => 0],
                5 => ['day' => 'May', 'amount' => 0],
                6 => ['day' => 'Jun', 'amount' => 0],
                7 => ['day' => 'Jul', 'amount' => 0],
                8 => ['day' => 'Aug', 'amount' => 0],
                9 => ['day' => 'Sep', 'amount' => 0],
                10 => ['day' => 'Oct', 'amount' => 0],
                11 => ['day' => 'Nov', 'amount' => 0],
                12 => ['day' => 'Dec', 'amount' => 0],
            ];

            $stmt = $pdo->prepare("
                SELECT MONTH(COALESCE(paid_at, created_at)) AS m_num, COALESCE(SUM(amount), 0) AS total_amt
                FROM payments
                WHERE status IN ('paid', 'partial')
                  AND YEAR(COALESCE(paid_at, created_at)) = YEAR(CURRENT_DATE)
                GROUP BY m_num
            ");
            $stmt->execute();
            $rows = $stmt->fetchAll();

            foreach ($rows as $r) {
                $mNum = (int)$r['m_num'];
                if (isset($months[$mNum])) {
                    $months[$mNum]['amount'] = (float)$r['total_amt'];
                }
            }

            $currentMonth = (int)date('n');
            for ($m = 1; $m <= $currentMonth; $m++) {
                $item = $months[$m];
                $points[] = $item;
                $total += $item['amount'];
                if ($item['amount'] > $highestAmount) {
                    $highestAmount = $item['amount'];
                    $highestPoint = $item['day'] . ' (₱' . number_format($item['amount'], 0) . ')';
                }
            }

        } else {
            // this_week, this_month, last_month
            // Breakdown into Mon-Sun or 7 active buckets
            $days = [
                'Mon' => ['day' => 'Mon', 'label' => 'Monday', 'amount' => 0],
                'Tue' => ['day' => 'Tue', 'label' => 'Tuesday', 'amount' => 0],
                'Wed' => ['day' => 'Wed', 'label' => 'Wednesday', 'amount' => 0],
                'Thu' => ['day' => 'Thu', 'label' => 'Thursday', 'amount' => 0],
                'Fri' => ['day' => 'Fri', 'label' => 'Friday', 'amount' => 0],
                'Sat' => ['day' => 'Sat', 'label' => 'Saturday', 'amount' => 0],
                'Sun' => ['day' => 'Sun', 'label' => 'Sunday', 'amount' => 0],
            ];

            $stmt = $pdo->prepare("
                SELECT DATE_FORMAT(COALESCE(paid_at, created_at), '%a') AS day_name,
                       COALESCE(SUM(amount), 0) AS total_amt
                FROM payments
                WHERE status IN ('paid', 'partial')
                  AND COALESCE(paid_at, created_at) >= :start
                  AND COALESCE(paid_at, created_at) <= :end
                GROUP BY day_name
            ");
            $stmt->execute(['start' => $startDate, 'end' => $endDate]);
            $rows = $stmt->fetchAll();

            foreach ($rows as $r) {
                $d = $r['day_name'];
                if (isset($days[$d])) {
                    $days[$d]['amount'] = (float)$r['total_amt'];
                }
            }

            foreach ($days as $dayKey => $data) {
                $points[] = ['day' => $data['day'], 'amount' => $data['amount']];
                $total += $data['amount'];
                if ($data['amount'] > $highestAmount) {
                    $highestAmount = $data['amount'];
                    $highestPoint = $data['label'] . ' (₱' . number_format($data['amount'], 0) . ')';
                }
            }
        }

        $average = count($points) > 0 ? round($total / count($points), 2) : 0;

        return [
            'points'  => $points,
            'total'   => $total,
            'average' => $average,
            'highest' => $highestAmount > 0 ? $highestPoint : '—'
        ];
    }
}
