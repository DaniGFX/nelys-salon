<?php
/**
 * Nely's Salon Management System
 * Sale Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class Sale {
    public static function create(array $data): int {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO sales (booking_id, amount, service_name, customer_name, payment_method, transaction_date)
            VALUES (:booking_id, :amount, :service_name, :customer_name, :method, :date)
        ");
        $stmt->execute([
            'booking_id'    => $data['booking_id'] ?? null,
            'amount'        => $data['amount'],
            'service_name'  => $data['service_name'],
            'customer_name' => $data['customer_name'],
            'method'        => $data['payment_method'],
            'date'          => $data['transaction_date'] ?? date('Y-m-d'),
        ]);
        return (int)$pdo->lastInsertId();
    }

    public static function all(int $limit = 100): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM sales ORDER BY transaction_date DESC, id DESC LIMIT :limit");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
