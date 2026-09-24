<?php
/**
 * Nely's Salon Management System
 * Availability & Appointment Slots Service
 */

require_once dirname(__DIR__) . '/config/database.php';

class AvailabilityService {
    public static function getAvailableSlots(string $date, ?int $serviceId = null): array {
        $pdo = Database::getConnection();

        // 1. Fetch bookings for this date that are not cancelled
        $stmt = $pdo->prepare("
            SELECT booking_time, COUNT(*) as count 
            FROM bookings 
            WHERE booking_date = :date AND status NOT IN ('cancelled', 'no_show')
            GROUP BY booking_time
        ");
        $stmt->execute(['date' => $date]);
        $bookedTimes = $stmt->fetchAll(PDO::FETCH_KEY_PAIR); // ['10:00:00' => 1]

        // 2. Salon Operating Hours: 9:00 AM to 7:00 PM
        $slots = [];
        $startHour = 9;
        $endHour = 19;
        $maxConcurrentPerSlot = 3; // Nely, Ana, Elena

        for ($h = $startHour; $h <= $endHour; $h++) {
            $timeStr = sprintf('%02d:00:00', $h);
            $displayTime = date('g:i A', strtotime($timeStr));
            $bookedCount = (int)($bookedTimes[$timeStr] ?? 0);
            $isAvailable = $bookedCount < $maxConcurrentPerSlot;

            $slots[] = [
                'time'          => $timeStr,
                'display_time'  => $displayTime,
                'booked_count'  => $bookedCount,
                'max_capacity'  => $maxConcurrentPerSlot,
                'is_available'  => $isAvailable,
            ];
        }

        return $slots;
    }
}
