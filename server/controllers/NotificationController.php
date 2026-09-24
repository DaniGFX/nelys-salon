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
        RoleMiddleware::requireAdmin();

        $filters = [
            'category' => $_GET['category'] ?? 'all',
            'status'   => $_GET['status'] ?? 'all',
            'search'   => $_GET['search'] ?? '',
        ];

        $notifications = Notification::allWithDetails($filters);
        $metrics = Notification::getSummaryMetrics();
        $preferences = Notification::getPreferences();

        Response::success([
            'notifications' => $notifications,
            'metrics'       => $metrics,
            'preferences'   => $preferences,
        ]);
    }

    public function markRead(int $id): void {
        RoleMiddleware::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $isRead = isset($input['is_read']) ? (bool)$input['is_read'] : true;

        Notification::markRead($id, $isRead);
        $updated = Notification::findById($id);

        Response::success($updated, 'Notification updated successfully.');
    }

    public function toggleRead(int $id): void {
        RoleMiddleware::requireAdmin();

        $notif = Notification::findById($id);
        if (!$notif) {
            Response::notFound('Notification not found.');
        }

        $newRead = empty($notif['is_read']);
        Notification::markRead($id, $newRead);
        $updated = Notification::findById($id);

        Response::success($updated, 'Notification read state toggled.');
    }

    public function markAllRead(): void {
        RoleMiddleware::requireAdmin();

        Notification::markAllRead();
        $metrics = Notification::getSummaryMetrics();

        Response::success($metrics, 'All notifications marked as read.');
    }

    public function destroy(int $id): void {
        RoleMiddleware::requireAdmin();

        Notification::delete($id);
        Response::success(null, 'Notification deleted successfully.');
    }

    public function preferences(): void {
        RoleMiddleware::requireAdmin();
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
            $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            Notification::savePreferences($input);
            $prefs = Notification::getPreferences();
            Response::success($prefs, 'Notification preferences saved successfully.');
        } else {
            $prefs = Notification::getPreferences();
            Response::success($prefs);
        }
    }
}
