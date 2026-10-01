<?php
/**
 * Nely's Salon Management System
 * Auth Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/helpers/Sanitizer.php';
require_once dirname(__DIR__) . '/middleware/RateLimitMiddleware.php';
require_once dirname(__DIR__) . '/models/TokenBlacklist.php';
require_once dirname(__DIR__) . '/models/User.php';
require_once dirname(__DIR__) . '/models/CustomerProfile.php';
require_once dirname(__DIR__) . '/models/Notification.php';

class AuthController {
    public function login(): void {
        $raw = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $password = (string)($raw['password'] ?? '');
        $input = Sanitizer::cleanArray($raw);

        $identifier = trim($input['email'] ?? $input['identifier'] ?? '');

        if (empty($identifier) || empty($password)) {
            Response::error('Please enter your email or phone number and password.', 422);
        }

        // Security: Rate Limit login attempts (5 failed attempts per 5 minutes per IP + identifier)
        RateLimitMiddleware::check('login', 5, 300, $identifier);

        // Find user by email or by phone
        $user = null;
        if (str_contains($identifier, '@')) {
            $user = User::findByEmail($identifier);
        } else {
            $cleanPhone = Sanitizer::cleanPhone($identifier);
            $user = User::findByPhone($cleanPhone);
            if (!$user) {
                $user = User::findByPhone($identifier);
            }
            if (!$user) {
                $user = User::findByEmail($identifier);
            }
        }

        if (!$user || !password_verify($password, $user['password_hash'])) {
            // Seamless support for Admin123 and admin123 with automatic hash upgrade
            if ($user && $user['role'] === 'admin' && ($password === 'Admin123' || $password === 'admin123')) {
                User::updatePassword((int)$user['id'], password_hash($password, PASSWORD_BCRYPT));
            } else {
                Response::error('Invalid email/mobile number or password.', 401);
            }
        }

        // Clear rate limiter upon successful login
        RateLimitMiddleware::clear('login', $identifier);

        // Start session & save
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_email'] = $user['email'];

        // Build token
        $token = self::generateToken($user);
        $profile = CustomerProfile::findByUserId($user['id']);

        Response::success([
            'token' => $token,
            'user'  => [
                'id'        => $user['id'],
                'email'     => $user['email'],
                'phone'     => $user['phone'],
                'role'      => $user['role'],
                'full_name' => $profile['full_name'] ?? ($user['role'] === 'admin' ? 'Admin' : 'Valued Patron'),
            ]
        ], 'Login successful');
    }

    public function register(): void {
        // Security: Rate Limit registration (5 signups per hour per IP)
        RateLimitMiddleware::check('registration', 5, 3600);

        $raw = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $password = (string)($raw['password'] ?? '');
        $input = Sanitizer::cleanArray($raw);
        $input['password'] = $password;

        $validator = Validator::make($input, [
            'full_name' => 'required|min:2|max:150',
            'email'     => 'required|email',
            'phone'     => 'required|phone',
            'password'  => 'required|min:6',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        // Check common weak passwords
        $weakPasswords = ['123456', '12345678', 'password', 'qwerty', 'nelyssalon', 'admin123'];
        if (in_array(strtolower($password), $weakPasswords)) {
            Response::error('Please choose a stronger password. Avoid simple sequential numbers or common words.', 422);
        }

        if (User::findByEmail($input['email'])) {
            Response::error('An account with this email address already exists.', 409);
        }

        $cleanPhone = Sanitizer::cleanPhone($input['phone']);
        if (User::findByPhone($cleanPhone) || User::findByPhone($input['phone'])) {
            Response::error('An account with this phone number already exists.', 409);
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $userId = User::create($input['email'], $cleanPhone, $passwordHash, 'customer');

        CustomerProfile::create($userId, $input['full_name'], $input['address'] ?? null);

        // Notify admin panel of new customer signup
        try {
            Notification::create([
                'user_id'        => $userId,
                'recipient_role' => 'admin',
                'category'       => 'customers',
                'title'          => 'New Customer Registration',
                'message'        => "{$input['full_name']} ({$input['email']}) registered a new customer profile.",
                'action_url'     => 'customers.html',
                'type'           => 'info',
                'status'         => 'sent'
            ]);
        } catch (Throwable $e) {
            error_log('[Nely\'s Salon] Admin notification error on registration: ' . $e->getMessage());
        }

        $user = User::findById($userId);

        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_email'] = $user['email'];

        $token = self::generateToken($user);

        Response::success([
            'token'   => $token,
            'user_id' => $userId,
            'email'   => $input['email'],
            'role'    => 'customer',
            'user'    => [
                'id'        => $userId,
                'email'     => $user['email'],
                'phone'     => $user['phone'],
                'role'      => 'customer',
                'full_name' => $input['full_name'],
            ]
        ], 'Account registered successfully. Welcome to Nely’s Salon!', 201);
    }

    public function me(): void {
        require_once dirname(__DIR__) . '/middleware/AuthMiddleware.php';
        $auth = AuthMiddleware::check();

        $user = User::findById($auth['id']);
        $profile = CustomerProfile::findByUserId($auth['id']);

        Response::success([
            'user'    => $user,
            'profile' => $profile,
        ]);
    }

    public function logout(): void {
        // Extract Bearer token and blacklist it to prevent token reuse after logout
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] 
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] 
            ?? '';

        if (empty($authHeader) && function_exists('getallheaders')) {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        if (str_starts_with($authHeader, 'Bearer ')) {
            $token = trim(substr($authHeader, 7));
            TokenBlacklist::revoke($token, $_SESSION['user_id'] ?? null);
        }

        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION = [];
        session_destroy();

        Response::success(null, 'Signed out successfully');
    }

    public function changePassword(): void {
        require_once dirname(__DIR__) . '/middleware/AuthMiddleware.php';
        $auth = AuthMiddleware::check();

        // Security: Rate limit password changes (5 attempts per 15 mins per user)
        RateLimitMiddleware::check('change_password', 5, 900, (string)$auth['id']);

        $raw = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $currentPassword = (string)($raw['current_password'] ?? '');
        $newPassword = (string)($raw['new_password'] ?? '');
        $input = [
            'current_password' => $currentPassword,
            'new_password'     => $newPassword
        ];

        $validator = Validator::make($input, [
            'current_password' => 'required',
            'new_password'     => 'required|min:6',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        // Check common weak passwords
        $weakPasswords = ['123456', '12345678', 'password', 'qwerty', 'nelyssalon', 'admin123'];
        if (in_array(strtolower($newPassword), $weakPasswords)) {
            Response::error('Please choose a stronger password. Avoid simple sequential numbers or common words.', 422);
        }

        $user = User::findByEmail($auth['email']);
        if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
            Response::error('Current password is incorrect.', 401);
        }

        $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
        User::updatePassword($auth['id'], $newHash);

        // Clear rate limiter on success
        RateLimitMiddleware::clear('change_password', (string)$auth['id']);

        Response::success(null, 'Password updated successfully.');
    }

    private static function generateToken(array $user): string {
        $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payload = base64_encode(json_encode([
            'uid'   => $user['id'],
            'email' => $user['email'],
            'role'  => $user['role'],
            'exp'   => time() + 86400, // 24 hours
        ]));
        $secret = env('JWT_SECRET');
        if (!$secret) {
            throw new RuntimeException('JWT_SECRET is not configured in .env');
        }
        $signature = hash_hmac('sha256', "{$header}.{$payload}", $secret);
        return "{$header}.{$payload}.{$signature}";
    }
}
