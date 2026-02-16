<?php
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

$auth = requireAuth();
$userId = (int)$auth['user_id'];
$db = getDB();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && $action === '') {
    $showPaid = ($_GET['show_paid'] ?? '0') === '1';
    $query = 'SELECT * FROM bills WHERE user_id = ?';
    if (!$showPaid) {
        $query .= ' AND is_paid = 0';
    }
    $query .= ' ORDER BY due_date ASC';
    $stmt = $db->prepare($query);
    $stmt->execute([$userId]);
    jsonResponse(['bills' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $action === 'get-by-id') {
    $id = (int)($_GET['id'] ?? 0);
    $stmt = $db->prepare('SELECT * FROM bills WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $userId]);
    $bill = $stmt->fetch();
    if (!$bill) jsonError('Bill not found', 404);
    jsonResponse(['bill' => $bill]);
}

if ($method === 'POST' && $action === '') {
    $body = getJsonBody();
    $name         = trim($body['name'] ?? '');
    $type         = $body['type'] ?? '';
    $amount       = isset($body['amount']) ? (float)$body['amount'] : null;
    $dueDate      = $body['due_date'] ?? null;
    $photoUri     = $body['photo_uri'] ?? null;
    $notes        = $body['notes'] ?? null;
    $isRecurring  = (int)($body['is_recurring'] ?? 0);
    $recurringDay = isset($body['recurring_day']) ? (int)$body['recurring_day'] : null;
    $reminderDays = (int)($body['reminder_days'] ?? 3);

    if ($name === '' || $type === '') jsonError('Name and type are required');

    $stmt = $db->prepare(
        'INSERT INTO bills (user_id, name, type, amount, due_date, photo_uri, notes, is_recurring, recurring_day, reminder_days)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $name, $type, $amount, $dueDate, $photoUri, $notes, $isRecurring, $recurringDay, $reminderDays]);
    $id = (int)$db->lastInsertId();

    jsonResponse(['id' => $id, 'message' => 'Bill added'], 201);
}

if ($method === 'PUT' && $action === 'update') {
    $body = getJsonBody();
    $id           = (int)($body['id'] ?? 0);
    $name         = trim($body['name'] ?? '');
    $type         = $body['type'] ?? '';
    $amount       = isset($body['amount']) ? (float)$body['amount'] : null;
    $dueDate      = $body['due_date'] ?? null;
    $photoUri     = $body['photo_uri'] ?? null;
    $notes        = $body['notes'] ?? null;
    $isRecurring  = (int)($body['is_recurring'] ?? 0);
    $recurringDay = isset($body['recurring_day']) ? (int)$body['recurring_day'] : null;
    $reminderDays = (int)($body['reminder_days'] ?? 3);

    if ($id <= 0) jsonError('ID is required');

    $stmt = $db->prepare(
        'UPDATE bills SET name = ?, type = ?, amount = ?, due_date = ?, photo_uri = ?, notes = ?,
         is_recurring = ?, recurring_day = ?, reminder_days = ? WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$name, $type, $amount, $dueDate, $photoUri, $notes, $isRecurring, $recurringDay, $reminderDays, $id, $userId]);

    jsonResponse(['message' => 'Bill updated']);
}

if ($method === 'POST' && $action === 'mark-paid') {
    $body = getJsonBody();
    $billId   = (int)($body['bill_id'] ?? 0);
    $paidDate = $body['paid_date'] ?? date('Y-m-d');
    $amount   = isset($body['amount']) ? (float)$body['amount'] : null;
    $photoUri = $body['photo_uri'] ?? null;
    $notes    = $body['notes'] ?? null;

    if ($billId <= 0) jsonError('bill_id is required');

    // Get bill info
    $stmt = $db->prepare('SELECT * FROM bills WHERE id = ? AND user_id = ?');
    $stmt->execute([$billId, $userId]);
    $bill = $stmt->fetch();
    if (!$bill) jsonError('Bill not found', 404);

    $payAmount = $amount ?? (float)$bill['amount'];

    // Add to history
    $db->prepare('INSERT INTO bill_history (bill_id, user_id, amount, paid_date, photo_uri, notes) VALUES (?, ?, ?, ?, ?, ?)')
       ->execute([$billId, $userId, $payAmount, $paidDate, $photoUri, $notes]);

    // If recurring, create next bill
    if ($bill['is_recurring'] && $bill['recurring_day']) {
        $current = new DateTime($bill['due_date']);
        $current->modify('+1 month');
        $nextDueDate = $current->format('Y-m') . '-' . str_pad($bill['recurring_day'], 2, '0', STR_PAD_LEFT);
        // Clamp day
        $daysInMonth = (int)(new DateTime($current->format('Y-m-01')))->format('t');
        $day = min($bill['recurring_day'], $daysInMonth);
        $nextDueDate = $current->format('Y-m') . '-' . str_pad($day, 2, '0', STR_PAD_LEFT);

        $db->prepare(
            'INSERT INTO bills (user_id, name, type, amount, due_date, is_recurring, recurring_day, reminder_days) VALUES (?, ?, ?, ?, ?, 1, ?, ?)'
        )->execute([$userId, $bill['name'], $bill['type'], null, $nextDueDate, $bill['recurring_day'], $bill['reminder_days']]);
    }

    // Mark current bill as paid
    $db->prepare('UPDATE bills SET is_paid = 1, paid_date = ? WHERE id = ?')
       ->execute([$paidDate, $billId]);

    jsonResponse(['message' => 'Bill marked as paid']);
}

if ($method === 'DELETE' && $action === 'delete') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    $db->prepare('DELETE FROM bill_assignments WHERE bill_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM bill_history WHERE bill_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM bills WHERE id = ? AND user_id = ?')->execute([$id, $userId]);

    jsonResponse(['message' => 'Bill deleted']);
}

if ($method === 'GET' && $action === 'history') {
    $billId = isset($_GET['bill_id']) ? (int)$_GET['bill_id'] : null;

    $query = "SELECT bh.*, b.name as bill_name, b.type as bill_type
              FROM bill_history bh
              LEFT JOIN bills b ON bh.bill_id = b.id
              WHERE bh.user_id = ?";
    $params = [$userId];

    if ($billId) {
        $query .= ' AND bh.bill_id = ?';
        $params[] = $billId;
    }
    $query .= ' ORDER BY bh.paid_date DESC';

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    jsonResponse(['history' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $action === 'due-soon') {
    $daysAhead = (int)($_GET['days'] ?? 7);
    $today = date('Y-m-d');
    $future = date('Y-m-d', strtotime("+{$daysAhead} days"));

    $stmt = $db->prepare(
        'SELECT * FROM bills WHERE user_id = ? AND is_paid = 0 AND due_date >= ? AND due_date <= ? ORDER BY due_date ASC'
    );
    $stmt->execute([$userId, $today, $future]);
    jsonResponse(['bills' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $action === 'overdue') {
    $today = date('Y-m-d');
    $stmt = $db->prepare(
        'SELECT * FROM bills WHERE user_id = ? AND is_paid = 0 AND due_date < ? ORDER BY due_date ASC'
    );
    $stmt->execute([$userId, $today]);
    jsonResponse(['bills' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $action === 'monthly-summary') {
    $month = (int)($_GET['month'] ?? 0);
    $year  = (int)($_GET['year'] ?? 0);

    $stmt = $db->prepare(
        "SELECT b.type, COALESCE(SUM(bh.amount), 0) as total, COUNT(*) as count
         FROM bill_history bh
         LEFT JOIN bills b ON bh.bill_id = b.id
         WHERE bh.user_id = ? AND MONTH(bh.paid_date) = ? AND YEAR(bh.paid_date) = ?
         GROUP BY b.type"
    );
    $stmt->execute([$userId, $month, $year]);
    jsonResponse(['summary' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $action === 'yearly-summary') {
    $year = (int)($_GET['year'] ?? 0);

    $stmt = $db->prepare(
        "SELECT b.type, LPAD(MONTH(bh.paid_date), 2, '0') as month, COALESCE(SUM(bh.amount), 0) as total
         FROM bill_history bh
         LEFT JOIN bills b ON bh.bill_id = b.id
         WHERE bh.user_id = ? AND YEAR(bh.paid_date) = ?
         GROUP BY b.type, MONTH(bh.paid_date)
         ORDER BY month ASC"
    );
    $stmt->execute([$userId, $year]);
    jsonResponse(['summary' => $stmt->fetchAll()]);
}

jsonError('Invalid action or method', 400);
