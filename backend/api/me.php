<?php
// GET /api/me.php
// Header: Authorization: Bearer <token>
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();

jsonResponse([
    'user' => [
        'id'            => (int)$user['user_id'],
        'name'          => $user['name'],
        'email'         => $user['email'],
        'profile_photo' => $user['profile_photo'],
    ],
]);
