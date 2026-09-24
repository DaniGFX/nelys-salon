<?php
/**
 * Nely's Salon Management System
 * Business Settings Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class Setting {
    public static function all(): array {
        $pdo = Database::getConnection();
        return $pdo->query("SELECT setting_key, setting_value FROM business_settings")->fetchAll(PDO::FETCH_KEY_PAIR);
    }

    public static function get(string $key, ?string $default = null): ?string {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT setting_value FROM business_settings WHERE setting_key = :k LIMIT 1");
        $stmt->execute(['k' => $key]);
        $val = $stmt->fetchColumn();
        return $val !== false && $val !== null ? $val : $default;
    }

    public static function set(string $key, string $value): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO business_settings (setting_key, setting_value, updated_at)
            VALUES (:k, :v, NOW())
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
        ");
        return $stmt->execute(['k' => $key, 'v' => $value]);
    }

    public static function allCategorized(?int $adminUserId = null): array {
        $pdo = Database::getConnection();

        // 1. Salon Information
        $salonInfo = [
            'name'        => self::get('salon_name', "Nely's Salon"),
            'address'     => self::get('salon_address', "BLK 42 Lot 12, Sacred Heart Village, Greater Lagro, Novaliches, Quezon City, Metro Manila"),
            'phone'       => self::get('salon_phone', "0917 888 9999"),
            'email'       => self::get('salon_email', "nelyssalon@email.com"),
            'description' => self::get('salon_description', "15 years of providing quality salon services to our customers.")
        ];

        // 2. Business Hours
        $defaultHours = [
            ['day' => 'Monday',    'open' => true,  'openTime' => '09:00', 'closeTime' => '18:00'],
            ['day' => 'Tuesday',   'open' => true,  'openTime' => '09:00', 'closeTime' => '18:00'],
            ['day' => 'Wednesday', 'open' => true,  'openTime' => '09:00', 'closeTime' => '18:00'],
            ['day' => 'Thursday',  'open' => true,  'openTime' => '09:00', 'closeTime' => '18:00'],
            ['day' => 'Friday',    'open' => true,  'openTime' => '09:00', 'closeTime' => '18:00'],
            ['day' => 'Saturday',  'open' => true,  'openTime' => '09:00', 'closeTime' => '18:00'],
            ['day' => 'Sunday',    'open' => false, 'openTime' => '',      'closeTime' => '']
        ];

        $rawHours = self::get('business_hours');
        $businessHours = $defaultHours;
        if ($rawHours) {
            $decodedHours = json_decode($rawHours, true);
            if (is_array($decodedHours) && count($decodedHours) === 7) {
                $businessHours = $decodedHours;
            }
        }

        // 3. Appointment Settings
        $appointmentSettings = [
            'duration'          => self::get('appt_duration', "30"),
            'advanceDays'       => (int)self::get('advance_booking_days', "30"),
            'minNoticeHours'    => (int)self::get('min_notice_hours', "2"),
            'maxPerSlot'        => (int)self::get('max_per_slot', "3"),
            'autoConfirm'       => self::get('auto_confirm_appts', "0") === "1" || self::get('auto_confirm_appts') === "true",
            'allowCancellation' => self::get('allow_cancellation', "1") === "1" || self::get('allow_cancellation') === "true",
            'cancelNoticeHours' => (int)self::get('cancellation_cutoff_hours', "2")
        ];

        // 4. Payment Settings
        $paymentSettings = [
            'cash'         => self::get('pay_cash', "1") === "1" || self::get('pay_cash') === "true",
            'gcash'        => self::get('pay_gcash', "1") === "1" || self::get('pay_gcash') === "true",
            'bankTransfer' => self::get('pay_bank', "0") === "1" || self::get('pay_bank') === "true",
            'other'        => self::get('pay_other', "0") === "1" || self::get('pay_other') === "true",
            'gcashNumber'  => self::get('gcash_number', "0917 888 9999"),
            'gcashName'    => self::get('gcash_account_name', "Nely D.")
        ];

        // 5. Notification Preferences
        $defaultNotifs = [
            'newAppt'       => true,
            'apptCancel'    => true,
            'apptResched'   => true,
            'payReceived'   => true,
            'newCustomer'   => true,
            'systemUpdates' => true
        ];
        $rawNotifs = self::get('notification_preferences');
        $notifications = $defaultNotifs;
        if ($rawNotifs) {
            $decodedNotifs = json_decode($rawNotifs, true);
            if (is_array($decodedNotifs)) {
                $notifications = array_merge($defaultNotifs, $decodedNotifs);
            }
        }

        // 6. Admin Account Profile
        $adminId = $adminUserId ?: 1;
        $stmtUser = $pdo->prepare("SELECT email, phone FROM users WHERE id = :id LIMIT 1");
        $stmtUser->execute(['id' => $adminId]);
        $userRow = $stmtUser->fetch();

        $account = [
            'name'  => self::get('admin_account_name', "Admin"),
            'email' => $userRow['email'] ?? "admin@nelyssalon.com",
            'phone' => $userRow['phone'] ?? "0917 888 9999"
        ];

        // 7. System Preferences
        $systemPreferences = [
            'language'   => self::get('sys_language', "English"),
            'currency'   => self::get('sys_currency', "PHP (₱)"),
            'timezone'   => self::get('sys_timezone', "Asia/Manila (GMT+8)"),
            'dateFormat' => self::get('sys_date_format', "MM/DD/YYYY")
        ];

        // 8. Danger Zone
        $isDeactivated = self::get('is_system_deactivated', "0") === "1" || self::get('is_system_deactivated') === "true";

        return [
            'salonInfo'           => $salonInfo,
            'businessHours'       => $businessHours,
            'appointmentSettings' => $appointmentSettings,
            'paymentSettings'     => $paymentSettings,
            'notifications'       => $notifications,
            'account'             => $account,
            'systemPreferences'   => $systemPreferences,
            'isDeactivated'       => $isDeactivated
        ];
    }
}
