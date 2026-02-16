<?php
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

$auth = requireAuth();
$userId = (int)$auth['user_id'];
$db = getDB();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && $action === '') {
    $billId = (int)($_GET['bill_id'] ?? 0);
    if ($billId <= 0) jsonError('bill_id is required');

    $stmt = $db->prepare(
        "SELECT ba.*, fm.name as member_name, fm.email as member_email
         FROM bill_assignments ba
         LEFT JOIN family_members fm ON ba.family_member_id = fm.id
         WHERE ba.bill_id = ?"
    );
    $stmt->execute([$billId]);
    jsonResponse(['assignments' => $stmt->fetchAll()]);
}

if ($method === 'POST' && $action === '') {
    $body = getJsonBody();
    $billId          = (int)($body['bill_id'] ?? 0);
    $familyMemberId  = (int)($body['family_member_id'] ?? 0);
    $shareAmount     = isset($body['share_amount']) ? (float)$body['share_amount'] : null;
    $sharePercentage = isset($body['share_percentage']) ? (float)$body['share_percentage'] : null;

    if ($billId <= 0 || $familyMemberId <= 0) jsonError('bill_id and family_member_id are required');

    $stmt = $db->prepare(
        'INSERT INTO bill_assignments (bill_id, family_member_id, share_amount, share_percentage) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$billId, $familyMemberId, $shareAmount, $sharePercentage]);
    $id = (int)$db->lastInsertId();

    jsonResponse(['id' => $id, 'message' => 'Assignment added'], 201);
}

if ($method === 'PUT' && $action === 'update-payment') {
    $body = getJsonBody();
    $id     = (int)($body['id'] ?? 0);
    $isPaid = (int)($body['is_paid'] ?? 0);

    if ($id <= 0) jsonError('ID is required');

    $db->prepare('UPDATE bill_assignments SET is_paid = ? WHERE id = ?')->execute([$isPaid, $id]);
    jsonResponse(['message' => 'Payment status updated']);
}

if ($method === 'DELETE' && $action === 'delete') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonError('ID is required');

    $db->prepare('DELETE FROM bill_assignments WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'Assignment deleted']);
}

jsonError('Invalid action or method', 400);
