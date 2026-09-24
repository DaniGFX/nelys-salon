<?php
require_once __DIR__ . '/../server/config/database.php';
$pdo = Database::getConnection();

$users = $pdo->query("SELECT u.id, u.email, u.phone, u.role, cp.full_name FROM users u LEFT JOIN customer_profiles cp ON u.id = cp.user_id")->fetchAll(PDO::FETCH_ASSOC);
print_r($users);
