<?php
require_once __DIR__ . '/../server/config/database.php';
$pdo = Database::getConnection();

$defaultCustomers = [
    [
        'email' => 'maria.santos@email.com',
        'phone' => '0917 123 4567',
        'full_name' => 'Maria Santos',
        'home_address' => 'Lagro, Quezon City',
        'city' => 'Quezon City',
        'notes' => 'Prefers warm water rinse and Ana as primary stylist.',
        'created_at' => '2024-03-15 10:00:00',
        'messages' => [
            [
                'sender' => 'customer',
                'sender_name' => 'Maria Santos',
                'text' => 'Hi po! Can I move my appointment to tomorrow afternoon?',
                'status' => 'read',
                'created_at' => date('Y-m-d 10:28:00')
            ],
            [
                'sender' => 'salon',
                'sender_name' => "Nely's Salon Concierge",
                'text' => 'Hello Maria! Yes po. We have an available slot at 2:00 PM tomorrow.',
                'status' => 'read',
                'created_at' => date('Y-m-d 10:30:00')
            ],
            [
                'sender' => 'customer',
                'sender_name' => 'Maria Santos',
                'text' => 'Yes po, 2 PM is okay. Thank you!',
                'status' => 'sent', // unread for admin
                'created_at' => date('Y-m-d 10:32:00')
            ]
        ],
        'booking' => [
            'service_id' => 7, // Haircut & Trim
            'staff_id' => 2, // Ana
            'date' => date('Y-m-d', strtotime('+1 day')),
            'time' => '14:00:00',
            'price' => 250.00,
            'status' => 'confirmed'
        ]
    ],
    [
        'email' => 'angela.cruz@email.com',
        'phone' => '0918 555 1234',
        'full_name' => 'Angela Cruz',
        'home_address' => 'Fairview, Quezon City',
        'city' => 'Quezon City',
        'notes' => 'Sensitive scalp; use gentle developer formula.',
        'created_at' => '2025-01-20 09:00:00',
        'messages' => [
            [
                'sender' => 'salon',
                'sender_name' => "Nely's Salon Concierge",
                'text' => 'Hello Ms. Angela, your Brazilian Blowout booking has been confirmed for Friday 10:30 AM with Ma’am Nely.',
                'status' => 'read',
                'created_at' => date('Y-m-d 09:40:00')
            ],
            [
                'sender' => 'customer',
                'sender_name' => 'Angela Cruz',
                'text' => 'Thank you po!',
                'status' => 'read',
                'created_at' => date('Y-m-d 09:45:00')
            ]
        ],
        'booking' => [
            'service_id' => 1, // Brazilian Treatment
            'staff_id' => 1, // Nely
            'date' => date('Y-m-d', strtotime('+2 days')),
            'time' => '10:30:00',
            'price' => 1999.00,
            'status' => 'confirmed'
        ]
    ],
    [
        'email' => 'jamie.reyes@email.com',
        'phone' => '0920 987 6543',
        'full_name' => 'Jamie Reyes',
        'home_address' => 'Novaliches, Quezon City',
        'city' => 'Quezon City',
        'notes' => 'Loves aromatherapy foot scrub and gel manicure combos.',
        'created_at' => '2023-06-10 14:00:00',
        'messages' => [
            [
                'sender' => 'customer',
                'sender_name' => 'Jamie Reyes',
                'text' => 'Good afternoon po! Is Brazilian blowout still discounted this weekend?',
                'status' => 'sent', // unread
                'created_at' => date('Y-m-d 15:15:00', strtotime('-1 day'))
            ]
        ]
    ],
    [
        'email' => 'carla.delacruz@email.com',
        'phone' => '0922 345 6789',
        'full_name' => 'Carla Dela Cruz',
        'home_address' => 'Lagro, Quezon City',
        'city' => 'Quezon City',
        'notes' => 'Requested ash brown highlights.',
        'created_at' => '2024-08-11 11:00:00',
        'messages' => [
            [
                'sender' => 'customer',
                'sender_name' => 'Carla Dela Cruz',
                'text' => 'Hello po! Rescheduled my hair dye to tomorrow 3 PM.',
                'status' => 'read',
                'created_at' => date('Y-m-d 17:10:00', strtotime('-1 day'))
            ],
            [
                'sender' => 'salon',
                'sender_name' => "Nely's Salon Concierge",
                'text' => 'Confirmed po Carla! We prepared your ash brown color mix.',
                'status' => 'read',
                'created_at' => date('Y-m-d 17:14:00', strtotime('-1 day'))
            ],
            [
                'sender' => 'customer',
                'sender_name' => 'Carla Dela Cruz',
                'text' => 'See you tomorrow!',
                'status' => 'read',
                'created_at' => date('Y-m-d 17:18:00', strtotime('-1 day'))
            ]
        ],
        'booking' => [
            'service_id' => 2, // Hair Dye
            'staff_id' => 3, // Elena
            'date' => date('Y-m-d', strtotime('+1 day')),
            'time' => '15:00:00',
            'price' => 699.00,
            'status' => 'confirmed'
        ]
    ],
    [
        'email' => 'bea.alonzo@email.com',
        'phone' => '0915 678 1234',
        'full_name' => 'Bea Alonzo',
        'home_address' => 'Batasan Hills, Quezon City',
        'city' => 'Quezon City',
        'notes' => 'Requires weekend morning slots only.',
        'created_at' => '2025-05-18 16:00:00',
        'messages' => [
            [
                'sender' => 'customer',
                'sender_name' => 'Bea Alonzo',
                'text' => 'Confirmed po, see you on Friday.',
                'status' => 'read',
                'created_at' => date('Y-m-d 14:15:00', strtotime('-3 days'))
            ]
        ],
        'booking' => [
            'service_id' => 3, // Power Dose
            'staff_id' => 2, // Ana
            'date' => date('Y-m-d', strtotime('+3 days')),
            'time' => '11:00:00',
            'price' => 499.00,
            'status' => 'confirmed'
        ]
    ],
    [
        'email' => 'sofia.andres@email.com',
        'phone' => '0933 111 2233',
        'full_name' => 'Sofia Andres',
        'home_address' => 'Tandang Sora, Quezon City',
        'city' => 'Quezon City',
        'notes' => 'New client inquiring about Bonacure German treatment.',
        'created_at' => '2026-02-01 10:00:00',
        'messages' => [
            [
                'sender' => 'customer',
                'sender_name' => 'Sofia Andres',
                'text' => 'How much is the Bonacure Hair Treatment?',
                'status' => 'read',
                'created_at' => date('Y-m-d 11:05:00', strtotime('-5 days'))
            ],
            [
                'sender' => 'salon',
                'sender_name' => "Nely's Salon Concierge",
                'text' => 'Hello Sofia! Bonacure treatment starts at ₱899 depending on hair volume po. Would you like to book a consultation?',
                'status' => 'read',
                'created_at' => date('Y-m-d 11:20:00', strtotime('-5 days'))
            ]
        ]
    ]
];

