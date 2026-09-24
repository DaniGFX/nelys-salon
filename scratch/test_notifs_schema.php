<?php
require_once __DIR__ . '/../server/config/database.php';
$pdo = Database::getConnection();

$stmt = $pdo->query("DESCRIBE notifications");
$columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($columns);

$rows = $pdo->query("SELECT * FROM notifications ORDER BY id DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
print_r($rows);
