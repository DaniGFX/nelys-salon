<?php
/**
 * Nely's Salon Management System
 * Staff Model
 */

require_once dirname(__DIR__) . '/config/database.php';
require_once __DIR__ . '/Service.php';

class Staff {
    private static bool $schemaChecked = false;

    public static function ensureSchema(): void {
        if (self::$schemaChecked) return;
        self::$schemaChecked = true;
        try {
            $pdo = Database::getConnection();
            
            // Ensure table exists
            $pdo->exec("CREATE TABLE IF NOT EXISTS `staff` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `name` VARCHAR(100) NOT NULL,
                `role` VARCHAR(100) NOT NULL DEFAULT 'Salon Staff',
                `specialties` VARCHAR(255) NULL,
                `avatar` VARCHAR(255) NULL DEFAULT 'director.jpg',
                `is_active` TINYINT(1) DEFAULT 1,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

            // Ensure all columns exist on Railway
            try { $pdo->exec("ALTER TABLE `staff` ADD COLUMN `full_name` VARCHAR(150) NULL AFTER `name`"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `staff` ADD COLUMN `phone` VARCHAR(50) NULL AFTER `role`"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `staff` ADD COLUMN `email` VARCHAR(100) NULL AFTER `phone`"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `staff` ADD COLUMN `address` VARCHAR(255) NULL AFTER `email`"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `staff` ADD COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'Active' AFTER `is_active`"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `staff` ADD COLUMN `availability` VARCHAR(50) NOT NULL DEFAULT 'Available' AFTER `status`"); } catch (Throwable $e) {}
            try { $pdo->exec("ALTER TABLE `staff` ADD COLUMN `schedule` TEXT NULL AFTER `availability`"); } catch (Throwable $e) {}

            // Seed default staff members if empty
            $count = (int)$pdo->query("SELECT COUNT(*) FROM `staff`")->fetchColumn();
            if ($count === 0) {
                $defaultSchedule = json_encode([
                    'Monday'    => '9:00 AM – 6:00 PM',
                    'Tuesday'   => '9:00 AM – 6:00 PM',
                    'Wednesday' => '9:00 AM – 6:00 PM',
                    'Thursday'  => '9:00 AM – 6:00 PM',
                    'Friday'    => '9:00 AM – 6:00 PM',
                    'Saturday'  => '9:00 AM – 6:00 PM',
                    'Sunday'    => 'Day Off'
                ]);

                $seedStmt = $pdo->prepare("
                    INSERT INTO `staff` (`id`, `name`, `full_name`, `role`, `phone`, `email`, `address`, `specialties`, `avatar`, `is_active`, `status`, `availability`, `schedule`)
                    VALUES (:id, :name, :full_name, :role, :phone, :email, :address, :specialties, :avatar, 1, 'Active', 'Available', :schedule)
                    ON DUPLICATE KEY UPDATE `name` = VALUES(`name`)
                ");

                $seedStmt->execute([
                    ':id'          => 1,
                    ':name'        => 'Nely',
                    ':full_name'   => 'Nely P. Dimaculangan',
                    ':role'        => 'Master Stylist / Director',
                    ':phone'       => '0917 123 4567',
                    ':email'       => 'nely@nelyssalon.com',
                    ':address'     => 'Lagro, Quezon City',
                    ':specialties' => 'Hair Coloring, Rebonding, Precision Cuts',
                    ':avatar'      => 'director.jpg',
                    ':schedule'    => $defaultSchedule
                ]);

                $seedStmt->execute([
                    ':id'          => 2,
                    ':name'        => 'Ana',
                    ':full_name'   => 'Ana Marie Ramos',
                    ':role'        => 'Senior Nail Artist & Stylist',
                    ':phone'       => '0917 234 5678',
                    ':email'       => 'ana@nelyssalon.com',
                    ':address'     => 'Fairview, Quezon City',
                    ':specialties' => 'Nail Art, Gel Manicure/Pedicure, Hair Treatments',
                    ':avatar'      => 'sculptor.jpg',
                    ':schedule'    => $defaultSchedule
                ]);

                $seedStmt->execute([
                    ':id'          => 3,
                    ':name'        => 'Elena',
                    ':full_name'   => 'Elena Cruz',
                    ':role'        => 'Spa & Treatment Specialist',
                    ':phone'       => '0917 345 6789',
                    ':email'       => 'elena@nelyssalon.com',
                    ':address'     => 'Novaliches, Quezon City',
                    ':specialties' => 'Footspa, Deep Conditioning, Keratin Therapy',
                    ':avatar'      => 'spa-specialist.jpg',
                    ':schedule'    => $defaultSchedule
                ]);
            }
        } catch (Throwable $e) {}
    }

    public static function all(bool $activeOnly = false): array {
        self::ensureSchema();
        $pdo = Database::getConnection();
        try {
            $sql = "SELECT s.*, 
                    (SELECT COUNT(*) FROM bookings b WHERE b.staff_id = s.id) AS total_appointments,
                    (SELECT COUNT(*) FROM bookings b WHERE b.staff_id = s.id AND b.status = 'completed') AS completed_appointments
                    FROM staff s";
            
            if ($activeOnly) {
                $sql .= " WHERE (s.is_active = 1 OR s.is_active IS NULL) AND (s.status = 'Active' OR s.status IS NULL)";
            }
            
            $sql .= " ORDER BY s.id ASC";
            return $pdo->query($sql)->fetchAll();
        } catch (Throwable $e) {
            return [];
        }
    }

    public static function getSummaryMetrics(): array {
        self::ensureSchema();
        $pdo = Database::getConnection();
        try {
            $stmt = $pdo->query("SELECT id, status, is_active, availability, schedule FROM staff");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $total = count($rows);
            $active = 0;
            $onLeave = 0;
            $inactive = 0;

            $dayOfWeek = date('l');

            foreach ($rows as $s) {
                $isArchived = ($s['status'] === 'Inactive') || (isset($s['is_active']) && (int)$s['is_active'] === 0);
                if ($isArchived) {
                    $inactive++;
                    continue;
                }

                $avail = strtolower(trim($s['availability'] ?? ''));
                $status = strtolower(trim($s['status'] ?? ''));

                // Check schedule for today
                $schedIsDayOff = false;
                if (!empty($s['schedule'])) {
                    $sched = json_decode($s['schedule'], true);
                    if (is_array($sched) && isset($sched[$dayOfWeek])) {
                        $shift = strtolower(trim($sched[$dayOfWeek]));
                        if ($shift === 'day off' || str_contains($shift, 'off') || str_contains($shift, 'leave')) {
                            $schedIsDayOff = true;
                        }
                    }
                }

                $isOnLeave = ($status === 'on leave')
                    || ($avail === 'on leave')
                    || ($avail === 'day off')
                    || ($avail === 'off-duty')
                    || $schedIsDayOff;

                if ($isOnLeave) {
                    $onLeave++;
                } else {
                    $active++;
                }
            }

            return [
                'total'    => $total,
                'active'   => $active,
                'on_leave' => $onLeave,
                'inactive' => $inactive
            ];
        } catch (Throwable $e) {
            return [
                'total'    => 0,
                'active'   => 0,
                'on_leave' => 0,
                'inactive' => 0
            ];
        }
    }

    public static function findById(int $id): ?array {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM staff WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $staff = $stmt->fetch();
        return $staff ?: null;
    }

    public static function findWithDetails(int $id): ?array {
        $staff = self::findById($id);
        if (!$staff) return null;

        // Parse specializations
        $specialties = [];
        if (!empty($staff['specialties'])) {
            if (is_array($staff['specialties'])) {
                $specialties = $staff['specialties'];
            } else {
                $specialties = array_map('trim', explode(',', $staff['specialties']));
            }
        }
        $staff['specializations_list'] = array_values(array_filter($specialties));

        // Parse schedule
        $schedule = [];
        if (!empty($staff['schedule'])) {
            $decoded = json_decode($staff['schedule'], true);
            if (is_array($decoded)) {
                $schedule = $decoded;
            }
        }
        if (empty($schedule)) {
            $schedule = [
                'Monday'    => '9:00 AM – 6:00 PM',
                'Tuesday'   => '9:00 AM – 6:00 PM',
                'Wednesday' => '9:00 AM – 6:00 PM',
                'Thursday'  => '9:00 AM – 6:00 PM',
                'Friday'    => '9:00 AM – 6:00 PM',
                'Saturday'  => '9:00 AM – 6:00 PM',
                'Sunday'    => 'Day Off'
            ];
        }
        $staff['schedule_parsed'] = $schedule;

        // Fetch assigned services with pricing
        $allServices = Service::all();
        $assignedServices = [];
        foreach ($allServices as $svc) {
            foreach ($staff['specializations_list'] as $spec) {
                if (stripos($svc['name'], $spec) !== false || stripos($spec, $svc['name']) !== false || (isset($svc['code']) && stripos($spec, $svc['code']) !== false)) {
                    $assignedServices[] = [
                        'id' => $svc['id'],
                        'name' => $svc['name'],
                        'category' => $svc['category'],
                        'price' => $svc['price'],
                        'duration' => $svc['duration_minutes']
                    ];
                    break;
                }
            }
        }
        $staff['assigned_services'] = $assignedServices;

        return $staff;
    }

    public static function create(array $data): int {
        $pdo = Database::getConnection();

        $name = trim($data['name'] ?? '');
        $fullName = !empty($data['full_name']) ? trim($data['full_name']) : $name;
        $role = !empty($data['role']) ? trim($data['role']) : (!empty($data['position']) ? trim($data['position']) : 'Salon Staff');
        $phone = trim($data['phone'] ?? '');
        $email = trim($data['email'] ?? '');
        $address = trim($data['address'] ?? '');

        // Handle specializations
        $specialties = '';
        if (isset($data['specialties'])) {
            if (is_array($data['specialties'])) {
                $specialties = implode(', ', array_filter(array_map('trim', $data['specialties'])));
            } else {
                $specialties = trim($data['specialties']);
            }
        } elseif (isset($data['specializations'])) {
            if (is_array($data['specializations'])) {
                $specialties = implode(', ', array_filter(array_map('trim', $data['specializations'])));
            } else {
                $specialties = trim($data['specializations']);
            }
        }

        $avatar = $data['avatar'] ?? 'director.jpg';
        $status = $data['status'] ?? 'Active';
        $isActive = ($status === 'Inactive') ? 0 : 1;
        $availability = $data['availability'] ?? 'Available';

        // Handle schedule
        $schedule = null;
        if (isset($data['schedule'])) {
            $schedule = is_array($data['schedule']) ? json_encode($data['schedule']) : $data['schedule'];
        } else {
            $startTime = $data['start_time'] ?? '9:00 AM';
            $endTime = $data['end_time'] ?? '6:00 PM';
            $defaultShift = "{$startTime} – {$endTime}";
            $schedule = json_encode([
                'Monday'    => $defaultShift,
                'Tuesday'   => $defaultShift,
                'Wednesday' => $defaultShift,
                'Thursday'  => $defaultShift,
                'Friday'    => $defaultShift,
                'Saturday'  => $defaultShift,
                'Sunday'    => 'Day Off'
            ]);
        }

        $stmt = $pdo->prepare("
            INSERT INTO staff (name, full_name, role, phone, email, address, specialties, avatar, is_active, status, availability, schedule)
            VALUES (:name, :full_name, :role, :phone, :email, :address, :specialties, :avatar, :is_active, :status, :availability, :schedule)
        ");

        $stmt->execute([
            'name'         => $name,
            'full_name'    => $fullName,
            'role'         => $role,
            'phone'        => $phone,
            'email'        => $email,
            'address'      => $address,
            'specialties'  => $specialties,
            'avatar'       => $avatar,
            'is_active'    => $isActive,
            'status'       => $status,
            'availability' => $availability,
            'schedule'     => $schedule,
        ]);

        return (int)$pdo->lastInsertId();
    }

    public static function update(int $id, array $data): bool {
        $pdo = Database::getConnection();

        $name = trim($data['name'] ?? '');
        $fullName = !empty($data['full_name']) ? trim($data['full_name']) : $name;
        $role = !empty($data['role']) ? trim($data['role']) : (!empty($data['position']) ? trim($data['position']) : 'Salon Staff');
        $phone = trim($data['phone'] ?? '');
        $email = trim($data['email'] ?? '');
        $address = trim($data['address'] ?? '');

        // Handle specializations
        $specialties = '';
        if (isset($data['specialties'])) {
            if (is_array($data['specialties'])) {
                $specialties = implode(', ', array_filter(array_map('trim', $data['specialties'])));
            } else {
                $specialties = trim($data['specialties']);
            }
        } elseif (isset($data['specializations'])) {
            if (is_array($data['specializations'])) {
                $specialties = implode(', ', array_filter(array_map('trim', $data['specializations'])));
            } else {
                $specialties = trim($data['specializations']);
            }
        }

        $status = $data['status'] ?? 'Active';
        $isActive = ($status === 'Inactive') ? 0 : 1;
        $availability = $data['availability'] ?? 'Available';

        // Handle schedule
        $schedule = null;
        if (isset($data['schedule'])) {
            $schedule = is_array($data['schedule']) ? json_encode($data['schedule']) : $data['schedule'];
        }

        $sql = "UPDATE staff SET 
                name = :name,
                full_name = :full_name,
                role = :role,
                phone = :phone,
                email = :email,
                address = :address,
                specialties = :specialties,
                status = :status,
                is_active = :is_active,
                availability = :availability";

        $params = [
            'name'         => $name,
            'full_name'    => $fullName,
            'role'         => $role,
            'phone'        => $phone,
            'email'        => $email,
            'address'      => $address,
            'specialties'  => $specialties,
            'status'       => $status,
            'is_active'    => $isActive,
            'availability' => $availability,
            'id'           => $id
        ];

        if ($schedule !== null) {
            $sql .= ", schedule = :schedule";
            $params['schedule'] = $schedule;
        }

        $sql .= " WHERE id = :id";

        $stmt = $pdo->prepare($sql);
        return $stmt->execute($params);
    }

    public static function updateAvailability(int $id, string $availability): bool {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE staff SET availability = :avail WHERE id = :id");
        return $stmt->execute([
            'avail' => $availability,
            'id'    => $id
        ]);
    }

    public static function delete(int $id): array {
        $pdo = Database::getConnection();

        // Check if bookings are associated
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM bookings WHERE staff_id = :id AND status IN ('pending', 'confirmed')");
        $stmt->execute(['id' => $id]);
        $activeBookings = (int)$stmt->fetchColumn();

        if ($activeBookings > 0) {
            return [
                'success' => false,
                'message' => "Cannot remove staff member because they currently have {$activeBookings} upcoming/active appointment(s). Please reassign appointments first or set their status to Inactive."
            ];
        }

        // Safe delete or nullify past completed bookings
        $pdo->prepare("UPDATE bookings SET staff_id = NULL WHERE staff_id = :id")->execute(['id' => $id]);
        $stmt = $pdo->prepare("DELETE FROM staff WHERE id = :id");
        $deleted = $stmt->execute(['id' => $id]);

        return [
            'success' => $deleted,
            'message' => $deleted ? 'Staff member removed successfully.' : 'Failed to remove staff member.'
        ];
    }
}
