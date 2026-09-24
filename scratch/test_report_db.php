<?php
require_once __DIR__ . '/../server/config/database.php';
$pdo = Database::getConnection();

$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
print_r($tables);

foreach ($tables as $t) {
    $count = $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
    echo "$t: $count rows\n";
}
