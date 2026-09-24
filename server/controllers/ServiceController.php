<?php
/**
 * Nely's Salon Management System
 * Service Catalog Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/helpers/Sanitizer.php';
require_once dirname(__DIR__) . '/models/Service.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';

class ServiceController {
    public function index(): void {
        $activeOnly = isset($_GET['active_only']) && $_GET['active_only'] === 'true';
        $services = Service::all($activeOnly);
        $metrics = Service::getSummaryMetrics();

        // If 'structured' or 'all' or 'metrics' is requested
        if (isset($_GET['all']) || isset($_GET['metrics']) || isset($_GET['stats'])) {
            Response::success([
                'services' => $services,
                'metrics'  => $metrics
            ]);
        }

        // Default response for compatibility
        Response::success($services);
    }

    public function show(int $id): void {
        $service = Service::findById($id);
        if (!$service) {
            Response::notFound('Service not found.');
        }
        Response::success($service);
    }

    public function store(): void {
        RoleMiddleware::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $validator = Validator::make($input, [
            'name'             => 'required|min:2|max:150',
            'category'         => 'required',
            'duration_minutes' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        if (!empty($input['code']) && Service::findByCode($input['code'])) {
            Response::error('A service with this code already exists.', 409);
        }

        $id = Service::create($input);
        $created = Service::findById($id);
        Response::success($created, 'Service created successfully.', 201);
    }

    public function update(int $id): void {
        RoleMiddleware::requireAdmin();

        $service = Service::findById($id);
        if (!$service) {
            Response::notFound('Service not found.');
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $validator = Validator::make($input, [
            'name'             => 'required|min:2|max:150',
            'category'         => 'required',
            'duration_minutes' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        Service::update($id, $input);
        Response::success(Service::findById($id), 'Service updated successfully.');
    }

    public function toggle(int $id): void {
        RoleMiddleware::requireAdmin();

        $service = Service::findById($id);
        if (!$service) {
            Response::notFound('Service not found.');
        }

        Service::toggleActive($id);
        $updated = Service::findById($id);
        $state = $updated['is_active'] ? 'activated' : 'deactivated';
        Response::success($updated, "Service has been {$state}.");
    }

    public function destroy(int $id): void {
        RoleMiddleware::requireAdmin();

        $service = Service::findById($id);
        if (!$service) {
            Response::notFound('Service not found.');
        }

        $result = Service::delete($id);
        if (!$result['success']) {
            Response::error($result['message'], 400);
        }

        Response::success(null, $result['message']);
    }
}
