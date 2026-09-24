<?php
/**
 * Nely's Salon Management System
 * Sales & Revenue Aggregation Service
 */

require_once dirname(__DIR__) . '/config/database.php';

class SalesService {
    public static function getSummary(?string $startDate = null, ?string $endDate = null): array {
        $pdo = Database::getConnection();

        $where = "1=1";
        $params = [];

        if ($startDate && $endDate) {
            $where .= " AND transaction_date BETWEEN :start AND :end";
            $params['start'] = $startDate;
            $params['end'] = $endDate;
        }

        // Total Revenue
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) AS total_revenue, COUNT(*) AS total_sales FROM sales WHERE {$where}");
        $stmt->execute($params);
        $summary = $stmt->fetch();

        // Breakdown by Service
        $stmt = $pdo->prepare("
            SELECT service_name, COUNT(*) AS volume, SUM(amount) AS total_amount
            FROM sales
            WHERE {$where}
            GROUP BY service_name
            ORDER BY total_amount DESC
        ");
        $stmt->execute($params);
        $serviceBreakdown = $stmt->fetchAll();

        // Breakdown by Payment Method
        $stmt = $pdo->prepare("
            SELECT payment_method, COUNT(*) AS count, SUM(amount) AS total_amount
            FROM sales
            WHERE {$where}
            GROUP BY payment_method
        ");
        $stmt->execute($params);
        $paymentBreakdown = $stmt->fetchAll();

        return [
            'total_revenue'     => (float)$summary['total_revenue'],
            'total_sales'       => (int)$summary['total_sales'],
            'service_breakdown' => $serviceBreakdown,
            'payment_breakdown' => $paymentBreakdown,
        ];
    }
}

