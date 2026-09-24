<?php
/**
 * Nely's Salon Management System
 * Staff Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/helpers/Sanitizer.php';
require_once dirname(__DIR__) . '/models/Staff.php';
require_once dirname(__DIR__) . '/models/Service.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';

class StaffController {
    public function index(): void {
        $activeOnly = isset($_GET['active_only']) && $_GET['active_only'] === 'true';
        $staffRaw = Staff::all($activeOnly);
        $metrics = Staff::getSummaryMetrics();
        $services = Service::all(true);

        $staffList = [];
        foreach ($staffRaw as $s) {
            $specialties = [];
            if (!empty($s['specialties'])) {
                if (is_array($s['specialties'])) {
                    $specialties = $s['specialties'];
                } else {
                    $specialties = array_map('trim', explode(',', $s['specialties']));
                }
            }
            $s['specializations_list'] = array_values(array_filter($specialties));

            $schedule = [];
            if (!empty($s['schedule'])) {
                $decoded = json_decode($s['schedule'], true);
                if (is_array($decoded)) {
                    $schedule = $decoded;
                }
            }
            $s['schedule_parsed'] = $schedule;

            $staffList[] = $s;
        }

        Response::success([
            'staff'    => $staffList,
            'metrics'  => $metrics,
            'services' => $services
        ]);
    }

    public function show(int $id): void {
        $staff = Staff::findWithDetails($id);
        if (!$staff) {
            Response::notFound('Staff member not found.');
        }
        Response::success($staff);
    }

    public function store(): void {
        RoleMiddleware::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $validator = Validator::make($input, [
            'name'  => 'required|min:2|max:100',
            'phone' => 'required|min:7|max:50',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        $id = Staff::create($input);
        $created = Staff::findWithDetails($id);
        Response::success($created, 'Staff member registered successfully.', 201);
    }

    public function update(int $id): void {
        RoleMiddleware::requireAdmin();

        $staff = Staff::findById($id);
        if (!$staff) {
            Response::notFound('Staff member not found.');
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $validator = Validator::make($input, [
            'name'  => 'required|min:2|max:100',
            'phone' => 'required|min:7|max:50',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        Staff::update($id, $input);
        $updated = Staff::findWithDetails($id);
        Response::success($updated, 'Staff member updated successfully.');
    }

    public function updateAvailability(int $id): void {
        $staff = Staff::findById($id);
        if (!$staff) {
            Response::notFound('Staff member not found.');
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $availability = trim($input['availability'] ?? '');

        $validStatuses = ['Available', 'On Break', 'In Service', 'Day Off'];
        if (!in_array($availability, $validStatuses, true)) {
            Response::error('Invalid availability status provided.', 422);
        }

        Staff::updateAvailability($id, $availability);
        $updated = Staff::findWithDetails($id);
        Response::success($updated, "Staff availability updated to {$availability}.");
    }

    public function destroy(int $id): void {
        RoleMiddleware::requireAdmin();

        $staff = Staff::findById($id);
        if (!$staff) {
            Response::notFound('Staff member not found.');
        }

        $result = Staff::delete($id);
        if (!$result['success']) {
            Response::error($result['message'], 400);
        }

        Response::success(null, $result['message']);
    }
}
