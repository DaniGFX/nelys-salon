<?php
/**
 * Nely's Salon Management System
 * Availability & Appointment Slots Service
 */

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/models/Staff.php';

class AvailabilityService {
    /**
     * Standard Salon Operating Time Slots
     */
    public static array $standardSlots = [
        '09:00:00' => '9:00 AM',
        '10:00:00' => '10:00 AM',
        '11:00:00' => '11:00 AM',
        '13:00:00' => '1:00 PM',
        '14:00:00' => '2:00 PM',
        '15:00:00' => '3:00 PM',
        '16:00:00' => '4:00 PM',
        '17:00:00' => '5:00 PM',
        '18:00:00' => '6:00 PM',
    ];

    /**
     * Get full availability dataset including slots and per-staff booked times for a specific date
     */
    public static function getAvailabilityData(string $date, ?int $serviceId = null, ?int $selectedStaffId = null): array {
        Staff::ensureSchema();
        $pdo = Database::getConnection();

        $dayOfWeek = date('l', strtotime($date));

        // 1. Fetch all active staff
        $stmtStaff = $pdo->query("
            SELECT id, name, full_name, role, specialties, avatar, is_active, status, availability, schedule 
            FROM staff 
            WHERE (is_active = 1 OR is_active IS NULL) 
              AND (status = 'Active' OR status IS NULL)
            ORDER BY id ASC
        ");
        $staffRows = $stmtStaff->fetchAll(PDO::FETCH_ASSOC);

        $defaultSchedule = [
            'Monday'    => '9:00 AM – 6:00 PM',
            'Tuesday'   => '9:00 AM – 6:00 PM',
            'Wednesday' => '9:00 AM – 6:00 PM',
            'Thursday'  => '9:00 AM – 6:00 PM',
            'Friday'    => '9:00 AM – 6:00 PM',
            'Saturday'  => '9:00 AM – 6:00 PM',
            'Sunday'    => 'Day Off'
        ];

        // Map staff working status for this day
        $staffMap = [];
        $workingStaffIds = [];

        foreach ($staffRows as $s) {
            $sid = (int)$s['id'];
            $schedule = $defaultSchedule;
            if (!empty($s['schedule'])) {
                $decoded = json_decode($s['schedule'], true);
                if (is_array($decoded)) {
                    $schedule = array_merge($defaultSchedule, $decoded);
                }
            }

            $daySchedule = $schedule[$dayOfWeek] ?? '9:00 AM – 6:00 PM';
            $isDayOff = (strtolower(trim($daySchedule)) === 'day off')
                || (strtolower(trim($s['status'] ?? '')) === 'on leave')
                || (strtolower(trim($s['availability'] ?? '')) === 'off-duty')
                || (strtolower(trim($s['availability'] ?? '')) === 'day off')
                || (strtolower(trim($s['availability'] ?? '')) === 'on leave');

            $isWorkingToday = !$isDayOff;
            if ($isWorkingToday) {
                $workingStaffIds[] = $sid;
            }

            $staffMap[$sid] = [
                'id'                   => $sid,
                'name'                 => $s['name'],
                'full_name'            => $s['full_name'] ?: $s['name'],
                'role'                 => $s['role'] ?: 'Stylist & Specialist',
                'specialties'          => $s['specialties'] ?: '',
                'avatar'               => $s['avatar'] ?: 'director.jpg',
                'is_working_today'     => $isWorkingToday,
                'schedule_today'       => $daySchedule,
                'availability_status'  => $s['availability'] ?: 'Available',
                'booked_times'         => [],
                'booked_display_times' => [],
            ];
        }

        // 2. Fetch active bookings for this date
        $stmtBookings = $pdo->prepare("
            SELECT id, staff_id, booking_time, status, reference_no 
            FROM bookings 
            WHERE booking_date = :date 
              AND status IN ('pending', 'confirmed')
        ");
        $stmtBookings->execute(['date' => $date]);
        $activeBookings = $stmtBookings->fetchAll(PDO::FETCH_ASSOC);

        // Group bookings by time slot
        $bookingsByTime = [];
        foreach ($activeBookings as $b) {
            $rawTime = date('H:i:s', strtotime($b['booking_time']));
            if (!isset($bookingsByTime[$rawTime])) {
                $bookingsByTime[$rawTime] = [];
            }
            $bookingsByTime[$rawTime][] = $b;

            // Track booked slots per staff
            if (!empty($b['staff_id']) && isset($staffMap[(int)$b['staff_id']])) {
                $sid = (int)$b['staff_id'];
                $timeDisplay = date('g:i A', strtotime($rawTime));
                $staffMap[$sid]['booked_times'][] = $rawTime;
                $staffMap[$sid]['booked_display_times'][] = $timeDisplay;
            }
        }

        // 3. Build time slots with precise staff availability
        $slots = [];
        $totalWorkingStaff = count($workingStaffIds);

        foreach (self::$standardSlots as $timeStr => $displayTime) {
            $slotBookings = $bookingsByTime[$timeStr] ?? [];
            $bookedStaffIds = [];
            $unassignedBookingsCount = 0;

            foreach ($slotBookings as $b) {
                if (!empty($b['staff_id'])) {
                    $bookedStaffIds[] = (int)$b['staff_id'];
                } else {
                    $unassignedBookingsCount++;
                }
            }

            // Staff available at this time slot = working today and NOT directly booked
            $availableStaffIds = [];
            foreach ($workingStaffIds as $wsid) {
                if (!in_array($wsid, $bookedStaffIds, true)) {
                    $availableStaffIds[] = $wsid;
                }
            }

            // Total bookings at this slot
            $bookedCount = count($slotBookings);
            $maxCapacity = max(1, $totalWorkingStaff);

            // Is slot available for selection?
            $isAvailable = false;
            if ($selectedStaffId) {
                // If a specific staff member is requested
                $isAvailable = in_array($selectedStaffId, $availableStaffIds, true);
            } else {
                // If "Any Available Stylist" is requested
                // Available if remaining unbooked working staff > unassigned bookings count
                $isAvailable = count($availableStaffIds) > $unassignedBookingsCount;
            }

            // Check if slot has already passed for today or a past date
            $today = date('Y-m-d');
            $currentTime = date('H:i:s');
            $isPast = ($date < $today) || ($date === $today && $timeStr <= $currentTime);
            if ($isPast) {
                $isAvailable = false;
            }

            $slots[] = [
                'time'                => $timeStr,
                'display_time'        => $displayTime,
                'booked_count'        => $bookedCount,
                'max_capacity'        => $maxCapacity,
                'is_available'        => $isAvailable,
                'is_past'             => $isPast,
                'booked_staff_ids'    => array_values(array_unique($bookedStaffIds)),
                'available_staff_ids' => array_values($availableStaffIds),
                'unassigned_count'    => $unassignedBookingsCount,
            ];
        }

        return [
            'date'           => $date,
            'day_of_week'    => $dayOfWeek,
            'formatted_date' => date('F j, Y', strtotime($date)),
            'slots'          => $slots,
            'staff'          => array_values($staffMap),
        ];
    }

    /**
     * Backward-compatible helper returning slots array
     */
    public static function getAvailableSlots(string $date, ?int $serviceId = null, ?int $selectedStaffId = null): array {
        $data = self::getAvailabilityData($date, $serviceId, $selectedStaffId);
        return $data['slots'] ?? [];
    }
}
