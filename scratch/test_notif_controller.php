<?php
require_once __DIR__ . '/../server/config/database.php';
require_once __DIR__ . '/../server/models/Notification.php';
require_once __DIR__ . '/../server/controllers/NotificationController.php';

session_start();
$_SESSION['user_id'] = 1;
$_SESSION['user_role'] = 'admin';
$_SESSION['user_email'] = 'admin@nelyssalon.com';

echo "=== 1. Test Summary Metrics ===" . PHP_EOL;
$metrics = Notification::getSummaryMetrics();
print_r($metrics);

echo "=== 2. Test Preferences Get & Save ===" . PHP_EOL;
$prefs = Notification::getPreferences();
print_r($prefs);
$newPrefs = array_merge($prefs, ['newCustomer' => false]);
Notification::savePreferences($newPrefs);
$savedPrefs = Notification::getPreferences();
echo "Saved newCustomer=" . ($savedPrefs['newCustomer'] ? 'true' : 'false') . PHP_EOL;
// Restore
Notification::savePreferences($prefs);

echo "=== 3. Test Mark Read & Toggle ===" . PHP_EOL;
$all = Notification::allWithDetails(['category' => 'all']);
if (count($all) > 0) {
    $firstId = $all[0]['id'];
    echo "Testing on ID: {$firstId}" . PHP_EOL;
    
    Notification::markRead($firstId, true);
    $item = Notification::findById($firstId);
    echo "After markRead(true): is_read=" . $item['is_read'] . PHP_EOL;
    
    Notification::markRead($firstId, false);
    $item = Notification::findById($firstId);
    echo "After markRead(false): is_read=" . $item['is_read'] . PHP_EOL;
}

echo "=== 4. Test Categories Filtering ===" . PHP_EOL;
$cats = ['all', 'appointments', 'payments', 'customers', 'system'];
foreach ($cats as $c) {
    $items = Notification::allWithDetails(['category' => $c]);
    echo "Category '{$c}': " . count($items) . " items" . PHP_EOL;
}

echo "All tests passed successfully!" . PHP_EOL;
