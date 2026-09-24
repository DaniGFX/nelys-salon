<?php
/**
 * Nely's Salon Management System
 * Sales & Financial Report Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/models/Sale.php';
require_once dirname(__DIR__) . '/services/SalesService.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';

class SalesController {
    public function report(): void {
        RoleMiddleware::requireAdmin();

        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;

        $summary = SalesService::getSummary($startDate, $endDate);
        $recentSales = Sale::all(30);

        Response::success([
            'summary'      => $summary,
            'recent_sales' => $recentSales,
        ]);
    }

    public function export(): void {
        RoleMiddleware::requireAdmin();

        $sales = Sale::all(1000);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="nelys_salon_sales_' . date('Ymd_His') . '.csv"');

        $out = fopen('php://output', 'w');
        fputcsv($out, ['Transaction ID', 'Booking ID', 'Service Name', 'Customer Name', 'Amount (PHP)', 'Payment Method', 'Date']);

        foreach ($sales as $sale) {
            fputcsv($out, [
                $sale['id'],
                $sale['booking_id'] ?? 'Walk-In',
                $sale['service_name'],
                $sale['customer_name'],
                $sale['amount'],
                $sale['payment_method'],
                $sale['transaction_date']
            ]);
        }
        fclose($out);
        exit;
    }
}
