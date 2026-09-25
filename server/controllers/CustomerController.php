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
                'totalSpentFormatted'   => '₱' . number_format((float)$c['total_spent'], 2),
                'lastVisit'             => $lastVisitText,
                'notes'                 => $notesList,
            ];
        }, $rawCustomers);

        $pdo = Database::getConnection();
        $services = Service::all(true);
        $staff = $pdo->query("SELECT id, name, role FROM staff WHERE is_active = 1 ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);

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
                'amountFormatted' => '₱' . number_format((float)$h['amount'], 2),
                'status'   => ucfirst($h['status']),
            ];
        }, $customer['history'] ?? []);

        $customerData = [
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
            'totalSpentFormatted'   => '₱' . number_format((float)$customer['total_spent'], 2),
            'lastVisit'             => !empty($customer['history'][0]['booking_date']) ? date('M d, Y', strtotime($customer['history'][0]['booking_date'])) : 'Never',
            'notes'                 => $notesList,
            'history'               => $formattedHistory,
        ];

        Response::success($customerData);
    }

    public function create(): void {
        RoleMiddleware::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $validator = Validator::make($input, [
            'name'  => 'required',
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        $cleanEmail = strtolower(trim($input['email']));
        $existing = User::findByEmail($cleanEmail);
        if ($existing) {
            Response::error('A customer with this email address is already registered.', 422);
        }

        $cleanPhone = !empty($input['phone']) ? Sanitizer::cleanPhone($input['phone']) : null;
        if ($cleanPhone) {
            $existingPhone = User::findByPhone($cleanPhone);
            if ($existingPhone) {
                Response::error('A customer with this phone number is already registered.', 422);
            }
        }

        $tempPassword = password_hash(bin2hex(random_bytes(8)), PASSWORD_BCRYPT);
        $userId = User::create($cleanEmail, $cleanPhone, $tempPassword, 'customer');

        CustomerProfile::create(
            $userId,
            trim($input['name']),
            $input['address'] ?? null,
            $input['dob'] ?? null,
            $input['gender'] ?? 'Female',
            $input['notes'] ?? null,
            $input['status'] ?? 'Active',
            $input['city'] ?? 'Quezon City'
        );

        $customer = CustomerProfile::findByUserId($userId);
        Response::success($customer, 'Customer record created successfully.', 201);
    }

    public function update(int $id): void {
        RoleMiddleware::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $profile = CustomerProfile::findByUserId($id);
        if (!$profile) {
            Response::notFound('Customer profile not found.');
        }

        if (!empty($input['email']) || !empty($input['phone'])) {
            $userUpdates = [];
            if (!empty($input['email'])) {
                $cleanEmail = strtolower(trim($input['email']));
                $existing = User::findByEmail($cleanEmail);
                if ($existing && (int)$existing['id'] !== $id) {
                    Response::error('This email is already registered to another account.', 422);
                }
                $userUpdates['email'] = $cleanEmail;
            }
            if (!empty($input['phone'])) {
                $cleanPhone = Sanitizer::cleanPhone($input['phone']);
                $existingPhone = User::findByPhone($cleanPhone);
                if ($existingPhone && (int)$existingPhone['id'] !== $id) {
                    Response::error('This phone number is already registered to another account.', 422);
                }
                $userUpdates['phone'] = $cleanPhone;
            }
            if (!empty($userUpdates)) {
                User::update($id, $userUpdates);
            }
        }

        $profileData = [];
        if (isset($input['name'])) $profileData['full_name'] = trim($input['name']);
        if (isset($input['address'])) $profileData['home_address'] = $input['address'];
        if (isset($input['city'])) $profileData['city'] = $input['city'];
        if (isset($input['dob'])) $profileData['dob'] = $input['dob'];
        if (isset($input['gender'])) $profileData['gender'] = $input['gender'];
        if (isset($input['status'])) $profileData['status'] = $input['status'];
        if (isset($input['notes'])) $profileData['notes'] = $input['notes'];

        CustomerProfile::update($id, $profileData);
        $updated = CustomerProfile::findByUserId($id);
        Response::success($updated, 'Customer profile updated successfully.');
    }

    public function destroy(int $id): void {
        RoleMiddleware::requireAdmin();

        $user = User::findById($id);
        if (!$user || $user['role'] !== 'customer') {
            Response::notFound('Customer not found.');
        }

        CustomerProfile::delete($id);
        Response::success([], 'Customer account deleted successfully.');
    }
}
