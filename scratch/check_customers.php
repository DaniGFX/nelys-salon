<?php
require_once dirname(__DIR__) . '/server/config/database.php';

$pdo = Database::getConnection();
$customers = $pdo->query("
    SELECT u.id, u.email, u.phone, u.role, cp.full_name, cp.gender, cp.status, cp.home_address, cp.notes,
           (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = u.id) as appt_count
    FROM users u
    LEFT JOIN customer_profiles cp ON u.id = cp.user_id
    WHERE u.role = 'customer'
")->fetchAll(PDO::FETCH_ASSOC);

echo "Total Customers in DB: " . count($customers) . "\n";
print_r($customers);
