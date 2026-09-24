<?php
require_once __DIR__ . '/../server/config/database.php';
require_once __DIR__ . '/../server/models/Payment.php';

// Test Create
$newId = Payment::create([
    'customer_id' => 1,
    'service_id' => 1,
    'amount' => 500,
    'payment_method' => 'gcash',
    'status' => 'paid',
    'notes' => 'Test payment transaction'
]);
echo "Created payment ID: " . $newId . "\n";

// Test Read
$p = Payment::findByIdWithDetails($newId);
echo "Fetched payment: " . $p['transaction_code'] . " / " . $p['status'] . " / " . $p['amount'] . " / " . $p['method'] . "\n";

// Test Update
Payment::update($newId, [
    'amount' => 550,
    'status' => 'partial',
    'notes' => 'Updated test notes'
]);
$pUpdated = Payment::findByIdWithDetails($newId);
echo "Updated payment: " . $pUpdated['status'] . " / " . $pUpdated['amount'] . " / " . $pUpdated['notes'] . "\n";

// Test Refund
Payment::refund($newId);
$pRefunded = Payment::findByIdWithDetails($newId);
echo "Refunded payment: " . $pRefunded['status'] . "\n";

// Cleanup test payment
$pdo = Database::getConnection();
$pdo->prepare("DELETE FROM payments WHERE id = :id")->execute(['id' => $newId]);
echo "Cleaned up test payment.\n";
