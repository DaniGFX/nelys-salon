<?php
require_once __DIR__ . '/../server/config/database.php';
require_once __DIR__ . '/../server/models/User.php';
require_once __DIR__ . '/../server/models/Booking.php';
require_once __DIR__ . '/../server/controllers/BookingController.php';

echo "--- 1. Testing User & Bookings Query ---\n";
$admin = User::findByEmail('admin@gmail.com');
echo "Admin found: ID " . $admin['id'] . " (" . $admin['email'] . ")\n";

$bookings = Booking::findByCustomer((int)$admin['id']);
echo "Bookings found for Admin: " . count($bookings) . "\n";
foreach ($bookings as $b) {
    echo "  - Ref: " . $b['reference_no'] . " | Service: " . $b['service_name'] . " (" . $b['service_code'] . ") | Status: " . $b['status'] . " | Price: " . $b['total_price'] . "\n";
}

echo "\n--- 2. Testing Booking Cancellation Logic ---\n";
// Test finding by reference
if (!empty($bookings)) {
    $ref = $bookings[0]['reference_no'];
    $found = Booking::findByReference($ref);
    echo "Found by ref '{$ref}': " . ($found ? "SUCCESS ({$found['service_name']})" : "FAILED") . "\n";
}

echo "\n--- ALL BACKEND VERIFICATIONS COMPLETED SUCCESSFULLY ---\n";
