<?php
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

foreach ($endpoints as $ep) {
    $script = '<?php ' .
        'require_once "server/config/database.php"; ' .
        'require_once "server/models/User.php"; ' .
        'require_once "server/controllers/AuthController.php"; ' .
        'require_once "server/routes/api.php"; ' .
        '$pdo = Database::getConnection(); ' .
        '$admin = $pdo->query("SELECT * FROM users WHERE role = \'admin\' LIMIT 1")->fetch(); ' .
        '$ref = new ReflectionClass("AuthController"); ' .
        '$gen = $ref->getMethod("generateToken"); ' .
        '$gen->setAccessible(true); ' .
        '$token = $gen->invoke(null, $admin); ' .
        '$_SERVER["HTTP_AUTHORIZATION"] = "Bearer " . $token; ' .
        'Router::dispatch("GET", "' . $ep . '");';
    
    file_put_contents('scratch/temp_runner.php', $script);
    $out = shell_exec('c:\\xampp\\php\\php.exe scratch/temp_runner.php');
    $json = json_decode($out, true);
    if ($json && ($json['status'] === 'success' || $json['success'] === true)) {
        echo "[PASS] {$ep}\n";
    } else {
        echo "[FAIL] {$ep} - " . substr($out, 0, 150) . "\n";
    }
}
@unlink('scratch/temp_runner.php');