$passHash = password_hash('password123', PASSWORD_BCRYPT);

foreach ($defaultCustomers as $cust) {
    // Check if user exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
    $stmt->execute(['email' => $cust['email']]);
    $userId = $stmt->fetchColumn();

    if (!$userId) {
        $stmtIns = $pdo->prepare("INSERT INTO users (email, phone, password_hash, role, created_at) VALUES (:email, :phone, :password_hash, 'customer', :created_at)");
        $stmtIns->execute([
            'email' => $cust['email'],
            'phone' => $cust['phone'],
            'password_hash' => $passHash,
            'created_at' => $cust['created_at']
        ]);
        $userId = (int)$pdo->lastInsertId();

        $stmtProf = $pdo->prepare("INSERT INTO customer_profiles (user_id, full_name, home_address, city, notes, status, created_at) VALUES (:uid, :name, :addr, :city, :notes, 'Active', :created_at)");
        $stmtProf->execute([
            'uid' => $userId,
            'name' => $cust['full_name'],
            'addr' => $cust['home_address'],
            'city' => $cust['city'],
            'notes' => $cust['notes'],
            'created_at' => $cust['created_at']
        ]);
    }

    // Insert messages if not already present
    $msgCheck = $pdo->prepare("SELECT COUNT(*) FROM messages WHERE user_id = :uid");
    $msgCheck->execute(['uid' => $userId]);
    $hasMsgs = (int)$msgCheck->fetchColumn() > 0;

    if (!$hasMsgs && !empty($cust['messages'])) {
        foreach ($cust['messages'] as $m) {
            $stmtMsg = $pdo->prepare("INSERT INTO messages (user_id, sender, sender_name, text, status, created_at) VALUES (:uid, :sender, :sender_name, :text, :status, :created_at)");
            $stmtMsg->execute([
                'uid' => $userId,
                'sender' => $m['sender'],
                'sender_name' => $m['sender_name'],
                'text' => $m['text'],
                'status' => $m['status'],
                'created_at' => $m['created_at']
            ]);
        }
    }

    // Insert booking if specified and doesn't exist
    if (!empty($cust['booking'])) {
        $b = $cust['booking'];
        $bCheck = $pdo->prepare("SELECT COUNT(*) FROM bookings WHERE customer_id = :uid AND service_id = :sid");
        $bCheck->execute(['uid' => $userId, 'sid' => $b['service_id']]);
        if ((int)$bCheck->fetchColumn() === 0) {
            $ref = 'NS-' . date('Ymd', strtotime($b['date'])) . '-' . rand(1000, 9999);
            $stmtB = $pdo->prepare("INSERT INTO bookings (customer_id, service_id, staff_id, booking_date, booking_time, total_price, status, reference_no, created_at) VALUES (:uid, :sid, :staff_id, :bdate, :btime, :price, :status, :ref, NOW())");
            $stmtB->execute([
                'uid' => $userId,
                'sid' => $b['service_id'],
                'staff_id' => $b['staff_id'],
                'bdate' => $b['date'],
                'btime' => $b['time'],
                'price' => $b['price'],
                'status' => $b['status'],
                'ref' => $ref
            ]);
        }
    }
}

echo "Database seeded successfully with customers, messages, and bookings!" . PHP_EOL;
