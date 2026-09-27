<?php
/**
 * Nely's Salon Management System
 * Secure File Upload & Attachment Helper
 */

class FileUpload {
    private const UPLOAD_BASE_DIR = 'uploads/messages/';
    private const MAX_SIZE_BYTES = 10485760; // 10 MB
    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt'];

    private static function getStorageDir(): string {
        $root = dirname(__DIR__, 2);
        $targetDir = $root . '/' . self::UPLOAD_BASE_DIR;
        if (!is_dir($targetDir)) {
            @mkdir($targetDir, 0755, true);
        }
        return $targetDir;
    }

    /**
     * Process and store an attachment (either from $_FILES or base64 data URL)
     * Returns ['name' => string, 'url' => string] or null on failure/empty
     */
    public static function saveAttachment($rawAttachment, ?string $originalName = null): ?array {
        if (empty($rawAttachment)) {
            return null;
        }

        $storageDir = self::getStorageDir();

        // 1. If it is already an uploaded path or external URL, keep as is
        if (is_string($rawAttachment) && (str_starts_with($rawAttachment, '/uploads/') || str_starts_with($rawAttachment, 'http://') || str_starts_with($rawAttachment, 'https://'))) {
            return [
                'name' => $originalName ?: basename($rawAttachment),
                'url'  => $rawAttachment
            ];
        }

        // 2. Handle Base64 Data URL (e.g., data:image/png;base64,iVBORw...)
        if (is_string($rawAttachment) && str_starts_with($rawAttachment, 'data:')) {
            if (!preg_match('/^data:([a-zA-Z0-9\/\.\-\+]+);base64,(.+)$/', $rawAttachment, $matches)) {
                return null;
            }

            $mimeType = strtolower($matches[1]);
            $base64Data = $matches[2];
            $binaryData = base64_decode($base64Data);

            if ($binaryData === false || strlen($binaryData) > self::MAX_SIZE_BYTES) {
                return null;
            }

            $ext = self::getExtensionFromMime($mimeType, $originalName);
            if (!in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
                return null;
            }

            $filename = 'att_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
            $destination = $storageDir . $filename;

            if (file_put_contents($destination, $binaryData) === false) {
                return null;
            }

            $cleanName = $originalName ? preg_replace('/[^a-zA-Z0-9._\- ]/', '', basename($originalName)) : $filename;

            return [
                'name' => $cleanName ?: $filename,
                'url'  => '/' . self::UPLOAD_BASE_DIR . $filename
            ];
        }

        // 3. Handle $_FILES array
        if (is_array($rawAttachment) && isset($rawAttachment['tmp_name'])) {
            if ($rawAttachment['error'] !== UPLOAD_ERR_OK) {
                return null;
            }

            if ($rawAttachment['size'] > self::MAX_SIZE_BYTES) {
                return null;
            }

            $sourceName = $originalName ?: ($rawAttachment['name'] ?? 'attachment');
            $ext = strtolower(pathinfo($sourceName, PATHINFO_EXTENSION));

            if (!in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
                return null;
            }

            $filename = 'att_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
            $destination = $storageDir . $filename;

            if (!move_uploaded_file($rawAttachment['tmp_name'], $destination)) {
                return null;
            }

            $cleanName = preg_replace('/[^a-zA-Z0-9._\- ]/', '', basename($sourceName));

            return [
                'name' => $cleanName ?: $filename,
                'url'  => '/' . self::UPLOAD_BASE_DIR . $filename
            ];
        }

        return null;
    }

    private static function getExtensionFromMime(string $mime, ?string $originalName): string {
        $map = [
            'image/jpeg'        => 'jpg',
            'image/jpg'         => 'jpg',
            'image/png'         => 'png',
            'image/webp'        => 'webp',
            'image/gif'         => 'gif',
            'application/pdf'   => 'pdf',
            'text/plain'        => 'txt',
            'application/msword'=> 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx'
        ];

        if (isset($map[$mime])) {
            return $map[$mime];
        }

        if ($originalName) {
            $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            if (!empty($ext)) {
                return $ext;
            }
        }

        return 'bin';
    }
}
