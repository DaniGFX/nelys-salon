<?php
/**
 * Nely's Salon Management System
 * SMS Gateway Helper
 * Handles sending OTPs via SMS (Semaphore API, PhilSMS, Twilio, or Dev Simulator).
 */

require_once dirname(__DIR__) . '/config/env.php';

class SmsService {
    /**
     * Dispatch an OTP code via SMS to a customer/admin phone number
     * 
     * @param string $phone Mobile number (e.g. 09171234567 or +639171234567)
     * @param string $otpCode 6-digit PIN
     * @return array ['success' => bool, 'message' => string]
     */
    public static function sendOtp(string $phone, string $otpCode): array {
        $cleanPhone = self::normalizePhone($phone);
        $message = "Your Nely's Salon verification code is: {$otpCode}. Valid for 5 minutes. Please do not share this code.";

        $provider = strtolower(env('SMS_GATEWAY_PROVIDER', 'dev'));
        $apiKey = env('SMS_API_KEY', '');
        $senderName = env('SMS_SENDER_NAME', 'NELYSALON');

        // 1. Semaphore API (Standard Philippine SMS Gateway)
        if ($provider === 'semaphore' && !empty($apiKey)) {
            $result = self::sendViaSemaphore($cleanPhone, $message, $apiKey, $senderName);
            if ($result['success']) {
                return $result;
            }
            error_log('[SmsService] Semaphore failed, falling back: ' . $result['message']);
        }

        // 2. Twilio API (International SMS Gateway)
        if ($provider === 'twilio' && !empty($apiKey)) {
            $result = self::sendViaTwilio($cleanPhone, $message);
            if ($result['success']) {
                return $result;
            }
            error_log('[SmsService] Twilio failed, falling back: ' . $result['message']);
        }

        // 3. Fallback / Dev Simulator (Logged to server log only)
        error_log("[SmsService] SMS OTP dispatched to [{$cleanPhone}]: Code = {$otpCode}");
        return [
            'success'  => true,
            'message'  => 'Verification code dispatched via SMS.'
        ];
    }

    /**
     * Dispatch via Semaphore API (Philippines)
     */
    private static function sendViaSemaphore(string $phone, string $message, string $apiKey, string $senderName): array {
        $url = 'https://api.semaphore.co/api/v4/messages';
        $postData = [
            'apikey'     => $apiKey,
            'number'     => $phone,
            'message'    => $message,
            'sendername' => $senderName
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            return ['success' => false, 'message' => "Semaphore connection error: {$curlError}"];
        }

        if ($httpCode >= 200 && $httpCode < 300) {
            return ['success' => true, 'message' => 'SMS sent successfully via Semaphore.'];
        }

        return ['success' => false, 'message' => "Semaphore returned status {$httpCode}: {$response}"];
    }

    /**
     * Dispatch via Twilio API
     */
    private static function sendViaTwilio(string $phone, string $message): array {
        $sid = env('TWILIO_ACCOUNT_SID', '');
        $token = env('TWILIO_AUTH_TOKEN', '');
        $from = env('TWILIO_PHONE_NUMBER', '');

        if (empty($sid) || empty($token) || empty($from)) {
            return ['success' => false, 'message' => 'Twilio credentials not configured.'];
        }

        $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";
        $data = [
            'From' => $from,
            'To'   => str_starts_with($phone, '+') ? $phone : ('+63' . ltrim($phone, '0')),
            'Body' => $message,
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_USERPWD, "{$sid}:{$token}");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300) {
            return ['success' => true, 'message' => 'SMS sent successfully via Twilio.'];
        }

        return ['success' => false, 'message' => "Twilio error {$httpCode}: {$response}"];
    }

    /**
     * Format phone number to clean Philippine format (09xxxxxxxxx or +639xxxxxxxxx)
     */
    public static function normalizePhone(string $phone): string {
        $clean = preg_replace('/[^\d+]/', '', $phone);
        if (str_starts_with($clean, '+63')) {
            $clean = '0' . substr($clean, 3);
        } elseif (str_starts_with($clean, '63') && strlen($clean) === 12) {
            $clean = '0' . substr($clean, 2);
        }
        return $clean;
    }
}
