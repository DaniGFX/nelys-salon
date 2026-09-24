<?php
require_once __DIR__ . '/../server/config/database.php';
require_once __DIR__ . '/../server/models/Payment.php';
require_once __DIR__ . '/../server/models/Service.php';
require_once __DIR__ . '/../server/models/CustomerProfile.php';

$payments = Payment::allWithDetails();
$metrics = Payment::getSummaryMetrics();
$services = Service::all(true);
$customers = CustomerProfile::allWithMetrics();

echo "Payments count: " . count($payments) . "\n";
echo "Services count: " . count($services) . "\n";
echo "Customers count: " . count($customers) . "\n";
echo "Metrics: " . json_encode($metrics, JSON_PRETTY_PRINT) . "\n";
