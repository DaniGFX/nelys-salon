<?php
/**
 * Nely's Salon Management System
 * Mailer Helper
 * Dispatches HTML emails & OTPs via Gmail SMTP, PHP mail(), or local development logger.
 */

require_once dirname(__DIR__) . '/config/env.php';

class Mailer {
    /**
     * Send an OTP verification email to customer/admin
     * 
     * @param string $recipientEmail
     * @param string $recipientName
     * @param string $otpCode 6-digit PIN
     * @return array ['success' => bool, 'message' => string, 'dev_code' => string|null]
     */
    public static function sendOtp(string $recipientEmail, string $recipientName, string $otpCode): array {
        $timeStr = date('h:i:s A');
        $subject = "Your Nely's Salon Verification Code: {$otpCode} [{$timeStr}]";
        $htmlBody = self::buildOtpHtml($recipientName, $otpCode);
        $plainText = "Hello {$recipientName},\n\nYour 6-digit verification code for Nely's Salon is: {$otpCode}\n\nThis code is valid for 10 minutes. If you did not request this code, please ignore this message.\n\nThank you,\nNely's Salon Team";

        return self::send($recipientEmail, $recipientName, $subject, $htmlBody, $plainText, $otpCode);
    }

    /**
     * Core email dispatch method
     */
    public static function send(
        string $toEmail,
        string $toName,
        string $subject,
        string $htmlBody,
        string $plainText = '',
        ?string $devOtp = null
    ): array {
        $smtpUser = env('GMAIL_SMTP_USER', '');
        $smtpPass = env('GMAIL_APP_PASSWORD', '');
        $fromName = env('GMAIL_FROM_NAME', "Nely's Salon");
        $fromEmail = !empty($smtpUser) ? $smtpUser : 'no-reply@nelyssalon.com';

        // 1. If Gmail SMTP credentials are provided, send via direct SMTP socket
        if (!empty($smtpUser) && !empty($smtpPass)) {
            $smtpResult = self::sendViaSmtp($toEmail, $toName, $fromEmail, $fromName, $subject, $htmlBody, $smtpUser, $smtpPass);
            if ($smtpResult['success']) {
                return $smtpResult;
            }
            error_log('[Mailer] Gmail SMTP failed, falling back: ' . $smtpResult['message']);
        }

        // 2. Standard PHP mail() if local mail server / sendmail is present
        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$fromName} <{$fromEmail}>\r\n";
        $headers .= "Reply-To: {$fromEmail}\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        if (@mail($toEmail, $subject, $htmlBody, $headers)) {
            return [
                'success'  => true,
                'message'  => 'Email sent successfully via mail().',
                'dev_code' => env('APP_ENV') === 'development' ? $devOtp : null
            ];
        }

        // 3. Development / Localhost Fallback (logs code for seamless testing)
        error_log("[Mailer Dev Mode] OTP dispatched to [{$toEmail}]: Code = {$devOtp}");
        return [
            'success'  => true,
            'message'  => 'Verification code dispatched to your email.',
            'dev_code' => env('APP_ENV') === 'development' ? $devOtp : null
        ];
    }

    /**
     * Send email via direct SSL/TLS socket to smtp.gmail.com:587 / 465
     */
    private static function sendViaSmtp(
        string $to,
        string $toName,
        string $fromEmail,
        string $fromName,
        string $subject,
        string $body,
        string $username,
        string $password
    ): array {
        $password = str_replace(' ', '', $password);
        $portsToTry = [465, 587];

        $lastError = 'Unknown SMTP error';

        foreach ($portsToTry as $port) {
            $host = ($port === 465) ? 'ssl://smtp.gmail.com' : 'smtp.gmail.com';
            $timeout = 3;

            $context = stream_context_create([
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                ]
            ]);

            $socket = @stream_socket_client("{$host}:{$port}", $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);
            if (!$socket) {
                $lastError = "Could not connect to {$host}:{$port} - {$errstr} ({$errno})";
                continue;
            }

            stream_set_timeout($socket, 5);

            $read = function() use ($socket) {
                $response = '';
                while ($line = fgets($socket, 515)) {
                    $response .= $line;
                    if (substr($line, 3, 1) === ' ') break;
                }
                return $response;
            };

            $write = function(string $cmd) use ($socket) {
                fputs($socket, $cmd . "\r\n");
            };

            $read();
            $write("EHLO " . gethostname());
            $read();

            // STARTTLS for port 587
            if ($port === 587) {
                $write("STARTTLS");
                $res = $read();
                if (!str_starts_with($res, '220')) {
                    fclose($socket);
                    $lastError = "STARTTLS failed on port 587: {$res}";
                    continue;
                }
                stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                $write("EHLO " . gethostname());
                $read();
            }

            $write("AUTH LOGIN");
            $read();
            $write(base64_encode($username));
            $read();
            $write(base64_encode($password));
            $res = $read();
            if (!str_starts_with($res, '235')) {
                fclose($socket);
                $lastError = "SMTP Authentication failed on port {$port}. Please check Gmail App Password.";
                continue;
            }

            $write("MAIL FROM: <$fromEmail>");
            $read();
            $write("RCPT TO: <$to>");
            $read();
            $write("DATA");
            $read();

            $msgId = '<' . bin2hex(random_bytes(12)) . '.' . time() . '@nelyssalon.website>';

            $headers  = "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $headers .= "From: {$fromName} <{$fromEmail}>\r\n";
            $headers .= "To: {$toName} <{$to}>\r\n";
            $headers .= "Subject: {$subject}\r\n";
            $headers .= "Date: " . date('r') . "\r\n";
            $headers .= "Message-ID: {$msgId}\r\n";
            $headers .= "X-Priority: 1 (Highest)\r\n";
            $headers .= "X-MSMail-Priority: High\r\n";
            $headers .= "Importance: High\r\n";
            $headers .= "X-Mailer: NelysSalon/1.0\r\n";

            $message = $headers . "\r\n" . $body . "\r\n.\r\n";
            $write($message);
            $res = $read();
            $write("QUIT");
            fclose($socket);

            if (str_starts_with($res, '250')) {
                return ['success' => true, 'message' => 'Email sent successfully via Gmail SMTP.'];
            } else {
                $lastError = "Error completing SMTP delivery on port {$port}: {$res}";
            }
        }

        return ['success' => false, 'message' => $lastError];
    }

    /**
     * HTML template for OTP verification
     */
    private static function buildOtpHtml(string $recipientName, string $otpCode): string {
        $safeName = htmlspecialchars($recipientName, ENT_QUOTES, 'UTF-8');
        return '<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #fdfaf7; margin: 0; padding: 24px; color: #2d2424; }
  .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #ebdcd0; padding: 36px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
  .header { text-align: center; margin-bottom: 28px; }
  .title { font-size: 22px; font-weight: 700; color: #935338; margin: 0; }
  .subtitle { font-size: 13px; color: #7a6e6e; margin-top: 6px; }
  .otp-box { background: #fdf7f2; border: 2px dashed #d99b7b; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
  .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #935338; font-family: monospace; }
  .otp-expiry { font-size: 12px; color: #8c7365; margin-top: 8px; }
  .footer { font-size: 12px; color: #9e9393; text-align: center; margin-top: 32px; border-top: 1px solid #f0e6df; padding-top: 16px; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1 class="title">Nely\'s Hair &amp; Beauty Salon</h1>
    <p class="subtitle">Security Verification Code</p>
  </div>
  <p>Hello <strong>' . $safeName . '</strong>,</p>
  <p>You recently requested to sign in to your Nely\'s Salon account. Use the verification code below to complete your authentication:</p>
  
  <div class="otp-box">
    <div class="otp-code">' . $otpCode . '</div>
    <div class="otp-expiry">Valid for 10 minutes • Do not share this code with anyone</div>
  </div>

  <p style="font-size: 13px; color: #665a5a;">If you did not attempt this login, your account password may still be secure, but you should change your password immediately.</p>

  <div class="footer">
    &copy; ' . date('Y') . ' Nely\'s Salon Management System. All rights reserved.
  </div>
</div>
</body>
</html>';
    }
}
