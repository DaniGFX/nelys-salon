<?php
/**
 * Nely's Salon Management System
 * Message Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class Message {
    private static bool $schemaChecked = false;

    /**
     * Ensure messages table schema is initialized
     */
    public static function ensureSchema(): void {
        if (self::$schemaChecked) return;
        self::$schemaChecked = true;
        try {
            $pdo = Database::getConnection();

            // Ensure table exists
            $pdo->exec("CREATE TABLE IF NOT EXISTS `messages` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `user_id` INT NOT NULL,
                `sender` VARCHAR(50) NOT NULL DEFAULT 'customer',
                `sender_name` VARCHAR(255) NOT NULL DEFAULT 'Client',
                `text` TEXT NOT NULL,
                `attachment_name` VARCHAR(255) NULL,
                `attachment_url` VARCHAR(255) NULL,
                `status` VARCHAR(50) NOT NULL DEFAULT 'sent',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_messages_user` (`user_id`),
                INDEX `idx_messages_status` (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // Ensure columns exist
            try { $pdo->exec("ALTER TABLE `messages` ADD COLUMN `sender_name` VARCHAR(255) NOT NULL DEFAULT 'Client' AFTER `sender`"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `messages` ADD COLUMN `attachment_name` VARCHAR(255) NULL AFTER `text`"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `messages` ADD COLUMN `attachment_url` VARCHAR(255) NULL AFTER `attachment_name`"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `messages` ADD COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'sent' AFTER `attachment_url`"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `messages` ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`"); } catch (Throwable $e) {}

        } catch (Throwable $e) {
            error_log('Message::ensureSchema Error: ' . $e->getMessage());
        }
    }

    /**
     * Check if a customer has an unanswered message that has been waiting for 10 minutes (600s) without an admin reply.
     * If so, automatically generate a salon auto-reply message: "We're currently busy, please leave a message..."
     */
    public static function checkAndTrigger10MinBusyReplies(?int $targetUserId = null): void {
        self::ensureSchema();
        try {
            $pdo = Database::getConnection();

            if ($targetUserId !== null) {
                $userIds = [$targetUserId];
            } else {
                $userStmt = $pdo->query("SELECT DISTINCT user_id FROM messages");
                $userIds = $userStmt->fetchAll(PDO::FETCH_COLUMN);
            }

            foreach ($userIds as $uid) {
                $uid = (int)$uid;
                if ($uid <= 0) continue;

                // Get the very last message in this conversation
                $stmt = $pdo->prepare("SELECT * FROM messages WHERE user_id = :uid ORDER BY created_at DESC, id DESC LIMIT 1");
                $stmt->execute(['uid' => $uid]);
                $lastMsg = $stmt->fetch();

                if (!$lastMsg) continue;

                // Only trigger if the latest message was sent by the customer
                if ($lastMsg['sender'] === 'customer') {
                    $createdTs = strtotime($lastMsg['created_at']);
                    $elapsedSeconds = time() - $createdTs;

                    // If 10 minutes (600 seconds) have elapsed without an admin reply
                    if ($elapsedSeconds >= 600) {
                        $busyText = "We're currently busy attending to clients, please leave your message and inquiries here and we will get back to you as soon as possible.";

                        // Check if a salon message was already sent on or after this customer message
                        $checkStmt = $pdo->prepare("
                            SELECT COUNT(*) FROM messages 
                            WHERE user_id = :uid 
                              AND sender = 'salon' 
                              AND (created_at >= :after_time OR id > :after_id)
                        ");
                        $checkStmt->execute([
                            'uid'        => $uid,
                            'after_time' => $lastMsg['created_at'],
                            'after_id'   => $lastMsg['id']
                        ]);
                        $alreadySent = (int)$checkStmt->fetchColumn();

                        if ($alreadySent === 0) {
                            // Insert the automated "we're busy" response
                            self::create([
                                'user_id'     => $uid,
                                'sender'      => 'salon',
                                'sender_name' => "Nely's Salon",
                                'text'        => $busyText,
                                'status'      => 'sent',
                                'created_at'  => date('Y-m-d H:i:s')
                            ]);
                        }
                    }
                }
            }
        } catch (Throwable $e) {
            error_log('Message::checkAndTrigger10MinBusyReplies Error: ' . $e->getMessage());
        }
    }

    /**
     * Retrieve conversation stream for a user
     */
    public static function findByUser(int $userId, int $limit = 100): array {
        self::ensureSchema();
        self::checkAndTrigger10MinBusyReplies($userId);

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            SELECT * FROM messages 
            WHERE user_id = :uid 
            ORDER BY created_at ASC, id ASC 
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
        self::ensureSchema();
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
        self::ensureSchema();
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
        self::ensureSchema();
        self::checkAndTrigger10MinBusyReplies();
        
        try {
            $pdo = Database::getConnection();
        } catch (Throwable $e) {
            error_log('Message::getAdminConversations DB connection error: ' . $e->getMessage());
            return [];
        }

        $customers = [];
        try {
            // 1. Fetch all customer users with profiles (and any users with messages or bookings)
            $sql = "
                SELECT 
                    u.id as user_id,
                    COALESCE(u.email, '') as email,
                    COALESCE(u.phone, '') as phone,
                    COALESCE(u.created_at, NOW()) as user_created_at,
                    COALESCE(cp.full_name, '') as full_name,
                    COALESCE(cp.home_address, '') as home_address,
                    COALESCE(cp.city, 'Lagro, Quezon City') as city,
                    COALESCE(cp.notes, '') as notes
                FROM users u
                LEFT JOIN customer_profiles cp ON u.id = cp.user_id
                WHERE (u.role != 'admin' AND u.role IS NOT NULL)
                   OR u.id IN (SELECT DISTINCT user_id FROM messages WHERE user_id > 0)
                ORDER BY u.id ASC
            ";
            $customers = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            error_log('Message::getAdminConversations initial query error: ' . $e->getMessage());
            $customers = [];
        }

        // Also ensure any message user_id without a users record is included
        $existingUserIds = array_map('intval', array_column($customers, 'user_id'));
        try {
            $orphanMsgStmt = $pdo->query("SELECT DISTINCT user_id, sender_name FROM messages WHERE user_id > 0");
            $orphanRows = $orphanMsgStmt ? $orphanMsgStmt->fetchAll(PDO::FETCH_ASSOC) : [];
            foreach ($orphanRows as $or) {
                $ouid = (int)$or['user_id'];
                if (!in_array($ouid, $existingUserIds, true)) {
                    $customers[] = [
                        'user_id'         => $ouid,
                        'email'           => '',
                        'phone'           => '',
                        'user_created_at' => date('Y-m-d H:i:s'),
                        'full_name'       => !empty($or['sender_name']) ? $or['sender_name'] : ('Client #' . $ouid),
                        'home_address'    => '',
                        'city'            => 'Lagro, Quezon City',
                        'notes'           => ''
                    ];
                    $existingUserIds[] = $ouid;
                }
            }
        } catch (Throwable $e) {
            error_log('Message::getAdminConversations orphan lookup error: ' . $e->getMessage());
        }

        $conversations = [];

        foreach ($customers as $c) {
            $userId = (int)$c['user_id'];
            $fullName = trim($c['full_name'] ?: ($c['email'] ? explode('@', $c['email'])[0] : ('Client #' . $userId)));

            // Fetch messages for this user
            $rawMessages = [];
            try {
                $msgStmt = $pdo->prepare("SELECT * FROM messages WHERE user_id = ? ORDER BY created_at ASC, id ASC");
                $msgStmt->execute([$userId]);
                $rawMessages = $msgStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
            } catch (Throwable $e) {
                error_log("Message::getAdminConversations msg fetch error for user {$userId}: " . $e->getMessage());
            }

            // Calculate unread count for admin (customer messages not read yet)
            $unreadCount = 0;
            foreach ($rawMessages as $rm) {
                if (($rm['sender'] ?? '') === 'customer' && ($rm['status'] ?? '') !== 'read') {
                    $unreadCount++;
                }
            }

            // Latest message & time formatting
            $lastMsg = !empty($rawMessages) ? end($rawMessages) : null;
            $lastTime = 'No activity';
            $lastTimestamp = $c['user_created_at'] ?? date('Y-m-d H:i:s');

            if ($lastMsg && !empty($lastMsg['created_at'])) {
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
            $upcomingAppointment = null;
            $hasAppointment = false;
            try {
                $apptStmt = $pdo->prepare("
                    SELECT b.id, b.reference_no, b.booking_date, b.booking_time, b.total_price, b.status,
                           COALESCE(s.name, 'Salon Treatment') as service_name,
                           COALESCE(st.name, 'Unassigned Stylist') as stylist_name,
                           COALESCE(st.role, 'Salon Stylist') as stylist_role
                    FROM bookings b
                    LEFT JOIN services s ON b.service_id = s.id
                    LEFT JOIN staff st ON b.staff_id = st.id
                    WHERE b.customer_id = ? AND b.status IN ('pending', 'confirmed')
                    ORDER BY b.booking_date ASC, b.booking_time ASC
                    LIMIT 1
                ");
                $apptStmt->execute([$userId]);
                $rawUpcoming = $apptStmt->fetch(PDO::FETCH_ASSOC);

                if ($rawUpcoming) {
                    $hasAppointment = true;
                    $timeStr = strtotime(($rawUpcoming['booking_date'] ?? date('Y-m-d')) . ' ' . ($rawUpcoming['booking_time'] ?? '09:00:00'));
                    $upcomingAppointment = [
                        'id'      => $rawUpcoming['reference_no'] ?: ('APPT-' . $rawUpcoming['id']),
                        'service' => $rawUpcoming['service_name'],
                        'date'    => date('M j, Y', $timeStr),
                        'time'    => date('g:i A', $timeStr),
                        'stylist' => $rawUpcoming['stylist_name'] . ($rawUpcoming['stylist_role'] ? ' (' . $rawUpcoming['stylist_role'] . ')' : ''),
                        'status'  => ucfirst($rawUpcoming['status'] ?? 'Pending'),
                        'price'   => '₱' . number_format((float)($rawUpcoming['total_price'] ?? 0), 2)
                    ];
                }
            } catch (Throwable $e) {
                // Non-critical, continue
            }

            // Patron History summary
            $history = [
                'totalVisits' => 0,
                'totalSpent'  => '₱0',
                'lastVisit'   => 'No previous visits',
                'notes'       => 'No notes available.'
            ];
            try {
                $histStmt = $pdo->prepare("
                    SELECT 
                        COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_visits,
                        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END), 0) as total_spent
                    FROM bookings 
                    WHERE customer_id = ?
                ");
                $histStmt->execute([$userId]);
                $rawHist = $histStmt->fetch(PDO::FETCH_ASSOC);

                $adminNotes = $c['notes'] ?: 'No notes available.';
                if (!empty($c['notes'])) {
                    $decodedNotes = json_decode($c['notes'], true);
                    if (is_array($decodedNotes) && !empty($decodedNotes)) {
                        $adminNotes = $decodedNotes[0]['text'] ?? $c['notes'];
                    }
                }

                $history = [
                    'totalVisits' => (int)($rawHist['total_visits'] ?? 0),
                    'totalSpent'  => '₱' . number_format((float)($rawHist['total_spent'] ?? 0), 0),
                    'lastVisit'   => 'Member record verified',
                    'notes'       => $adminNotes
                ];
            } catch (Throwable $e) {
                // Non-critical, continue
            }

            // Initials for avatar
            $nameParts = explode(' ', $fullName);
            $avatar = count($nameParts) > 1
                ? (mb_substr($nameParts[0], 0, 1) . mb_substr($nameParts[1], 0, 1))
                : mb_substr($fullName, 0, 2);
            $avatar = strtoupper($avatar) ?: 'NS';

            // Format message list
            $formattedMessages = array_map(function($m) {
                $timeTs = !empty($m['created_at']) ? strtotime($m['created_at']) : time();
                return [
                    'id'         => (int)($m['id'] ?? 0),
                    'sender'     => ($m['sender'] ?? '') === 'salon' ? 'admin' : 'customer',
                    'senderName' => $m['sender_name'] ?? 'Client',
                    'text'       => $m['text'] ?? '',
                    'time'       => date('g:i A', $timeTs),
                    'date'       => date('M j, Y', $timeTs),
                    'created_at' => $m['created_at'] ?? date('Y-m-d H:i:s'),
                    'status'     => $m['status'] ?? 'sent',
                    'attachment' => !empty($m['attachment_name']) ? [
                        'name' => $m['attachment_name'],
                        'url'  => $m['attachment_url'] ?? null
                    ] : null
                ];
            }, $rawMessages);

            $conversations[] = [
                'id'                  => (string)$userId,
                'userId'              => $userId,
                'name'                => $fullName,
                'avatar'              => $avatar,
                'phone'               => !empty($c['phone']) ? $c['phone'] : 'N/A',
                'email'               => $c['email'] ?? '',
                'location'            => !empty($c['home_address']) ? $c['home_address'] : (!empty($c['city']) ? $c['city'] : 'Lagro, Quezon City'),
                'memberSince'         => 'Member since ' . date('Y', strtotime($c['user_created_at'] ?? date('Y-m-d'))),
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
