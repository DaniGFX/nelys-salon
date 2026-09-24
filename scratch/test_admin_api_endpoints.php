<?php
require_once dirname(__DIR__) . '/server/config/database.php';
require_once dirname(__DIR__) . '/server/models/User.php';
require_once dirname(__DIR__) . '/server/controllers/AuthController.php';
require_once dirname(__DIR__) . '/server/routes/api.php';

// 1. Get or create an admin user
$pdo = Database::getConnection();
$admin = $pdo->query("SELECT * FROM users WHERE role = 'admin' LIMIT 1")->fetch();
if (!$admin) {
    echo "No admin user found. Creating one...\n";
    $pass = password_hash('Admin123!', PASSWORD_BCRYPT);
    $adminId = User::create('admin@nelyssalon.com', '09171234567', $pass, 'admin');
    $admin = User::findById($adminId);
}

// Generate token using AuthController reflection or method
$ref = new ReflectionClass('AuthController');
$gen = $ref->getMethod('generateToken');
$gen->setAccessible(true);
$token = $gen->invoke(null, $admin);

echo "Admin User: {$admin['email']} (ID: {$admin['id']})\n";
echo "Token generated: " . substr($token, 0, 20) . "...\n\n";

$_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$token}";
$_SERVER['REQUEST_METHOD'] = 'GET';

$endpoints = [
    '/api/dashboard/stats',
    '/api/bookings',
    '/api/customers',
    '/api/staff',
    '/api/services',
    '/api/payments',
    '/api/reports',
    '/api/notifications',
    '/api/messages',
    '/api/settings',
    '/api/health'
];

$allPassed = true;

foreach ($endpoints as $uri) {
    ob_start();
    try {
        Router::dispatch('GET', $uri);
        $output = ob_get_clean();
    } catch (Throwable $e) {
        $output = ob_get_clean();
        echo "[FAIL] {$uri} - Exception: {$e->getMessage()} in {$e->getFile()}:{$e->getLine()}\n";
        $allPassed = false;
        continue;
    }

    $json = json_decode($output, true);
    if ($json && ($json['status'] === 'success' || $json['success'] === true)) {
        echo "[PASS] {$uri} - Returned success (HTTP " . http_response_code() . ")\n";
    } else {
        echo "[FAIL] {$uri} - Invalid response: " . substr($output, 0, 150) . "\n";
        $allPassed = false;
    }
}

if ($allPassed) {
    echo "\nALL ADMIN ENDPOINTS RESPONDING SUCCESSFULLY WITH NO ERRORS!\n";
} else {
    echo "\nSOME ENDPOINTS ENCOUNTERED ISSUES.\n";
}
