<?php
require_once __DIR__ . '/../server/config/database.php';
$pdo = Database::getConnection();

echo "=== SERVICES ===" . PHP_EOL;
$services = $pdo->query("SELECT id, name, price FROM services")->fetchAll(PDO::FETCH_ASSOC);
print_r($services);

echo "=== STAFF ===" . PHP_EOL;
$staff = $pdo->query("SELECT id, name, role FROM staff")->fetchAll(PDO::FETCH_ASSOC);
print_r($staff);
