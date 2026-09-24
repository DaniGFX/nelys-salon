<?php
require_once __DIR__ . '/../server/config/database.php';

$pdo = Database::getConnection();

echo "=== CUSTOMERS ===" . PHP_EOL;
$users = $pdo->query("SELECT u.id, u.email, u.phone, u.role, cp.full_name, cp.home_address, cp.notes FROM users u LEFT JOIN customer_profiles cp ON u.id = cp.user_id WHERE u.role = 'customer'")->fetchAll(PDO::FETCH_ASSOC);
print_r($users);

echo "=== MESSAGES COUNT ===" . PHP_EOL;
$msgCount = $pdo->query("SELECT COUNT(*) FROM messages")->fetchColumn();
echo "Total messages: " . $msgCount . PHP_EOL;

echo "=== MESSAGES BY USER ===" . PHP_EOL;
$msgs = $pdo->query("SELECT m.*, u.email, cp.full_name FROM messages m JOIN users u ON m.user_id = u.id LEFT JOIN customer_profiles cp ON u.id = cp.user_id ORDER BY m.id DESC")->fetchAll(PDO::FETCH_ASSOC);
print_r($msgs);
