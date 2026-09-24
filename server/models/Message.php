<?php
/**
 * Nely's Salon Management System
 * Message Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class Message {
    /**
     * Retrieve conversation stream for a user
     */
    public static function findByUser(int $userId, int $limit = 100): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT * FROM messages 
            WHERE user_id = :uid 
            ORDER BY created_at ASC 
            LIMIT :limit
        ");
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Find single message by ID
     */
    public static function findById(int $id): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM messages WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Store new message
     */
    public static function create(array $data): int {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO messages (user_id, sender, sender_name, text, attachment_name, attachment_url, status, created_at)
            VALUES (:user_id, :sender, :sender_name, :text, :attachment_name, :attachment_url, :status, :created_at)
        ");
        $stmt->execute([
            'user_id'         => $data['user_id'],
            'sender'          => $data['sender'] ?? 'customer',
            'sender_name'     => $data['sender_name'] ?? 'Client',
            'text'            => $data['text'],
            'attachment_name' => $data['attachment_name'] ?? null,
            'attachment_url'  => $data['attachment_url'] ?? null,
            'status'          => $data['status'] ?? 'sent',
            'created_at'      => $data['created_at'] ?? date('Y-m-d H:i:s'),
        ]);
        return (int)$pdo->lastInsertId();
    }

    /**
     * Delete a single message for a user
     */
    public static function deleteForUser(int $id, int $userId): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("DELETE FROM messages WHERE id = :id AND user_id = :uid");
        return $stmt->execute(['id' => $id, 'uid' => $userId]);
    }

    /**
     * Delete single message as admin
     */
    public static function delete(int $id): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("DELETE FROM messages WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    /**
     * Clear all chat history for a customer
     */
    public static function clearAllForUser(int $userId): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("DELETE FROM messages WHERE user_id = :uid");
        return $stmt->execute(['uid' => $userId]);
    }

    /**
     * Mark all unread salon messages as read for a customer
     */
    public static function markAllReadForUser(int $userId): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            UPDATE messages 
            SET status = 'read' 
            WHERE user_id = :uid AND sender = 'salon' AND status != 'read'
        ");
        return $stmt->execute(['uid' => $userId]);
    }

    /**
     * Mark all customer messages as read (when viewed by Admin)
     */
    public static function markAllReadByAdmin(int $userId): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            UPDATE messages 
            SET status = 'read' 
            WHERE user_id = :uid AND sender = 'customer' AND status != 'read'
        ");
        return $stmt->execute(['uid' => $userId]);
    }

    /**
     * Count unread messages from salon for a customer
     */
    public static function getUnreadCount(int $userId): int {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT COUNT(*) FROM messages 
            WHERE user_id = :uid AND sender = 'salon' AND status != 'read'
        ");
        $stmt->execute(['uid' => $userId]);
        return (int)$stmt->fetchColumn();
    }

    /**
     * Count all unread messages from customers for the Admin
     */
    public static function getAdminUnreadCount(): int {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("SELECT COUNT(*) FROM messages WHERE sender = 'customer' AND status != 'read'");
        return (int)$stmt->fetchColumn();
    }

    /**
     * Retrieve all customer conversations for Admin Dashboard
     */
    public static function getAdminConversations(string $search = '', string $filter = 'all'): array {
        $pdo = Database::getConnection();

        // 1. Fetch all customer users with profiles
        $sql = "
            SELECT 
                u.id as user_id,
                u.email,
                u.phone,
                u.created_at as user_created_at,
                cp.full_name,
                cp.home_address,
                cp.city,
                cp.notes
            FROM users u
            LEFT JOIN customer_profiles cp ON u.id = cp.user_id
            WHERE u.role = 'customer'
            ORDER BY u.id ASC
        ";
        $customers = $pdo->query($sql)->fetchAll();

        $conversations = [];

        foreach ($customers as $c) {
            $userId = (int)$c['user_id'];
            $fullName = trim($c['full_name'] ?: ($c['email'] ? explode('@', $c['email'])[0] : 'Customer'));

            // Fetch messages for this user
            $msgStmt = $pdo->prepare("SELECT * FROM messages WHERE user_id = :uid ORDER BY created_at ASC");
            $msgStmt->execute(['uid' => $userId]);
            $rawMessages = $msgStmt->fetchAll();

            // Calculate unread count for admin (customer messages not read yet)
            $unreadCount = 0;
            foreach ($rawMessages as $rm) {
                if ($rm['sender'] === 'customer' && $rm['status'] !== 'read') {
                    $unreadCount++;
                }
            }

            // Latest message & time formatting
            $lastMsg = !empty($rawMessages) ? end($rawMessages) : null;
            $lastTime = 'No activity';
            $lastTimestamp = $c['user_created_at'];

            if ($lastMsg) {
                $lastTimestamp = $lastMsg['created_at'];
                $msgDate = date('Y-m-d', strtotime($lastMsg['created_at']));
                $todayDate = date('Y-m-d');
                $yesterdayDate = date('Y-m-d', strtotime('-1 day'));

                if ($msgDate === $todayDate) {
                    $lastTime = date('g:i A', strtotime($lastMsg['created_at']));
                } elseif ($msgDate === $yesterdayDate) {
                    $lastTime = 'Yesterday';
                } else {
                    $lastTime = date('M j', strtotime($lastMsg['created_at']));
                }
            }

            // Upcoming appointment
            $apptStmt = $pdo->prepare("
                SELECT b.id, b.reference_no, b.booking_date, b.booking_time, b.total_price, b.status,
                       s.name as service_name,
                       COALESCE(st.name, 'Unassigned') as stylist_name,
                       COALESCE(st.role, 'Salon Stylist') as stylist_role
                FROM bookings b
                JOIN services s ON b.service_id = s.id
                LEFT JOIN staff st ON b.staff_id = st.id
                WHERE b.customer_id = :uid AND b.status IN ('pending', 'confirmed')
                ORDER BY b.booking_date ASC, b.booking_time ASC
                LIMIT 1
            ");
            $apptStmt->execute(['uid' => $userId]);
            $rawUpcoming = $apptStmt->fetch();

            $upcomingAppointment = null;
            $hasAppointment = !empty($rawUpcoming);

            if ($rawUpcoming) {
                $timeStr = strtotime($rawUpcoming['booking_date'] . ' ' . $rawUpcoming['booking_time']);
                $upcomingAppointment = [
                    'id'      => $rawUpcoming['reference_no'] ?: ('APPT-' . $rawUpcoming['id']),
                    'service' => $rawUpcoming['service_name'],
                    'date'    => date('M j, Y', $timeStr),
                    'time'    => date('g:i A', $timeStr),
                    'stylist' => $rawUpcoming['stylist_name'] . ($rawUpcoming['stylist_role'] ? ' (' . $rawUpcoming['stylist_role'] . ')' : ''),
                    'status'  => ucfirst($rawUpcoming['status']),
                    'price'   => '₱' . number_format((float)$rawUpcoming['total_price'], 2)
                ];
            }

            // Patron History summary
            $histStmt = $pdo->prepare("
                SELECT 
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_visits,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END), 0) as total_spent,
                    (
                        SELECT CONCAT(b2.booking_date, ' (', s2.name, ')')
                        FROM bookings b2
                        JOIN services s2 ON b2.service_id = s2.id
                        WHERE b2.customer_id = :uid2 AND b2.status = 'completed'
                        ORDER BY b2.booking_date DESC LIMIT 1
                    ) as last_visit
                FROM bookings 
                WHERE customer_id = :uid
            ");
            $histStmt->execute(['uid' => $userId, 'uid2' => $userId]);
            $rawHist = $histStmt->fetch();

            // Notes parsing
            $adminNotes = $c['notes'] ?: 'No specific admin notes recorded.';
            if (!empty($c['notes'])) {
                $decodedNotes = json_decode($c['notes'], true);
                if (is_array($decodedNotes) && !empty($decodedNotes)) {
                    $adminNotes = $decodedNotes[0]['text'] ?? $c['notes'];
                }
            }

            $history = [
                'totalVisits' => (int)($rawHist['total_visits'] ?? 0),
                'totalSpent'  => '₱' . number_format((float)($rawHist['total_spent'] ?? 0), 0),
                'lastVisit'   => $rawHist['last_visit'] ?: 'No previous visits',
                'notes'       => $adminNotes
            ];

            // Initials for avatar
            $nameParts = explode(' ', $fullName);
            $avatar = count($nameParts) > 1
                ? (mb_substr($nameParts[0], 0, 1) . mb_substr($nameParts[1], 0, 1))
                : mb_substr($fullName, 0, 2);
            $avatar = strtoupper($avatar);

            // Format message list
            $formattedMessages = array_map(function($m) {
                $timeTs = strtotime($m['created_at']);
                return [
                    'id'         => (int)$m['id'],
                    'sender'     => $m['sender'] === 'salon' ? 'admin' : 'customer',
                    'senderName' => $m['sender_name'],
                    'text'       => $m['text'],
                    'time'       => date('g:i A', $timeTs),
                    'date'       => date('M j, Y', $timeTs),
                    'status'     => $m['status'],
                    'attachment' => !empty($m['attachment_name']) ? [
                        'name' => $m['attachment_name'],
                        'url'  => $m['attachment_url']
                    ] : null
                ];
            }, $rawMessages);

            $conversations[] = [
                'id'                  => (string)$userId,
                'userId'              => $userId,
                'name'                => $fullName,
                'avatar'              => $avatar,
                'phone'               => $c['phone'] ?: 'N/A',
                'email'               => $c['email'] ?: '',
                'location'            => $c['home_address'] ?: ($c['city'] ?: 'Lagro, Quezon City'),
                'memberSince'         => 'Member since ' . date('Y', strtotime($c['user_created_at'])),
                'status'              => 'online', // Verified / Online client
                'isUnread'            => $unreadCount > 0,
                'unreadCount'         => $unreadCount,
                'isMuted'             => false,
                'hasAppointment'      => $hasAppointment,
                'lastTime'            => $lastTime,
                'lastTimestamp'       => $lastTimestamp,
                'upcomingAppointment' => $upcomingAppointment,
                'history'             => $history,
                'messages'            => $formattedMessages,
            ];
        }

        // Sort conversations: latest message / activity on top
        usort($conversations, function($a, $b) {
            return strtotime($b['lastTimestamp']) <=> strtotime($a['lastTimestamp']);
        });

        // Apply search & filter if passed
        if (!empty($search)) {
            $q = mb_strtolower(trim($search));
            $conversations = array_values(array_filter($conversations, function($conv) use ($q) {
                if (str_contains(mb_strtolower($conv['name']), $q)) return true;
                foreach ($conv['messages'] as $m) {
                    if (str_contains(mb_strtolower($m['text']), $q)) return true;
                }
                return false;
            }));
        }

        if ($filter === 'unread') {
            $conversations = array_values(array_filter($conversations, fn($c) => $c['isUnread']));
        } elseif ($filter === 'appointments') {
            $conversations = array_values(array_filter($conversations, fn($c) => $c['hasAppointment']));
        }

        return $conversations;
    }
}
