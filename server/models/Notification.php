<?php
/**
 * Nely's Salon Management System
 * Notification Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class Notification {
    public static function allWithDetails(array $filters = []): array {
        $pdo = Database::getConnection();

        $sql = "
            SELECT n.*, 
                   u.email AS user_email, 
                   cp.full_name AS customer_name
            FROM notifications n
            LEFT JOIN users u ON n.user_id = u.id
            LEFT JOIN customer_profiles cp ON u.id = cp.user_id
            WHERE 1=1
        ";

        $params = [];

        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $sql .= " AND n.category = :category";
            $params['category'] = strtolower(trim($filters['category']));
        }

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            if ($filters['status'] === 'unread') {
                $sql .= " AND (n.is_read = 0 OR n.is_read IS NULL)";
            } elseif ($filters['status'] === 'read') {
                $sql .= " AND n.is_read = 1";
            }
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (n.title LIKE :search OR n.message LIKE :search)";
            $params['search'] = '%' . trim($filters['search']) . '%';
        }

        $sql .= " ORDER BY n.created_at DESC, n.id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        return array_map([self::class, 'formatRow'], $rows);
    }

    public static function getSummaryMetrics(): array {
        $pdo = Database::getConnection();

        $total = (int)$pdo->query("SELECT COUNT(*) FROM notifications")->fetchColumn();
        $unread = (int)$pdo->query("SELECT COUNT(*) FROM notifications WHERE is_read = 0 OR is_read IS NULL")->fetchColumn();
        $appointments = (int)$pdo->query("SELECT COUNT(*) FROM notifications WHERE category = 'appointments'")->fetchColumn();
        $payments = (int)$pdo->query("SELECT COUNT(*) FROM notifications WHERE category = 'payments'")->fetchColumn();
        $customers = (int)$pdo->query("SELECT COUNT(*) FROM notifications WHERE category = 'customers'")->fetchColumn();
        $system = (int)$pdo->query("SELECT COUNT(*) FROM notifications WHERE category = 'system'")->fetchColumn();

        return [
            'total'        => $total,
            'unread'       => $unread,
            'appointments' => $appointments,
            'payments'     => $payments,
            'customers'    => $customers,
            'system'       => $system,
        ];
    }

    public static function findById(int $id): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM notifications WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::formatRow($row) : null;
    }

    public static function markRead(int $id, bool $isRead = true): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE notifications SET is_read = :is_read WHERE id = :id");
        return $stmt->execute([
            'is_read' => $isRead ? 1 : 0,
            'id'      => $id
        ]);
    }

    public static function markAllRead(): bool {
        $pdo = Database::getConnection();
        return (bool)$pdo->exec("UPDATE notifications SET is_read = 1 WHERE is_read = 0 OR is_read IS NULL");
    }

    public static function delete(int $id): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("DELETE FROM notifications WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    public static function create(array $data): int {
        $pdo = Database::getConnection();

        $userId = !empty($data['user_id']) ? (int)$data['user_id'] : 1;
        $bookingId = !empty($data['booking_id']) ? (int)$data['booking_id'] : null;
        $category = strtolower(trim($data['category'] ?? 'appointments'));
        $title = trim($data['title'] ?? 'Notification');
        $message = trim($data['message'] ?? '');
        $actionUrl = trim($data['action_url'] ?? '');
        $channel = in_array($data['channel'] ?? '', ['email', 'sms']) ? $data['channel'] : 'email';
        $status = in_array($data['status'] ?? '', ['pending', 'sent', 'failed']) ? $data['status'] : 'sent';

        $stmt = $pdo->prepare("
            INSERT INTO notifications (user_id, booking_id, category, title, message, action_url, channel, status, is_read, created_at)
            VALUES (:user_id, :booking_id, :category, :title, :message, :action_url, :channel, :status, 0, NOW())
        ");

        $stmt->execute([
            'user_id'    => $userId,
            'booking_id' => $bookingId,
            'category'   => $category,
            'title'      => $title,
            'message'    => $message,
            'action_url' => $actionUrl,
            'channel'    => $channel,
            'status'     => $status,
        ]);

        return (int)$pdo->lastInsertId();
    }

    public static function getPreferences(): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT setting_value FROM business_settings WHERE setting_key = 'notification_preferences'");
        $stmt->execute();
        $val = $stmt->fetchColumn();

        $defaults = [
            'newBooking'        => true,
            'apptConfirmation'  => true,
            'apptCancellation'  => true,
            'apptRescheduling'  => true,
            'paymentReceived'   => true,
            'pendingPayment'    => true,
            'newCustomer'       => true,
        ];

        if ($val) {
            $decoded = json_decode($val, true);
            if (is_array($decoded)) {
                return array_merge($defaults, $decoded);
            }
        }

        return $defaults;
    }

    public static function savePreferences(array $prefs): bool {
        $pdo = Database::getConnection();
        $json = json_encode($prefs);

        $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM business_settings WHERE setting_key = 'notification_preferences'");
        $stmtCheck->execute();
        $exists = (int)$stmtCheck->fetchColumn() > 0;

        if ($exists) {
            $stmt = $pdo->prepare("UPDATE business_settings SET setting_value = :val, updated_at = NOW() WHERE setting_key = 'notification_preferences'");
            return $stmt->execute(['val' => $json]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO business_settings (setting_key, setting_value, updated_at) VALUES ('notification_preferences', :val, NOW())");
            return $stmt->execute(['val' => $json]);
        }
    }

    private static function formatRow(array $row): array {
        $dt = new DateTime($row['created_at']);
        $now = new DateTime();
        $diffSeconds = max(0, $now->getTimestamp() - $dt->getTimestamp());

        // Relative timestamp
        if ($diffSeconds < 60) {
            $relativeTime = 'Just now';
        } elseif ($diffSeconds < 3600) {
            $mins = max(1, (int)floor($diffSeconds / 60));
            $relativeTime = "{$mins} minute" . ($mins === 1 ? '' : 's') . " ago";
        } elseif ($diffSeconds < 86400) {
            $hours = (int)floor($diffSeconds / 3600);
            $relativeTime = "{$hours} hour" . ($hours === 1 ? '' : 's') . " ago";
        } elseif ($diffSeconds < 172800) {
            $relativeTime = 'Yesterday';
        } else {
            $relativeTime = $dt->format('M j');
        }

        $dateFormatted = $dt->format('M j, Y');
        $timeFormatted = $dt->format('g:i A');

        $category = strtolower($row['category'] ?: 'appointments');
        if (!in_array($category, ['appointments', 'payments', 'customers', 'system'])) {
            $category = 'appointments';
        }

        // Action Text and Action URL
        $actionText = 'View Details';
        $actionUrl = 'dashboard.html';

        if ($category === 'appointments') {
            $actionText = 'View Appointment';
            $actionUrl = 'appointments.html';
        } elseif ($category === 'payments') {
            $actionText = 'View Payment';
            $actionUrl = 'payments.html';
        } elseif ($category === 'customers') {
            $actionText = 'View Profile';
            $actionUrl = 'customers.html';
        } elseif ($category === 'system') {
            $actionText = 'System Health';
            $actionUrl = 'settings.html';
        }

        if (!empty($row['action_url'])) {
            $actionUrl = $row['action_url'];
        }

        // Icons and Colors
        $titleLower = strtolower($row['title']);
        $icon = 'fa-bell';
        $iconColor = 'text-stone-600 bg-stone-100 border-stone-200';

        if ($category === 'appointments') {
            if (str_contains($titleLower, 'cancel')) {
                $icon = 'fa-calendar-xmark';
                $iconColor = 'text-rose-600 bg-rose-50 border-rose-200';
            } elseif (str_contains($titleLower, 'resched')) {
                $icon = 'fa-clock-rotate-left';
                $iconColor = 'text-amber-600 bg-amber-50 border-amber-200';
            } elseif (str_contains($titleLower, 'confirm')) {
                $icon = 'fa-calendar-check';
                $iconColor = 'text-blue-600 bg-blue-50 border-blue-200';
            } else {
                $icon = 'fa-calendar-plus';
                $iconColor = 'text-blue-600 bg-blue-50 border-blue-200';
            }
        } elseif ($category === 'payments') {
            if (str_contains($titleLower, 'refund')) {
                $icon = 'fa-arrow-rotate-left';
                $iconColor = 'text-rose-600 bg-rose-50 border-rose-200';
            } elseif (str_contains($titleLower, 'pending')) {
                $icon = 'fa-clock';
                $iconColor = 'text-amber-600 bg-amber-50 border-amber-200';
            } else {
                $icon = 'fa-money-bill-wave';
                $iconColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
            }
        } elseif ($category === 'customers') {
            $icon = 'fa-user-plus';
            $iconColor = 'text-indigo-600 bg-indigo-50 border-indigo-200';
        } elseif ($category === 'system') {
            if (str_contains($titleLower, 'backup') || str_contains($titleLower, 'server')) {
                $icon = 'fa-server';
            } elseif (str_contains($titleLower, 'price') || str_contains($titleLower, 'service')) {
                $icon = 'fa-gear';
            } else {
                $icon = 'fa-sliders';
            }
            $iconColor = 'text-stone-600 bg-stone-100 border-stone-200';
        }

        return [
            'id'         => (int)$row['id'],
            'user_id'    => (int)$row['user_id'],
            'booking_id' => $row['booking_id'] ? (int)$row['booking_id'] : null,
            'category'   => $category,
            'title'      => $row['title'],
            'details'    => $row['message'],
            'message'    => $row['message'],
            'actionText' => $actionText,
            'actionUrl'  => $actionUrl,
            'channel'    => $row['channel'],
            'status'     => $row['status'],
            'isUnread'   => empty($row['is_read']),
            'is_read'    => (int)($row['is_read'] ?? 0),
            'timestamp'  => $relativeTime,
            'date'       => $dateFormatted,
            'time'       => $timeFormatted,
            'created_at' => $row['created_at'],
            'icon'       => $icon,
            'iconColor'  => $iconColor,
        ];
    }
}
