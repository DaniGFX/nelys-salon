<?php
/**
 * Nely's Salon Management System
 * Business Settings Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Sanitizer.php';
require_once dirname(__DIR__) . '/models/Setting.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';

class SettingsController {
    public function index(): void {
        $settings = Setting::all();
        Response::success($settings);
    }

    public function update(): void {
        RoleMiddleware::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        foreach ($input as $key => $val) {
            Setting::set($key, (string)$val);
        }

        Response::success(Setting::all(), 'Settings updated successfully.');
    }
}
