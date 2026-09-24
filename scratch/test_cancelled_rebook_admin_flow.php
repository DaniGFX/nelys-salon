<?php
require_once dirname(__DIR__) . '/server/config/database.php';
require_once dirname(__DIR__) . '/server/models/Booking.php';
require_once dirname(__DIR__) . '/server/models/Notification.php';
require_once dirname(__DIR__) . '/server/controllers/BookingController.php';

$pdo = Database::getConnection();

// 1. Get customer user
$customer = $pdo->query("SELECT u.id, u.email, cp.full_name FROM users u LEFT JOIN customer_profiles cp ON u.id = cp.user_id WHERE u.role = 'customer' LIMIT 1")->fetch();
if (!$customer) {
    echo "No customer found.\n";
    exit;
}
$customerId = (int)$customer['id'];
$service = $pdo->query("SELECT id, name, price FROM services WHERE is_active = 1 LIMIT 1")->fetch();

echo "Step 1: Creating initial booking...\n";
$refInitial = 'INIT-' . time();
$initBookingId = Booking::create([
    'reference_no' => $refInitial,
    'customer_id'  => $customerId,
    'service_id'   => (int)$service['id'],
    'booking_date' => date('Y-m-d', strtotime('+2 days')),
    'booking_time' => '14:00:00',
    'visit_type'   => 'salon',
    'status'       => 'pending',
    'notes'        => 'Initial appointment',
    'total_price'  => (float)$service['price']
]);

echo "Step 2: Customer cancels the booking...\n";
Booking::updateStatus($initBookingId, 'cancelled', 'Schedule conflict');

$cancelledCheck = Booking::findById($initBookingId);
echo "Initial booking status: {$cancelledCheck['status']}\n";

echo "Step 3: Customer rebooks the cancelled appointment...\n";
$refRebook = 'REBOOK-' . time();
$rebookedDate = date('Y-m-d', strtotime('+5 days'));
$rebookedTime = '11:00:00';

$rebookedBookingId = Booking::create([
    'reference_no' => $refRebook,
    'customer_id'  => $customerId,
    'service_id'   => (int)$service['id'],
    'booking_date' => $rebookedDate,
    'booking_time' => $rebookedTime,
    'visit_type'   => 'salon',
    'status'       => 'pending',
    'notes'        => "Re-booked from Ref: {$refInitial}",
    'total_price'  => (float)$service['price']
]);

Notification::create([
    'user_id'    => $customerId,
    'booking_id' => $rebookedBookingId,
    'category'   => 'appointments',
    'title'      => 'Appointment Re-booked',
    'message'    => "Appointment Ref: {$refRebook} for {$service['name']} on {$rebookedDate} at {$rebookedTime} requires review/confirmation.",
    'action_url' => 'admin-appointments.html',
    'channel'    => 'email',
    'status'     => 'sent'
]);

echo "Step 4: Fetching admin panel appointments list...\n";
$adminBookings = Booking::all();
$foundInAdmin = false;
foreach ($adminBookings as $b) {
    if ($b['id'] == $rebookedBookingId && $b['reference_no'] === $refRebook) {
        $foundInAdmin = true;
        echo "Found rebooked appointment in Admin Panel: Ref {$b['reference_no']}, Customer {$b['customer_name']}, Service {$b['service_name']}, Status {$b['status']}, Notes '{$b['notes']}'\n";
        break;
    }
}

echo "Step 5: Checking Admin Notifications for Re-booked alert...\n";
$adminNotifs = Notification::allWithDetails(['category' => 'appointments']);
$foundNotif = false;
foreach ($adminNotifs as $n) {
    if ($n['booking_id'] == $rebookedBookingId) {
        $foundNotif = true;
        echo "Admin received notification: [{$n['title']}] {$n['message']}\n";
        break;
    }
}

if ($foundInAdmin && $foundNotif) {
    echo "SUCCESS: Cancelled appointment re-booking returned to Admin Panel appointments list.\n";
} else {
    echo "FAILED: Rebooked appointment not verified in Admin Panel.\n";
}

// Cleanup
$pdo->prepare("DELETE FROM notifications WHERE booking_id IN (:b1, :b2)")->execute(['b1' => $initBookingId, 'b2' => $rebookedBookingId]);
$pdo->prepare("DELETE FROM payments WHERE booking_id IN (:b1, :b2)")->execute(['b1' => $initBookingId, 'b2' => $rebookedBookingId]);
$pdo->prepare("DELETE FROM bookings WHERE id IN (:b1, :b2)")->execute(['b1' => $initBookingId, 'b2' => $rebookedBookingId]);
echo "Test cleanup complete.\n";
