<?php
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

$auth = requireAuth();
$userId = (int)$auth['user_id'];
$db = getDB();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// GET → list (month, year)
// POST ?action=set → upsert budget
// GET ?action=category-spending → category spending
// GET ?action=category-transactions → transactions for category in period

if ($method === 'GET' && $action === '') {
    $month = $_GET['month'] ?? '';
    $year  = (int)($_GET['year'] ?? 0);

    if ($month === '' || $year <= 0) jsonError('month and year are required');

    $stmt = $db->prepare(
        "SELECT b.*, c.name as category_name, c.icon, c.color, c.id as category_id
         FROM budgets b
         LEFT JOIN categories c ON b.category_id = c.id
         WHERE b.user_id = ? AND b.month = ? AND b.year = ?"
    );
    $stmt->execute([$userId, $month, $year]);
    jsonResponse(['budgets' => $stmt->fetchAll()]);
}

if ($method === 'POST' && $action === 'set') {
    $body = getJsonBody();
    $categoryId = (int)($body['category_id'] ?? 0);
    $amount     = (float)($body['amount'] ?? 0);
    $month      = $body['month'] ?? '';
    $year       = (int)($body['year'] ?? 0);

    if ($categoryId <= 0 || $amount <= 0 || $month === '' || $year <= 0) {
        jsonError('category_id, amount, month, year are required');
    }

    // Upsert
    $stmt = $db->prepare('SELECT id FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?');
    $stmt->execute([$userId, $categoryId, $month, $year]);
    $existing = $stmt->fetch();

    if ($existing) {
        $db->prepare('UPDATE budgets SET amount = ? WHERE id = ?')->execute([$amount, $existing['id']]);
    } else {
        $db->prepare('INSERT INTO budgets (user_id, category_id, amount, month, year) VALUES (?, ?, ?, ?, ?)')
           ->execute([$userId, $categoryId, $amount, $month, $year]);
    }

    jsonResponse(['message' => 'Budget set']);
}

if ($method === 'GET' && $action === 'category-spending') {
    $categoryId = (int)($_GET['category_id'] ?? 0);
    $month = $_GET['month'] ?? '';
    $year  = (int)($_GET['year'] ?? 0);

    $stmt = $db->prepare(
        "SELECT COALESCE(SUM(amount), 0) as total
         FROM transactions
         WHERE user_id = ? AND category_id = ? AND type = 'expense'
         AND MONTH(date) = ? AND YEAR(date) = ?
         AND is_deleted = 0"
    );
    $stmt->execute([$userId, $categoryId, (int)$month, $year]);
    $row = $stmt->fetch();
    jsonResponse(['total' => (float)$row['total']]);
}

if ($method === 'GET' && $action === 'category-transactions') {
    $categoryId = (int)($_GET['category_id'] ?? 0);
    $month = $_GET['month'] ?? '';
    $year  = (int)($_GET['year'] ?? 0);

    $stmt = $db->prepare(
        "SELECT t.*, c.name as category_name, c.icon, c.color
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = ? AND t.category_id = ? AND t.type = 'expense'
         AND MONTH(t.date) = ? AND YEAR(t.date) = ?
         ORDER BY t.date DESC"
    );
    $stmt->execute([$userId, $categoryId, (int)$month, $year]);
    jsonResponse(['transactions' => $stmt->fetchAll()]);
}

jsonError('Invalid action or method', 400);
