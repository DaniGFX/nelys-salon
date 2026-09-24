<?php
require_once __DIR__ . '/../server/config/database.php';
require_once __DIR__ . '/../server/models/Notification.php';

$pdo = Database::getConnection();
$count = $pdo->query("SELECT COUNT(*) FROM notifications")->fetchColumn();
echo "Total notifications count: " . $count . PHP_EOL;

$metrics = Notification::getSummaryMetrics();
echo "Summary metrics: " . json_encode($metrics, JSON_PRETTY_PRINT) . PHP_EOL;

$sample = Notification::allWithDetails(['category' => 'all']);
echo "Total fetched: " . count($sample) . PHP_EOL;
if (count($sample) > 0) {
    echo "First notification: " . json_encode($sample[0], JSON_PRETTY_PRINT) . PHP_EOL;
}
