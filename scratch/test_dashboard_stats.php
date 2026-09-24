<?php
session_start();
$_SESSION['user_id'] = 1;
$_SESSION['user_role'] = 'admin';

require_once __DIR__ . '/../server/controllers/DashboardController.php';

(new DashboardController())->stats();
