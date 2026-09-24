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
        if ($auth) {
            $customerId = $auth['id'];
        } else {
            // Guest customer
            $clientName  = trim($input['client_name'] ?? $input['name'] ?? 'Guest Patron');
            $clientEmail = trim($input['client_email'] ?? $input['email'] ?? '');
            $clientPhone = trim($input['client_phone'] ?? $input['phone'] ?? '');

            if (empty($clientEmail) && empty($clientPhone)) {
                Response::error('Please provide your name, phone number, or email for the booking.', 422);
            }

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

        $bookingId = Booking::create([
            'reference_no' => $referenceNo,
            'customer_id'  => $customerId,
            'service_id'   => $service['id'],
            'staff_id'     => !empty($input['staff_id']) ? (int)$input['staff_id'] : null,
            'booking_date' => $bookingDate,
            'booking_time' => $bookingTime,
            'visit_type'   => $visitType,
            'home_address' => $homeAddress,
            'status'       => 'pending',
            'notes'        => $input['notes'] ?? null,
            'total_price'  => $totalPrice,
        ]);

        // Record payment
        Payment::create([
            'booking_id'       => $bookingId,
            'amount'           => $totalPrice,
            'payment_method'   => $paymentMethod,
            'reference_number' => $input['reference_number'] ?? null,
            'status'           => $paymentMethod === 'cash' ? 'pending' : 'paid',
            'paid_at'          => $paymentMethod !== 'cash' ? date('Y-m-d H:i:s') : null,
        ]);

        // Create alert notification
        NotificationService::create(
            $customerId,
            'Booking Received',
            "Your appointment for {$service['name']} on {$bookingDate} at {$bookingTime} has been registered.",
            $bookingId
        );

        $booking = Booking::findById($bookingId);
        Response::success($booking, 'Appointment booked successfully.', 201);
    }

    public function index(): void {
        $auth = AuthMiddleware::check();

        if ($auth['role'] === 'admin') {
            $filters = [
                'status' => $_GET['status'] ?? null,
                'date'   => $_GET['date'] ?? null,
                'search' => $_GET['search'] ?? null,
            ];
            $bookings = Booking::all($filters);
        } else {
            $bookings = Booking::findByCustomer($auth['id'], $_GET['status'] ?? null);
        }

        Response::success($bookings);
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
}
