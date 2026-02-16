<?php
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

$auth = requireAuth();
$userId = (int)$auth['user_id'];
$db = getDB();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && $action === '') {
    $stmt = $db->prepare(
        "SELECT i.*, a.name as account_name
         FROM installments i
         LEFT JOIN accounts a ON i.account_id = a.id
         WHERE i.user_id = ?
         ORDER BY i.is_completed ASC, i.created_at DESC"
    );
    $stmt->execute([$userId]);
    jsonResponse(['installments' => $stmt->fetchAll()]);
}

if ($method === 'POST' && $action === '') {
    $body = getJsonBody();
    $name             = trim($body['name'] ?? '');
    $description      = $body['description'] ?? null;
    $totalAmount      = (float)($body['total_amount'] ?? 0);
    $installmentCount = (int)($body['installment_count'] ?? 0);
    $monthlyAmount    = (float)($body['monthly_amount'] ?? 0);
    $firstPaymentDate = $body['first_payment_date'] ?? '';
    $accountId        = isset($body['account_id']) ? (int)$body['account_id'] : null;

    if ($name === '' || $totalAmount <= 0 || $installmentCount <= 0 || $firstPaymentDate === '') {
        jsonError('name, total_amount, installment_count, first_payment_date are required');
    }

    $stmt = $db->prepare(
        'INSERT INTO installments (user_id, name, description, total_amount, installment_count, monthly_amount, first_payment_date, account_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $name, $description, $totalAmount, $installmentCount, $monthlyAmount, $firstPaymentDate, $accountId]);
    $installmentId = (int)$db->lastInsertId();

    // Create individual payment records
    $dateParts = explode('-', $firstPaymentDate);
    $baseYear  = (int)$dateParts[0];
    $baseMonth = (int)$dateParts[1] - 1; // 0-indexed
    $baseDay   = (int)$dateParts[2];

    $payStmt = $db->prepare(
        'INSERT INTO installment_payments (installment_id, payment_number, amount, due_date) VALUES (?, ?, ?, ?)'
    );

    for ($i = 0; $i < $installmentCount; $i++) {
        $targetMonth = $baseMonth + $i;
        $targetYear  = $baseYear + intdiv($targetMonth, 12);
        $targetMonth = $targetMonth % 12;

        $daysInMonth = (int)(new DateTime("{$targetYear}-" . ($targetMonth + 1) . "-01"))->format('t');
        $targetDay   = min($baseDay, $daysInMonth);

        $dueDateStr = sprintf('%d-%02d-%02d', $targetYear, $targetMonth + 1, $targetDay);
        $payStmt->execute([$installmentId, $i + 1, $monthlyAmount, $dueDateStr]);
    }

    jsonResponse(['id' => $installmentId, 'message' => 'Installment added'], 201);
}

if ($method === 'PUT' && $action === 'update') {
    $body = getJsonBody();
    $id          = (int)($body['id'] ?? 0);
    $name        = trim($body['name'] ?? '');
    $description = $body['description'] ?? null;

    if ($id <= 0) jsonError('ID is required');

    $db->prepare('UPDATE installments SET name = ?, description = ? WHERE id = ? AND user_id = ?')
       ->execute([$name, $description, $id, $userId]);

    jsonResponse(['message' => 'Installment updated']);
}

if ($method === 'DELETE' && $action === 'delete') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    $db->prepare('DELETE FROM installment_payments WHERE installment_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM installments WHERE id = ? AND user_id = ?')->execute([$id, $userId]);

    jsonResponse(['message' => 'Installment deleted']);
}

if ($method === 'GET' && $action === 'payments') {
    $installmentId = (int)($_GET['installment_id'] ?? 0);
    if ($installmentId <= 0) jsonError('installment_id is required');

    $stmt = $db->prepare('SELECT * FROM installment_payments WHERE installment_id = ? ORDER BY payment_number ASC');
    $stmt->execute([$installmentId]);
    jsonResponse(['payments' => $stmt->fetchAll()]);
}

if ($method === 'PUT' && $action === 'mark-paid') {
    $body = getJsonBody();
    $paymentId = (int)($body['payment_id'] ?? 0);
    if ($paymentId <= 0) jsonError('payment_id is required');

    $today = date('Y-m-d');
    $db->prepare('UPDATE installment_payments SET is_paid = 1, paid_date = ? WHERE id = ?')
       ->execute([$today, $paymentId]);

    // Get installment_id
    $stmt = $db->prepare('SELECT installment_id FROM installment_payments WHERE id = ?');
    $stmt->execute([$paymentId]);
    $payment = $stmt->fetch();

    if ($payment) {
        $stmt = $db->prepare('SELECT COUNT(*) as cnt FROM installment_payments WHERE installment_id = ? AND is_paid = 1');
        $stmt->execute([$payment['installment_id']]);
        $paidCount = (int)$stmt->fetch()['cnt'];

        $stmt = $db->prepare('SELECT installment_count FROM installments WHERE id = ?');
        $stmt->execute([$payment['installment_id']]);
        $inst = $stmt->fetch();
        $isCompleted = $paidCount >= (int)($inst['installment_count'] ?? 0) ? 1 : 0;

        $db->prepare('UPDATE installments SET paid_count = ?, is_completed = ? WHERE id = ?')
           ->execute([$paidCount, $isCompleted, $payment['installment_id']]);
    }

    jsonResponse(['message' => 'Payment marked as paid']);
}

if ($method === 'PUT' && $action === 'unmark-paid') {
    $body = getJsonBody();
    $paymentId = (int)($body['payment_id'] ?? 0);
    if ($paymentId <= 0) jsonError('payment_id is required');

    $db->prepare('UPDATE installment_payments SET is_paid = 0, paid_date = NULL WHERE id = ?')
       ->execute([$paymentId]);

    $stmt = $db->prepare('SELECT installment_id FROM installment_payments WHERE id = ?');
    $stmt->execute([$paymentId]);
    $payment = $stmt->fetch();

    if ($payment) {
        $stmt = $db->prepare('SELECT COUNT(*) as cnt FROM installment_payments WHERE installment_id = ? AND is_paid = 1');
        $stmt->execute([$payment['installment_id']]);
        $paidCount = (int)$stmt->fetch()['cnt'];

        $db->prepare('UPDATE installments SET paid_count = ?, is_completed = 0 WHERE id = ?')
           ->execute([$paidCount, $payment['installment_id']]);
    }

    jsonResponse(['message' => 'Payment unmarked']);
}

jsonError('Invalid action or method', 400);
