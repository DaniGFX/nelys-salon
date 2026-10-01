<?php
/**
 * Nely's Salon Management System
 * Secure File Upload & Attachment Helper
 * Implements strict MIME type verification, magic-byte inspection,
 * extension whitelisting, image integrity checks, and path traversal protection.
 */

class FileUpload {
    private const UPLOAD_BASE_DIR = 'uploads/messages/';
    private const MAX_SIZE_BYTES = 10485760; // 10 MB

    private const ALLOWED_EXTENSIONS = [
        'jpg', 'jpeg', 'png', 'gif', 'webp',
        'pdf', 'txt', 'doc', 'docx'
    ];

    private const ALLOWED_MIME_MAP = [
        'image/jpeg'      => ['jpg', 'jpeg'],
        'image/png'       => ['png'],
        'image/gif'       => ['gif'],
        'image/webp'      => ['webp'],
        'application/pdf' => ['pdf'],
        'text/plain'      => ['txt'],
        'application/msword' => ['doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => ['docx'],
    ];

    private static function getStorageDir(): string {
        $root = dirname(__DIR__, 2);
        $targetDir = $root . '/' . self::UPLOAD_BASE_DIR;
        if (!is_dir($targetDir)) {
            @mkdir($targetDir, 0755, true);
        }

        // Ensure parent uploads directory has .htaccess protection
        $uploadsDir = $root . '/uploads';
        $htaccessPath = $uploadsDir . '/.htaccess';
        if (!file_exists($htaccessPath) && is_dir($uploadsDir)) {
            $htaccessContent = "# Prevent script execution in uploads directory\nOptions -Indexes -ExecCGI\nSetHandler default-handler\n<FilesMatch \"(?i)\\.(php|phtml|php3|php4|php5|php7|php8|phps|phar|cgi|pl|py|sh|bat|cmd|exe|dll|jsp|asp|aspx|shtml|htaccess|htpasswd)$\">\n  Require all denied\n</FilesMatch>\n";
            @file_put_contents($htaccessPath, $htaccessContent);
        }

        return $targetDir;
    }

    /**
     * Process and store an attachment (from $_FILES array or base64 data URL)
     * Returns ['name' => string, 'url' => string] or null on failure/invalid file
     */
    public static function saveAttachment($rawAttachment, ?string $originalName = null): ?array {
        if (empty($rawAttachment)) {
            return null;
        }

        $storageDir = self::getStorageDir();

        // Validate requested filename extension if provided
        if (!empty($originalName)) {
            $origExt = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            if (!empty($origExt) && !in_array($origExt, self::ALLOWED_EXTENSIONS, true)) {
                return null;
            }
        }

        // 1. If it is already a valid safe internal path or external URL, sanitize and return
        if (is_string($rawAttachment)) {
            $trimmed = trim($rawAttachment);
            if (str_starts_with($trimmed, '/uploads/') || str_starts_with($trimmed, 'http://') || str_starts_with($trimmed, 'https://')) {
                // Ensure no path traversal attempt in URL
                if (str_contains($trimmed, '../') || str_contains($trimmed, '..\\')) {
                    return null;
                }
                $cleanName = $originalName ? preg_replace('/[^a-zA-Z0-9._\- ]/', '', basename($originalName)) : basename($trimmed);
                return [
                    'name' => $cleanName ?: 'attachment',
                    'url'  => $trimmed
                ];
            }
        }

        // 2. Handle Base64 Data URL (e.g., data:image/png;base64,iVBORw...)
        if (is_string($rawAttachment) && str_starts_with($rawAttachment, 'data:')) {
            if (!preg_match('/^data:([a-zA-Z0-9\/\.\-\+]+);base64,(.+)$/', $rawAttachment, $matches)) {
                return null;
            }

            $declaredMime = strtolower(trim($matches[1]));
            $base64Data = $matches[2];
            $binaryData = base64_decode($base64Data, true);

            if ($binaryData === false || strlen($binaryData) === 0 || strlen($binaryData) > self::MAX_SIZE_BYTES) {
                return null;
            }

            // Inspect actual binary content using finfo buffer
            $actualMime = self::detectMimeFromBuffer($binaryData);
            if (!isset(self::ALLOWED_MIME_MAP[$actualMime])) {
                return null; // Disallowed MIME type
            }

            // If declared MIME is octet-stream/executable or not in allowed list, reject
            if (!isset(self::ALLOWED_MIME_MAP[$declaredMime]) && $declaredMime !== 'application/octet-stream') {
                return null;
            }

            // Determine canonical extension from actual MIME
            $ext = self::ALLOWED_MIME_MAP[$actualMime][0];

            // If image, verify structure integrity
            if (str_starts_with($actualMime, 'image/')) {
                if (!self::validateImageBuffer($binaryData)) {
                    return null; // Corrupted or malicious image payload
                }
            }

            $safeFilename = 'att_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
            $destination = $storageDir . $safeFilename;

            if (file_put_contents($destination, $binaryData) === false) {
                return null;
            }

            $cleanName = $originalName ? preg_replace('/[^a-zA-Z0-9._\- ]/', '', basename($originalName)) : $safeFilename;

            return [
                'name' => $cleanName ?: $safeFilename,
                'url'  => '/' . self::UPLOAD_BASE_DIR . $safeFilename
            ];
        }

        // 3. Handle $_FILES array
        if (is_array($rawAttachment) && isset($rawAttachment['tmp_name'])) {
            if ($rawAttachment['error'] !== UPLOAD_ERR_OK) {
                return null;
            }

            if (!is_uploaded_file($rawAttachment['tmp_name'])) {
                return null;
            }

            if ($rawAttachment['size'] > self::MAX_SIZE_BYTES || $rawAttachment['size'] === 0) {
                return null;
            }

            $tmpPath = $rawAttachment['tmp_name'];
            $sourceName = $originalName ?: ($rawAttachment['name'] ?? 'attachment');
            $clientExt = strtolower(pathinfo($sourceName, PATHINFO_EXTENSION));

            if (!in_array($clientExt, self::ALLOWED_EXTENSIONS, true)) {
                return null;
            }

            // Inspect actual file MIME type from magic bytes on disk
            $actualMime = self::detectMimeFromFile($tmpPath);
            if (!isset(self::ALLOWED_MIME_MAP[$actualMime])) {
                return null; // Disallowed MIME type
            }

            // Verify extension matches MIME class
            $validExtensions = self::ALLOWED_MIME_MAP[$actualMime];
            if (!in_array($clientExt, $validExtensions, true)) {
                // If extension doesn't match MIME (e.g. php named as png), use canonical extension from detected MIME
                $clientExt = $validExtensions[0];
            }

            // If image, verify with getimagesize
            if (str_starts_with($actualMime, 'image/')) {
                $imgInfo = @getimagesize($tmpPath);
                if ($imgInfo === false || empty($imgInfo[0]) || empty($imgInfo[1])) {
                    return null; // Invalid/corrupted image
                }
            }

            $safeFilename = 'att_' . time() . '_' . bin2hex(random_bytes(8)) . '.' . $clientExt;
            $destination = $storageDir . $safeFilename;

            if (!move_uploaded_file($tmpPath, $destination)) {
                return null;
            }

            $cleanName = preg_replace('/[^a-zA-Z0-9._\- ]/', '', basename($sourceName));

            return [
                'name' => $cleanName ?: $safeFilename,
                'url'  => '/' . self::UPLOAD_BASE_DIR . $safeFilename
            ];
        }

        return null;
    }

    /**
     * Alias for saveAttachment with $_FILES array
     */
    public static function saveMessageAttachment($filesArray, ?string $originalName = null): ?array {
        return self::saveAttachment($filesArray, $originalName);
    }

    /**
     * Alias for saveAttachment with Base64 URL
     */
    public static function saveBase64Attachment(string $base64Url, ?string $originalName = null): ?array {
        return self::saveAttachment($base64Url, $originalName);
    }

    /**
     * Detect MIME type from binary buffer using Fileinfo
     */
    private static function detectMimeFromBuffer(string $data): string {
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo) {
                $mime = finfo_buffer($finfo, $data);
                finfo_close($finfo);
                if (!empty($mime)) {
                    $cleanedMime = strtolower(trim($mime));
                    if ($cleanedMime === 'text/plain') {
                        // Check if text starts with executable/script signatures
                        if (str_starts_with($data, 'MZ') || str_starts_with($data, "\x7fELF") || str_starts_with($data, '#!') || preg_match('/<\?php|<\?=|class\s+[A-Za-z0-9_]+\s*\{/i', $data)) {
                            return 'application/octet-stream';
                        }
                    }
                    return $cleanedMime;
                }
            }
        }

