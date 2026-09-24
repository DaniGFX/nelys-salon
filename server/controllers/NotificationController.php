<?php
/**
 * Nely's Salon Management System
 * Notification Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/models/Notification.php';
require_once dirname(__DIR__) . '/middleware/AuthMiddleware.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';

class NotificationController {
    public function index(): void {
        $auth = AuthMiddleware::check();

        if ($auth['role'] === 'admin') {
            $notifications = Notification::all(50);
        } else {
            $notifications = Notification::findByUser($auth['id']);
        }

        Response::success($notifications);
    }

    public function resend(int $id): void {
        RoleMiddleware::requireAdmin();

        Notification::updateStatus($id, 'sent');
        Response::success(null, 'Notification resent successfully.');
    }
}
