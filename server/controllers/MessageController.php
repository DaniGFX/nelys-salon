<?php
/**
 * Nely's Salon Management System
 * Customer Support Messages Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/helpers/Sanitizer.php';
require_once dirname(__DIR__) . '/middleware/AuthMiddleware.php';
require_once dirname(__DIR__) . '/models/Message.php';
require_once dirname(__DIR__) . '/models/CustomerProfile.php';

class MessageController {
    /**
     * Get chat message history for the authenticated customer
     */
    public function index(): void {
        $user = AuthMiddleware::check();
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
            // Mark salon messages as read when fetched
            Message::markAllReadForUser($userId);
        }

        Response::success($messages);
    }

    /**
     * Send a customer message and receive automated concierge response
     */
    public function send(): void {
        $user = AuthMiddleware::check();
        $userId = (int)$user['id'];

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $text = trim($input['text'] ?? '');
        $attachmentName = !empty($input['attachment_name']) ? trim($input['attachment_name']) : null;
        $attachmentUrl = !empty($input['attachment_url']) ? $input['attachment_url'] : null;

        if (empty($text) && empty($attachmentName)) {
            Response::error('Message text or attachment is required.', 422);
        }

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
     * Delete a single message belonging to the customer
     */
    public function delete(int $id): void {
        $user = AuthMiddleware::check();
        $userId = (int)$user['id'];

        $message = Message::findById($id);
        if (!$message || (int)$message['user_id'] !== $userId) {
            Response::notFound('Message not found.');
        }

        Message::deleteForUser($id, $userId);
        Response::success(null, 'Message deleted successfully.');
    }

    /**
     * Clear entire chat stream for the customer
     */
    public function clear(): void {
        $user = AuthMiddleware::check();
        $userId = (int)$user['id'];

        Message::clearAllForUser($userId);
        Response::success(null, 'Chat history cleared successfully.');
    }

    /**
     * Get unread messages count for badges
     */
    public function unreadCount(): void {
        $user = AuthMiddleware::check();
        $userId = (int)$user['id'];

        $count = Message::getUnreadCount($userId);
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

