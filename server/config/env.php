<?php
/**
 * Nely's Salon Management System
 * Environment Variables Loader
 */

function loadEnv($path = null) {
    if ($path === null) {
        $path = dirname(__DIR__, 2) . '/.env';
    }

    if (!file_exists($path)) {
        return false;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        if (str_contains($line, '=')) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            // Strip surrounding quotes if present
            if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                $value = substr($value, 1, -1);
            }

            if (!array_key_exists($key, $_SERVER) && !array_key_exists($key, $_ENV)) {
                putenv("$key=$value");
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
            }
        }
    }
    return true;
}

// Auto-load on include
loadEnv();

function env($key, $default = null) {
    $val = getenv($key);
    if ($val === false) {
        return $_ENV[$key] ?? $default;
    }
    return $val;
}
