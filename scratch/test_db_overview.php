<?php
require_once __DIR__ . '/../server/config/database.php';
$pdo = Database::getConnection();

echo "=== USERS COUNT ===" . PHP_EOL;
$users = $pdo->query("SELECT id, email, role, created_at FROM users")->fetchAll(PDO::FETCH_ASSOC);
print_r($users);

echo "=== BOOKINGS COUNT ===" . PHP_EOL;
$bookings = $pdo->query("SELECT id, customer_id, service_id, staff_id, booking_date, booking_time, total_price, status FROM bookings LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
print_r($bookings);
