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
        $user = AuthMiddleware::checkOptional();
        if ($user && ($user['role'] ?? '') === 'admin') {
            try {
                Notification::ensureSchema();
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
            } catch (Throwable $e) {
                error_log('NotificationController::index Error: ' . $e->getMessage());
                Response::success([
                    'notifications' => [],
                    'metrics'       => [
                        'total'        => 0,
                        'unread'       => 0,
                        'appointments' => 0,
                        'payments'     => 0,
                        'customers'    => 0,
                        'system'       => 0,
                    ],
                    'preferences'   => [
                        'newBooking'       => true,
                        'apptConfirmation' => true,
                        'apptCancellation' => true,
                        'apptRescheduling' => true,
                        'paymentReceived'  => true,
                        'pendingPayment'   => true,
                        'newCustomer'      => true
                    ],
                ]);
            }
            return;
        }

        $userId = $user ? (int)($user['id'] ?? 0) : 0;
        if ($userId <= 0) {
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }
            if (!empty($_SESSION['user_id'])) {
                $userId = (int)$_SESSION['user_id'];
            }
        }
        if ($userId <= 0) {
            Response::success([]);
            return;
        }

        try {
            Notification::ensureSchema();
            $notifications = Notification::forUser($userId);
            Response::success($notifications);
        } catch (Throwable $e) {
            error_log('NotificationController::forUser Error: ' . $e->getMessage());
            Response::success([]);
        }
    }

    public function markRead(int $id): void {
        $auth = AuthMiddleware::check();
        $notif = Notification::findById($id);
        if (!$notif) {
            Response::notFound('Notification not found.');
        }

        if ($auth['role'] !== 'admin' && (int)$notif['user_id'] !== (int)$auth['id']) {
            Response::forbidden('Access denied.');
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $isRead = isset($input['is_read']) ? (bool)$input['is_read'] : true;

        Notification::markRead($id, $isRead);
        $updated = Notification::findById($id);

        Response::success($updated, 'Notification updated successfully.');
    }

    public function toggleRead(int $id): void {
        $auth = AuthMiddleware::check();
        $notif = Notification::findById($id);
        if (!$notif) {
            Response::notFound('Notification not found.');
        }

        if ($auth['role'] !== 'admin' && (int)$notif['user_id'] !== (int)$auth['id']) {
            Response::forbidden('Access denied.');
        }

        $newRead = empty($notif['is_read']);
        Notification::markRead($id, $newRead);
        $updated = Notification::findById($id);

        Response::success($updated, 'Notification read state toggled.');
    }

    public function markAllRead(): void {
        $auth = AuthMiddleware::check();
        if ($auth['role'] === 'admin') {
            Notification::markAllRead();
            $metrics = Notification::getSummaryMetrics();
            Response::success($metrics, 'All notifications marked as read.');
        } else {
            $userId = (int)$auth['id'];
            Notification::markAllReadForUser($userId);
            Response::success(null, 'All notifications marked as read.');
        }
    }

    public function destroy(int $id): void {
        $auth = AuthMiddleware::check();
        $notif = Notification::findById($id);
        if (!$notif) {
            Response::notFound('Notification not found.');
        }

        if ($auth['role'] !== 'admin' && (int)$notif['user_id'] !== (int)$auth['id']) {
            Response::forbidden('Access denied.');
        }

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
