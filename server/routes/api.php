<?php
/**
 * Nely's Salon Management System
 * REST API Router
 */

// Global headers & CORS
if (!headers_sent()) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/controllers/AuthController.php';
require_once dirname(__DIR__) . '/controllers/BookingController.php';
require_once dirname(__DIR__) . '/controllers/ServiceController.php';
require_once dirname(__DIR__) . '/controllers/AvailabilityController.php';
require_once dirname(__DIR__) . '/controllers/CustomerController.php';
require_once dirname(__DIR__) . '/controllers/InventoryController.php';
require_once dirname(__DIR__) . '/controllers/SalesController.php';
require_once dirname(__DIR__) . '/controllers/NotificationController.php';
require_once dirname(__DIR__) . '/controllers/SettingsController.php';
require_once dirname(__DIR__) . '/controllers/MessageController.php';
require_once dirname(__DIR__) . '/controllers/DashboardController.php';

class Router {
    public static function dispatch(string $method, string $uri): void {
        // Strip query string and leading/trailing slashes
        $path = parse_url($uri, PHP_URL_PATH);
        
        // Remove base prefix if accessing through /nelys-salon/api or /api
        $path = preg_replace('#^.*?/api/?#i', '', $path);
        $path = trim($path, '/');
        $segments = explode('/', $path);
        $resource = $segments[0] ?? '';
        $id = $segments[1] ?? null;
        $subaction = $segments[2] ?? null;

        try {
            switch ($resource) {
                // Auth Routes
                case 'auth':
                    $authCtrl = new AuthController();
                    if ($id === 'login' && $method === 'POST') {
                        $authCtrl->login();
                    } elseif ($id === 'register' && $method === 'POST') {
                        $authCtrl->register();
                    } elseif ($id === 'me' && $method === 'GET') {
                        $authCtrl->me();
                    } elseif ($id === 'logout' && $method === 'POST') {
                        $authCtrl->logout();
                    } elseif (($id === 'password' || $id === 'change-password') && $method === 'POST') {
                        $authCtrl->changePassword();
                    } else {
                        Response::notFound('Auth endpoint not found.');
                    }
                    break;

                // Services Catalog Routes
                case 'services':
                    $svcCtrl = new ServiceController();
                    if ($id === null) {
                        if ($method === 'GET') $svcCtrl->index();
                        if ($method === 'POST') $svcCtrl->store();
                    } elseif (is_numeric($id)) {
                        if ($method === 'GET') $svcCtrl->show((int)$id);
                        if ($method === 'PUT' || $method === 'PATCH') $svcCtrl->update((int)$id);
                        if ($subaction === 'toggle' && $method === 'POST') $svcCtrl->toggle((int)$id);
                    }
                    Response::notFound('Service endpoint not found.');
                    break;

                // Availability Slots Routes
                case 'availability':
                    $availCtrl = new AvailabilityController();
                    if ($method === 'GET') $availCtrl->slots();
                    Response::notFound('Availability endpoint not found.');
                    break;

                // Appointments / Bookings Routes
                case 'bookings':
                case 'appointments':
                    $bookingCtrl = new BookingController();
                    if ($id === null) {
                        if ($method === 'GET') $bookingCtrl->index();
                        if ($method === 'POST') $bookingCtrl->create();
                    } elseif ($id !== null && $subaction === 'cancel' && ($method === 'POST' || $method === 'PATCH')) {
                        $bookingCtrl->cancel($id);
                    } elseif ($id !== null && $subaction === 'status' && ($method === 'POST' || $method === 'PATCH')) {
                        $bookingCtrl->updateStatus((int)$id);
                    } elseif ($id !== null) {
                        if ($method === 'GET') $bookingCtrl->show($id);
                        if ($method === 'PUT' || $method === 'PATCH') $bookingCtrl->update((int)$id);
                        if ($method === 'DELETE') $bookingCtrl->destroy((int)$id);
                    }
                    Response::notFound('Booking endpoint not found.');
                    break;

                // Customers Directory & Profile Routes
                case 'customers':
                    $custCtrl = new CustomerController();
                    if ($id === null && $method === 'GET') $custCtrl->index();
                    if ($id === 'profile' && $method === 'GET') $custCtrl->getProfile();
                    if ($id === 'profile' && ($method === 'PUT' || $method === 'PATCH')) $custCtrl->updateProfile();
                    if (is_numeric($id) && $method === 'GET') $custCtrl->show((int)$id);
                    Response::notFound('Customer endpoint not found.');
                    break;

                // Inventory & Stock Routes
                case 'inventory':
                    $invCtrl = new InventoryController();
                    if ($id === null) {
                        if ($method === 'GET') $invCtrl->index();
                        if ($method === 'POST') $invCtrl->store();
                    } elseif ($id === 'movement' && $method === 'POST') {
                        $invCtrl->movement();
                    }
                    Response::notFound('Inventory endpoint not found.');
                    break;

                // Sales & Reporting Routes
                case 'sales':
                    $salesCtrl = new SalesController();
                    if ($id === 'report' && $method === 'GET') $salesCtrl->report();
                    if ($id === 'export' && $method === 'GET') $salesCtrl->export();
                    Response::notFound('Sales endpoint not found.');
                    break;

                // Notifications Routes
                case 'notifications':
                    $notifCtrl = new NotificationController();
                    if ($id === null && $method === 'GET') $notifCtrl->index();
                    if (is_numeric($id) && $subaction === 'resend' && $method === 'POST') $notifCtrl->resend((int)$id);
                    Response::notFound('Notification endpoint not found.');
                    break;

                // Business Settings Routes
                case 'settings':
                    $settingCtrl = new SettingsController();
                    if ($method === 'GET') $settingCtrl->index();
                    if ($method === 'PUT' || $method === 'POST') $settingCtrl->update();
                    Response::notFound('Settings endpoint not found.');
                    break;

                // Customer Support Messages Routes
                case 'messages':
                    $msgCtrl = new MessageController();
                    if ($id === null) {
                        if ($method === 'GET') $msgCtrl->index();
                        if ($method === 'POST') $msgCtrl->send();
                        if ($method === 'DELETE') $msgCtrl->clear();
                    } elseif ($id === 'clear' && $method === 'POST') {
                        $msgCtrl->clear();
                    } elseif ($id === 'unread-count' && $method === 'GET') {
                        $msgCtrl->unreadCount();
                    } elseif (is_numeric($id) && $method === 'DELETE') {
                        $msgCtrl->delete((int)$id);
                    }
                    Response::notFound('Message endpoint not found.');
                    break;

                // Admin Dashboard Routes
                case 'dashboard':
                    $dashCtrl = new DashboardController();
                    if (($id === null || $id === 'stats' || $id === 'overview') && $method === 'GET') {
                        $dashCtrl->stats();
                    }
                    Response::notFound('Dashboard endpoint not found.');
                    break;

                // Health check
                case 'health':
                case '':
                    Response::success([
                        'status'  => 'online',
                        'service' => "Nely's Salon REST API",
                        'version' => '1.0.0',
                    ], 'API is running smoothly.');
                    break;

                default:
                    Response::notFound("Endpoint '/{$resource}' not found.");
            }
        } catch (Throwable $e) {
            error_log('[Nely\'s Salon] API Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            Response::serverError('An unexpected error occurred.');
        }
    }
}
