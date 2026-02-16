<?php
// POST /api/change-password.php
// Header: Authorization: Bearer <token>
// Body: { current_password, new_password }
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$authUser = requireAuth();
$body = getJsonBody();

$currentPassword = $body['current_password'] ?? '';
$newPassword     = $body['new_password'] ?? '';

if ($currentPassword === '' || $newPassword === '') {
    jsonError('Current password and new password are required');
}

if (strlen($newPassword) < 6) {
    jsonError('New password must be at least 6 characters');
}

$db = getDB();

// Verify current password
$stmt = $db->prepare('SELECT password FROM users WHERE id = ?');
$stmt->execute([$authUser['user_id']]);
$user = $stmt->fetch();

if (!$user || !password_verify($currentPassword, $user['password'])) {
    jsonError('Current password is incorrect', 401);
}

// Update password
$newHash = password_hash($newPassword, PASSWORD_BCRYPT);
$stmt = $db->prepare('UPDATE users SET password = ? WHERE id = ?');
$stmt->execute([$newHash, $authUser['user_id']]);

jsonResponse(['message' => 'Password changed successfully']);
