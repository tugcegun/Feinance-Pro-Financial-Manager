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
        "SELECT rt.*, c.name as category_name, c.icon, c.color, a.name as account_name
         FROM recurring_transactions rt
         LEFT JOIN categories c ON rt.category_id = c.id
         LEFT JOIN accounts a ON rt.account_id = a.id
         WHERE rt.user_id = ?
         ORDER BY rt.created_at DESC"
    );
    $stmt->execute([$userId]);
    jsonResponse(['recurring_transactions' => $stmt->fetchAll()]);
}

if ($method === 'POST' && $action === '') {
    $body = getJsonBody();
    $type        = $body['type'] ?? '';
    $amount      = (float)($body['amount'] ?? 0);
    $categoryId  = isset($body['category_id']) ? (int)$body['category_id'] : null;
    $description = $body['description'] ?? null;
    $accountId   = isset($body['account_id']) ? (int)$body['account_id'] : null;
    $frequency   = $body['frequency'] ?? '';
    $dayOfWeek   = isset($body['day_of_week']) ? (int)$body['day_of_week'] : null;
    $dayOfMonth  = isset($body['day_of_month']) ? (int)$body['day_of_month'] : null;
    $startDate   = $body['start_date'] ?? '';
    $endDate     = $body['end_date'] ?? null;

    if (!in_array($type, ['income', 'expense']) || $amount <= 0 || !in_array($frequency, ['daily', 'weekly', 'monthly'])) {
        jsonError('Valid type, amount, and frequency are required');
    }

    $stmt = $db->prepare(
        'INSERT INTO recurring_transactions (user_id, type, amount, category_id, description, account_id, frequency, day_of_week, day_of_month, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $type, $amount, $categoryId, $description, $accountId, $frequency, $dayOfWeek, $dayOfMonth, $startDate, $endDate]);
    $id = (int)$db->lastInsertId();

    jsonResponse(['id' => $id, 'message' => 'Recurring transaction added'], 201);
}

if ($method === 'PUT' && $action === 'update') {
    $body = getJsonBody();
    $id          = (int)($body['id'] ?? 0);
    $type        = $body['type'] ?? '';
    $amount      = (float)($body['amount'] ?? 0);
    $categoryId  = isset($body['category_id']) ? (int)$body['category_id'] : null;
    $description = $body['description'] ?? null;
    $accountId   = isset($body['account_id']) ? (int)$body['account_id'] : null;
    $frequency   = $body['frequency'] ?? '';
    $dayOfWeek   = isset($body['day_of_week']) ? (int)$body['day_of_week'] : null;
    $dayOfMonth  = isset($body['day_of_month']) ? (int)$body['day_of_month'] : null;
    $startDate   = $body['start_date'] ?? '';
    $endDate     = $body['end_date'] ?? null;

    if ($id <= 0) jsonError('ID is required');

    $stmt = $db->prepare(
        'UPDATE recurring_transactions SET type = ?, amount = ?, category_id = ?, description = ?, account_id = ?, frequency = ?, day_of_week = ?, day_of_month = ?, start_date = ?, end_date = ? WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$type, $amount, $categoryId, $description, $accountId, $frequency, $dayOfWeek, $dayOfMonth, $startDate, $endDate, $id, $userId]);

    jsonResponse(['message' => 'Recurring transaction updated']);
}

if ($method === 'DELETE' && $action === 'delete') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    $db->prepare('DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
    jsonResponse(['message' => 'Recurring transaction deleted']);
}

if ($method === 'PUT' && $action === 'toggle') {
    $body = getJsonBody();
    $id       = (int)($body['id'] ?? 0);
    $isActive = (int)($body['is_active'] ?? 0);

    if ($id <= 0) jsonError('ID is required');

    $db->prepare('UPDATE recurring_transactions SET is_active = ? WHERE id = ? AND user_id = ?')
       ->execute([$isActive, $id, $userId]);

    jsonResponse(['message' => 'Recurring transaction toggled']);
}

if ($method === 'POST' && $action === 'process') {
    $today = date('Y-m-d');
    $generatedCount = 0;

    $stmt = $db->prepare('SELECT * FROM recurring_transactions WHERE user_id = ? AND is_active = 1');
    $stmt->execute([$userId]);
    $recurrings = $stmt->fetchAll();

    foreach ($recurrings as $rec) {
        if ($rec['end_date'] && $rec['end_date'] < $today) continue;

        $cursor = $rec['last_generated_date']
            ? (new DateTime($rec['last_generated_date']))->modify('+1 day')
            : new DateTime($rec['start_date']);

        $todayDt = new DateTime($today);
        $lastGenerated = $rec['last_generated_date'];

        while ($cursor <= $todayDt) {
            $cursorStr = $cursor->format('Y-m-d');
            if ($rec['end_date'] && $cursorStr > $rec['end_date']) break;

            $shouldGenerate = false;

            if ($rec['frequency'] === 'daily') {
                $shouldGenerate = true;
            } elseif ($rec['frequency'] === 'weekly') {
                $jsDay = (int)$cursor->format('w'); // 0=Sun
                $storedDay = $jsDay === 0 ? 7 : $jsDay;
                if ($storedDay === (int)$rec['day_of_week']) {
                    $shouldGenerate = true;
                }
            } elseif ($rec['frequency'] === 'monthly') {
                $daysInMonth = (int)$cursor->format('t');
                $targetDay = min((int)$rec['day_of_month'], $daysInMonth);
                if ((int)$cursor->format('j') === $targetDay) {
                    $shouldGenerate = true;
                }
            }

            if ($shouldGenerate) {
                // Insert transaction
                $ins = $db->prepare(
                    'INSERT INTO transactions (user_id, type, amount, category_id, description, date, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
                );
                $ins->execute([
                    $userId, $rec['type'], $rec['amount'], $rec['category_id'],
                    $rec['description'], $cursorStr, $rec['account_id']
                ]);

                // Update account balance
                if ($rec['account_id']) {
                    if ($rec['type'] === 'income') {
                        $db->prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?')->execute([$rec['amount'], $rec['account_id']]);
                    } else {
                        $db->prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?')->execute([$rec['amount'], $rec['account_id']]);
                    }
                }

                $generatedCount++;
                $lastGenerated = $cursorStr;
            }

            $cursor->modify('+1 day');
        }

        if ($lastGenerated && $lastGenerated !== $rec['last_generated_date']) {
            $db->prepare('UPDATE recurring_transactions SET last_generated_date = ? WHERE id = ?')
               ->execute([$lastGenerated, $rec['id']]);
        }
    }

    jsonResponse(['generated_count' => $generatedCount]);
}

jsonError('Invalid action or method', 400);
