<?php
// POST /api/logout.php
// Header: Authorization: Bearer <token>
require_once __DIR__ . '/../helpers.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$header = getAuthHeader();
if (preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
    deleteSession($matches[1]);
}

jsonResponse(['message' => 'Logged out']);
