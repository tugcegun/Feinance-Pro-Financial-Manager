<?php
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

$auth = requireAuth();
$userId = (int)$auth['user_id'];
$db = getDB();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// GET ?action=monthly&month=X&year=Y
// GET ?action=top-categories&month=X&year=Y&limit=N

if ($method === 'GET' && $action === 'monthly') {
    $month = (int)($_GET['month'] ?? 0);
    $year  = (int)($_GET['year'] ?? 0);

    if ($month <= 0 || $year <= 0) jsonError('month and year are required');

    $stmt = $db->prepare(
        "SELECT type, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
         FROM transactions
         WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ? AND is_deleted = 0
         GROUP BY type"
    );
    $stmt->execute([$userId, $month, $year]);
    jsonResponse(['summary' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $action === 'top-categories') {
    $month = (int)($_GET['month'] ?? 0);
    $year  = (int)($_GET['year'] ?? 0);
    $limit = (int)($_GET['limit'] ?? 3);

    if ($month <= 0 || $year <= 0) jsonError('month and year are required');

    $stmt = $db->prepare(
        "SELECT c.id, c.name, c.icon, c.color, COALESCE(SUM(t.amount), 0) as total
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = ? AND t.type = 'expense'
         AND MONTH(t.date) = ? AND YEAR(t.date) = ? AND t.is_deleted = 0
         GROUP BY c.id
         ORDER BY total DESC
         LIMIT ?"
    );
    $stmt->execute([$userId, $month, $year, $limit]);
    jsonResponse(['categories' => $stmt->fetchAll()]);
}

jsonError('Invalid action or method', 400);
