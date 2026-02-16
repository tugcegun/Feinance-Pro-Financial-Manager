<?php
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

$auth = requireAuth();
$userId = (int)$auth['user_id'];
$db = getDB();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// GET /categories.php → list
// POST /categories.php → add
// POST /categories.php?action=create-defaults → create defaults
// PUT /categories.php?action=update → update
// DELETE /categories.php?action=delete → delete

if ($method === 'GET' && $action === '') {
    $type = $_GET['type'] ?? null;
    $query = 'SELECT * FROM categories WHERE user_id = ?';
    $params = [$userId];
    if ($type) {
        $query .= ' AND type = ?';
        $params[] = $type;
    }
    $query .= ' ORDER BY name';
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    jsonResponse(['categories' => $stmt->fetchAll()]);
}

if ($method === 'POST' && $action === 'create-defaults') {
    $defaults = [
        ['Salary', 'income', 'dollar-sign', '#4CAF50'],
        ['Freelance', 'income', 'briefcase', '#66BB6A'],
        ['Food', 'expense', 'coffee', '#FF5252'],
        ['Transportation', 'expense', 'truck', '#FF7043'],
        ['Shopping', 'expense', 'shopping-cart', '#FFA726'],
        ['Entertainment', 'expense', 'film', '#FFCA28'],
        ['Bills', 'expense', 'file-text', '#EF5350'],
        ['Healthcare', 'expense', 'heart', '#EC407A'],
    ];
    $stmt = $db->prepare('INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES (?, ?, ?, ?, ?, 1)');
    foreach ($defaults as $cat) {
        $stmt->execute([$userId, $cat[0], $cat[1], $cat[2], $cat[3]]);
    }
    jsonResponse(['message' => 'Default categories created']);
}

if ($method === 'POST' && $action === '') {
    $body = getJsonBody();
    $name  = trim($body['name'] ?? '');
    $type  = $body['type'] ?? '';
    $icon  = $body['icon'] ?? null;
    $color = $body['color'] ?? null;

    if ($name === '' || !in_array($type, ['income', 'expense'])) {
        jsonError('Name and valid type (income/expense) are required');
    }

    $stmt = $db->prepare('INSERT INTO categories (user_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$userId, $name, $type, $icon, $color]);
    $id = (int)$db->lastInsertId();

    jsonResponse(['id' => $id, 'message' => 'Category added'], 201);
}

if ($method === 'PUT' && $action === 'update') {
    $body = getJsonBody();
    $id    = (int)($body['id'] ?? 0);
    $name  = trim($body['name'] ?? '');
    $icon  = $body['icon'] ?? null;
    $color = $body['color'] ?? null;

    if ($id <= 0 || $name === '') {
        jsonError('ID and name are required');
    }

    $stmt = $db->prepare('UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ? AND user_id = ?');
    $stmt->execute([$name, $icon, $color, $id, $userId]);

    jsonResponse(['message' => 'Category updated']);
}

if ($method === 'DELETE' && $action === 'delete') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    // Unlink transactions
    $stmt = $db->prepare('UPDATE transactions SET category_id = NULL WHERE category_id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);

    $stmt = $db->prepare('DELETE FROM categories WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);

    jsonResponse(['message' => 'Category deleted']);
}

jsonError('Invalid action or method', 400);