        // Fallback byte inspection for common signatures
        if (str_starts_with($data, "\xFF\xD8\xFF")) return 'image/jpeg';
        if (str_starts_with($data, "\x89PNG\r\n\x1a\n")) return 'image/png';
        if (str_starts_with($data, "GIF87a") || str_starts_with($data, "GIF89a")) return 'image/gif';
        if (str_starts_with($data, "RIFF") && substr($data, 8, 4) === "WEBP") return 'image/webp';
        if (str_starts_with($data, "%PDF-")) return 'application/pdf';

        return 'application/octet-stream';
    }

    /**
     * Detect MIME type from file on disk using Fileinfo
     */
    private static function detectMimeFromFile(string $filePath): string {
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo) {
                $mime = finfo_file($finfo, $filePath);
                finfo_close($finfo);
                if (!empty($mime)) {
                    return strtolower(trim($mime));
                }
            }
        }

        if (function_exists('mime_content_type')) {
            $mime = mime_content_type($filePath);
            if (!empty($mime)) {
                return strtolower(trim($mime));
            }
        }

        return 'application/octet-stream';
    }

    /**
     * Validate image buffer integrity
     */
    private static function validateImageBuffer(string $binaryData): bool {
        if (function_exists('imagecreatefromstring')) {
            $img = @imagecreatefromstring($binaryData);
            if ($img !== false) {
                imagedestroy($img);
                return true;
            }
        }
        return false;
    }
}
