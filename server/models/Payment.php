<?php
/**
 * Nely's Salon Management System
 * Payment Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class Payment {
    public static function create(array $data): int {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO payments (booking_id, amount, payment_method, reference_number, receipt_file, status, paid_at)
            VALUES (:booking_id, :amount, :method, :ref, :receipt, :status, :paid_at)
        ");
        $stmt->execute([
            'booking_id' => $data['booking_id'],
            'amount'     => $data['amount'],
            'method'     => $data['payment_method'] ?? 'cash',
            'ref'        => $data['reference_number'] ?? null,
            'receipt'    => $data['receipt_file'] ?? null,
            'status'     => $data['status'] ?? 'pending',
            'paid_at'    => $data['paid_at'] ?? null,
        ]);

        return (int)$pdo->lastInsertId();
    }

    public static function findByBookingId(int $bookingId): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM payments WHERE booking_id = :bid");
        $stmt->execute(['bid' => $bookingId]);
        return $stmt->fetch() ?: null;
    }

    public static function updateStatus(int $id, string $status, ?string $paidAt = null): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE payments SET status = :status, paid_at = :paid_at WHERE id = :id");
        return $stmt->execute([
            'status'  => $status,
            'paid_at' => $paidAt,
            'id'      => $id,
        ]);
    }
}
