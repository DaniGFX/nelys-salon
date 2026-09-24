<?php
/**
 * Nely's Salon Management System
 * Admin Dashboard Controller
 * Aggregates statistics, KPI metrics, today's schedule, charts, and recent customers.
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/models/Booking.php';
require_once dirname(__DIR__) . '/models/Service.php';
require_once dirname(__DIR__) . '/models/CustomerProfile.php';
require_once dirname(__DIR__) . '/models/Notification.php';
require_once dirname(__DIR__) . '/models/Message.php';

class DashboardController {
    public function stats(): void {
        RoleMiddleware::requireAdmin();

        $pdo = Database::getConnection();
        $today = date('Y-m-d');
        $currentMonthStart = date('Y-m-01');

        // 1. Sidebar Badges (Only Appointments, Notifications, Messages)
        $pendingApptsCount = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE status = 'pending'")->fetchColumn();
        $unreadNotifsCount = (int)$pdo->query("SELECT COUNT(*) FROM notifications WHERE is_read = 0 OR is_read IS NULL")->fetchColumn();
        $unreadMsgsCount   = (int)$pdo->query("SELECT COUNT(*) FROM messages WHERE sender = 'customer' AND status != 'read'")->fetchColumn();

        $counts = [
            'appointments'  => $pendingApptsCount,
            'notifications' => $unreadNotifsCount,
            'messages'      => $unreadMsgsCount,
        ];

        // 2. Summary Cards
        // Today's appointments count & breakdown
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_today,
                SUM(CASE WHEN TIME(booking_time) < '12:00:00' THEN 1 ELSE 0 END) as morning_count,
                SUM(CASE WHEN TIME(booking_time) >= '12:00:00' THEN 1 ELSE 0 END) as afternoon_count
            FROM bookings 
            WHERE booking_date = :today
        ");
        $stmt->execute(['today' => $today]);
        $todayApptsData = $stmt->fetch();
        $todayApptsCount = (int)($todayApptsData['total_today'] ?? 0);
        $morningCount = (int)($todayApptsData['morning_count'] ?? 0);
        $afternoonCount = (int)($todayApptsData['afternoon_count'] ?? 0);

        // Total Customers and Month Growth
        $totalCustomers = $counts['customers'];
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role = 'customer' AND created_at >= :month_start");
        $stmt->execute(['month_start' => $currentMonthStart]);
        $newCustomersThisMonth = (int)$stmt->fetchColumn();

        // Today's Revenue and Breakdown (from sales or paid bookings)
        $stmt = $pdo->prepare("
            SELECT 
                COALESCE(SUM(amount), 0) as total_rev,
                COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%gcash%' THEN amount ELSE 0 END), 0) as gcash_rev,
                COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%cash%' THEN amount ELSE 0 END), 0) as cash_rev
            FROM sales 
            WHERE transaction_date = :today
        ");
        $stmt->execute(['today' => $today]);
        $todayRevData = $stmt->fetch();
        $todayRevenue = (float)($todayRevData['total_rev'] ?? 0);
        $gcashRevenue = (float)($todayRevData['gcash_rev'] ?? 0);
        $cashRevenue  = (float)($todayRevData['cash_rev'] ?? 0);

        // Pending Appointments
        $stmt = $pdo->query("SELECT COUNT(*) FROM bookings WHERE status = 'pending'");
        $pendingApptsCount = (int)$stmt->fetchColumn();

        // 3. Status Breakdown (Confirmed, Pending, Completed, Cancelled)
        $stmt = $pdo->query("
            SELECT 
                status,
                COUNT(*) as count
            FROM bookings
            GROUP BY status
        ");
        $statusCounts = [
            'confirmed' => 0,
            'pending'   => 0,
            'completed' => 0,
            'cancelled' => 0,
            'no_show'   => 0
        ];
        $totalBookingsAll = 0;
        while ($row = $stmt->fetch()) {
            $st = $row['status'];
            $cnt = (int)$row['count'];
            $statusCounts[$st] = $cnt;
            $totalBookingsAll += $cnt;
        }

        // 4. Today's Appointments List (or upcoming today)
        $stmt = $pdo->prepare("
            SELECT b.*, 
                   s.name as service_name, s.code as service_code, s.category as service_category,
                   COALESCE(cp.full_name, u.email, 'Valued Client') as customer_name, 
                   COALESCE(u.phone, '') as customer_phone,
                   st.name as staff_name, p.status as payment_status, p.payment_method
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users u ON b.customer_id = u.id
            LEFT JOIN customer_profiles cp ON u.id = cp.user_id
            LEFT JOIN staff st ON b.staff_id = st.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE b.booking_date = :today
            ORDER BY b.booking_time ASC
            LIMIT 20
        ");
        $stmt->execute(['today' => $today]);
        $todayAppointments = $stmt->fetchAll();

        // Fallback: If no appointments strictly today in a fresh/demo environment, fetch the latest 5 bookings so the schedule isn't just an empty black hole unless desired
        $isActualToday = count($todayAppointments) > 0;
        if (!$isActualToday) {
            $stmt = $pdo->query("
                SELECT b.*, 
                       s.name as service_name, s.code as service_code, s.category as service_category,
                       COALESCE(cp.full_name, u.email, 'Valued Client') as customer_name, 
                       COALESCE(u.phone, '') as customer_phone,
                       st.name as staff_name, p.status as payment_status, p.payment_method
                FROM bookings b
                JOIN services s ON b.service_id = s.id
                JOIN users u ON b.customer_id = u.id
                LEFT JOIN customer_profiles cp ON u.id = cp.user_id
                LEFT JOIN staff st ON b.staff_id = st.id
                LEFT JOIN payments p ON b.id = p.booking_id
                ORDER BY b.booking_date DESC, b.booking_time DESC
                LIMIT 5
            ");
            $todayAppointments = $stmt->fetchAll();
        }

        // 5. Recent Customers List (last 5)
        $stmt = $pdo->query("
            SELECT cp.full_name, cp.user_id, u.email, u.phone, u.created_at,
                   b.booking_date as last_visit, b.status as last_status, s.name as last_service
            FROM customer_profiles cp
            JOIN users u ON cp.user_id = u.id
            LEFT JOIN bookings b ON b.id = (
                SELECT b2.id FROM bookings b2 
                WHERE b2.customer_id = u.id 
                ORDER BY b2.booking_date DESC, b2.booking_time DESC 
                LIMIT 1
            )
            LEFT JOIN services s ON b.service_id = s.id
            WHERE u.role = 'customer'
            ORDER BY cp.created_at DESC
            LIMIT 50
        ");
        $recentCustomers = $stmt->fetchAll();

        // 6. Popular Services (Top 5 by booking count)
        $stmt = $pdo->query("
            SELECT s.id, s.name, s.category, s.price, COUNT(b.id) as booking_count
            FROM services s
            LEFT JOIN bookings b ON s.id = b.service_id
            WHERE s.is_active = 1
            GROUP BY s.id, s.name, s.category, s.price
            ORDER BY booking_count DESC, s.name ASC
            LIMIT 5
        ");
        $popularServices = $stmt->fetchAll();

        // 7. Comprehensive Revenue Summary across timeframes (Today, Week, Month, Year)
        $currentYear = date('Y');

        // Today's breakdown
        $todayBars = [
            ['label' => 'GCash', 'amount' => $gcashRevenue],
            ['label' => 'Cash', 'amount' => $cashRevenue],
        ];

        // Week (Last 7 days, ending today)
        $weekDays = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-$i days"));
            $dayName = date('D', strtotime($d)); // e.g. Mon, Tue
            $weekDays[$d] = [
                'date'   => $d,
                'label'  => $dayName,
                'amount' => 0.00
            ];
        }

        $stmt = $pdo->prepare("
            SELECT 
                DATE(transaction_date) as t_date,
                COALESCE(SUM(amount), 0) as daily_sum
            FROM sales
            WHERE transaction_date >= DATE_SUB(:today, INTERVAL 6 DAY)
            GROUP BY DATE(transaction_date)
        ");
        $stmt->execute(['today' => $today]);
        while ($row = $stmt->fetch()) {
            if (isset($weekDays[$row['t_date']])) {
                $weekDays[$row['t_date']]['amount'] = (float)$row['daily_sum'];
            }
        }
        $weekBars = array_values($weekDays);
        $weekTotal = array_sum(array_column($weekBars, 'amount'));

        // Month (Weeks 1 to 4 of the current month)
        $monthWeeks = [
            'Wk 1' => 0.00,
            'Wk 2' => 0.00,
            'Wk 3' => 0.00,
            'Wk 4' => 0.00
        ];
        $stmt = $pdo->prepare("
            SELECT 
                DAY(transaction_date) as d_day,
                amount
            FROM sales
            WHERE transaction_date >= :month_start AND transaction_date <= LAST_DAY(:today)
        ");
        $stmt->execute(['month_start' => $currentMonthStart, 'today' => $today]);
        $monthTotal = 0.00;
        while ($row = $stmt->fetch()) {
            $day = (int)$row['d_day'];
            $amt = (float)$row['amount'];
            $monthTotal += $amt;
            if ($day <= 7) {
                $monthWeeks['Wk 1'] += $amt;
            } elseif ($day <= 14) {
                $monthWeeks['Wk 2'] += $amt;
            } elseif ($day <= 21) {
                $monthWeeks['Wk 3'] += $amt;
            } else {
                $monthWeeks['Wk 4'] += $amt;
            }
        }
        $monthBars = [];
        foreach ($monthWeeks as $label => $amt) {
            $monthBars[] = ['label' => $label, 'amount' => $amt];
        }

        // Year (Quarters Q1 to Q4 of current year)
        $yearQuarters = [
            'Q1' => 0.00,
            'Q2' => 0.00,
            'Q3' => 0.00,
            'Q4' => 0.00
        ];
        $stmt = $pdo->prepare("
            SELECT 
                QUARTER(transaction_date) as q_num,
                COALESCE(SUM(amount), 0) as q_sum
            FROM sales
            WHERE YEAR(transaction_date) = :year
            GROUP BY QUARTER(transaction_date)
        ");
        $stmt->execute(['year' => $currentYear]);
        $yearTotal = 0.00;
        while ($row = $stmt->fetch()) {
            $q = (int)$row['q_num'];
            $amt = (float)$row['q_sum'];
            $yearTotal += $amt;
            $qKey = 'Q' . $q;
            if (isset($yearQuarters[$qKey])) {
                $yearQuarters[$qKey] = $amt;
            }
        }
        $yearBars = [];
        foreach ($yearQuarters as $label => $amt) {
            $yearBars[] = ['label' => $label, 'amount' => $amt];
        }

        // All active services & staff for modal selects
        $servicesList = Service::all(true);
        $staffList = $pdo->query("SELECT id, name, role FROM staff WHERE is_active = 1 ORDER BY name ASC")->fetchAll();

        // Recent Notifications for the Modal
        $notifications = Notification::allWithDetails(['category' => 'all']);

        Response::success([
            'date' => [
                'raw'       => $today,
                'formatted' => date('F j, Y'),
                'is_actual_today_data' => $isActualToday,
            ],
            'badges'               => $counts,
            'new_appointments'     => $pendingApptsCount,
            'pending_appointments' => $pendingApptsCount,
            'total_appointments'   => (int)$pdo->query("SELECT COUNT(*) FROM bookings")->fetchColumn(),
            'total_customers'      => $totalCustomers,
            'total_services'       => (int)$pdo->query("SELECT COUNT(*) FROM services WHERE is_active = 1")->fetchColumn(),
            'total_staff'          => (int)$pdo->query("SELECT COUNT(*) FROM staff WHERE is_active = 1")->fetchColumn(),
            'unread_notifications' => $unreadNotifsCount,
            'unread_messages'      => $unreadMsgsCount,
            'summary' => [
                'today_appointments' => $todayApptsCount,
                'morning_count'      => $morningCount,
                'afternoon_count'    => $afternoonCount,
                'total_customers'    => $totalCustomers,
                'new_customers_month'=> $newCustomersThisMonth,
                'today_revenue'      => $todayRevenue,
                'gcash_revenue'      => $gcashRevenue,
                'cash_revenue'       => $cashRevenue,
                'pending_appts'      => $pendingApptsCount,
            ],
            'status_breakdown' => [
                'total'     => $totalBookingsAll,
                'confirmed' => $statusCounts['confirmed'],
                'pending'   => $statusCounts['pending'],
                'completed' => $statusCounts['completed'],
                'cancelled' => $statusCounts['cancelled'],
                'no_show'   => $statusCounts['no_show'],
            ],
            'today_appointments' => $todayAppointments,
            'recent_customers'   => $recentCustomers,
            'revenue_summary'    => [
                'today_total' => $todayRevenue,
                'today_bars'  => $todayBars,
                'week_total'  => $weekTotal,
                'week_bars'   => $weekBars,
                'month_total' => $monthTotal,
                'month_bars'  => $monthBars,
                'year_total'  => $yearTotal,
                'year_bars'   => $yearBars,
            ],
            'form_options' => [
                'services' => $servicesList,
                'staff'    => $staffList,
            ],
            'notifications' => $notifications,
        ]);
    }
}
