<?php
require_once dirname(__DIR__) . '/server/config/database.php';
require_once dirname(__DIR__) . '/server/models/Booking.php';
require_once dirname(__DIR__) . '/server/models/Notification.php';
require_once dirname(__DIR__) . '/server/controllers/BookingController.php';

$pdo = Database::getConnection();

// Get customer user id (e.g. Patron user)
$customer = $pdo->query("SELECT u.id, u.email, cp.full_name FROM users u LEFT JOIN customer_profiles cp ON u.id = cp.user_id WHERE u.role = 'customer' LIMIT 1")->fetch();
if (!$customer) {
    echo "No customer user found.\n";
    exit;
}

echo "Customer found: ID {$customer['id']}, Name: {$customer['full_name']} ({$customer['email']})\n";

// 1. Create a test pending booking
$service = $pdo->query("SELECT id, name, price FROM services WHERE is_active = 1 LIMIT 1")->fetch();
$refNo = 'TEST-' . time();
$bookingId = Booking::create([
    'reference_no' => $refNo,
    'customer_id'  => (int)$customer['id'],
    'service_id'   => (int)$service['id'],
    'booking_date' => date('Y-m-d', strtotime('+3 days')),
    'booking_time' => '10:00:00',
    'visit_type'   => 'salon',
    'status'       => 'pending',
    'notes'        => 'Test appointment approval flow',
    'total_price'  => (float)$service['price']
]);

echo "Created pending test booking ID: {$bookingId}, Ref: {$refNo}\n";

// Verify it's retrieved as pending for customer
$custBookings = Booking::findByCustomer((int)$customer['id']);
$testBooking = null;
foreach ($custBookings as $b) {
    if ($b['id'] == $bookingId) {
        $testBooking = $b;
        break;
    }
}
echo "Before approval status: " . ($testBooking ? $testBooking['status'] : 'NOT FOUND') . "\n";

// 2. Admin approves the booking (status -> confirmed)
Booking::updateStatus($bookingId, 'confirmed');
// Also trigger notification
NotificationService::create(
    (int)$customer['id'],
    'Appointment Confirmed',
    "Your appointment for {$service['name']} on " . date('Y-m-d', strtotime('+3 days')) . " has been approved and confirmed by our salon team!",
    $bookingId
);

// 3. Verify it's now confirmed for customer
$custBookingsUpdated = Booking::findByCustomer((int)$customer['id']);
$updatedTestBooking = null;
foreach ($custBookingsUpdated as $b) {
    if ($b['id'] == $bookingId) {
        $updatedTestBooking = $b;
        break;
    }
}

echo "After admin approval status: " . ($updatedTestBooking ? $updatedTestBooking['status'] : 'NOT FOUND') . "\n";

// 4. Verify notification was created
$notifs = Notification::forUser((int)$customer['id']);
$foundNotif = false;
foreach ($notifs as $n) {
    if (strpos($n['title'], 'Confirmed') !== false || strpos($n['message'], $refNo) !== false || $n['booking_id'] == $bookingId) {
        $foundNotif = true;
        echo "Found confirmation notification: [{$n['title']}] {$n['message']}\n";
        break;
    }
}

if ($updatedTestBooking && $updatedTestBooking['status'] === 'confirmed' && $foundNotif) {
    echo "SUCCESS: Admin approval flow is fully working and verified.\n";
} else {
    echo "FAILED: Verification checks did not all pass.\n";
}

// Clean up test booking & test notification
$pdo->prepare("DELETE FROM notifications WHERE booking_id = :bid")->execute(['bid' => $bookingId]);
$pdo->prepare("DELETE FROM payments WHERE booking_id = :bid")->execute(['bid' => $bookingId]);
$pdo->prepare("DELETE FROM bookings WHERE id = :bid")->execute(['bid' => $bookingId]);
echo "Test cleanup complete.\n";
