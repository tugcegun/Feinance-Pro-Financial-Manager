<?php
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

$auth = requireAuth();
$userId = (int)$auth['user_id'];
$db = getDB();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && $action === '') {
    $stmt = $db->prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY is_default DESC, created_at DESC');
    $stmt->execute([$userId]);
    jsonResponse(['accounts' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $action === 'total-balance') {
    $stmt = $db->prepare('SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    jsonResponse(['total' => (float)$row['total']]);
}

if ($method === 'POST' && $action === '') {
    $body = getJsonBody();
    $name         = trim($body['name'] ?? '');
    $type         = $body['type'] ?? '';
    $bankName     = $body['bank_name'] ?? null;
    $balance      = (float)($body['balance'] ?? 0);
    $color        = $body['color'] ?? null;
    $icon         = $body['icon'] ?? null;
    $cardLastFour = $body['card_last_four'] ?? null;

    if ($name === '' || $type === '') {
        jsonError('Name and type are required');
    }

    $stmt = $db->prepare(
        'INSERT INTO accounts (user_id, name, type, bank_name, balance, color, icon, card_last_four) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $name, $type, $bankName, $balance, $color, $icon, $cardLastFour]);
    $id = (int)$db->lastInsertId();

    jsonResponse(['id' => $id, 'message' => 'Account added'], 201);
}

if ($method === 'POST' && $action === 'transfer') {
    $body = getJsonBody();
    $fromId = (int)($body['from_account_id'] ?? 0);
    $toId   = (int)($body['to_account_id'] ?? 0);
    $amount = (float)($body['amount'] ?? 0);

    if ($fromId === $toId) jsonError('Cannot transfer to the same account');
    if ($amount <= 0) jsonError('Amount must be positive');

    // Check source account
    $stmt = $db->prepare('SELECT id, balance FROM accounts WHERE id = ? AND user_id = ?');
    $stmt->execute([$fromId, $userId]);
    $source = $stmt->fetch();
    if (!$source) jsonError('Source account not found', 404);
    if ((float)$source['balance'] < $amount) jsonError('Insufficient balance');

    // Check destination account
    $stmt = $db->prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?');
    $stmt->execute([$toId, $userId]);
    if (!$stmt->fetch()) jsonError('Destination account not found', 404);

    $db->prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?')->execute([$amount, $fromId]);
    $db->prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?')->execute([$amount, $toId]);

    jsonResponse(['message' => 'Transfer completed']);
}

if ($method === 'PUT' && $action === 'update') {
    $body = getJsonBody();
    $id           = (int)($body['id'] ?? 0);
    $name         = trim($body['name'] ?? '');
    $type         = $body['type'] ?? '';
    $bankName     = $body['bank_name'] ?? null;
    $balance      = (float)($body['balance'] ?? 0);
    $color        = $body['color'] ?? null;
    $icon         = $body['icon'] ?? null;
    $cardLastFour = $body['card_last_four'] ?? null;

    if ($id <= 0) jsonError('ID is required');

    $stmt = $db->prepare(
        'UPDATE accounts SET name = ?, type = ?, bank_name = ?, balance = ?, color = ?, icon = ?, card_last_four = ? WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$name, $type, $bankName, $balance, $color, $icon, $cardLastFour, $id, $userId]);

    jsonResponse(['message' => 'Account updated']);
}

if ($method === 'PUT' && $action === 'update-balance') {
    $body = getJsonBody();
    $id      = (int)($body['id'] ?? 0);
    $balance = (float)($body['balance'] ?? 0);

    if ($id <= 0) jsonError('ID is required');

    $db->prepare('UPDATE accounts SET balance = ? WHERE id = ? AND user_id = ?')
       ->execute([$balance, $id, $userId]);

    jsonResponse(['message' => 'Balance updated']);
}

if ($method === 'DELETE' && $action === 'delete') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    // Unlink transactions
    $db->prepare('UPDATE transactions SET account_id = NULL WHERE account_id = ? AND user_id = ?')
       ->execute([$id, $userId]);

    $db->prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?')->execute([$id, $userId]);

    jsonResponse(['message' => 'Account deleted']);
}

jsonError('Invalid action or method', 400);
