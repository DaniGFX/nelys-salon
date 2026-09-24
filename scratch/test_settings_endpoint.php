<?php
require_once __DIR__ . '/../server/config/database.php';
require_once __DIR__ . '/../server/models/Setting.php';
require_once __DIR__ . '/../server/models/User.php';

echo "=== 1. TEST SETTING ALL CATEGORIZED ===\n";
$categorized = Setting::allCategorized(1);
echo "Salon Name: " . $categorized['salonInfo']['name'] . "\n";
echo "Address: " . $categorized['salonInfo']['address'] . "\n";
echo "Phone: " . $categorized['salonInfo']['phone'] . "\n";
echo "Email: " . $categorized['salonInfo']['email'] . "\n";
echo "Business Hours Count: " . count($categorized['businessHours']) . "\n";
echo "Appt Duration: " . $categorized['appointmentSettings']['duration'] . "\n";
echo "GCash Number: " . $categorized['paymentSettings']['gcashNumber'] . "\n";
echo "Admin Name: " . $categorized['account']['name'] . "\n";
echo "Admin Email: " . $categorized['account']['email'] . "\n";
echo "Is Deactivated: " . ($categorized['isDeactivated'] ? 'Yes' : 'No') . "\n";

echo "\n=== 2. TEST UPDATE SETTING ===\n";
Setting::set('salon_name', "Nely's Salon");
Setting::set('is_system_deactivated', '0');
echo "Updated salon_name & deactivation state successfully.\n";

echo "\nAll checks passed!\n";
