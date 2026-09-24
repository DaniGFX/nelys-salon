<?php
require_once __DIR__ . '/../server/config/database.php';
require_once __DIR__ . '/../server/models/User.php';
require_once __DIR__ . '/../server/models/Booking.php';

$users = User::all();
echo "Total users: " . count($users) . "\n";
foreach ($users as $u) {
    $bookings = Booking::findByCustomer((int)$u['id']);
    echo "User ID {$u['id']} ({$u['email']}): " . count($bookings) . " bookings\n";
    foreach ($bookings as $b) {
        echo "  - Ref: {$b['reference_no']} | Service: {$b['service_name']} | Status: {$b['status']} | Date: {$b['booking_date']} | Total: {$b['total_price']}\n";
    }
}
