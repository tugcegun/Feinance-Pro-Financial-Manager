<?php
// POST /api/login.php
// Body: { email, password }
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getJsonBody();
$email    = trim($body['email'] ?? '');
$password = $body['password'] ?? '';

if ($email === '' || $password === '') {
    jsonError('Email and password are required');
}

$db = getDB();

$stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    jsonError('Invalid email or password', 401);
}

// Create session
$token = createSession((int)$user['id']);

// Cleanup old expired sessions occasionally
if (random_int(1, 10) === 1) {
    cleanupExpiredSessions();
}

jsonResponse([
    'token' => $token,
    'user'  => [
        'id'            => (int)$user['id'],
        'name'          => $user['name'],
        'email'         => $user['email'],
        'profile_photo' => $user['profile_photo'],
    ],
]);
