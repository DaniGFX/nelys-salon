<?php
/**
 * Nely's Salon Management System
 * Inventory & Stock Controller
 */

require_once dirname(__DIR__) . '/helpers/Response.php';
require_once dirname(__DIR__) . '/helpers/Validator.php';
require_once dirname(__DIR__) . '/helpers/Sanitizer.php';
require_once dirname(__DIR__) . '/models/Product.php';
require_once dirname(__DIR__) . '/models/InventoryMovement.php';
require_once dirname(__DIR__) . '/services/InventoryService.php';
require_once dirname(__DIR__) . '/middleware/RoleMiddleware.php';

class InventoryController {
    public function index(): void {
        RoleMiddleware::requireAdmin();

        $products = Product::all();
        $lowStock = InventoryService::getLowStockAlerts();
        $recentMovements = InventoryMovement::recent(20);

        Response::success([
            'products'         => $products,
            'low_stock_alerts' => $lowStock,
            'recent_movements' => $recentMovements,
        ]);
    }

    public function store(): void {
        RoleMiddleware::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $validator = Validator::make($input, [
            'sku'           => 'required|min:3|max:50',
            'name'          => 'required|min:2|max:150',
            'category'      => 'required',
            'stock_quantity'=> 'required|numeric',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        $id = Product::create($input);
        Response::success(Product::findById($id), 'Product created successfully.', 201);
    }

    public function movement(): void {
        $admin = RoleMiddleware::requireAdmin();

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $input = Sanitizer::cleanArray($input);

        $validator = Validator::make($input, [
            'product_id'    => 'required|numeric',
            'movement_type' => 'required|in:stock_in,stock_out,damaged,adjustment',
            'quantity'      => 'required|numeric',
        ]);

        if ($validator->fails()) {
            Response::error('Validation failed', 422, $validator->errors());
        }

        $productId = (int)$input['product_id'];
        $product = Product::findById($productId);
        if (!$product) {
            Response::notFound('Product not found.');
        }

        $qty = (int)$input['quantity'];
        if (in_array($input['movement_type'], ['stock_out', 'damaged'], true) && $product['stock_quantity'] < $qty) {
            Response::error("Insufficient stock. Available: {$product['stock_quantity']}", 400);
        }

        $success = InventoryService::recordMovement(
            $productId,
            $input['movement_type'],
            $qty,
            $input['reason'] ?? null,
            $admin['id']
        );

        if (!$success) {
            Response::serverError('Failed to record stock movement.');
        }

        Response::success(Product::findById($productId), 'Inventory movement recorded successfully.');
    }
}
