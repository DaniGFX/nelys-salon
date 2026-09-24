<?php
/**
 * Nely's Salon Management System
 * Global Application Constants
 */

// User Roles
define('ROLE_ADMIN', 'admin');
define('ROLE_CUSTOMER', 'customer');

// Booking Statuses
define('BOOKING_STATUS_PENDING', 'pending');
define('BOOKING_STATUS_CONFIRMED', 'confirmed');
define('BOOKING_STATUS_COMPLETED', 'completed');
define('BOOKING_STATUS_CANCELLED', 'cancelled');
define('BOOKING_STATUS_NO_SHOW', 'no_show');

// Visit Types
define('VISIT_TYPE_SALON', 'salon');
define('VISIT_TYPE_HOME', 'home');

// Payment Methods
define('PAYMENT_METHOD_CASH', 'cash');
define('PAYMENT_METHOD_GCASH', 'gcash');
define('PAYMENT_METHOD_BANK_TRANSFER', 'bank_transfer');

// Payment Statuses
define('PAYMENT_STATUS_PENDING', 'pending');
define('PAYMENT_STATUS_PAID', 'paid');
define('PAYMENT_STATUS_PARTIAL', 'partial');
define('PAYMENT_STATUS_REFUNDED', 'refunded');

// Inventory Movement Types
define('INVENTORY_STOCK_IN', 'stock_in');
define('INVENTORY_STOCK_OUT', 'stock_out');
define('INVENTORY_DAMAGED', 'damaged');
define('INVENTORY_ADJUSTMENT', 'adjustment');

// Notification Channels & Statuses
define('NOTIFICATION_CHANNEL_EMAIL', 'email');
define('NOTIFICATION_CHANNEL_SMS', 'sms');
define('NOTIFICATION_STATUS_PENDING', 'pending');
define('NOTIFICATION_STATUS_SENT', 'sent');
define('NOTIFICATION_STATUS_FAILED', 'failed');
