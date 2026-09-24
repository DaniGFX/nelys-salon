<?php
require_once __DIR__ . '/../server/config/database.php';
require_once __DIR__ . '/../server/models/Report.php';

$ranges = ['today', 'this_week', 'this_month', 'last_month', 'this_year'];

foreach ($ranges as $r) {
    $res = Report::generate($r);
    echo "=== Range: $r ({$res['label']}) ===\n";
    echo "Total Revenue: " . $res['summary']['total_revenue'] . " (Growth: " . $res['summary']['revenue_growth'] . ")\n";
    echo "Total Appointments: " . $res['summary']['total_appointments'] . " (Completed: " . $res['summary']['completed_services'] . ")\n";
    echo "Total Customers: " . $res['summary']['total_customers'] . " (New: " . $res['summary']['new_customers'] . ")\n";
    echo "Popular Services count: " . count($res['popular_services']) . "\n";
    echo "Staff Performance count: " . count($res['staff_performance']) . "\n";
    echo "Service Breakdown count: " . count($res['service_breakdown']) . "\n";
    echo "Chart points count: " . count($res['revenue_chart']['points']) . " (Total: " . $res['revenue_chart']['total'] . ", Highest: " . $res['revenue_chart']['highest'] . ")\n\n";
}
