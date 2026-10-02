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
     * @return array ['success' => bool, 'message' => string]
     */
    public static function sendOtp(string $recipientEmail, string $recipientName, string $otpCode): array {
        $timeStr = date('h:i:s A');
        $subject = "Your Nely's Salon Verification Code: {$otpCode} [{$timeStr}]";
        $htmlBody = self::buildOtpHtml($recipientName, $otpCode);
        $plainText = "Hello {$recipientName},\n\nYour 6-digit verification code for Nely's Salon is: {$otpCode}\n\nThis code is valid for 10 minutes. If you did not request this code, please ignore this message.\n\nThank you,\nNely's Salon Team";

        return self::send($recipientEmail, $recipientName, $subject, $htmlBody, $plainText);
    }

    /**
     * Core email dispatch method
     */
    public static function send(
        string $toEmail,
        string $toName,
        string $subject,
        string $htmlBody,
        string $plainText = ''
    ): array {
        $smtpUser = env('GMAIL_SMTP_USER', '');
        $smtpPass = env('GMAIL_APP_PASSWORD', '');
        $fromName = env('GMAIL_FROM_NAME', "nelys salon website");
        $fromEmail = !empty($smtpUser) ? $smtpUser : 'no-reply@nelyssalon.com';

        // 1. If Resend HTTPS API is provided (Port 443)
        $resendKey = env('RESEND_API_KEY', '');
        if (!empty($resendKey)) {
            $resendResult = self::sendViaResend($toEmail, $toName, $fromEmail, $fromName, $subject, $htmlBody, $resendKey);
            if ($resendResult['success']) {
                return $resendResult;
            }
            error_log('[Mailer] Resend API failed: ' . $resendResult['message']);
        }

        // 2. If Brevo HTTPS API is provided (Port 443)
        $brevoKey = env('BREVO_API_KEY', '');
        if (!empty($brevoKey)) {
            $brevoResult = self::sendViaBrevo($toEmail, $toName, $fromEmail, $fromName, $subject, $htmlBody, $brevoKey);
            if ($brevoResult['success']) {
                return $brevoResult;
            }
            error_log('[Mailer] Brevo API failed: ' . $brevoResult['message']);
        }

        // 3. If Gmail SMTP credentials are provided, dispatch via cURL SMTPS
        if (!empty($smtpUser) && !empty($smtpPass)) {
            $smtpResult = self::sendViaCurlSmtp($toEmail, $toName, $fromEmail, $fromName, $subject, $htmlBody, $smtpUser, $smtpPass);
            if ($smtpResult['success']) {
                return $smtpResult;
            }
            error_log('[Mailer] Gmail SMTPS failed: ' . $smtpResult['message']);
        }

        // 4. Standard PHP mail() if available
        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$fromName} <{$fromEmail}>\r\n";
        $headers .= "Reply-To: {$fromEmail}\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        if (@mail($toEmail, $subject, $htmlBody, $headers)) {
            return [
                'success' => true,
                'message' => 'Email sent successfully via mail().'
            ];
        }

        return [
            'success' => false,
            'message' => 'Unable to send email. Please verify SMTP credentials or network connectivity.'
        ];
    }

    /**
     * Send email via native cURL SMTPS (Port 465 SSL with Port 587 TLS fallback)
     */
    private static function sendViaCurlSmtp(
        string $to,
        string $toName,
        string $fromEmail,
        string $fromName,
        string $subject,
        string $body,
        string $username,
        string $password
    ): array {
        $cleanPass = str_replace(' ', '', $password);
        $msgId = '<' . bin2hex(random_bytes(12)) . '.' . time() . '@nelyssalon.website>';
        $date = date('r');

        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $encodedFromName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
        $encodedToName = '=?UTF-8?B?' . base64_encode($toName) . '?=';

        $rawMessage = "Date: {$date}\r\n" .
                      "To: {$encodedToName} <{$to}>\r\n" .
                      "From: {$encodedFromName} <{$fromEmail}>\r\n" .
                      "Reply-To: <{$fromEmail}>\r\n" .
                      "Subject: {$encodedSubject}\r\n" .
                      "Message-ID: {$msgId}\r\n" .
                      "X-Priority: 1 (Highest)\r\n" .
                      "X-MSMail-Priority: High\r\n" .
                      "Importance: High\r\n" .
                      "MIME-Version: 1.0\r\n" .
                      "Content-Type: text/html; charset=UTF-8\r\n" .
                      "Content-Transfer-Encoding: 8bit\r\n\r\n" .
                      $body . "\r\n";

        $targets = [
            [
                'url' => 'smtps://smtp.gmail.com:465',
                'ssl' => CURLUSESSL_ALL,
            ],
            [
                'url' => 'smtp://smtp.gmail.com:587',
                'ssl' => CURLUSESSL_TRY,
            ],
        ];

        $lastError = 'Unknown SMTP error';

        foreach ($targets as $target) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $target['url']);
            curl_setopt($ch, CURLOPT_USERNAME, $username);
            curl_setopt($ch, CURLOPT_PASSWORD, $cleanPass);
            curl_setopt($ch, CURLOPT_MAIL_FROM, "<{$fromEmail}>");
            curl_setopt($ch, CURLOPT_MAIL_RCPT, ["<{$to}>"]);
            curl_setopt($ch, CURLOPT_USE_SSL, $target['ssl']);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($ch, CURLOPT_UPLOAD, true);
            curl_setopt($ch, CURLOPT_INFILESIZE, strlen($rawMessage));
            curl_setopt($ch, CURLOPT_TIMEOUT, 12);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            $offset = 0;
            curl_setopt($ch, CURLOPT_READFUNCTION, function($ch, $fd, $length) use ($rawMessage, &$offset) {
                $chunk = substr($rawMessage, $offset, $length);
                $offset += strlen($chunk);
                return $chunk;
            });

            $exec = curl_exec($ch);
            $errno = curl_errno($ch);
            $error = curl_error($ch);
            $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            curl_close($ch);

            if ($errno === 0) {
                return ['success' => true, 'message' => 'Email sent successfully via Gmail SMTPS.'];
            }

            $lastError = "cURL SMTP error ({$target['url']}): [{$errno}] {$error}";
            error_log("[Mailer] " . $lastError);
        }

        return ['success' => false, 'message' => $lastError];
    }

    /**
     * Send email via Resend HTTPS REST API (Port 443 - Cloud friendly)
     */
    private static function sendViaResend(
        string $to,
        string $toName,
        string $fromEmail,
        string $fromName,
        string $subject,
        string $body,
        string $apiKey
    ): array {
        $ch = curl_init('https://api.resend.com/emails');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . trim($apiKey),
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'from'    => "{$fromName} <" . env('RESEND_FROM_EMAIL', 'onboarding@resend.dev') . ">",
            'to'      => [$to],
            'subject' => $subject,
            'html'    => $body
        ]));
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        $resp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            return ['success' => true, 'message' => 'Email sent successfully via Resend API.'];
        }
        return ['success' => false, 'message' => "Resend API error ({$httpCode}): {$resp}"];
    }

    /**
     * Send email via Brevo HTTPS REST API (Port 443 - Cloud friendly)
     */
    private static function sendViaBrevo(
        string $to,
        string $toName,
        string $fromEmail,
        string $fromName,
        string $subject,
        string $body,
        string $apiKey
    ): array {
        $ch = curl_init('https://api.brevo.com/v3/smtp/email');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'api-key: ' . trim($apiKey),
            'Content-Type: application/json',
            'Accept: application/json'
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'sender'      => ['name' => $fromName, 'email' => $fromEmail],
            'to'          => [['email' => $to, 'name' => $toName]],
            'subject'     => $subject,
            'htmlContent' => $body
        ]));
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        $resp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            return ['success' => true, 'message' => 'Email sent successfully via Brevo API.'];
        }
        return ['success' => false, 'message' => "Brevo API error ({$httpCode}): {$resp}"];
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
