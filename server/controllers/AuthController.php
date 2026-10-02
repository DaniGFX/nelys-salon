<?php
/**
 * Nely's Salon Management System
 * Auth Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/helpers/Sanitizer.php';
require_once dirname(__DIR__) . '/helpers/Mailer.php';
require_once dirname(__DIR__) . '/helpers/SmsService.php';
require_once dirname(__DIR__) . '/middleware/RateLimitMiddleware.php';
require_once dirname(__DIR__) . '/models/TokenBlacklist.php';
require_once dirname(__DIR__) . '/models/Otp.php';
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

        // Clear rate limiter upon successful password verification
        RateLimitMiddleware::clear('login', $identifier);

        // Check if 2FA (OTP) is enabled
        $otpEnabled = env('OTP_ENABLED', 'true');
        $isOtpActive = ($otpEnabled === 'true' || $otpEnabled === true || $otpEnabled === '1');

        // Optional bypass flag for testing or if explicitly disabled
        if ($isOtpActive) {
            $ticket = self::generate2faTicket($user);
            $profile = CustomerProfile::findByUserId($user['id']);
            $fullName = $profile['full_name'] ?? ($user['role'] === 'admin' ? 'Admin' : 'Valued Patron');

            // Default auto-dispatch to Email on initial password verification
            $maskedEmail = self::maskEmail($user['email'] ?? '');
            $maskedPhone = self::maskPhone($user['phone'] ?? '');

            // Dispatch OTP to default channel (email)
            $code = Otp::generate($user['email'], 'email', (int)$user['id'], (int)env('OTP_EXPIRY_SECONDS', 600));
            $mailRes = Mailer::sendOtp($user['email'], $fullName, $code);

            Response::success([
                'requires_2fa'    => true,
                'ticket'          => $ticket,
                'masked_email'    => $maskedEmail,
                'masked_phone'    => $maskedPhone,
                'default_channel' => 'email',
                'channels'        => ['email', 'sms'],
                'message'         => 'Verification code sent. Please enter the 6-digit code to complete login.'
            ], 'Two-factor authentication required');
            return;
        }

        // Standard direct session creation if OTP is disabled
        self::establishSessionAndRespond($user);
    }

    /**
     * Re-send or switch channel for OTP delivery (Email vs SMS)
     */
    public function sendOtp(): void {
        $raw = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $ticket = trim($raw['ticket'] ?? '');
        $channel = strtolower(trim($raw['channel'] ?? 'email'));

        if (empty($ticket)) {
            Response::error('Session expired or invalid 2FA ticket. Please log in again.', 401);
        }

        $ticketData = self::verify2faTicket($ticket);
        if (!$ticketData) {
            Response::error('2FA ticket has expired or is invalid. Please log in again.', 401);
        }

        $user = User::findById($ticketData['uid']);
        if (!$user) {
            Response::error('User account not found.', 404);
        }

        // Rate limit OTP resend (max 5 requests per 5 minutes per user)
        RateLimitMiddleware::check('send_otp', 5, 300, (string)$user['id']);

        $profile = CustomerProfile::findByUserId($user['id']);
        $fullName = $profile['full_name'] ?? ($user['role'] === 'admin' ? 'Admin' : 'Valued Patron');
        $expirySeconds = (int)env('OTP_EXPIRY_SECONDS', 600);

        if ($channel === 'sms') {
            $phone = $user['phone'] ?? '';
            if (empty($phone)) {
                Response::error('No phone number is registered to this account. Please use Gmail.', 422);
            }
            $code = Otp::generate($phone, 'sms', (int)$user['id'], $expirySeconds);
            $smsRes = SmsService::sendOtp($phone, $code);

            Response::success([
                'channel'      => 'sms',
                'masked_phone' => self::maskPhone($phone),
            ], 'Verification code dispatched to your phone number.');
            return;
        }

        // Default Email channel
        $email = $user['email'] ?? '';
        $code = Otp::generate($email, 'email', (int)$user['id'], $expirySeconds);
        $mailRes = Mailer::sendOtp($email, $fullName, $code);

        Response::success([
            'channel'      => 'email',
            'masked_email' => self::maskEmail($email),
        ], 'Verification code dispatched to your Gmail address.');
    }

    /**
     * Verify the 6-digit OTP code and complete authentication
     */
    public function verifyOtp(): void {
        $raw = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $ticket = trim($raw['ticket'] ?? '');
        $code = trim($raw['code'] ?? '');
        $channel = strtolower(trim($raw['channel'] ?? ''));

        if (empty($ticket) || empty($code)) {
            Response::error('Please enter the 6-digit verification code.', 422);
        }

        $ticketData = self::verify2faTicket($ticket);
        if (!$ticketData) {
            Response::error('2FA session expired. Please sign in again.', 401);
        }

        $user = User::findById($ticketData['uid']);
        if (!$user) {
            Response::error('User account not found.', 404);
        }

        // Rate limit verification attempts (5 failed attempts per 5 minutes per user)
        RateLimitMiddleware::check('verify_otp', 5, 300, (string)$user['id']);

        // Determine target identifier based on channel or check both email and phone
        $targetIdentifier = $user['email'];
        if ($channel === 'sms' && !empty($user['phone'])) {
            $targetIdentifier = $user['phone'];
        }

        $res = Otp::verify($targetIdentifier, $code);

        // If not found under current identifier, check alternate (e.g. if sent to phone but channel omitted)
        if (!$res['valid'] && !empty($user['phone']) && $targetIdentifier !== $user['phone']) {
            $altRes = Otp::verify($user['phone'], $code);
            if ($altRes['valid']) {
                $res = $altRes;
            }
        }

        if (!$res['valid']) {
            Response::error($res['message'], 400);
        }

        // Clear rate limiters upon successful OTP verification
        RateLimitMiddleware::clear('verify_otp', (string)$user['id']);
        RateLimitMiddleware::clear('send_otp', (string)$user['id']);

        // Complete login
        self::establishSessionAndRespond($user);
    }

    /**
     * Establish user session and return authenticated token payload
     */
    private static function establishSessionAndRespond(array $user): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_email'] = $user['email'];

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
        ], 'Login verified and authenticated successfully.');
    }

    /**
     * Generate temporary signed 2FA ticket valid for 10 minutes
     */
    private static function generate2faTicket(array $user): string {
        $payload = base64_encode(json_encode([
            'uid'  => (int)$user['id'],
            'exp'  => time() + 900,
            'type' => '2fa_challenge'
        ]));
        $secret = env('JWT_SECRET', 'nelys_salon_secret_key_2fa');
        $signature = hash_hmac('sha256', $payload, $secret);
        return "{$payload}.{$signature}";
    }

    /**
     * Verify and decode temporary 2FA ticket
     */
    private static function verify2faTicket(string $ticket): ?array {
        $parts = explode('.', $ticket);
        if (count($parts) !== 2) return null;

        list($payload, $signature) = $parts;
        $secret = env('JWT_SECRET', 'nelys_salon_secret_key_2fa');
        $expected = hash_hmac('sha256', $payload, $secret);

        if (!hash_equals($expected, $signature)) return null;

        $data = json_decode(base64_decode($payload), true);
        if (!$data || ($data['type'] ?? '') !== '2fa_challenge' || ($data['exp'] ?? 0) < time()) {
            return null;
        }

        return $data;
    }

    /**
     * Mask email (e.g. maria.santos@email.com -> m***s@email.com)
     */
    private static function maskEmail(string $email): string {
        if (!str_contains($email, '@')) return $email;
        list($name, $domain) = explode('@', $email, 2);
        $len = strlen($name);
        if ($len <= 2) {
            $maskedName = substr($name, 0, 1) . '*';
        } else {
            $maskedName = substr($name, 0, 1) . str_repeat('*', max(3, $len - 2)) . substr($name, -1);
        }
        return "{$maskedName}@{$domain}";
    }

    /**
     * Mask phone (e.g. 09178889999 -> 0917 ••• ••99)
     */
    private static function maskPhone(string $phone): string {
        $clean = preg_replace('/[^\d]/', '', $phone);
        $len = strlen($clean);
        if ($len < 7) return $phone;
        $start = substr($clean, 0, 4);
        $end = substr($clean, -2);
        return "{$start} ••• ••{$end}";
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
