<?php
// PUT /api/update-profile.php
// Header: Authorization: Bearer <token>
// Body: { name?, profile_photo? }
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    jsonError('Method not allowed', 405);
}

$authUser = requireAuth();
$body = getJsonBody();
$db = getDB();

$updates = [];
$params  = [];

if (isset($body['name'])) {
    $name = trim($body['name']);
    if ($name === '') {
        jsonError('Name cannot be empty');
    }
    $updates[] = 'name = ?';
    $params[]  = $name;
}

if (array_key_exists('profile_photo', $body)) {
    $updates[] = 'profile_photo = ?';
    $params[]  = $body['profile_photo']; // can be null to remove
}

if (empty($updates)) {
    jsonError('No fields to update');
}

$params[] = $authUser['user_id'];
$sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?';
$stmt = $db->prepare($sql);
$stmt->execute($params);

// Fetch updated user
$stmt = $db->prepare('SELECT id, name, email, profile_photo FROM users WHERE id = ?');
$stmt->execute([$authUser['user_id']]);
$user = $stmt->fetch();

jsonResponse([
    'user' => [
        'id'            => (int)$user['id'],
        'name'          => $user['name'],
        'email'         => $user['email'],
        'profile_photo' => $user['profile_photo'],
    ],
]);
