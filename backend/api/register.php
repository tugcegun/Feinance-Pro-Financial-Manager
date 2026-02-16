<?php
// POST /api/register.php
// Body: { name, email, password }
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getJsonBody();
$name     = trim($body['name'] ?? '');
$email    = trim($body['email'] ?? '');
$password = $body['password'] ?? '';

// Validation
if ($name === '') {
    jsonError('Name is required');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Valid email is required');
}
if (strlen($password) < 6) {
    jsonError('Password must be at least 6 characters');
}

$db = getDB();

// Check if email already exists
$stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    jsonError('Email already exists', 409);
}

// Create user with bcrypt hash
$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $db->prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
$stmt->execute([$name, $email, $hash]);
$userId = (int)$db->lastInsertId();

// Create default categories for the new user
$defaultCategories = [
    ['Salary', 'income', 'dollar-sign', '#4CAF50'],
    ['Freelance', 'income', 'briefcase', '#66BB6A'],
    ['Food', 'expense', 'coffee', '#FF5252'],
    ['Transportation', 'expense', 'truck', '#FF7043'],
    ['Shopping', 'expense', 'shopping-cart', '#FFA726'],
    ['Entertainment', 'expense', 'film', '#FFCA28'],
    ['Bills', 'expense', 'file-text', '#EF5350'],
    ['Healthcare', 'expense', 'heart', '#EC407A'],
];

$catStmt = $db->prepare(
    'INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES (?, ?, ?, ?, ?, 1)'
);
foreach ($defaultCategories as $cat) {
    $catStmt->execute([$userId, $cat[0], $cat[1], $cat[2], $cat[3]]);
}

// Create session
$token = createSession($userId);

// Cleanup old expired sessions occasionally
if (random_int(1, 10) === 1) {
    cleanupExpiredSessions();
}

jsonResponse([
    'token' => $token,
    'user'  => [
        'id'            => $userId,
        'name'          => $name,
        'email'         => $email,
        'profile_photo' => null,
    ],
], 201);
