<?php
require_once __DIR__ . '/../server/config/database.php';
require_once __DIR__ . '/../server/controllers/DashboardController.php';

session_start();
$_SESSION['user_id'] = 1;
$_SESSION['user_role'] = 'admin';

ob_start();
$ctrl = new DashboardController();
$ctrl->stats();
$output = ob_get_clean();

$res = json_decode($output, true);
echo "Success: " . ($res['success'] ? 'true' : 'false') . PHP_EOL;
echo "Unread messages count: " . ($res['data']['unread_messages'] ?? 'N/A') . PHP_EOL;
echo "Badges: " . json_encode($res['data']['badges'] ?? []) . PHP_EOL;
