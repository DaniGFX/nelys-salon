<?php
/**
 * Nely's Salon Management System
 * Admin Dashboard Controller
 * Aggregates live statistics, KPI metrics, today's schedule, charts, popular services, and customer records from the database.
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

        // 1. Sidebar Badges
        $pendingApptsCount = 0;
        $unreadNotifsCount = 0;
        $unreadMsgsCount   = 0;

        try {
            $pendingApptsCount = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE status = 'pending'")->fetchColumn();
        } catch (Exception $e) {}

        try {
            $unreadNotifsCount = (int)$pdo->query("SELECT COUNT(*) FROM notifications WHERE is_read = 0 OR is_read IS NULL")->fetchColumn();
        } catch (Exception $e) {
            try {
                $unreadNotifsCount = (int)$pdo->query("SELECT COUNT(*) FROM notifications WHERE status = 'pending'")->fetchColumn();
            } catch (Exception $e2) {}
        }

        try {
            $unreadMsgsCount = (int)$pdo->query("SELECT COUNT(*) FROM messages WHERE sender = 'customer' AND status != 'read'")->fetchColumn();
        } catch (Exception $e) {}

        $badges = [
            'pending_appointments' => $pendingApptsCount,
            'unread_notifications' => $unreadNotifsCount,
            'unread_messages'      => $unreadMsgsCount,
            'appointments'         => $pendingApptsCount,
            'notifications'        => $unreadNotifsCount,
            'messages'             => $unreadMsgsCount,
        ];

        // 2. Summary KPI Cards
        // Today's appointments count & breakdown
        $todayApptsCount = 0;
        $morningCount = 0;
        $afternoonCount = 0;

        try {
            $stmt = $pdo->prepare("
                SELECT 
                    COUNT(*) as total_today,
                    SUM(CASE WHEN TIME(booking_time) < '12:00:00' THEN 1 ELSE 0 END) as morning_count,
                    SUM(CASE WHEN TIME(booking_time) >= '12:00:00' THEN 1 ELSE 0 END) as afternoon_count
                FROM bookings 
                WHERE booking_date = :today
            ");
            $stmt->execute(['today' => $today]);
            $todayApptsData = $stmt->fetch(PDO::FETCH_ASSOC);
            $todayApptsCount = (int)($todayApptsData['total_today'] ?? 0);
            $morningCount = (int)($todayApptsData['morning_count'] ?? 0);
            $afternoonCount = (int)($todayApptsData['afternoon_count'] ?? 0);
        } catch (Exception $e) {}

        // Total Customers and Month Growth
        $totalCustomers = 0;
        $newCustomersThisMonth = 0;

        try {
            $totalCustomers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'customer'")->fetchColumn();
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role = 'customer' AND created_at >= :month_start");
            $stmt->execute(['month_start' => $currentMonthStart]);
            $newCustomersThisMonth = (int)$stmt->fetchColumn();
        } catch (Exception $e) {}

        // Today's Revenue and Breakdown (from sales / payments)
        $todayRevenue = 0.00;
        $gcashRevenue = 0.00;
        $cashRevenue  = 0.00;

        try {
            $stmt = $pdo->prepare("
                SELECT 
                    COALESCE(SUM(amount), 0) as total_rev,
                    COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%gcash%' THEN amount ELSE 0 END), 0) as gcash_rev,
                    COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%cash%' THEN amount ELSE 0 END), 0) as cash_rev
                FROM sales 
                WHERE transaction_date = :today
            ");
            $stmt->execute(['today' => $today]);
            $todayRevData = $stmt->fetch(PDO::FETCH_ASSOC);
            $todayRevenue = (float)($todayRevData['total_rev'] ?? 0);
            $gcashRevenue = (float)($todayRevData['gcash_rev'] ?? 0);
            $cashRevenue  = (float)($todayRevData['cash_rev'] ?? 0);
        } catch (Exception $e) {
            // Fallback to payments table if sales table is not populated
            try {
                $stmt = $pdo->prepare("
                    SELECT 
                        COALESCE(SUM(amount), 0) as total_rev,
                        COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%gcash%' THEN amount ELSE 0 END), 0) as gcash_rev,
                        COALESCE(SUM(CASE WHEN LOWER(payment_method) LIKE '%cash%' THEN amount ELSE 0 END), 0) as cash_rev
                    FROM payments 
                    WHERE status = 'paid' AND DATE(paid_at) = :today
                ");
                $stmt->execute(['today' => $today]);
                $todayRevData = $stmt->fetch(PDO::FETCH_ASSOC);
                $todayRevenue = (float)($todayRevData['total_rev'] ?? 0);
                $gcashRevenue = (float)($todayRevData['gcash_rev'] ?? 0);
                $cashRevenue  = (float)($todayRevData['cash_rev'] ?? 0);
            } catch (Exception $e2) {}
        }

        // 3. Status Breakdown
        $rawStatusCounts = [
            'confirmed' => 0,
            'pending'   => 0,
            'completed' => 0,
            'cancelled' => 0
        ];
        $totalBookingsAll = 0;

        try {
            $stmt = $pdo->query("
                SELECT 
                    status,
                    COUNT(*) as count
                FROM bookings
                GROUP BY status
            ");
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $st = strtolower($row['status'] ?? '');
                $cnt = (int)($row['count'] ?? 0);
                if (isset($rawStatusCounts[$st])) {
                    $rawStatusCounts[$st] = $cnt;
                }
                $totalBookingsAll += $cnt;
            }
        } catch (Exception $e) {}

        $statusBreakdown = [
            'total' => $totalBookingsAll,
            'confirmed' => [
                'count' => $rawStatusCounts['confirmed'],
                'percentage' => $totalBookingsAll > 0 ? round(($rawStatusCounts['confirmed'] / $totalBookingsAll) * 100) : 0
            ],
            'pending' => [
                'count' => $rawStatusCounts['pending'],
                'percentage' => $totalBookingsAll > 0 ? round(($rawStatusCounts['pending'] / $totalBookingsAll) * 100) : 0
            ],
            'completed' => [
                'count' => $rawStatusCounts['completed'],
                'percentage' => $totalBookingsAll > 0 ? round(($rawStatusCounts['completed'] / $totalBookingsAll) * 100) : 0
            ],
            'cancelled' => [
                'count' => $rawStatusCounts['cancelled'],
                'percentage' => $totalBookingsAll > 0 ? round(($rawStatusCounts['cancelled'] / $totalBookingsAll) * 100) : 0
            ]
        ];

        // 4. Today's Appointments List (Strictly today's date from database)
        $todayAppointments = [];
        try {
            $stmt = $pdo->prepare("
                SELECT b.id, b.reference_no, b.booking_date, b.booking_time, b.status, b.notes,
                       COALESCE(b.total_price, s.price, 0.00) as price,
                       s.name as service_name, s.code as service_code, s.category as service_category,
                       COALESCE(cp.full_name, u.email, 'Valued Client') as customer_name, 
                       COALESCE(u.phone, '') as customer_phone,
                       COALESCE(u.email, '') as customer_email,
                       st.name as staff_name, 
                       COALESCE(p.status, 'unpaid') as payment_status, 
                       p.payment_method
                FROM bookings b
                LEFT JOIN services s ON b.service_id = s.id
                LEFT JOIN users u ON b.customer_id = u.id
                LEFT JOIN customer_profiles cp ON u.id = cp.user_id
                LEFT JOIN staff st ON b.staff_id = st.id
                LEFT JOIN payments p ON b.id = p.booking_id
                WHERE b.booking_date = :today
                ORDER BY b.booking_time ASC
            ");
            $stmt->execute(['today' => $today]);
            $todayAppointments = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Exception $e) {
            error_log('[DashboardController] Error fetching today appointments: ' . $e->getMessage());
        }

        // 5. Recent Customers List (With real visits and spendings from database)
        $recentCustomers = [];
        try {
            $stmt = $pdo->query("
                SELECT 
                    u.id as user_id,
                    COALESCE(cp.full_name, u.email) as name,
                    u.email,
                    COALESCE(u.phone, '') as phone,
                    (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id) as total_visits,
                    (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN bookings b ON p.booking_id = b.id WHERE b.customer_id = u.id AND p.status = 'paid') as total_spent,
                    u.created_at
                FROM users u
                LEFT JOIN customer_profiles cp ON u.id = cp.user_id
                WHERE u.role = 'customer'
                ORDER BY total_visits DESC, u.created_at DESC
                LIMIT 10
            ");
            $recentCustomers = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Exception $e) {
            error_log('[DashboardController] Error fetching recent customers: ' . $e->getMessage());
        }

        // 6. Popular Services (Ranked dynamically by actual bookings in database)
        $popularServices = [];
        try {
            $stmt = $pdo->query("
                SELECT s.id, s.name, s.category, s.price, COUNT(b.id) as bookings_count
                FROM services s
                LEFT JOIN bookings b ON s.id = b.service_id
                WHERE s.is_active = 1
                GROUP BY s.id, s.name, s.category, s.price
                ORDER BY bookings_count DESC, s.name ASC
                LIMIT 4
            ");
            $popularServices = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $totalServiceBookings = array_sum(array_column($popularServices, 'bookings_count'));
            foreach ($popularServices as &$svc) {
                $svc['percentage'] = $totalServiceBookings > 0 ? round(($svc['bookings_count'] / $totalServiceBookings) * 100) : 0;
            }
        } catch (Exception $e) {}

        // 7. Dynamic Revenue Chart Summary
        $weekLabels = [];
        $weekValues = [];
        $weekTotal = 0.00;

        try {
            for ($i = 6; $i >= 0; $i--) {
                $d = date('Y-m-d', strtotime("-$i days"));
                $dayName = date('D', strtotime($d));
                $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM sales WHERE transaction_date = :d");
                $stmt->execute(['d' => $d]);
                $amt = (float)$stmt->fetchColumn();
                $weekLabels[] = $dayName;
                $weekValues[] = $amt;
                $weekTotal += $amt;
            }
        } catch (Exception $e) {}

        $monthWeeks = [0.00, 0.00, 0.00, 0.00];
        $monthTotal = 0.00;

        try {
            $stmt = $pdo->prepare("SELECT DAY(transaction_date) as d, amount FROM sales WHERE transaction_date >= :month_start AND transaction_date <= LAST_DAY(:today)");
            $stmt->execute(['month_start' => $currentMonthStart, 'today' => $today]);
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $d = (int)$row['d'];
                $amt = (float)$row['amount'];
                $monthTotal += $amt;
                if ($d <= 7) $monthWeeks[0] += $amt;
                elseif ($d <= 14) $monthWeeks[1] += $amt;
                elseif ($d <= 21) $monthWeeks[2] += $amt;
                else $monthWeeks[3] += $amt;
            }
        } catch (Exception $e) {}

        $revenueSummary = [
            'day' => [
                'labels' => ['GCash', 'Cash'],
                'values' => [$gcashRevenue, $cashRevenue],
                'total'  => $todayRevenue
            ],
            'week' => [
                'labels' => $weekLabels,
                'values' => $weekValues,
                'total'  => $weekTotal
            ],
            'month' => [
                'labels' => ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                'values' => $monthWeeks,
                'total'  => $monthTotal
            ]
        ];

        // 8. Active services & staff for modals
        $servicesList = [];
        $staffList = [];
        try {
            $servicesList = Service::all(true);
            $staffList = $pdo->query("SELECT id, name, role FROM staff WHERE is_active = 1 ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Exception $e) {}

        // 9. Recent notifications
        $notifications = [];
        try {
            $notifications = Notification::allWithDetails(['category' => 'all']);
        } catch (Exception $e) {
            try {
                $notifications = $pdo->query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC) ?: [];
            } catch (Exception $e2) {}
        }

        Response::success([
            'date' => date('l, F j, Y'),
            'badges' => $badges,
            'cards' => [
                'today_appointments_count' => $todayApptsCount,
                'today_morning_count'      => $morningCount,
                'today_afternoon_count'    => $afternoonCount,
                'total_customers_count'    => $totalCustomers,
                'new_customers_this_month' => $newCustomersThisMonth,
                'today_revenue'            => $todayRevenue,
                'today_gcash_revenue'      => $gcashRevenue,
                'today_cash_revenue'       => $cashRevenue,
                'pending_appointments_count'=> $pendingApptsCount,
            ],
            'status_breakdown'    => $statusBreakdown,
            'today_appointments'  => $todayAppointments,
            'recent_customers'    => $recentCustomers,
            'popular_services'    => $popularServices,
            'revenue_summary'     => $revenueSummary,
            'form_options'        => [
                'services' => $servicesList,
                'staff'    => $staffList,
            ],
            'notifications'       => $notifications,
        ]);
    }
}
