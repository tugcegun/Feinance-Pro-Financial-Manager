<?php
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

$auth = requireAuth();
$userId = (int)$auth['user_id'];
$db = getDB();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && $action === '') {
    $stmt = $db->prepare('SELECT * FROM savings_goals WHERE user_id = ? ORDER BY is_completed ASC, created_at DESC');
    $stmt->execute([$userId]);
    jsonResponse(['goals' => $stmt->fetchAll()]);
}

if ($method === 'POST' && $action === '') {
    $body = getJsonBody();
    $name         = trim($body['name'] ?? '');
    $description  = $body['description'] ?? null;
    $targetAmount = (float)($body['target_amount'] ?? 0);
    $icon         = $body['icon'] ?? 'target';
    $color        = $body['color'] ?? '#F39C12';
    $targetDate   = $body['target_date'] ?? null;

    if ($name === '' || $targetAmount <= 0) jsonError('Name and target_amount are required');

    $stmt = $db->prepare(
        'INSERT INTO savings_goals (user_id, name, description, target_amount, icon, color, target_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $name, $description, $targetAmount, $icon, $color, $targetDate]);
    $id = (int)$db->lastInsertId();

    jsonResponse(['id' => $id, 'message' => 'Savings goal added'], 201);
}

if ($method === 'PUT' && $action === 'update') {
    $body = getJsonBody();
    $id           = (int)($body['id'] ?? 0);
    $name         = trim($body['name'] ?? '');
    $description  = $body['description'] ?? null;
    $targetAmount = (float)($body['target_amount'] ?? 0);
    $icon         = $body['icon'] ?? 'target';
    $color        = $body['color'] ?? '#F39C12';
    $targetDate   = $body['target_date'] ?? null;

    if ($id <= 0) jsonError('ID is required');

    $stmt = $db->prepare(
        'UPDATE savings_goals SET name = ?, description = ?, target_amount = ?, icon = ?, color = ?, target_date = ? WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$name, $description, $targetAmount, $icon, $color, $targetDate, $id, $userId]);

    jsonResponse(['message' => 'Savings goal updated']);
}

if ($method === 'DELETE' && $action === 'delete') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    // Delete history first (CASCADE should handle, but explicit)
    $db->prepare('DELETE FROM savings_goal_history WHERE goal_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM savings_goals WHERE id = ? AND user_id = ?')->execute([$id, $userId]);

    jsonResponse(['message' => 'Savings goal deleted']);
}

if ($method === 'POST' && $action === 'deposit') {
    $body = getJsonBody();
    $id        = (int)($body['id'] ?? 0);
    $amount    = (float)($body['amount'] ?? 0);
    $accountId = isset($body['account_id']) ? (int)$body['account_id'] : null;
    $deducted  = (int)($body['deducted'] ?? 1);

    if ($id <= 0 || $amount <= 0) jsonError('ID and positive amount are required');

    // Get goal
    $stmt = $db->prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    $goal = $stmt->fetch();
    if (!$goal) jsonError('Goal not found', 404);

    $newAmount = min((float)$goal['current_amount'] + $amount, (float)$goal['target_amount']);
    $isCompleted = $newAmount >= (float)$goal['target_amount'] ? 1 : 0;

    $db->prepare('UPDATE savings_goals SET current_amount = ?, is_completed = ? WHERE id = ?')
       ->execute([$newAmount, $isCompleted, $id]);

    // Record history
    $db->prepare('INSERT INTO savings_goal_history (goal_id, user_id, account_id, amount, action_type, deducted) VALUES (?, ?, ?, ?, ?, ?)')
       ->execute([$id, $userId, $accountId, $amount, 'deposit', ($accountId && $deducted) ? 1 : 0]);

    // Deduct from account if requested
    if ($accountId && $deducted) {
        $db->prepare('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?')
           ->execute([$amount, $accountId, $userId]);
    }

    jsonResponse(['new_amount' => $newAmount, 'is_completed' => $isCompleted]);
}

if ($method === 'POST' && $action === 'withdraw') {
    $body = getJsonBody();
    $id        = (int)($body['id'] ?? 0);
    $amount    = (float)($body['amount'] ?? 0);
    $accountId = isset($body['account_id']) ? (int)$body['account_id'] : null;
    $deducted  = (int)($body['deducted'] ?? 1);

    if ($id <= 0 || $amount <= 0) jsonError('ID and positive amount are required');

    $stmt = $db->prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    $goal = $stmt->fetch();
    if (!$goal) jsonError('Goal not found', 404);

    $newAmount = max((float)$goal['current_amount'] - $amount, 0);
    $isCompleted = $newAmount >= (float)$goal['target_amount'] ? 1 : 0;

    $db->prepare('UPDATE savings_goals SET current_amount = ?, is_completed = ? WHERE id = ?')
       ->execute([$newAmount, $isCompleted, $id]);

    $db->prepare('INSERT INTO savings_goal_history (goal_id, user_id, account_id, amount, action_type, deducted) VALUES (?, ?, ?, ?, ?, ?)')
       ->execute([$id, $userId, $accountId, $amount, 'withdraw', ($accountId && $deducted) ? 1 : 0]);

    if ($accountId && $deducted) {
        $db->prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?')
           ->execute([$amount, $accountId, $userId]);
    }

    jsonResponse(['new_amount' => $newAmount, 'is_completed' => $isCompleted]);
}

if ($method === 'GET' && $action === 'history') {
    $goalId = (int)($_GET['goal_id'] ?? 0);
    if ($goalId <= 0) jsonError('goal_id is required');

    $stmt = $db->prepare(
        "SELECT h.*, a.name as account_name
         FROM savings_goal_history h
         LEFT JOIN accounts a ON h.account_id = a.id
         WHERE h.goal_id = ?
         ORDER BY h.created_at DESC"
    );
    $stmt->execute([$goalId]);
    jsonResponse(['history' => $stmt->fetchAll()]);
}

if ($method === 'DELETE' && $action === 'delete-all-history') {
    $goalId = (int)($_GET['goal_id'] ?? 0);
    if ($goalId <= 0) jsonError('goal_id is required');

    $db->prepare('DELETE FROM savings_goal_history WHERE goal_id = ?')->execute([$goalId]);
    jsonResponse(['message' => 'All history deleted']);
}

if ($method === 'DELETE' && $action === 'delete-history-entry') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    // Get entry
    $stmt = $db->prepare('SELECT * FROM savings_goal_history WHERE id = ?');
    $stmt->execute([$id]);
    $entry = $stmt->fetch();
    if (!$entry) jsonError('History entry not found', 404);

    // Reverse goal amount
    if ($entry['action_type'] === 'deposit') {
        $db->prepare('UPDATE savings_goals SET current_amount = GREATEST(current_amount - ?, 0) WHERE id = ?')
           ->execute([$entry['amount'], $entry['goal_id']]);
    } else {
        $db->prepare('UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ?')
           ->execute([$entry['amount'], $entry['goal_id']]);
    }

    // Recalculate is_completed
    $stmt = $db->prepare('SELECT current_amount, target_amount FROM savings_goals WHERE id = ?');
    $stmt->execute([$entry['goal_id']]);
    $goal = $stmt->fetch();
    if ($goal) {
        $isCompleted = (float)$goal['current_amount'] >= (float)$goal['target_amount'] ? 1 : 0;
        $db->prepare('UPDATE savings_goals SET is_completed = ? WHERE id = ?')->execute([$isCompleted, $entry['goal_id']]);
    }

    // Reverse account balance
    if ($entry['account_id'] && (int)$entry['deducted'] === 1) {
        if ($entry['action_type'] === 'deposit') {
            $db->prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?')->execute([$entry['amount'], $entry['account_id']]);
        } else {
            $db->prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?')->execute([$entry['amount'], $entry['account_id']]);
        }
    }

    // Delete
    $db->prepare('DELETE FROM savings_goal_history WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'History entry deleted and reversed']);
}

jsonError('Invalid action or method', 400);
