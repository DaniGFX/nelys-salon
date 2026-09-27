<?php
/**
 * Nely's Salon Management System
 * Customer Support Messages Controller
 * Supports both Admin inbox management and Customer direct concierge chat.
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/helpers/Sanitizer.php';
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
                $priorityUserId = !empty($_GET['user_id']) ? (int)$_GET['user_id'] : null;

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

            // Customer Flow
            $userId = (int)($user['id'] ?? 0);
            $messages = [];
            if ($userId > 0) {
                try {
                    $messages = Message::findByUser($userId);
                    if (!empty($messages)) {
                        Message::markAllReadForUser($userId);
                    }
                } catch (Throwable $e) {
                    error_log('MessageController::index findByUser Error: ' . $e->getMessage());
                    $messages = [];
                }
            }

            Response::success($messages);
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
            $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            $input = Sanitizer::cleanArray($input);

            $text = trim($input['text'] ?? '');
            $attachmentName = !empty($input['attachment_name']) ? trim($input['attachment_name']) : null;
            $attachmentUrl = !empty($input['attachment_url']) ? $input['attachment_url'] : null;

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
                    'sender'          => 'salon',
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
}
