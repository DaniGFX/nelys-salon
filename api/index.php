<?php
/**
 * Nely's Salon Management System
 * API Public Gateway Entry Point
 */

require_once dirname(__DIR__) . '/server/routes/api.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri    = $_SERVER['REQUEST_URI'] ?? '/';

Router::dispatch($method, $uri);
