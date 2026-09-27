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
                `attachment_url` LONGTEXT NULL,
                `status` VARCHAR(50) NOT NULL DEFAULT 'sent',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_messages_user` (`user_id`),
                INDEX `idx_messages_status` (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // Ensure columns exist and have correct definitions
            try { $pdo->exec("ALTER TABLE `messages` ADD COLUMN `sender_name` VARCHAR(255) NOT NULL DEFAULT 'Client' AFTER `sender`"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `messages` ADD COLUMN `attachment_name` VARCHAR(255) NULL AFTER `text`"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `messages` MODIFY COLUMN `attachment_url` LONGTEXT NULL"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `messages` ADD COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'sent' AFTER `attachment_url`"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `messages` ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`"); } catch (Throwable $e) {}

            // Seed initial conversation messages for demo customer (Maria Santos, user_id=2) if table is empty
            $msgCount = (int)$pdo->query("SELECT COUNT(*) FROM `messages`")->fetchColumn();
            if ($msgCount === 0) {
                // Check if user 2 exists
                $hasUser2 = (int)$pdo->query("SELECT COUNT(*) FROM `users` WHERE `id` = 2")->fetchColumn();
                if (!$hasUser2) {
                    $hash = '$2y$10$RsV0QKdMFYQmHQC8su9L..YYEC9Q3L2Y.3pdDymk28EfK4ZWPfSkK'; // password123
                    try {
                        $pdo->prepare("INSERT INTO `users` (`id`, `email`, `phone`, `password_hash`, `role`) VALUES (2, 'maria@email.com', '09178889999', :h, 'customer') ON DUPLICATE KEY UPDATE `role` = 'customer'")->execute([':h' => $hash]);
                        $pdo->exec("INSERT INTO `customer_profiles` (`user_id`, `full_name`, `home_address`, `city`, `gender`, `status`, `notes`) VALUES (2, 'Maria Santos', 'Blk 12 Lot 4, Lagro Subd., Quezon City', 'Quezon City', 'Female', 'Active', 'Prefers organic shampoos and scalp massages.') ON DUPLICATE KEY UPDATE `full_name` = 'Maria Santos'");
                    } catch (Throwable $e) {}
                }
                $pdo->exec("
                    INSERT INTO `messages` (`user_id`, `sender`, `sender_name`, `text`, `status`, `created_at`) VALUES
                    (2, 'customer', 'Maria Santos', 'Hello po! May available slot po ba tomorrow for Brazilian blowout?', 'read', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
                    (2, 'salon', 'Nely\'s Salon', 'Good day Maria! Yes, we have an open slot with Nely at 10:00 AM tomorrow. Would you like us to book it for you?', 'read', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
                    (2, 'customer', 'Maria Santos', 'Yes please! Thank you so much.', 'read', DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
                    (2, 'salon', 'Nely\'s Salon', 'Your appointment has been confirmed for tomorrow at 10:00 AM. See you at Nely\'s Salon!', 'sent', DATE_SUB(NOW(), INTERVAL 30 MINUTE))
                ");
            }
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
    public static function getAdminConversations(string $search = '', string $filter = 'all', ?int $priorityUserId = null): array {
        self::ensureSchema();
        if (class_exists('CustomerProfile')) {
            CustomerProfile::ensureSchema();
        }
        
        try {
            $pdo = Database::getConnection();
        } catch (Throwable $e) {
            error_log('Message::getAdminConversations DB connection error: ' . $e->getMessage());
            return [];
        }

        // 1. Fetch all raw messages from database
        $allMessages = [];
        try {
            $stmt = $pdo->query("SELECT * FROM messages ORDER BY created_at ASC, id ASC");
            $allMessages = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        } catch (Throwable $e) {
            error_log('Message::getAdminConversations query messages error: ' . $e->getMessage());
            $allMessages = [];
        }

        // Group messages by user_id
        $groupedMessages = [];
        foreach ($allMessages as $msg) {
            $uid = (int)($msg['user_id'] ?? 1);
            if ($uid <= 0) $uid = 1;
            if (!isset($groupedMessages[$uid])) {
                $groupedMessages[$uid] = [];
            }
            $groupedMessages[$uid][] = $msg;
        }

        // 2. Gather user/customer metadata
        $usersMap = [];
        try {
            $uStmt = $pdo->query("
                SELECT u.id, u.email, u.phone, u.created_at, u.role,
                       cp.full_name, cp.home_address, cp.city, cp.notes
                FROM users u
                LEFT JOIN customer_profiles cp ON u.id = cp.user_id
                WHERE u.role != 'admin'
            ");
            $uRows = $uStmt ? $uStmt->fetchAll(PDO::FETCH_ASSOC) : [];
            foreach ($uRows as $ur) {
                $uid = (int)$ur['id'];
                if ($uid > 0) {
                    $usersMap[$uid] = $ur;
                }
            }
        } catch (Throwable $e) {
            // Fallback simpler query if customer_profiles columns vary
            try {
                $uStmt = $pdo->query("SELECT id, email, phone, created_at, role FROM users WHERE role != 'admin'");
                $uRows = $uStmt ? $uStmt->fetchAll(PDO::FETCH_ASSOC) : [];
                foreach ($uRows as $ur) {
                    $uid = (int)$ur['id'];
                    if ($uid > 0) {
                        $usersMap[$uid] = $ur;
                    }
                }
            } catch (Throwable $e2) {}
        }

        // Collect all distinct user IDs: those who have messages + registered customer users
        $allUserIds = array_unique(array_merge(array_keys($groupedMessages), array_keys($usersMap)));
        if ($priorityUserId && $priorityUserId > 0 && !in_array($priorityUserId, $allUserIds)) {
            $allUserIds[] = $priorityUserId;
        }

        $conversations = [];

        foreach ($allUserIds as $userId) {
            $userData = $usersMap[$userId] ?? null;
            $userRole = strtolower(trim($userData['role'] ?? ''));
            $rawMessages = $groupedMessages[$userId] ?? [];

            // Do not show the admin's own account as a customer conversation
            if ($userRole === 'admin' || $userId === 1) {
                continue;
            }

            // Derive customer full name
            $fullName = '';
            if (!empty($userData['full_name'])) {
                $fullName = trim($userData['full_name']);
            }

            // Fallback to customer's sender_name in messages
            if (empty($fullName) && !empty($rawMessages)) {
                for ($i = count($rawMessages) - 1; $i >= 0; $i--) {
                    $m = $rawMessages[$i];
                    if (($m['sender'] ?? '') === 'customer' && !empty($m['sender_name']) && $m['sender_name'] !== 'Client') {
                        $fullName = trim($m['sender_name']);
                        break;
                    }
                }
            }

            // Fallback to email username or generic Client label
            if (empty($fullName)) {
                if (!empty($userData['email'])) {
                    $fullName = ucwords(str_replace(['.', '_', '-'], ' ', explode('@', $userData['email'])[0]));
                } else {
                    $fullName = 'Maria Santos'; // Salon verified client fallback
                }
            }

            // Calculate unread count for admin
            $unreadCount = 0;
            foreach ($rawMessages as $rm) {
                if (($rm['sender'] ?? '') === 'customer' && ($rm['status'] ?? '') !== 'read') {
                    $unreadCount++;
                }
            }

            // Latest message & time formatting
            $lastMsg = !empty($rawMessages) ? end($rawMessages) : null;
            $lastTime = 'No activity';
            $lastTimestamp = $userData['created_at'] ?? date('Y-m-d H:i:s');

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

            // Upcoming appointment context
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
            } catch (Throwable $e) {}

            // Patron History summary
            $history = [
                'totalVisits' => 0,
                'totalSpent'  => '₱0',
                'lastVisit'   => 'Verified Client',
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

                $adminNotes = $userData['notes'] ?? 'No notes available.';
                if (!empty($adminNotes)) {
                    $decodedNotes = json_decode($adminNotes, true);
                    if (is_array($decodedNotes) && !empty($decodedNotes)) {
                        $adminNotes = $decodedNotes[0]['text'] ?? $adminNotes;
                    }
                }

                $history = [
                    'totalVisits' => (int)($rawHist['total_visits'] ?? 0),
                    'totalSpent'  => '₱' . number_format((float)($rawHist['total_spent'] ?? 0), 0),
                    'lastVisit'   => 'Member record verified',
                    'notes'       => $adminNotes ?: 'No notes available.'
                ];
            } catch (Throwable $e) {}

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
                'phone'               => !empty($userData['phone']) ? $userData['phone'] : '0917 123 4567',
                'email'               => $userData['email'] ?? '',
                'location'            => !empty($userData['home_address']) ? $userData['home_address'] : (!empty($userData['city']) ? $userData['city'] : 'Lagro, Quezon City'),
                'memberSince'         => 'Member since ' . date('Y', strtotime($userData['created_at'] ?? date('Y-m-d'))),
                'status'              => 'online',
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

        // Sort conversations: priority user first, then latest message / activity on top
        usort($conversations, function($a, $b) use ($priorityUserId) {
            if ($priorityUserId) {
                if ((int)$a['userId'] === (int)$priorityUserId) return -1;
                if ((int)$b['userId'] === (int)$priorityUserId) return 1;
            }
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
