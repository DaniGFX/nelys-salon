<?php
/**
 * Nely's Salon Management System
 * Booking Reference Code Generator
 */

class BookingReferenceService {
    public static function generate(): string {
        $prefix = 'NS';
        $date = date('Ymd');
        $random = str_pad((string)random_int(100, 9999), 4, '0', STR_PAD_LEFT);
        return "{$prefix}-{$date}-{$random}";
    }
}
