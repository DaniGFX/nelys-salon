<?php
/**
 * Nely's Salon Management System
 * Date & Timezone Helper
 */

class DateHelper {
    public static function timezone(): DateTimeZone {
        return new DateTimeZone('Asia/Manila');
    }

    public static function now(): DateTime {
        return new DateTime('now', self::timezone());
    }

    public static function format(?string $datetime, string $format = 'F j, Y · g:i A'): string {
        if (!$datetime) return '';
        $dt = new DateTime($datetime, self::timezone());
        return $dt->format($format);
    }

    public static function formatDate(?string $date, string $format = 'M d, Y'): string {
        if (!$date) return '';
        $dt = new DateTime($date, self::timezone());
        return $dt->format($format);
    }

    public static function formatTime(?string $time, string $format = 'g:i A'): string {
        if (!$time) return '';
        $dt = new DateTime($time, self::timezone());
        return $dt->format($format);
    }

    public static function isPast(string $datetime): bool {
        $dt = new DateTime($datetime, self::timezone());
        return $dt < self::now();
    }

    public static function canCancel(string $appointmentDateTime, int $cutoffHours = 24): bool {
        $dt = new DateTime($appointmentDateTime, self::timezone());
        $now = self::now();
        $diffSeconds = $dt->getTimestamp() - $now->getTimestamp();
        return $diffSeconds >= ($cutoffHours * 3600);
    }
}
