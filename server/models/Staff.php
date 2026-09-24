<?php
/**
 * Nely's Salon Management System
 * Staff Model
 */

require_once dirname(__DIR__) . '/config/database.php';
require_once __DIR__ . '/Service.php';

class Staff {
    public static function all(bool $activeOnly = false): array {
        $pdo = Database::getConnection();
        $sql = "SELECT s.*, 
                COUNT(b.id) AS total_appointments,
                SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) AS completed_appointments
                FROM staff s
                LEFT JOIN bookings b ON b.staff_id = s.id";
        
        if ($activeOnly) {
            $sql .= " WHERE s.is_active = 1 AND s.status = 'Active'";
        }
        
        $sql .= " GROUP BY s.id ORDER BY s.id ASC";
        return $pdo->query($sql)->fetchAll();
    }

    public static function getSummaryMetrics(): array {
        $pdo = Database::getConnection();
        
        $total = (int)$pdo->query("SELECT COUNT(*) FROM staff")->fetchColumn();
        $active = (int)$pdo->query("SELECT COUNT(*) FROM staff WHERE status = 'Active' AND is_active = 1")->fetchColumn();
        $onLeave = (int)$pdo->query("SELECT COUNT(*) FROM staff WHERE status = 'On Leave'")->fetchColumn();
        $inactive = (int)$pdo->query("SELECT COUNT(*) FROM staff WHERE status = 'Inactive' OR is_active = 0")->fetchColumn();

        return [
            'total'    => $total,
            'active'   => $active,
            'on_leave' => $onLeave,
            'inactive' => $inactive
        ];
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
