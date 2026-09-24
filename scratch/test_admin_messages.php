<?php
require_once __DIR__ . '/../server/config/database.php';
require_once __DIR__ . '/../server/models/Message.php';
require_once __DIR__ . '/../server/controllers/MessageController.php';

session_start();
$_SESSION['user_id'] = 1;
$_SESSION['user_role'] = 'admin';
$_SESSION['user_email'] = 'admin@nelyssalon.com';

echo "=== 1. Test getAdminConversations ===" . PHP_EOL;
$convs = Message::getAdminConversations();
echo "Total conversations: " . count($convs) . PHP_EOL;
foreach ($convs as $c) {
    echo "- Customer: {$c['name']} (ID: {$c['id']}), Messages: " . count($c['messages']) . ", Unread: {$c['unreadCount']}, LastTime: {$c['lastTime']}" . PHP_EOL;
    if ($c['upcomingAppointment']) {
        echo "  Upcoming Appt: {$c['upcomingAppointment']['service']} on {$c['upcomingAppointment']['date']} at {$c['upcomingAppointment']['time']}" . PHP_EOL;
    }
}

echo "=== 2. Test getAdminUnreadCount ===" . PHP_EOL;
$unread = Message::getAdminUnreadCount();
echo "Total Admin Unread: {$unread}" . PHP_EOL;

echo "=== 3. Test sendAsAdmin ===" . PHP_EOL;
if (count($convs) > 0) {
    $firstUser = $convs[0]['userId'];
    $msgId = Message::create([
        'user_id' => $firstUser,
        'sender' => 'salon',
        'sender_name' => "Admin",
        'text' => 'Test admin response from script',
        'status' => 'sent'
    ]);
    echo "Created message ID: {$msgId} for user {$firstUser}" . PHP_EOL;
    
    // Clean up test message
    Message::delete($msgId);
    echo "Cleaned up test message." . PHP_EOL;
}

echo "All tests completed successfully!" . PHP_EOL;
