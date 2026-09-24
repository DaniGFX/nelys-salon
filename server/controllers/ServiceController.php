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
        $activeOnly = !isset($_GET['all']) || $_GET['all'] !== 'true';
        $services = Service::all($activeOnly);
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
            'code'             => 'required|min:2|max:50',
            'name'             => 'required|min:2|max:150',
            'category'         => 'required',
            'price'            => 'required|numeric',
            'duration_minutes' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        if (Service::findByCode($input['code'])) {
            Response::error('A service with this code already exists.', 409);
        }

        $id = Service::create($input);
        Response::success(Service::findById($id), 'Service created successfully.', 201);
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
            'price'            => 'required|numeric',
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
}
