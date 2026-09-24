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
        $user = AuthMiddleware::check();

        if ($user['role'] === 'admin') {
            $search = $_GET['search'] ?? '';
            $filter = $_GET['filter'] ?? 'all';

            $conversations = Message::getAdminConversations($search, $filter);
            $unreadTotal = Message::getAdminUnreadCount();

            // If a specific user_id was requested to view & mark as read
            if (!empty($_GET['user_id'])) {
                $targetUserId = (int)$_GET['user_id'];
                Message::markAllReadByAdmin($targetUserId);
            }

            Response::success([
                'conversations' => $conversations,
                'unread_total'  => $unreadTotal
            ]);
            return;
        }

        // Customer Flow
        $userId = (int)$user['id'];
        $messages = Message::findByUser($userId);

        // If fresh conversation with no messages yet, seed personalized welcome greeting
        if (empty($messages)) {
            $profile = CustomerProfile::findByUserId($userId);
            $fullName = $profile['full_name'] ?? ($user['email'] ? explode('@', $user['email'])[0] : 'there');
            $firstName = explode(' ', trim($fullName))[0] ?: 'there';

            $welcomeText = "Hello {$firstName}! Welcome to Nely's Salon official support. How can we assist you today with appointments, treatments, or beauty questions?";

            Message::create([
                'user_id'     => $userId,
                'sender'      => 'salon',
                'sender_name' => "Nely's Salon Concierge",
                'text'        => $welcomeText,
                'status'      => 'read',
            ]);

            $messages = Message::findByUser($userId);
        } else {
            // Mark salon messages as read when fetched by customer
            Message::markAllReadForUser($userId);
        }

        Response::success($messages);
    }

    /**
     * Send a message
     * If Admin: Sends message to target user_id (sender = 'salon').
     * If Customer: Sends message and receives automated concierge response.
     */
    public function send(): void {
        $user = AuthMiddleware::check();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $text = trim($input['text'] ?? '');
        $attachmentName = !empty($input['attachment_name']) ? trim($input['attachment_name']) : null;
        $attachmentUrl = !empty($input['attachment_url']) ? $input['attachment_url'] : null;

        if (empty($text) && empty($attachmentName)) {
            Response::error('Message text or attachment is required.', 422);
        }

        // Admin sending message to a customer
        if ($user['role'] === 'admin') {
            $targetUserId = !empty($input['user_id']) ? (int)$input['user_id'] : 0;
            if (!$targetUserId) {
                Response::error('Target customer user_id is required.', 422);
            }

            $adminName = !empty($input['sender_name']) ? trim($input['sender_name']) : "Nely's Salon Concierge";

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
                'status'     => $saved['status'],
                'attachment' => $saved['attachment_name'] ? [
                    'name' => $saved['attachment_name'],
                    'url'  => $saved['attachment_url']
                ] : null
            ], 'Message sent successfully.', 201);
            return;
        }

        // Customer sending message to Salon
        $userId = (int)$user['id'];
        $profile = CustomerProfile::findByUserId($userId);
        $customerName = $profile['full_name'] ?? 'Client';

        // 1. Save customer outgoing message
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

        // 2. Generate intelligent automated concierge response
        $replyText = self::generateConciergeReply($text);

        $salonMsgId = Message::create([
            'user_id'     => $userId,
            'sender'      => 'salon',
            'sender_name' => "Nely's Salon Concierge",
            'text'        => $replyText,
            'status'      => 'read',
        ]);

        $salonMessage = Message::findById($salonMsgId);

        Response::success([
            'customer_message' => $customerMessage,
            'salon_reply'      => $salonMessage,
        ], 'Message sent successfully.', 201);
    }

    /**
     * Mark a conversation as read
     */
    public function markRead(): void {
        $user = AuthMiddleware::check();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $targetUserId = !empty($input['user_id']) ? (int)$input['user_id'] : (!empty($_GET['user_id']) ? (int)$_GET['user_id'] : 0);

        if ($user['role'] === 'admin') {
            if ($targetUserId) {
                Message::markAllReadByAdmin($targetUserId);
            }
        } else {
            Message::markAllReadForUser((int)$user['id']);
        }

        Response::success(null, 'Messages marked as read.');
    }

    /**
     * Delete a single message
     */
    public function delete(int $id): void {
        $user = AuthMiddleware::check();

        $message = Message::findById($id);
        if (!$message) {
            Response::notFound('Message not found.');
        }

        if ($user['role'] !== 'admin' && (int)$message['user_id'] !== (int)$user['id']) {
            Response::forbidden('You do not have permission to delete this message.');
        }

        Message::delete($id);
        Response::success(null, 'Message deleted successfully.');
    }

    /**
     * Clear entire chat stream for a customer
     */
    public function clear(): void {
        $user = AuthMiddleware::check();

        if ($user['role'] === 'admin') {
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
    }

    /**
     * Get unread messages count for badges
     */
    public function unreadCount(): void {
        $user = AuthMiddleware::check();

        if ($user['role'] === 'admin') {
            $count = Message::getAdminUnreadCount();
        } else {
            $count = Message::getUnreadCount((int)$user['id']);
        }

        Response::success(['unread_count' => $count]);
    }

    /**
     * Intelligent Concierge Reply Generator
     */
    private static function generateConciergeReply(string $query): string {
        $q = strtolower($query);

        if (str_contains($q, 'appointment') || str_contains($q, 'booking') || str_contains($q, 'sched')) {
            return "You can view or manage all your bookings under 'My Appointments', or schedule a new one right away under 'Book Appointment'!";
        }

        if (str_contains($q, 'price') || str_contains($q, 'cost') || str_contains($q, 'magkano') || str_contains($q, 'rate') || str_contains($q, 'how much')) {
            return "Our full updated price list is available under 'Services & Prices'. Brazilian treatment starts at ₱1,999, haircuts at ₱150, classic manicure at ₱150, and gel nails at ₱499.";
        }

        if (str_contains($q, 'hour') || str_contains($q, 'time') || str_contains($q, 'open') || str_contains($q, 'closing') || str_contains($q, 'schedule')) {
            return "Nely's Salon is open Monday through Saturday from 9:00 AM to 6:00 PM in Lagro, Quezon City.";
        }

        if (str_contains($q, 'location') || str_contains($q, 'address') || str_contains($q, 'saan') || str_contains($q, 'where')) {
            return "We are located at BLK 42 Lot 59 Ascension Rd, Lagro, Quezon City. We also offer Home Service for select hair and nail treatments!";
        }

        if (str_contains($q, 'service') || str_contains($q, 'rebond') || str_contains($q, 'brazilian') || str_contains($q, 'nail') || str_contains($q, 'spa')) {
            return "We offer 13 signature hair, nail, and foot spa treatments! Check out the 'Services & Prices' tab to view full details, inclusions, and book.";
        }

        if (str_contains($q, 'stylist') || str_contains($q, 'staff') || str_contains($q, 'nely')) {
            return "Our salon is led by Nely and certified senior stylists with over 15 years of beauty heritage in Lagro, QC.";
        }

        if (str_contains($q, 'hello') || str_contains($q, 'hi') || str_contains($q, 'good morning') || str_contains($q, 'good afternoon')) {
            return "Hello! Thank you for contacting Nely's Salon Concierge. How can we assist with your beauty treatment or booking today?";
        }

        return "Thank you for reaching out to Nely's Salon! Our front desk staff has received your message and will assist you shortly.";
    }
}
