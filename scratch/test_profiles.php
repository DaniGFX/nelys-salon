<?php
require_once __DIR__ . '/../server/config/database.php';
$pdo = Database::getConnection();

$profiles = $pdo->query("SELECT * FROM customer_profiles")->fetchAll(PDO::FETCH_ASSOC);
print_r($profiles);
