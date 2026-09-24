<?php
require_once dirname(__DIR__) . '/server/config/database.php';

$pdo = Database::getConnection();
$stmt = $pdo->query("SHOW COLUMNS FROM customer_profiles");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Columns in customer_profiles:\n";
foreach ($cols as $col) {
    echo " - " . $col['Field'] . " (" . $col['Type'] . ")\n";
}

// Add optional fields if they don't exist
$fieldNames = array_column($cols, 'Field');
if (!in_array('dob', $fieldNames)) {
    $pdo->exec("ALTER TABLE customer_profiles ADD COLUMN dob DATE NULL AFTER home_address");
    echo "Added dob column.\n";
}
if (!in_array('gender', $fieldNames)) {
    $pdo->exec("ALTER TABLE customer_profiles ADD COLUMN gender VARCHAR(20) DEFAULT 'Female' AFTER dob");
    echo "Added gender column.\n";
}
if (!in_array('notes', $fieldNames)) {
    $pdo->exec("ALTER TABLE customer_profiles ADD COLUMN notes TEXT NULL AFTER gender");
    echo "Added notes column.\n";
}
if (!in_array('status', $fieldNames)) {
    $pdo->exec("ALTER TABLE customer_profiles ADD COLUMN status VARCHAR(20) DEFAULT 'Active' AFTER notes");
    echo "Added status column.\n";
}
if (!in_array('city', $fieldNames)) {
    $pdo->exec("ALTER TABLE customer_profiles ADD COLUMN city VARCHAR(100) NULL AFTER home_address");
    echo "Added city column.\n";
}

echo "Database schema check complete.\n";
