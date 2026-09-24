<?php
/**
 * Nely's Salon Management System
 * User Model
 */

require_once dirname(__DIR__) . '/config/database.php';

class User {
    public static function findById(int $id): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT id, email, phone, role, created_at, updated_at FROM users WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public static function findByEmail(string $email): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        return $stmt->fetch() ?: null;
    }

    public static function findByPhone(string $phone): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM users WHERE phone = :phone LIMIT 1");
        $stmt->execute(['phone' => $phone]);
        return $stmt->fetch() ?: null;
    }

    public static function create(string $email, string $phone, string $passwordHash, string $role = 'customer'): int {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO users (email, phone, password_hash, role)
            VALUES (:email, :phone, :password_hash, :role)
        ");
        $stmt->execute([
            'email'         => $email,
            'phone'         => $phone,
            'password_hash' => $passwordHash,
            'role'          => $role,
        ]);

        return (int)$pdo->lastInsertId();
    }

    public static function updatePassword(int $userId, string $passwordHash): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE users SET password_hash = :hash WHERE id = :id");
        return $stmt->execute(['hash' => $passwordHash, 'id' => $userId]);
    }

    public static function all(): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("SELECT id, email, phone, role, created_at, updated_at FROM users ORDER BY id ASC");
        return $stmt->fetchAll();
    }
}
