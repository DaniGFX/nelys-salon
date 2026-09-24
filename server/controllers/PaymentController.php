<?php
/**
 * Nely's Salon Management System
 * Payment Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/helpers/Sanitizer.php';
require_once dirname(__DIR__) . '/models/Payment.php';
require_once dirname(__DIR__) . '/models/Service.php';
require_once dirname(__DIR__) . '/models/CustomerProfile.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';

class PaymentController {
    public function index(): void {
        RoleMiddleware::requireAdmin();

        $payments = Payment::allWithDetails();
        $metrics = Payment::getSummaryMetrics();
        $services = Service::all(true);
        $customers = CustomerProfile::allWithMetrics();

        Response::success([
            'payments'  => $payments,
            'metrics'   => $metrics,
            'services'  => $services,
            'customers' => $customers
        ]);
    }

    public function show(int $id): void {
        RoleMiddleware::requireAdmin();

        $payment = Payment::findByIdWithDetails($id);
        if (!$payment) {
            Response::notFound('Payment transaction not found.');
        }

        Response::success($payment);
    }

    public function store(): void {
        RoleMiddleware::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $validator = Validator::make($input, [
            'amount' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        $id = Payment::create($input);
        $created = Payment::findByIdWithDetails($id);
        Response::success($created, 'Payment recorded successfully.', 201);
    }

    public function update(int $id): void {
        RoleMiddleware::requireAdmin();

        $payment = Payment::findByIdWithDetails($id);
        if (!$payment) {
            Response::notFound('Payment transaction not found.');
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        Payment::update($id, $input);
        $updated = Payment::findByIdWithDetails($id);
        Response::success($updated, 'Payment updated successfully.');
    }

    public function refund(int $id): void {
        RoleMiddleware::requireAdmin();

        $payment = Payment::findByIdWithDetails($id);
        if (!$payment) {
            Response::notFound('Payment transaction not found.');
        }

        Payment::refund($id);
        $updated = Payment::findByIdWithDetails($id);
        Response::success($updated, 'Payment marked as refunded.');
    }
}
