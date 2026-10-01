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

    public static function update(int $userId, array $data): bool {
        $pdo = Database::getConnection();
        $fields = [];
        $params = ['id' => $userId];

        if (isset($data['email'])) {
            $fields[] = "email = :email";
            $params['email'] = strtolower(trim($data['email']));
        }
        if (isset($data['phone'])) {
            $fields[] = "phone = :phone";
            $params['phone'] = trim($data['phone']);
        }
        if (isset($data['role'])) {
            $fields[] = "role = :role";
            $params['role'] = trim($data['role']);
        }
        if (isset($data['password_hash'])) {
            $fields[] = "password_hash = :password_hash";
            $params['password_hash'] = $data['password_hash'];
        }

        if (empty($fields)) return false;

        $sql = "UPDATE users SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public static function all(): array {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("SELECT id, email, phone, role, created_at, updated_at FROM users ORDER BY id ASC");
        return $stmt->fetchAll();
    }
}
