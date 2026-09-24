<?php
require_once __DIR__ . '/../server/config/database.php';
require_once __DIR__ . '/../server/models/Booking.php';
require_once __DIR__ . '/../server/models/Service.php';

$allServices = Service::all();
echo "Available services:\n";
foreach ($allServices as $s) {
    echo "  - ID: {$s['id']} | Code: {$s['code']} | Name: {$s['name']} | Price: {$s['price']}\n";
}

$bookings = Booking::all();
echo "\nTotal bookings in DB: " . count($bookings) . "\n";
foreach ($bookings as $b) {
    echo "  - Ref: {$b['reference_no']} | Service: {$b['service_name']} | Status: {$b['status']} | Customer: {$b['customer_name']}\n";
}
