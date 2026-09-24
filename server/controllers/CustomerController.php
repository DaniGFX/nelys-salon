<?php
/**
 * Nely's Salon Management System
 * Customer Directory & Profile Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/helpers/Sanitizer.php';
require_once dirname(__DIR__) . '/models/CustomerProfile.php';
require_once dirname(__DIR__) . '/models/User.php';
require_once dirname(__DIR__) . '/models/Booking.php';
require_once dirname(__DIR__) . '/models/Service.php';
require_once dirname(__DIR__) . '/middleware/AuthMiddleware.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';

class CustomerController {
    public function index(): void {
        RoleMiddleware::requireAdmin();

        $rawCustomers = CustomerProfile::allWithMetrics();
        $summary = CustomerProfile::getSummaryMetrics();

        $customers = array_map(function($c) {
            $createdTs = strtotime($c['user_created_at'] ?? 'now');
            $lastVisitText = 'Never';
            if (!empty($c['last_visit_raw'])) {
                $lvTime = strtotime($c['last_visit_raw']);
                $lastVisitText = date('M d', $lvTime);
            }

            // Parse notes
            $notesList = [];
            if (!empty($c['notes'])) {
                $decoded = json_decode($c['notes'], true);
                if (is_array($decoded)) {
                    $notesList = $decoded;
                } else {
                    $notesList[] = [
                        'id' => 'n_' . $c['user_id'] . '_1',
                        'text' => $c['notes'],
                        'date' => date('M d, Y', $createdTs),
                        'author' => 'Admin'
                    ];
                }
            }

            return [
                'id'                    => 'CUST-' . str_pad((string)$c['user_id'], 4, '0', STR_PAD_LEFT),
                'userId'                => (int)$c['user_id'],
                'name'                  => $c['name'] ?: 'Customer',
                'phone'                 => $c['phone'] ?: 'N/A',
                'email'                 => $c['email'] ?: '',
                'dob'                   => $c['dob'] ?: '',
                'address'               => $c['home_address'] ?: '',
                'city'                  => $c['city'] ?: 'Quezon City',
                'gender'                => $c['gender'] ?: 'Female',
                'joinedDate'            => date('F Y', $createdTs),
                'joinedTimestamp'       => date('Y-m-d', $createdTs),
                'status'                => $c['status'] ?: 'Active',
                'totalAppointments'     => (int)$c['total_appointments'],
                'completedAppointments' => (int)$c['completed_appointments'],
                'cancelledAppointments' => (int)$c['cancelled_appointments'],
                'pendingAppointments'   => (int)$c['pending_appointments'],
                'totalSpent'            => (float)$c['total_spent'],
                'totalSpentFormatted'   => '₱' . number_format((float)$c['total_spent'], 0),
                'lastVisit'             => $lastVisitText,
                'notes'                 => $notesList,
            ];
        }, $rawCustomers);

        $pdo = Database::getConnection();
        $services = Service::all(true);
        $staff = $pdo->query("SELECT id, name, role FROM staff WHERE is_active = 1 ORDER BY name ASC")->fetchAll();

        Response::success([
            'customers' => $customers,
            'summary'   => $summary,
            'services'  => $services,
            'staff'     => $staff,
        ]);
    }

    public function show(int $id): void {
        RoleMiddleware::requireAdmin();

        $customer = CustomerProfile::findWithHistory($id);
        if (!$customer) {
            Response::notFound('Customer record not found.');
        }

        $createdTs = strtotime($customer['user_created_at'] ?? 'now');
        $notesList = [];
        if (!empty($customer['notes'])) {
            $decoded = json_decode($customer['notes'], true);
            if (is_array($decoded)) {
                $notesList = $decoded;
            } else {
                $notesList[] = [
                    'id' => 'n_' . $customer['user_id'] . '_1',
                    'text' => $customer['notes'],
                    'date' => date('M d, Y', $createdTs),
                    'author' => 'Admin'
                ];
            }
        }

        $formattedHistory = array_map(function($h) {
            $time = strtotime($h['booking_date'] . ' ' . $h['booking_time']);
            return [
                'id'       => $h['reference_no'] ?: ('APPT-' . $h['id']),
                'bookingId'=> (int)$h['id'],
                'date'     => date('M d, Y', $time),
                'time'     => date('g:i A', $time),
                'service'  => $h['service_name'],
                'staff'    => $h['staff_name'],
                'amount'   => (float)$h['amount'],
                'amountFormatted' => '₱' . number_format((float)$h['amount'], 0),
                'status'   => ucfirst($h['status']),
            ];
        }, $customer['history'] ?? []);

        $response = [
            'id'                    => 'CUST-' . str_pad((string)$customer['user_id'], 4, '0', STR_PAD_LEFT),
            'userId'                => (int)$customer['user_id'],
            'name'                  => $customer['name'] ?: 'Customer',
            'phone'                 => $customer['phone'] ?: 'N/A',
            'email'                 => $customer['email'] ?: '',
            'dob'                   => $customer['dob'] ?: '',
            'address'               => $customer['home_address'] ?: '',
            'city'                  => $customer['city'] ?: 'Quezon City',
            'gender'                => $customer['gender'] ?: 'Female',
            'joinedDate'            => date('F Y', $createdTs),
            'joinedTimestamp'       => date('Y-m-d', $createdTs),
            'status'                => $customer['status'] ?: 'Active',
            'totalAppointments'     => (int)$customer['total_appointments'],
            'completedAppointments' => (int)$customer['completed_appointments'],
            'cancelledAppointments' => (int)$customer['cancelled_appointments'],
            'pendingAppointments'   => (int)$customer['pending_appointments'],
            'totalSpent'            => (float)$customer['total_spent'],
            'totalSpentFormatted'   => '₱' . number_format((float)$customer['total_spent'], 0),
            'notes'                 => $notesList,
            'history'               => $formattedHistory,
        ];

        Response::success($response);
    }

    public function store(): void {
        RoleMiddleware::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $validator = Validator::make($input, [
            'name'  => 'required|min:2|max:150',
            'phone' => 'required',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        $phone = Sanitizer::cleanPhone($input['phone'] ?? '');
        $email = trim($input['email'] ?? '');
        if (empty($email)) {
            $email = 'client_' . time() . '_' . rand(100, 999) . '@nelyssalon.com';
        }

        // Check if user with phone/email already exists
        $existing = User::findByPhone($phone) ?: User::findByEmail($email);
        if ($existing) {
            Response::error('A customer with this phone number or email is already registered.', 409);
        }

        $tempPassword = password_hash(bin2hex(random_bytes(8)), PASSWORD_BCRYPT);
        $userId = User::create($email, $phone, $tempPassword, 'customer');

        $initialNotes = null;
        if (!empty($input['notes'])) {
            $initialNotes = json_encode([[
                'id' => 'n_' . $userId . '_' . time(),
                'text' => trim($input['notes']),
                'date' => date('M d, Y'),
                'author' => 'Admin'
            ]]);
        }

        CustomerProfile::create(
            $userId,
            trim($input['name'] ?? $input['full_name'] ?? 'Client'),
            $input['address'] ?? $input['home_address'] ?? null,
            !empty($input['dob']) ? $input['dob'] : null,
            $input['gender'] ?? 'Female',
            $initialNotes,
            $input['status'] ?? 'Active',
            $input['city'] ?? 'Quezon City'
        );

        $customer = CustomerProfile::findByUserId($userId);
        Response::success($customer, 'Customer registered successfully.', 201);
    }

    public function update(int $id): void {
        RoleMiddleware::requireAdmin();

        $user = User::findById($id);
        if (!$user || $user['role'] !== 'customer') {
            Response::notFound('Customer not found.');
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $pdo = Database::getConnection();

        // Update user record (phone, email)
        if (!empty($input['phone'])) {
            $cleanPhone = Sanitizer::cleanPhone($input['phone']);
            $pdo->prepare("UPDATE users SET phone = :phone WHERE id = :id")
                ->execute(['phone' => $cleanPhone, 'id' => $id]);
        }
        if (!empty($input['email'])) {
            $pdo->prepare("UPDATE users SET email = :email WHERE id = :id")
                ->execute(['email' => trim($input['email']), 'id' => $id]);
        }

        // Update profile record
        $updateData = [];
        if (isset($input['name']) || isset($input['full_name'])) {
            $updateData['full_name'] = trim($input['name'] ?? $input['full_name']);
        }
        if (isset($input['address']) || isset($input['home_address'])) {
            $updateData['home_address'] = trim($input['address'] ?? $input['home_address']);
        }
        if (isset($input['city'])) {
            $updateData['city'] = trim($input['city']);
        }
        if (isset($input['dob'])) {
            $updateData['dob'] = !empty($input['dob']) ? $input['dob'] : null;
        }
        if (isset($input['gender'])) {
            $updateData['gender'] = $input['gender'];
        }
        if (isset($input['status'])) {
            $updateData['status'] = $input['status'];
        }

        // Check if customer profile exists
        $profile = CustomerProfile::findByUserId($id);
        if ($profile) {
            CustomerProfile::update($id, $updateData);
        } else {
            CustomerProfile::create(
                $id,
                $updateData['full_name'] ?? 'Client',
                $updateData['home_address'] ?? null,
                $updateData['dob'] ?? null,
                $updateData['gender'] ?? 'Female',
                null,
                $updateData['status'] ?? 'Active',
                $updateData['city'] ?? 'Quezon City'
            );
        }

        $updated = CustomerProfile::findByUserId($id);
        Response::success($updated, 'Customer profile updated successfully.');
    }

    public function addNote(int $id): void {
        RoleMiddleware::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $noteText = trim($input['note'] ?? $input['text'] ?? '');

        if (empty($noteText)) {
            Response::error('Note text cannot be empty.', 422);
        }

        $profile = CustomerProfile::findByUserId($id);
        if (!$profile) {
            Response::notFound('Customer profile not found.');
        }

        $notesList = [];
        if (!empty($profile['notes'])) {
            $decoded = json_decode($profile['notes'], true);
            if (is_array($decoded)) {
                $notesList = $decoded;
            } else {
                $notesList[] = [
                    'id' => 'n_' . $id . '_1',
                    'text' => $profile['notes'],
                    'date' => date('M d, Y'),
                    'author' => 'Admin'
                ];
            }
        }

        $auth = AuthMiddleware::check();
        $authorName = $auth['email'] ? explode('@', $auth['email'])[0] : 'Admin';

        array_unshift($notesList, [
            'id'     => 'n_' . $id . '_' . time(),
            'text'   => $noteText,
            'date'   => date('M d, Y'),
            'author' => ucfirst($authorName)
        ]);

        CustomerProfile::update($id, ['notes' => json_encode($notesList)]);

        Response::success($notesList, 'Note added successfully.');
    }

    public function destroy(int $id): void {
        RoleMiddleware::requireAdmin();

        $user = User::findById($id);
        if (!$user || $user['role'] !== 'customer') {
            Response::notFound('Customer record not found.');
        }

        CustomerProfile::delete($id);
        Response::success(null, 'Customer record and salon history deleted successfully.');
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
