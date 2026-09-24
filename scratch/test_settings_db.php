<?php
require_once __DIR__ . '/../server/config/database.php';
$pdo = Database::getConnection();

echo "=== BUSINESS SETTINGS IN DB ===" . PHP_EOL;
$rows = $pdo->query("SELECT * FROM business_settings")->fetchAll(PDO::FETCH_ASSOC);
print_r($rows);
