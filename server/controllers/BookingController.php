<?php
/**
 * Nely's Salon Management System
 * Booking Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/helpers/Sanitizer.php';
require_once dirname(__DIR__) . '/helpers/DateHelper.php';
require_once dirname(__DIR__) . '/models/Booking.php';
require_once dirname(__DIR__) . '/models/Service.php';
require_once dirname(__DIR__) . '/models/Payment.php';
require_once dirname(__DIR__) . '/models/Sale.php';
require_once dirname(__DIR__) . '/services/BookingReferenceService.php';
require_once dirname(__DIR__) . '/services/NotificationService.php';
require_once dirname(__DIR__) . '/models/User.php';
require_once dirname(__DIR__) . '/models/CustomerProfile.php';
require_once dirname(__DIR__) . '/middleware/AuthMiddleware.php';

class BookingController {
    public function create(): void {
        $auth = AuthMiddleware::checkOptional();
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $validator = Validator::make($input, [
            'service_id'     => 'required',
            'booking_date'   => 'required|date',
            'booking_time'   => 'required',
            'payment_method' => 'required',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        $service = is_numeric($input['service_id'])
            ? Service::findById((int)$input['service_id'])
            : Service::findByCode((string)$input['service_id']);

        if (!$service || empty($service['is_active'])) {
            Response::error('The selected service is not available.', 404);
        }

        // Determine customer ID
        $customerId = null;
        if ($auth && $auth['role'] === 'customer') {
            $customerId = $auth['id'];
        } elseif (!empty($input['customer_id'])) {
            $customerId = (int)$input['customer_id'];
        } else {
            // Guest or manual customer
            $clientName  = trim($input['client_name'] ?? $input['name'] ?? 'Guest Patron');
            $clientEmail = trim($input['client_email'] ?? $input['email'] ?? '');
            $clientPhone = trim($input['client_phone'] ?? $input['phone'] ?? '');

            if (empty($clientEmail) && empty($clientPhone) && empty($clientName)) {
                if ($auth) {
                    $customerId = $auth['id'];
                } else {
                    Response::error('Please provide customer name, phone number, or email for the booking.', 422);
                }
            } else {
                $user = null;
                if (!empty($clientEmail)) {
                    $user = User::findByEmail($clientEmail);
                }
                if (!$user && !empty($clientPhone)) {
                    $cleanP = Sanitizer::cleanPhone($clientPhone);
                    $user = User::findByPhone($cleanP) ?: User::findByPhone($clientPhone);
                }

                if ($user) {
                    $customerId = $user['id'];
                } else {
                    $guestEmail = !empty($clientEmail) ? $clientEmail : ('guest_' . time() . '_' . rand(100, 999) . '@guest.nelyssalon.com');
                    $guestPhone = !empty($clientPhone) ? Sanitizer::cleanPhone($clientPhone) : '09170000000';
                    $tempPassword = password_hash(bin2hex(random_bytes(8)), PASSWORD_BCRYPT);
                    $customerId = User::create($guestEmail, $guestPhone, $tempPassword, 'customer');
                    CustomerProfile::create($customerId, $clientName, is_string($input['home_address'] ?? null) ? $input['home_address'] : null);
                }
            }
        }

        $rawVisitType = strtolower($input['visit_type'] ?? 'salon');
        $visitType = str_contains($rawVisitType, 'home') ? 'home' : 'salon';

        $homeAddress = $input['home_address'] ?? null;
        if (is_array($homeAddress)) {
            $parts = array_filter([
                $homeAddress['building'] ?? '',
                $homeAddress['street'] ?? '',
                $homeAddress['barangay'] ?? '',
                $homeAddress['city'] ?? '',
                !empty($homeAddress['landmark']) ? 'Landmark: ' . $homeAddress['landmark'] : '',
            ]);
            $homeAddress = implode(', ', $parts);
        }

        $bookingDate = date('Y-m-d', strtotime($input['booking_date']));
        $bookingTime = date('H:i:s', strtotime($input['booking_time']));

        $rawPayMethod = strtolower($input['payment_method'] ?? 'cash');
        if (str_contains($rawPayMethod, 'gcash')) {
            $paymentMethod = 'gcash';
        } elseif (str_contains($rawPayMethod, 'bank')) {
            $paymentMethod = 'bank_transfer';
        } else {
            $paymentMethod = 'cash';
        }

        $referenceNo = BookingReferenceService::generate();
        $totalPrice = (float)$service['price'];
        if ($visitType === 'home') {
            $totalPrice += 150.00; // standard home service transport fee
        }

        $initialStatus = !empty($input['status']) ? strtolower($input['status']) : 'pending';

        $bookingId = Booking::create([
            'reference_no' => $referenceNo,
            'customer_id'  => $customerId,
            'service_id'   => $service['id'],
            'staff_id'     => !empty($input['staff_id']) ? (int)$input['staff_id'] : null,
            'booking_date' => $bookingDate,
            'booking_time' => $bookingTime,
            'visit_type'   => $visitType,
            'home_address' => $homeAddress,
            'status'       => $initialStatus,
            'notes'        => $input['notes'] ?? null,
            'total_price'  => $totalPrice,
        ]);

        // Record payment
        $paymentStatus = !empty($input['payment_status']) ? strtolower($input['payment_status']) : ($paymentMethod === 'cash' ? 'pending' : 'paid');
        Payment::create([
            'booking_id'       => $bookingId,
            'amount'           => $totalPrice,
            'payment_method'   => $paymentMethod,
            'reference_number' => $input['reference_number'] ?? null,
            'status'           => $paymentStatus,
            'paid_at'          => $paymentStatus === 'paid' ? date('Y-m-d H:i:s') : null,
        ]);

        // Create alert notification for customer
        NotificationService::create(
            $customerId,
            'Booking Received',
            "Your appointment for {$service['name']} on {$bookingDate} at {$bookingTime} has been registered.",
            $bookingId
        );

        // Also create notification entry for admin panel
        $isRebook = !empty($input['notes']) && str_contains(strtolower($input['notes']), 're-book');
        Notification::create([
            'user_id'    => $customerId,
            'booking_id' => $bookingId,
            'category'   => 'appointments',
            'title'      => $isRebook ? 'Appointment Re-booked' : 'New Appointment Booked',
            'message'    => "Appointment Ref: {$referenceNo} for {$service['name']} on {$bookingDate} at {$bookingTime} requires review/confirmation.",
            'action_url' => 'admin-appointments.html',
            'channel'    => 'email',
            'status'     => 'sent'
        ]);

        $booking = Booking::findById($bookingId);
        Response::success($booking, 'Appointment booked successfully.', 201);
    }

    public function index(): void {
        $auth = AuthMiddleware::checkOptional();

        if ($auth && ($auth['role'] ?? '') === 'admin') {
            $filters = [
                'status' => $_GET['status'] ?? null,
                'date'   => $_GET['date'] ?? null,
                'search' => $_GET['search'] ?? null,
            ];
            $bookings = Booking::all($filters);

            // Summary metrics
            $pdo = Database::getConnection();
            $today = date('Y-m-d');
            $summary = [
                'today'     => (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE booking_date = '$today'")->fetchColumn(),
                'pending'   => (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE status = 'pending'")->fetchColumn(),
                'confirmed' => (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'")->fetchColumn(),
                'completed' => (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE status = 'completed'")->fetchColumn(),
                'cancelled' => (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE status IN ('cancelled', 'no_show')")->fetchColumn(),
                'total'     => (int)$pdo->query("SELECT COUNT(*) FROM bookings")->fetchColumn(),
            ];

            // Services & Staff lists for dropdown filters & modal selects
            $services = Service::all(true);
            $staff = $pdo->query("SELECT id, name, role FROM staff WHERE is_active = 1 ORDER BY name ASC")->fetchAll();
            $customers = $pdo->query("
                SELECT u.id as user_id, u.email, u.phone, cp.full_name 
                FROM users u 
                LEFT JOIN customer_profiles cp ON u.id = cp.user_id 
                WHERE u.role = 'customer' 
                ORDER BY cp.full_name ASC, u.email ASC
            ")->fetchAll();

            Response::success([
                'bookings'  => $bookings,
                'summary'   => $summary,
                'services'  => $services,
                'staff'     => $staff,
                'customers' => $customers,
            ]);
        } else {
            $customerId = $auth ? (int)$auth['id'] : null;
            if (!$customerId) {
                if (session_status() === PHP_SESSION_NONE) {
                    session_start();
                }
                if (!empty($_SESSION['user_id'])) {
                    $customerId = (int)$_SESSION['user_id'];
                }
            }
            if (!$customerId) {
                $pdo = Database::getConnection();
                $demoId = $pdo->query("SELECT id FROM users WHERE role = 'customer' ORDER BY id ASC LIMIT 1")->fetchColumn();
                $customerId = $demoId ? (int)$demoId : 0;
            }
            $bookings = Booking::findByCustomer($customerId, $_GET['status'] ?? null);
            Response::success($bookings);
        }
    }

    public function show(string $idOrRef): void {
        $auth = AuthMiddleware::check();

        $booking = is_numeric($idOrRef) 
            ? Booking::findById((int)$idOrRef)
            : Booking::findByReference($idOrRef);

        if (!$booking) {
            Response::notFound('Appointment not found.');
        }

        if ($auth['role'] !== 'admin' && (int)$booking['customer_id'] !== $auth['id']) {
            Response::forbidden('You do not have access to this appointment.');
        }

        Response::success($booking);
    }

    public function cancel(string|int $idOrRef): void {
        $auth = AuthMiddleware::check();
        $booking = is_numeric($idOrRef) 
            ? Booking::findById((int)$idOrRef) 
            : Booking::findByReference((string)$idOrRef);

        if (!$booking) {
            Response::notFound('Appointment not found.');
        }

        if ($auth['role'] !== 'admin' && (int)$booking['customer_id'] !== $auth['id']) {
            Response::forbidden('You do not have permission to cancel this booking.');
        }

        // Check 24hr policy for customers only if confirmed/in past
        if ($auth['role'] !== 'admin') {
            $appointmentDateTime = "{$booking['booking_date']} {$booking['booking_time']}";
            if ($booking['status'] === 'confirmed' && !DateHelper::canCancel($appointmentDateTime, 24)) {
                Response::error('Confirmed appointments may only be cancelled at least 24 hours prior. Please call our Lagro concierge at 0917 123 4567.');
            }
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $reason = Sanitizer::cleanString($input['reason'] ?? 'Customer request');

        Booking::updateStatus((int)$booking['id'], 'cancelled', $reason);

        NotificationService::create(
            (int)$booking['customer_id'],
            'Appointment Cancelled',
            "Your appointment Ref: {$booking['reference_no']} has been cancelled.",
            (int)$booking['id']
        );

        Response::success(null, 'Appointment has been cancelled successfully.');
    }

    public function updateStatus(int $id): void {
        require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';
        RoleMiddleware::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $validator = Validator::make($input, [
            'status' => 'required|in:pending,confirmed,completed,cancelled,no_show'
        ]);

        if ($validator->fails()) {
            Response::error('Invalid status value.', 422, $validator->errors());
        }

        $booking = Booking::findById($id);
        if (!$booking) {
            Response::notFound('Booking not found.');
        }

        $status = $input['status'];
        Booking::updateStatus($id, $status, $input['reason'] ?? null);

        // Notify customer when admin approves/confirms booking
        if ($status === 'confirmed' && !empty($booking['customer_id'])) {
            NotificationService::create(
                (int)$booking['customer_id'],
                'Appointment Confirmed',
                "Your appointment for {$booking['service_name']} on {$booking['booking_date']} has been approved and confirmed by our salon team!",
                (int)$booking['id']
            );
        }

        // If completed, record to sales ledger if not already recorded
        if ($status === 'completed') {
            Sale::create([
                'booking_id'     => $booking['id'],
                'amount'         => $booking['total_price'],
                'service_name'   => $booking['service_name'],
                'customer_name'  => $booking['customer_name'] ?? 'Patron',
                'payment_method' => $booking['payment_method'] ?? 'Cash',
                'transaction_date'=> date('Y-m-d'),
            ]);
        }

        Response::success(null, "Booking status updated to {$status}.");
    }

    public function update(int $id): void {
        require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';
        RoleMiddleware::requireAdmin();

        $booking = Booking::findById($id);
        if (!$booking) {
            Response::notFound('Appointment not found.');
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $updateData = [];
        if (!empty($input['service_id'])) $updateData['service_id'] = (int)$input['service_id'];
        if (isset($input['staff_id'])) $updateData['staff_id'] = !empty($input['staff_id']) ? (int)$input['staff_id'] : null;
        if (!empty($input['booking_date'])) $updateData['booking_date'] = date('Y-m-d', strtotime($input['booking_date']));
        if (!empty($input['booking_time'])) $updateData['booking_time'] = date('H:i:s', strtotime($input['booking_time']));
        if (!empty($input['status'])) $updateData['status'] = $input['status'];
        if (isset($input['notes'])) $updateData['notes'] = $input['notes'];
        if (isset($input['total_price'])) $updateData['total_price'] = (float)$input['total_price'];

        Booking::update($id, $updateData);

        // Update customer profile or user contact if provided
        $pdo = Database::getConnection();
        if (!empty($input['customer_name']) && !empty($booking['customer_id'])) {
            $pdo->prepare("UPDATE customer_profiles SET full_name = :name WHERE user_id = :uid")
                ->execute(['name' => $input['customer_name'], 'uid' => $booking['customer_id']]);
        }
        if (!empty($input['customer_phone']) && !empty($booking['customer_id'])) {
            $pdo->prepare("UPDATE users SET phone = :phone WHERE id = :uid")
                ->execute(['phone' => $input['customer_phone'], 'uid' => $booking['customer_id']]);
        }
        if (!empty($input['payment_status'])) {
            $pdo->prepare("UPDATE payments SET status = :pst WHERE booking_id = :bid")
                ->execute(['pst' => strtolower($input['payment_status']), 'bid' => $id]);
        }

        // If marked completed, record to sales ledger if not already recorded
        if (($input['status'] ?? '') === 'completed') {
            Sale::create([
                'booking_id'     => $booking['id'],
                'amount'         => $input['total_price'] ?? $booking['total_price'],
                'service_name'   => $booking['service_name'],
                'customer_name'  => $input['customer_name'] ?? ($booking['customer_name'] ?? 'Patron'),
                'payment_method' => $booking['payment_method'] ?? 'Cash',
                'transaction_date'=> date('Y-m-d'),
            ]);
        }

        $updated = Booking::findById($id);
        Response::success($updated, 'Appointment updated successfully.');
    }

    public function destroy(int $id): void {
        require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';
        RoleMiddleware::requireAdmin();

        $booking = Booking::findById($id);
        if (!$booking) {
            Response::notFound('Appointment not found.');
        }

        Booking::delete($id);
        Response::success(null, 'Appointment record deleted successfully.');
    }
}
