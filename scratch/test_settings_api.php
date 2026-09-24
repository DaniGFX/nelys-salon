<?php
require_once __DIR__ . '/../server/config/database.php';
require_once __DIR__ . '/../server/models/Setting.php';
require_once __DIR__ . '/../server/controllers/SettingsController.php';

session_start();
$_SESSION['user_id'] = 1;
$_SESSION['user_role'] = 'admin';
$_SESSION['user_email'] = 'admin@nelyssalon.com';

echo "=== 1. Test GET Categorized Settings ===" . PHP_EOL;
$settings = Setting::allCategorized(1);
print_r($settings);

echo "=== 2. Test Deactivate & Reactivate ===" . PHP_EOL;
Setting::set('is_system_deactivated', '1');
$s1 = Setting::allCategorized(1);
echo "isDeactivated: " . ($s1['isDeactivated'] ? 'true' : 'false') . PHP_EOL;

Setting::set('is_system_deactivated', '0');
$s2 = Setting::allCategorized(1);
echo "isDeactivated after reactivate: " . ($s2['isDeactivated'] ? 'true' : 'false') . PHP_EOL;

echo "All tests passed successfully!" . PHP_EOL;
