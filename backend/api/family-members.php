<?php
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

$auth = requireAuth();
$userId = (int)$auth['user_id'];
$db = getDB();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && $action === '') {
    $stmt = $db->prepare('SELECT * FROM family_members WHERE user_id = ? ORDER BY name');
    $stmt->execute([$userId]);
    jsonResponse(['members' => $stmt->fetchAll()]);
}

if ($method === 'POST' && $action === '') {
    $body = getJsonBody();
    $name  = trim($body['name'] ?? '');
    $email = $body['email'] ?? null;
    $role  = $body['role'] ?? 'member';

    if ($name === '') jsonError('Name is required');

    $stmt = $db->prepare('INSERT INTO family_members (user_id, name, email, role) VALUES (?, ?, ?, ?)');
    $stmt->execute([$userId, $name, $email, $role]);
    $id = (int)$db->lastInsertId();

    jsonResponse(['id' => $id, 'message' => 'Family member added'], 201);
}

if ($method === 'PUT' && $action === 'update') {
    $body = getJsonBody();
    $id    = (int)($body['id'] ?? 0);
    $name  = trim($body['name'] ?? '');
    $email = $body['email'] ?? null;
    $role  = $body['role'] ?? 'member';

    if ($id <= 0 || $name === '') jsonError('ID and name are required');

    $stmt = $db->prepare('UPDATE family_members SET name = ?, email = ?, role = ? WHERE id = ? AND user_id = ?');
    $stmt->execute([$name, $email, $role, $id, $userId]);

    jsonResponse(['message' => 'Family member updated']);
}

if ($method === 'DELETE' && $action === 'delete') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    $db->prepare('DELETE FROM bill_assignments WHERE family_member_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM family_members WHERE id = ? AND user_id = ?')->execute([$id, $userId]);

    jsonResponse(['message' => 'Family member deleted']);
}

jsonError('Invalid action or method', 400);
