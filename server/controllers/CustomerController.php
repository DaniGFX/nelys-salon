<?php
/**
 * Nely's Salon Management System
 * Customer Directory & Profile Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/helpers/Sanitizer.php';
require_once dirname(__DIR__) . '/models/CustomerProfile.php';
require_once dirname(__DIR__) . '/models/Booking.php';
require_once dirname(__DIR__) . '/middleware/AuthMiddleware.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';

class CustomerController {
    public function index(): void {
        RoleMiddleware::requireAdmin();

        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $offset = ($page - 1) * $limit;

        $customers = CustomerProfile::all($limit, $offset);
        Response::success($customers);
    }

    public function show(int $id): void {
        RoleMiddleware::requireAdmin();

        $profile = CustomerProfile::findByUserId($id);
        if (!$profile) {
            Response::notFound('Customer profile not found.');
        }

        $bookings = Booking::findByCustomer($id);
        Response::success([
            'profile'  => $profile,
            'bookings' => $bookings,
        ]);
    }

    public function getProfile(): void {
        $auth = AuthMiddleware::check();

        $profile = CustomerProfile::findByUserId($auth['id']);
        if (!$profile) {
            $user = User::findById($auth['id']);
            $profile = [
                'user_id' => $auth['id'],
                'full_name' => $user['email'] ? explode('@', $user['email'])[0] : 'Client',
                'email' => $user['email'] ?? '',
                'phone' => $user['phone'] ?? '',
                'home_address' => '',
            ];
        }

        Response::success($profile);
    }

    public function updateProfile(): void {
        $auth = AuthMiddleware::check();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $validator = Validator::make($input, [
            'full_name' => 'min:2|max:150',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        CustomerProfile::update($auth['id'], $input);

        // Update phone in users table if provided
        if (isset($input['phone'])) {
            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("UPDATE users SET phone = :phone WHERE id = :id");
            $stmt->execute(['phone' => $input['phone'], 'id' => $auth['id']]);
        }

        $updated = CustomerProfile::findByUserId($auth['id']);
        Response::success($updated, 'Profile updated successfully.');
    }
}
