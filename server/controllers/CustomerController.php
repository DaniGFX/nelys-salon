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
require_once dirname(__DIR__) . '/models/Notification.php';
require_once dirname(__DIR__) . '/middleware/AuthMiddleware.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';

class CustomerController {
    public function index(): void {
        RoleMiddleware::requireAdmin();

        try {
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
                    'totalAppointments'     => (int)($c['total_appointments'] ?? 0),
                    'completedAppointments' => (int)($c['completed_appointments'] ?? 0),
                    'cancelledAppointments' => (int)($c['cancelled_appointments'] ?? 0),
                    'pendingAppointments'   => (int)($c['pending_appointments'] ?? 0),
                    'totalSpent'            => (float)($c['total_spent'] ?? 0),
                    'totalSpentFormatted'   => '₱' . number_format((float)($c['total_spent'] ?? 0), 2),
                    'lastVisit'             => $lastVisitText,
                    'notes'                 => $notesList,
                ];
            }, $rawCustomers);

            $pdo = Database::getConnection();
            $services = [];
            try {
                $services = Service::all(true);
            } catch (Throwable $se) {}

            $staff = [];
            try {
                $staff = $pdo->query("SELECT id, name, role FROM staff WHERE is_active = 1 ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);
            } catch (Throwable $ste) {}

            Response::success([
                'customers' => $customers,
                'summary'   => $summary,
                'services'  => $services,
                'staff'     => $staff,
            ]);
        } catch (Throwable $e) {
            Response::success([
                'customers' => [],
                'summary'   => [
                    'total'        => 0,
                    'newThisMonth' => 0,
                    'withUpcoming' => 0,
                    'returning'    => 0,
                ],
                'services'  => [],
                'staff'     => [],
            ]);
        }
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
            'name'  => 'required|min:2',
            'phone' => 'required',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed: ' . implode(', ', array_map(fn($e) => implode(' ', $e), $validator->errors())), 422, $validator->errors());
        }

        $cleanPhone = Sanitizer::cleanPhone($input['phone']);
        $existingPhone = User::findByPhone($cleanPhone) ?? User::findByPhone($input['phone']);
        if ($existingPhone) {
            Response::error('A customer with this phone number is already registered.', 422);
        }

        // Email handling: use provided email if valid, or generate unique placeholder
        $cleanEmail = !empty($input['email']) ? strtolower(trim($input['email'])) : null;
        if ($cleanEmail) {
            if (!filter_var($cleanEmail, FILTER_VALIDATE_EMAIL)) {
                Response::error('Please provide a valid email address.', 422);
            }
            $existing = User::findByEmail($cleanEmail);
            if ($existing) {
                Response::error('A customer with this email address is already registered.', 422);
            }
        } else {
            $digits = preg_replace('/\D/', '', $cleanPhone);
            $cleanEmail = 'patron_' . ($digits ?: time()) . '@nelyssalon.com';
            if (User::findByEmail($cleanEmail)) {
                $cleanEmail = 'patron_' . time() . '_' . rand(100, 999) . '@nelyssalon.com';
            }
        }

        $tempPassword = password_hash(bin2hex(random_bytes(8)), PASSWORD_BCRYPT);
        $userId = User::create($cleanEmail, $cleanPhone, $tempPassword, 'customer');

        // Format notes if provided
        $notes = null;
        if (!empty($input['notes'])) {
            $rawNotes = trim($input['notes']);
            $decoded = json_decode($rawNotes, true);
            if (is_array($decoded)) {
                $notes = $rawNotes;
            } else {
                $notes = json_encode([[
                    'id'     => 'n_' . $userId . '_' . time(),
                    'text'   => $rawNotes,
                    'date'   => date('M d, Y'),
                    'author' => 'Admin'
                ]]);
            }
        }

        CustomerProfile::create(
            $userId,
            trim($input['name']),
            $input['home_address'] ?? $input['address'] ?? null,
            !empty($input['dob']) ? $input['dob'] : null,
            $input['gender'] ?? 'Female',
            $notes,
            $input['status'] ?? 'Active',
            $input['city'] ?? 'Quezon City'
        );

        // Notify admin panel
        try {
            Notification::create([
                'user_id'        => $userId,
                'recipient_role' => 'admin',
                'category'       => 'customers',
                'title'          => 'New Customer Added',
                'message'        => "{$input['name']} ({$cleanPhone}) was added to the customer directory.",
                'action_url'     => 'customers.html',
                'type'           => 'info',
                'status'         => 'sent'
            ]);
        } catch (Throwable $e) {}

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

        $userUpdates = [];
        if (!empty($input['email'])) {
            $cleanEmail = strtolower(trim($input['email']));
            if (!filter_var($cleanEmail, FILTER_VALIDATE_EMAIL)) {
                Response::error('Please provide a valid email address.', 422);
            }
            $existing = User::findByEmail($cleanEmail);
            if ($existing && (int)$existing['id'] !== $id) {
                Response::error('This email is already registered to another account.', 422);
            }
            $userUpdates['email'] = $cleanEmail;
        }

        if (!empty($input['phone'])) {
            $cleanPhone = Sanitizer::cleanPhone($input['phone']);
            $existingPhone = User::findByPhone($cleanPhone) ?? User::findByPhone($input['phone']);
            if ($existingPhone && (int)$existingPhone['id'] !== $id) {
                Response::error('This phone number is already registered to another account.', 422);
            }
            $userUpdates['phone'] = $cleanPhone;
        }

        if (!empty($userUpdates)) {
            User::update($id, $userUpdates);
        }

        $profileData = [];
        if (isset($input['name']) || isset($input['full_name'])) {
            $profileData['full_name'] = trim($input['name'] ?? $input['full_name']);
        }
        if (isset($input['address']) || isset($input['home_address'])) {
            $profileData['home_address'] = trim($input['address'] ?? $input['home_address']);
        }
        if (isset($input['city'])) $profileData['city'] = trim($input['city']);
        if (isset($input['dob'])) $profileData['dob'] = !empty($input['dob']) ? $input['dob'] : null;
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

    /**
     * Alias for create
     */
    public function store(): void {
        $this->create();
    }

    /**
     * Add admin note to customer profile
     * POST /api/customers/{id}/notes
     */
    public function addNote(int $id): void {
        RoleMiddleware::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $noteText = trim($input['note'] ?? $input['text'] ?? '');
        if (empty($noteText)) {
            Response::badRequest('Note content cannot be empty.');
            return;
        }

        $profile = CustomerProfile::findByUserId($id);
        if (!$profile) {
            Response::notFound('Customer record not found.');
            return;
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

        array_unshift($notesList, [
            'id' => 'n_' . time(),
            'text' => $noteText,
            'date' => date('M d, Y'),
            'author' => 'Admin'
        ]);

        CustomerProfile::update($id, ['notes' => json_encode($notesList)]);
        Response::success(['notes' => $notesList], 'Customer note added successfully.');
    }

    /**
     * Get authenticated customer's own profile
     * GET /api/customers/profile
     */
    public function getProfile(): void {
        $auth = AuthMiddleware::check();
        $userId = (int)($auth['id'] ?? 0);
        if ($userId <= 0) {
            Response::unauthorized('Authentication required.');
            return;
        }

        $profile = CustomerProfile::findByUserId($userId);
        if (!$profile) {
            $user = User::findById($userId);
            if (!$user) {
                Response::notFound('User record not found.');
                return;
            }
            $name = explode('@', $user['email'] ?? 'Customer')[0];
            CustomerProfile::create(
                $userId,
                $name,
                null,
                null,
                'Female',
                null,
                'Active',
                'Quezon City'
            );
            $profile = CustomerProfile::findByUserId($userId);
        }

        if (!$profile) {
            Response::serverError('Unable to load customer profile.');
            return;
        }

        // Return profile payload with backward-compatible aliases
        $profile['name'] = $profile['full_name'] ?? '';
        $profile['address'] = $profile['home_address'] ?? '';

        Response::success($profile, 'Profile retrieved successfully.');
    }

    /**
     * Update authenticated customer's own profile
     * PUT /api/customers/profile
     */
    public function updateProfile(): void {
        $auth = AuthMiddleware::check();
        $userId = (int)($auth['id'] ?? 0);
        if ($userId <= 0) {
            Response::unauthorized('Authentication required.');
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            $input = $_POST;
        }
        $input = Sanitizer::cleanArray($input);

        $profile = CustomerProfile::findByUserId($userId);
        $fullName = trim($input['full_name'] ?? $input['name'] ?? ($profile['full_name'] ?? ''));
        $phone = !empty($input['phone']) ? Sanitizer::cleanPhone($input['phone']) : ($profile['phone'] ?? null);
        $address = trim($input['home_address'] ?? $input['address'] ?? ($profile['home_address'] ?? ''));
        $city = trim($input['city'] ?? ($profile['city'] ?? 'Quezon City'));
        $dob = !empty($input['dob']) ? $input['dob'] : ($profile['dob'] ?? null);
        $gender = !empty($input['gender']) ? $input['gender'] : ($profile['gender'] ?? 'Female');

        // Check unique phone if changed
        if ($phone) {
            $existingPhone = User::findByPhone($phone);
            if ($existingPhone && (int)$existingPhone['id'] !== $userId) {
                Response::error('This phone number is already registered to another account.', 422);
                return;
            }
            User::update($userId, ['phone' => $phone]);
        }

        // Create or update customer profile
        CustomerProfile::create(
            $userId,
            $fullName,
            $address,
            $dob,
            $gender,
            $profile['notes'] ?? null,
            $profile['status'] ?? 'Active',
            $city
        );

        $updated = CustomerProfile::findByUserId($userId);
        if ($updated) {
            $updated['name'] = $updated['full_name'] ?? '';
            $updated['address'] = $updated['home_address'] ?? '';
        }

        Response::success($updated, 'Profile updated successfully.');
    }
}
