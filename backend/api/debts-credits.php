<?php
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

$auth = requireAuth();
$userId = (int)$auth['user_id'];
$db = getDB();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && $action === '') {
    $stmt = $db->prepare('SELECT * FROM debts_credits WHERE user_id = ? ORDER BY is_settled ASC, date_created DESC');
    $stmt->execute([$userId]);
    jsonResponse(['debts_credits' => $stmt->fetchAll()]);
}

if ($method === 'POST' && $action === '') {
    $body = getJsonBody();
    $type        = $body['type'] ?? '';
    $personName  = trim($body['person_name'] ?? '');
    $amount      = (float)($body['amount'] ?? 0);
    $description = $body['description'] ?? null;
    $dateCreated = $body['date_created'] ?? date('Y-m-d');
    $dueDate     = $body['due_date'] ?? null;

    if ($type === '' || $personName === '' || $amount <= 0) {
        jsonError('type, person_name, and positive amount are required');
    }

    $stmt = $db->prepare(
        'INSERT INTO debts_credits (user_id, type, person_name, amount, remaining_amount, description, date_created, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $type, $personName, $amount, $amount, $description, $dateCreated, $dueDate]);
    $id = (int)$db->lastInsertId();

    jsonResponse(['id' => $id, 'message' => 'Debt/credit added'], 201);
}

if ($method === 'PUT' && $action === 'update') {
    $body = getJsonBody();
    $id          = (int)($body['id'] ?? 0);
    $personName  = trim($body['person_name'] ?? '');
    $amount      = (float)($body['amount'] ?? 0);
    $description = $body['description'] ?? null;
    $dueDate     = $body['due_date'] ?? null;

    if ($id <= 0) jsonError('ID is required');

    // Get current to calculate remaining difference
    $stmt = $db->prepare('SELECT amount, remaining_amount FROM debts_credits WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    $old = $stmt->fetch();
    if (!$old) jsonError('Record not found', 404);

    $diff = $amount - (float)$old['amount'];
    $newRemaining = max(0, (float)$old['remaining_amount'] + $diff);
    $isSettled = $newRemaining <= 0 ? 1 : 0;

    $db->prepare(
        'UPDATE debts_credits SET person_name = ?, amount = ?, remaining_amount = ?, description = ?, due_date = ?, is_settled = ? WHERE id = ? AND user_id = ?'
    )->execute([$personName, $amount, $newRemaining, $description, $dueDate, $isSettled, $id, $userId]);

    jsonResponse(['message' => 'Debt/credit updated']);
}

if ($method === 'DELETE' && $action === 'delete') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    $db->prepare('DELETE FROM debt_credit_payments WHERE debt_credit_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM debts_credits WHERE id = ? AND user_id = ?')->execute([$id, $userId]);

    jsonResponse(['message' => 'Debt/credit deleted']);
}

if ($method === 'GET' && $action === 'payments') {
    $debtCreditId = (int)($_GET['debt_credit_id'] ?? 0);
    if ($debtCreditId <= 0) jsonError('debt_credit_id is required');

    $stmt = $db->prepare('SELECT * FROM debt_credit_payments WHERE debt_credit_id = ? ORDER BY payment_date DESC');
    $stmt->execute([$debtCreditId]);
    jsonResponse(['payments' => $stmt->fetchAll()]);
}

if ($method === 'POST' && $action === 'add-payment') {
    $body = getJsonBody();
    $debtCreditId = (int)($body['debt_credit_id'] ?? 0);
    $amount       = (float)($body['amount'] ?? 0);
    $paymentDate  = $body['payment_date'] ?? date('Y-m-d');
    $note         = $body['note'] ?? null;

    if ($debtCreditId <= 0 || $amount <= 0) jsonError('debt_credit_id and positive amount are required');

    $db->prepare('INSERT INTO debt_credit_payments (debt_credit_id, amount, payment_date, note) VALUES (?, ?, ?, ?)')
       ->execute([$debtCreditId, $amount, $paymentDate, $note]);

    // Update remaining_amount
    $db->prepare('UPDATE debts_credits SET remaining_amount = remaining_amount - ? WHERE id = ? AND user_id = ?')
       ->execute([$amount, $debtCreditId, $userId]);

    // Check if settled
    $stmt = $db->prepare('SELECT remaining_amount FROM debts_credits WHERE id = ?');
    $stmt->execute([$debtCreditId]);
    $row = $stmt->fetch();
    if ($row && (float)$row['remaining_amount'] <= 0) {
        $db->prepare('UPDATE debts_credits SET is_settled = 1, remaining_amount = 0, settled_date = CURDATE() WHERE id = ?')
           ->execute([$debtCreditId]);
    }

    jsonResponse(['message' => 'Payment added']);
}

if ($method === 'PUT' && $action === 'settle') {
    $body = getJsonBody();
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    $db->prepare('UPDATE debts_credits SET remaining_amount = 0, is_settled = 1, settled_date = CURDATE() WHERE id = ? AND user_id = ?')
       ->execute([$id, $userId]);

    jsonResponse(['message' => 'Debt/credit settled']);
}

jsonError('Invalid action or method', 400);
