<?php
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

$auth = requireAuth();
$userId = (int)$auth['user_id'];
$db = getDB();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// GET  → list (with optional month/year)
// POST → add
// GET  ?action=by-account&account_id=X
// GET  ?action=archived
// GET  ?action=deleted
// PUT  ?action=soft-delete
// DELETE ?action=delete&id=X
// PUT  ?action=toggle-pin
// PUT  ?action=toggle-archive
// PUT  ?action=restore
// DELETE ?action=empty-trash

if ($method === 'GET' && $action === '') {
    $month = $_GET['month'] ?? null;
    $year  = $_GET['year'] ?? null;

    $query = "SELECT t.*, c.name as category_name, c.icon, c.color
              FROM transactions t
              LEFT JOIN categories c ON t.category_id = c.id
              WHERE t.user_id = ? AND (t.is_archived = 0) AND (t.is_deleted = 0)";
    $params = [$userId];

    if ($month && $year) {
        $query .= " AND MONTH(t.date) = ? AND YEAR(t.date) = ?";
        $params[] = (int)$month;
        $params[] = (int)$year;
    }

    $query .= ' ORDER BY t.is_pinned DESC, t.pinned_at DESC, t.date DESC';

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    jsonResponse(['transactions' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $action === 'by-account') {
    $accountId = (int)($_GET['account_id'] ?? 0);
    $stmt = $db->prepare(
        "SELECT t.*, c.name as category_name, c.icon, c.color
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.account_id = ? AND t.user_id = ? AND t.is_deleted = 0
         ORDER BY t.date DESC"
    );
    $stmt->execute([$accountId, $userId]);
    jsonResponse(['transactions' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $action === 'archived') {
    $stmt = $db->prepare(
        "SELECT t.*, c.name as category_name, c.icon, c.color
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = ? AND t.is_archived = 1 AND t.is_deleted = 0
         ORDER BY t.date DESC"
    );
    $stmt->execute([$userId]);
    jsonResponse(['transactions' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $action === 'deleted') {
    $stmt = $db->prepare(
        "SELECT t.*, c.name as category_name, c.icon, c.color
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = ? AND t.is_deleted = 1
         ORDER BY t.deleted_at DESC"
    );
    $stmt->execute([$userId]);
    jsonResponse(['transactions' => $stmt->fetchAll()]);
}

if ($method === 'POST' && $action === '') {
    $body = getJsonBody();
    $type        = $body['type'] ?? '';
    $amount      = (float)($body['amount'] ?? 0);
    $categoryId  = isset($body['category_id']) ? (int)$body['category_id'] : null;
    $description = $body['description'] ?? null;
    $date        = $body['date'] ?? date('Y-m-d');
    $accountId   = isset($body['account_id']) ? (int)$body['account_id'] : null;

    if (!in_array($type, ['income', 'expense']) || $amount <= 0) {
        jsonError('Valid type and positive amount are required');
    }

    $stmt = $db->prepare(
        'INSERT INTO transactions (user_id, type, amount, category_id, description, date, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $type, $amount, $categoryId, $description, $date, $accountId]);
    $id = (int)$db->lastInsertId();

    // Update account balance if linked
    if ($accountId) {
        if ($type === 'income') {
            $db->prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?')->execute([$amount, $accountId, $userId]);
        } else {
            $db->prepare('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?')->execute([$amount, $accountId, $userId]);
        }
    }

    jsonResponse(['id' => $id, 'message' => 'Transaction added'], 201);
}

if ($method === 'PUT' && $action === 'soft-delete') {
    $body = getJsonBody();
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    // Get transaction for balance reversal
    $stmt = $db->prepare('SELECT type, amount, account_id FROM transactions WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    $tx = $stmt->fetch();
    if (!$tx) jsonError('Transaction not found', 404);

    $db->prepare('UPDATE transactions SET is_deleted = 1, deleted_at = NOW() WHERE id = ? AND user_id = ?')
       ->execute([$id, $userId]);

    // Reverse account balance
    if ($tx['account_id']) {
        if ($tx['type'] === 'income') {
            $db->prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?')->execute([$tx['amount'], $tx['account_id']]);
        } else {
            $db->prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?')->execute([$tx['amount'], $tx['account_id']]);
        }
    }

    jsonResponse(['message' => 'Transaction moved to trash']);
}

if ($method === 'DELETE' && $action === 'delete') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    $db->prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
    jsonResponse(['message' => 'Transaction permanently deleted']);
}

if ($method === 'PUT' && $action === 'toggle-pin') {
    $body = getJsonBody();
    $id = (int)($body['id'] ?? 0);
    $isPinned = (int)($body['is_pinned'] ?? 0);

    $db->prepare('UPDATE transactions SET is_pinned = ?, pinned_at = ? WHERE id = ? AND user_id = ?')
       ->execute([$isPinned, $isPinned ? date('Y-m-d H:i:s') : null, $id, $userId]);

    jsonResponse(['message' => 'Pin toggled']);
}

if ($method === 'PUT' && $action === 'toggle-archive') {
    $body = getJsonBody();
    $id = (int)($body['id'] ?? 0);
    $isArchived = (int)($body['is_archived'] ?? 0);

    $db->prepare('UPDATE transactions SET is_archived = ? WHERE id = ? AND user_id = ?')
       ->execute([$isArchived, $id, $userId]);

    jsonResponse(['message' => 'Archive toggled']);
}

if ($method === 'PUT' && $action === 'restore') {
    $body = getJsonBody();
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    // Get transaction for balance re-apply
    $stmt = $db->prepare('SELECT type, amount, account_id FROM transactions WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    $tx = $stmt->fetch();
    if (!$tx) jsonError('Transaction not found', 404);

    $db->prepare('UPDATE transactions SET is_deleted = 0, deleted_at = NULL WHERE id = ? AND user_id = ?')
       ->execute([$id, $userId]);

    // Re-apply account balance
    if ($tx['account_id']) {
        if ($tx['type'] === 'income') {
            $db->prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?')->execute([$tx['amount'], $tx['account_id']]);
        } else {
            $db->prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?')->execute([$tx['amount'], $tx['account_id']]);
        }
    }

    jsonResponse(['message' => 'Transaction restored']);
}

if ($method === 'DELETE' && $action === 'empty-trash') {
    $db->prepare('DELETE FROM transactions WHERE user_id = ? AND is_deleted = 1')->execute([$userId]);
    jsonResponse(['message' => 'Trash emptied']);
}

jsonError('Invalid action or method', 400);
