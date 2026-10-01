<?php
/**
 * Nely's Salon Management System
 * Availability Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/services/AvailabilityService.php';

class AvailabilityController {
    public function slots(): void {
        $date = $_GET['date'] ?? date('Y-m-d');
        $serviceId = !empty($_GET['service_id']) ? (int)$_GET['service_id'] : null;
        $staffId = !empty($_GET['staff_id']) ? (int)$_GET['staff_id'] : null;

        $validator = Validator::make(['date' => $date], ['date' => 'required|date']);
        if ($validator->fails()) {
            Response::error('Invalid date format.', 422, $validator->errors());
        }

        $data = AvailabilityService::getAvailabilityData($date, $serviceId, $staffId);
        Response::success($data);
    }
}
