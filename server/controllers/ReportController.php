<?php
/**
 * Nely's Salon Management System
 * Report Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/models/Report.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';

class ReportController {
    public function index(): void {
        RoleMiddleware::requireAdmin();

        $range = $_GET['range'] ?? 'this_month';
        $reportData = Report::generate($range);

        Response::success($reportData);
    }

    public function export(): void {
        RoleMiddleware::requireAdmin();

        $range = $_GET['range'] ?? 'this_month';
        $type = $_GET['type'] ?? 'Complete Salon Report';

        $reportData = Report::generate($range);

        $filename = 'Nelys_Salon_' . str_replace(' ', '_', $type) . '_' . date('Ymd_His') . '.csv';

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        $out = fopen('php://output', 'w');

        // Header metadata
        fputcsv($out, ["NELY'S SALON MANAGEMENT SYSTEM - OFFICIAL REPORT"]);
        fputcsv($out, ["Report Type", $type]);
        fputcsv($out, ["Date Range", $reportData['label']]);
        fputcsv($out, ["Generated On", date('F j, Y — g:i A')]);
        fputcsv($out, []);

        // Summary
        fputcsv($out, ["EXECUTIVE SUMMARY"]);
        fputcsv($out, ["Total Revenue (PHP)", $reportData['summary']['total_revenue']]);
        fputcsv($out, ["Revenue Growth", $reportData['summary']['revenue_growth']]);
        fputcsv($out, ["Total Appointments", $reportData['summary']['total_appointments']]);
        fputcsv($out, ["Appointment Growth", $reportData['summary']['appointment_growth']]);
        fputcsv($out, ["Total Customers", $reportData['summary']['total_customers']]);
        fputcsv($out, ["New Customers", $reportData['summary']['new_customers']]);
        fputcsv($out, ["Completed Services", $reportData['summary']['completed_services']]);
        fputcsv($out, ["Completion Rate", $reportData['summary']['completion_rate']]);
        fputcsv($out, []);

        if ($type === 'Service Report' || $type === 'Complete Salon Report') {
            fputcsv($out, ["SERVICE REVENUE BREAKDOWN"]);
            fputcsv($out, ["Service", "Price", "Bookings", "Total Revenue (PHP)"]);
            foreach ($reportData['service_breakdown'] as $row) {
                fputcsv($out, [
                    $row['service'],
                    $row['priceDisplay'],
                    $row['bookings'],
                    $row['revenue']
                ]);
            }
            fputcsv($out, []);
        }

        if ($type === 'Staff Report' || $type === 'Complete Salon Report') {
            fputcsv($out, ["STAFF PERFORMANCE"]);
            fputcsv($out, ["Staff Name", "Role", "Appointments", "Completed", "Revenue (PHP)"]);
            foreach ($reportData['staff_performance'] as $row) {
                fputcsv($out, [
                    $row['staff'],
                    $row['role'],
                    $row['appointments'],
                    $row['completed'],
                    $row['revenue']
                ]);
            }
            fputcsv($out, []);
        }

        if ($type === 'Customer Report' || $type === 'Complete Salon Report') {
            fputcsv($out, ["CUSTOMER STATISTICS"]);
            fputcsv($out, ["Metric", "Count"]);
            fputcsv($out, ["Total Customers", $reportData['customer_stats']['total']]);
            fputcsv($out, ["New Customers", $reportData['customer_stats']['new']]);
            fputcsv($out, ["Returning Customers", $reportData['customer_stats']['returning']]);
            fputcsv($out, ["Inactive Customers", $reportData['customer_stats']['inactive']]);
            fputcsv($out, ["Retention Rate", $reportData['customer_stats']['retention_rate'] . '%']);
            fputcsv($out, []);
        }

        fclose($out);
        exit;
    }
}
