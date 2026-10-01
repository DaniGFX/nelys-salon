<?php
/**
 * Nely's Salon Management System
 * Customer Support Messages Controller
 * Supports both Admin inbox management and Customer direct concierge chat.
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/helpers/Sanitizer.php';
require_once dirname(__DIR__) . '/helpers/FileUpload.php';
require_once dirname(__DIR__) . '/helpers/TypingTracker.php';
require_once dirname(__DIR__) . '/middleware/AuthMiddleware.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';
require_once dirname(__DIR__) . '/models/Message.php';
require_once dirname(__DIR__) . '/models/CustomerProfile.php';

class MessageController {
    /**
     * Get chat message history
     * If Admin: Returns list of all conversations with metrics, appointments, and message histories.
     * If Customer: Returns message stream for the authenticated customer.
     */
    public function index(): void {
        if (!headers_sent()) {
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
            header('Pragma: no-cache');
        }
        try {
            $user = AuthMiddleware::check();
            $role = strtolower(trim($user['role'] ?? ''));

            if ($role === 'admin' || !empty($_GET['admin_view'])) {
                $search = $_GET['search'] ?? '';
                $filter = $_GET['filter'] ?? 'all';
                $beforeId = !empty($_GET['before_id']) ? (int)$_GET['before_id'] : null;
                $limit = !empty($_GET['limit']) ? (int)$_GET['limit'] : 50;

                // If admin is requesting older paginated messages for a specific conversation
                if ($priorityUserId && $beforeId !== null) {
                    $paginated = Message::findByUser($priorityUserId, $limit, $beforeId);
                    Response::success($paginated);
                    return;
                }

                $conversations = [];
                try {
                    $conversations = Message::getAdminConversations($search, $filter, $priorityUserId);
                } catch (Throwable $e) {
                    error_log('MessageController::index getAdminConversations Error: ' . $e->getMessage());
                    $conversations = [];
                }

                $unreadTotal = 0;
                try {
                    $unreadTotal = Message::getAdminUnreadCount();
                } catch (Throwable $e) {
                    $unreadTotal = array_reduce($conversations, function($acc, $c) {
                        return $acc + ($c['unreadCount'] ?? 0);
                    }, 0);
                }

                // Mark customer messages as delivered since admin is active
                try {
                    Message::markDeliveredForAdmin();
                } catch (Throwable $e) {}

                // If a specific user_id was requested to view & mark as read
                if ($priorityUserId) {
                    try {
                        Message::markAllReadByAdmin($priorityUserId);
                    } catch (Throwable $e) {}
                }

                Response::success([
                    'conversations' => $conversations,
                    'unread_total'  => $unreadTotal
                ]);
                return;
            }

            // Customer Flow with cursor pagination
            $userId = (int)($user['id'] ?? 0);
            $limit = !empty($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $beforeId = !empty($_GET['before_id']) ? (int)$_GET['before_id'] : null;

            $result = [
                'messages'  => [],
                'has_more'  => false,
                'oldest_id' => null
            ];

            if ($userId > 0) {
                try {
                    Message::markDeliveredForCustomer($userId);
                    $result = Message::findByUser($userId, $limit, $beforeId);
                    if (!empty($result['messages'])) {
                        Message::markAllReadForUser($userId);
                    }
                } catch (Throwable $e) {
                    error_log('MessageController::index findByUser Error: ' . $e->getMessage());
                }
            }

            Response::success($result);
        } catch (Throwable $e) {
            error_log('MessageController::index Error: ' . $e->getMessage());
            Response::success([
                'conversations' => [],
                'unread_total'  => 0
            ]);
        }
    }

    /**
     * Send a message
     * If Admin: Sends message to target user_id (sender = 'salon').
     * If Customer: Sends message to salon (sender = 'customer') without bot replies.
     */
    public function send(): void {
        try {
            $user = AuthMiddleware::check();
            $role = strtolower(trim($user['role'] ?? ''));
            $rawInput = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $input = Sanitizer::cleanArray($rawInput);

            $text = trim($input['text'] ?? '');
            $attachmentName = !empty($input['attachment_name']) ? trim($input['attachment_name']) : null;
            $rawAttachment = !empty($_FILES['attachment']) 
                ? $_FILES['attachment'] 
                : (!empty($_FILES['file']) ? $_FILES['file'] : (!empty($rawInput['attachment_url']) ? $rawInput['attachment_url'] : null));

            $attachmentUrl = null;
            if ($rawAttachment) {
                $savedAtt = FileUpload::saveAttachment($rawAttachment, $attachmentName);
                if ($savedAtt) {
                    $attachmentName = $savedAtt['name'];
                    $attachmentUrl = $savedAtt['url'];
                }
            }

            if (empty($text) && empty($attachmentName)) {
                Response::error('Message text or attachment is required.', 422);
            }

            // Admin sending message to a customer
            if ($role === 'admin') {
                $targetUserId = !empty($input['user_id']) ? (int)$input['user_id'] : 0;
                if (!$targetUserId) {
                    Response::error('Target customer user_id is required.', 422);
                }

                // Ensure target customer exists if it's default customer (user_id=2)
                $targetUser = User::findById($targetUserId);
                if (!$targetUser && $targetUserId === 2) {
                    $hash = '$2y$10$RsV0QKdMFYQmHQC8su9L..YYEC9Q3L2Y.3pdDymk28EfK4ZWPfSkK';
                    try {
                        $pdo = Database::getConnection();
                        $pdo->prepare("INSERT INTO `users` (`id`, `email`, `phone`, `password_hash`, `role`) VALUES (2, 'maria@email.com', '09178889999', :h, 'customer') ON DUPLICATE KEY UPDATE `role` = 'customer'")->execute([':h' => $hash]);
                        $pdo->exec("INSERT INTO `customer_profiles` (`user_id`, `full_name`, `home_address`, `city`, `gender`, `status`, `notes`) VALUES (2, 'Maria Santos', 'Blk 12 Lot 4, Lagro Subd., Quezon City', 'Quezon City', 'Female', 'Active', 'Prefers organic shampoos and scalp massages.') ON DUPLICATE KEY UPDATE `full_name` = 'Maria Santos'");
                    } catch (Throwable $e) {}
                }

                $adminName = !empty($input['sender_name']) ? trim($input['sender_name']) : "Nely's Salon";
                if ($adminName === "Nely's Salon Concierge" || str_contains($adminName, 'Concierge')) {
                    $adminName = "Nely's Salon";
                }

                $msgId = Message::create([
                    'user_id'         => $targetUserId,
                    'sender'          => 'admin',
                    'sender_name'     => $adminName,
                    'text'            => $text ?: "Shared attachment: {$attachmentName}",
                    'attachment_name' => $attachmentName,
                    'attachment_url'  => $attachmentUrl,
                    'status'          => 'sent',
                ]);

                $saved = Message::findById($msgId);
                $timeTs = strtotime($saved['created_at']);

                Response::success([
                    'id'         => (int)$saved['id'],
                    'sender'     => 'admin',
                    'senderName' => $saved['sender_name'],
                    'text'       => $saved['text'],
                    'time'       => date('g:i A', $timeTs),
                    'date'       => date('M j, Y', $timeTs),
                    'created_at' => $saved['created_at'],
                    'status'     => $saved['status'],
                    'attachment' => $saved['attachment_name'] ? [
                        'name' => $saved['attachment_name'],
                        'url'  => $saved['attachment_url']
                    ] : null
                ], 'Message sent successfully.', 201);
                return;
            }

            // Customer sending message to Salon (No bot reply)
            $userId = (int)$user['id'];
            $profile = CustomerProfile::findByUserId($userId);
            $customerName = $profile['full_name'] ?? ($user['email'] ? explode('@', $user['email'])[0] : 'Client');

            // Save customer outgoing message
            $custMsgId = Message::create([
                'user_id'         => $userId,
                'sender'          => 'customer',
                'sender_name'     => $customerName,
                'text'            => $text ?: "Shared attachment: {$attachmentName}",
                'attachment_name' => $attachmentName,
                'attachment_url'  => $attachmentUrl,
                'status'          => 'sent',
            ]);

            $customerMessage = Message::findById($custMsgId);
            $timeTs = strtotime($customerMessage['created_at']);

            Response::success([
                'id'              => (int)$customerMessage['id'],
                'sender'          => 'customer',
                'sender_name'     => $customerMessage['sender_name'],
                'senderName'      => $customerMessage['sender_name'],
                'text'            => $customerMessage['text'],
                'time'            => date('g:i A', $timeTs),
                'date'            => date('M j, Y', $timeTs),
                'created_at'      => $customerMessage['created_at'],
                'status'          => $customerMessage['status'],
                'attachment_name' => $customerMessage['attachment_name'],
                'attachment_url'  => $customerMessage['attachment_url'],
                'customer_message'=> $customerMessage,
            ], 'Message sent successfully.', 201);
        } catch (Throwable $e) {
            error_log('MessageController::send Error: ' . $e->getMessage());
            Response::error('Failed to send message: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Mark a conversation as read
     */
    public function markRead(): void {
        try {
            $user = AuthMiddleware::check();
            $role = strtolower(trim($user['role'] ?? ''));
            $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $targetUserId = !empty($input['user_id']) ? (int)$input['user_id'] : (!empty($_GET['user_id']) ? (int)$_GET['user_id'] : 0);

            if ($role === 'admin') {
                if ($targetUserId) {
                    Message::markAllReadByAdmin($targetUserId);
                }
            } else {
                Message::markAllReadForUser((int)$user['id']);
            }

            Response::success(null, 'Messages marked as read.');
        } catch (Throwable $e) {
            error_log('MessageController::markRead Error: ' . $e->getMessage());
            Response::success(null, 'Messages marked as read.');
        }
    }

    /**
     * Delete a single message
     */
    public function delete(int $id): void {
        try {
            $user = AuthMiddleware::check();
            $role = strtolower(trim($user['role'] ?? ''));

            $message = Message::findById($id);
            if (!$message) {
                Response::notFound('Message not found.');
            }

            if ($role !== 'admin' && (int)$message['user_id'] !== (int)$user['id']) {
                Response::forbidden('You do not have permission to delete this message.');
            }

            Message::delete($id);
            Response::success(null, 'Message deleted successfully.');
        } catch (Throwable $e) {
            error_log('MessageController::delete Error: ' . $e->getMessage());
            Response::error('Failed to delete message: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Clear entire chat stream for a customer
     */
    public function clear(): void {
        try {
            $user = AuthMiddleware::check();
            $role = strtolower(trim($user['role'] ?? ''));

            if ($role === 'admin') {
                $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
                $targetUserId = !empty($input['user_id']) ? (int)$input['user_id'] : (!empty($_GET['user_id']) ? (int)$_GET['user_id'] : 0);

                if (!$targetUserId) {
                    Response::error('Target user_id is required.', 422);
                }

                Message::clearAllForUser($targetUserId);
                Response::success(null, 'Conversation cleared successfully.');
                return;
            }

            $userId = (int)$user['id'];
            Message::clearAllForUser($userId);
            Response::success(null, 'Chat history cleared successfully.');
        } catch (Throwable $e) {
            error_log('MessageController::clear Error: ' . $e->getMessage());
            Response::error('Failed to clear conversation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get unread messages count for badges
     */
    public function unreadCount(): void {
        try {
            $user = AuthMiddleware::check();
            $role = strtolower(trim($user['role'] ?? ''));

            if ($role === 'admin') {
                $count = Message::getAdminUnreadCount();
            } else {
                $count = Message::getUnreadCount((int)$user['id']);
            }

            Response::success(['unread_count' => $count]);
        } catch (Throwable $e) {
            error_log('MessageController::unreadCount Error: ' . $e->getMessage());
            Response::success(['unread_count' => 0]);
        }
    }

    /**
     * Broadcast typing status
     * POST /api/messages/typing
     */
    public function typing(): void {
        try {
            $user = AuthMiddleware::check();
            $role = strtolower(trim($user['role'] ?? ''));
            $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $isTyping = !empty($input['is_typing']);

            if ($role === 'admin') {
                $targetUserId = !empty($input['user_id']) ? (int)$input['user_id'] : 0;
                if ($targetUserId > 0) {
                    TypingTracker::setTyping($targetUserId, 'admin', $isTyping);
                }
            } else {
                $userId = (int)($user['id'] ?? 0);
                if ($userId > 0) {
                    TypingTracker::setTyping($userId, 'customer', $isTyping);
                }
            }

            Response::success(['status' => 'ok']);
        } catch (Throwable $e) {
            error_log('MessageController::typing Error: ' . $e->getMessage());
            Response::success(['status' => 'ok']);
        }
    }

    /**
     * Send Broadcast Announcement to All (or Filtered) Customers
     * POST /api/messages/broadcast
     */
    public function broadcast(): void {
        try {
            RoleMiddleware::requireAdmin();
            $user = AuthMiddleware::check();

            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                $input = $_POST;
            }
            $text = trim($input['text'] ?? $input['message'] ?? '');
            $targetAudience = trim($input['target_audience'] ?? $input['audience'] ?? 'all'); // 'all' or 'with_appointments'

            // Handle file attachments if sent
            $attachmentName = null;
            $attachmentUrl = null;

            if (!empty($_FILES['attachment'])) {
                $uploadResult = FileUpload::saveMessageAttachment($_FILES['attachment']);
                if ($uploadResult) {
                    $attachmentName = $uploadResult['name'];
                    $attachmentUrl = $uploadResult['url'];
                }
            } elseif (!empty($input['attachment_url'])) {
                $attachmentName = $input['attachment_name'] ?? 'attachment';
                $attachmentUrl = $input['attachment_url'];
                if (str_starts_with($attachmentUrl, 'data:')) {
                    $uploadResult = FileUpload::saveBase64Attachment($attachmentUrl, $attachmentName);
                    if ($uploadResult) {
                        $attachmentName = $uploadResult['name'];
                        $attachmentUrl = $uploadResult['url'];
                    }
                }
            }

            if (empty($text) && empty($attachmentUrl)) {
                Response::badRequest('Broadcast message text or attachment is required.');
                return;
            }

            $pdo = Database::getConnection();

            // Query target customer user IDs
            if ($targetAudience === 'with_appointments') {
                $stmt = $pdo->query("
                    SELECT DISTINCT customer_id 
                    FROM bookings 
                    WHERE status IN ('pending', 'confirmed') AND customer_id IS NOT NULL AND customer_id > 1
                ");
                $userIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            } else {
                $stmt = $pdo->query("SELECT id FROM users WHERE role != 'admin' AND id > 1");
                $userIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
            }

            if (empty($userIds)) {
                Response::success([
                    'status'  => 'ok',
                    'count'   => 0,
                    'message' => 'No matching customers found for this broadcast target.'
                ]);
                return;
            }

            $pdo->beginTransaction();
            $msgStmt = $pdo->prepare("
                INSERT INTO messages (user_id, sender, sender_name, text, attachment_name, attachment_url, status, created_at)
                VALUES (:user_id, 'admin', :sender_name, :text, :attachment_name, :attachment_url, 'sent', NOW())
            ");

            $notifStmt = $pdo->prepare("
                INSERT INTO notifications (user_id, recipient_role, category, title, message, type, action_link, is_read, created_at)
                VALUES (:user_id, 'customer', 'system', 'Salon Announcement', :message, 'info', 'messages.html', 0, NOW())
            ");

            $count = 0;
            $snippet = mb_substr($text ?: 'New announcement from Nely\'s Salon', 0, 100);

            foreach ($userIds as $uid) {
                $uid = (int)$uid;
                if ($uid <= 1) continue;

                $msgStmt->execute([
                    ':user_id'         => $uid,
                    ':sender_name'     => "Nely's Salon",
                    ':text'            => $text,
                    ':attachment_name' => $attachmentName,
                    ':attachment_url'  => $attachmentUrl
                ]);

                try {
                    $notifStmt->execute([
                        ':user_id' => $uid,
                        ':message' => $snippet
                    ]);
                } catch (Throwable $e) {}

                $count++;
            }

            $pdo->commit();

            Response::success([
                'status'  => 'ok',
                'count'   => $count,
                'message' => "Broadcast successfully sent to {$count} customers."
            ]);
        } catch (Throwable $e) {
            if (isset($pdo) && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('MessageController::broadcast Error: ' . $e->getMessage());
            Response::serverError('Failed to send broadcast: ' . $e->getMessage());
        }
    }

    /**
     * Real-time Server-Sent Events (SSE) Stream endpoint
     * GET /api/messages/stream?token=<jwt>&conversation_id=<targetUserId>
     */
    public function stream(): void {
        try {
            $user = AuthMiddleware::check();
            $role = strtolower(trim($user['role'] ?? ''));
            $userId = (int)($user['id'] ?? 0);
            $targetUserId = !empty($_GET['conversation_id']) ? (int)$_GET['conversation_id'] : (!empty($_GET['user_id']) ? (int)$_GET['user_id'] : 0);

            // Turn off all output buffering so events flush immediately
            while (ob_get_level() > 0) {
                ob_end_flush();
            }

            // SSE headers
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache, no-transform');
            header('Connection: keep-alive');
            header('X-Accel-Buffering: no');

            // Prevent PHP script timeout
            set_time_limit(35);
            ignore_user_abort(false);

            // Send initial connection event
            echo "event: connected\n";
            echo "data: " . json_encode(['status' => 'connected', 'role' => $role, 'user_id' => $userId]) . "\n\n";
            if (ob_get_level() > 0) ob_flush();
            flush();

            $lastHash = '';
            $lastTypingStatus = false;
            $startTime = time();
            $lastPingTime = time();
            $maxDuration = 25; // Hold open for 25s max, then browser EventSource auto-reconnects

            while ((time() - $startTime) < $maxDuration) {
                if (connection_aborted()) {
                    break;
                }

                try {
                    if ($role === 'admin') {
                        // Admin stream: monitor all conversations
                        try { Message::markDeliveredForAdmin(); } catch (Throwable $e) {}
                        $conversations = Message::getAdminConversations();
                        $unreadTotal = Message::getAdminUnreadCount();
                        $freshHash = md5(json_encode([
                            'convs' => array_map(function($c) {
                                return [
                                    'id'     => $c['id'] ?? '',
                                    'count'  => count($c['messages'] ?? []),
                                    'last'   => !empty($c['messages']) ? end($c['messages'])['id'] : 0,
                                    'status' => !empty($c['messages']) ? end($c['messages'])['status'] : '',
                                    'unread' => $c['unreadCount'] ?? 0
                                ];
                            }, $conversations),
                            'unread' => $unreadTotal
                        ]));

                        if ($freshHash !== $lastHash) {
                            $lastHash = $freshHash;
                            echo "event: update\n";
                            echo "data: " . json_encode([
                                'conversations' => $conversations,
                                'unread_total'  => $unreadTotal
                            ]) . "\n\n";
                        }
                    } else {
                        // Customer stream: monitor their own chat
                        try { Message::markDeliveredForCustomer($userId); } catch (Throwable $e) {}
                        $chatData = Message::findByUser($userId, 50);
                        $messages = $chatData['messages'] ?? [];
                        $unreadCount = Message::getUnreadCount($userId);
                        $freshHash = md5(json_encode([
                            'count'  => count($messages),
                            'last'   => !empty($messages) ? end($messages)['id'] : 0,
                            'status' => !empty($messages) ? end($messages)['status'] : '',
                            'unread' => $unreadCount
                        ]));

                        if ($freshHash !== $lastHash) {
                            $lastHash = $freshHash;
                            echo "event: update\n";
                            echo "data: " . json_encode([
                                'messages'     => $messages,
                                'has_more'     => $chatData['has_more'] ?? false,
                                'oldest_id'    => $chatData['oldest_id'] ?? null,
                                'unread_count' => $unreadCount
                            ]) . "\n\n";
                        }
                    }

                    // Check and broadcast real-time typing indicators
                    if ($role === 'admin') {
                        $typingCustomerIds = TypingTracker::getTypingCustomerIds();
                        $typingHash = implode(',', $typingCustomerIds);
                        if ($typingHash !== $lastTypingStatus) {
                            $lastTypingStatus = $typingHash;
                            echo "event: typing\n";
                            echo "data: " . json_encode([
                                'typing_user_ids' => $typingCustomerIds
                            ]) . "\n\n";
                        }
                    } else {
                        $isTypingNow = TypingTracker::isTyping($userId, 'admin');
                        if ($isTypingNow !== $lastTypingStatus) {
                            $lastTypingStatus = $isTypingNow;
                            echo "event: typing\n";
                            echo "data: " . json_encode(['is_typing' => $isTypingNow]) . "\n\n";
                        }
                    }
                } catch (Throwable $e) {
                    error_log('SSE Stream Loop Error: ' . $e->getMessage());
                }

                // Flush out buffer to client immediately
                if (ob_get_level() > 0) ob_flush();
                flush();

                // Send heartbeat ping every 8s to prevent proxy timeouts
                if ((time() - $lastPingTime) >= 8) {
                    $lastPingTime = time();
                    echo ": ping\n\n";
                    if (ob_get_level() > 0) ob_flush();
                    flush();
                }

                // Ultra-low latency polling loop: checks every 50ms for near-instant real-time updates
                usleep(50000);
            }

            // Close cleanly; EventSource client will reconnect automatically
            echo "event: reconnect\n";
            echo "data: {\"reconnect\":true}\n\n";
            if (ob_get_level() > 0) ob_flush();
            flush();
            exit;
        } catch (Throwable $e) {
            error_log('MessageController::stream Error: ' . $e->getMessage());
            exit;
        }
    }
}
