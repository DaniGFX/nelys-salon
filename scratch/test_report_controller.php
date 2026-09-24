<?php
require_once __DIR__ . '/../server/config/database.php';
require_once __DIR__ . '/../server/controllers/ReportController.php';

session_start();
$_SESSION['user_id'] = 1;
$_SESSION['user_role'] = 'admin';

// Test GET /api/reports?range=this_month
$_GET['range'] = 'this_month';
$ctrl = new ReportController();

ob_start();
$ctrl->index();
$output = ob_get_clean();

$res = json_decode($output, true);
echo "Success: " . ($res['success'] ? 'true' : 'false') . "\n";
echo "Range: " . ($res['data']['label'] ?? 'unknown') . "\n";
echo "Total Revenue: " . ($res['data']['summary']['total_revenue'] ?? 'unknown') . "\n";
echo "Total Appointments: " . ($res['data']['summary']['total_appointments'] ?? 'unknown') . "\n";
echo "Popular Services: " . count($res['data']['popular_services'] ?? []) . "\n";
echo "Staff Performance: " . count($res['data']['staff_performance'] ?? []) . "\n";
echo "Service Breakdown: " . count($res['data']['service_breakdown'] ?? []) . "\n";
