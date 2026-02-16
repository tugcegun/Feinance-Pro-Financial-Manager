<?php
require_once __DIR__ . '/db.php';

// ---- CORS ----
function setCorsHeaders(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// ---- JSON Helpers ----
function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $status = 400): void {
    jsonResponse(['error' => $message], $status);
}

function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ---- Auth Middleware ----
function getAuthHeader(): string {
    // Try standard header first
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        return $_SERVER['HTTP_AUTHORIZATION'];
    }
    // Apache mod_rewrite fallback
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    // Apache with CGI/FastCGI fallback
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            return $headers['Authorization'];
        }
    }
    return '';
}

function requireAuth(): array {
    $header = getAuthHeader();

    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        jsonError('Unauthorized', 401);
    }

    $token = $matches[1];
    $db = getDB();

    $stmt = $db->prepare(
        'SELECT s.id as session_id, s.user_id, u.name, u.email, u.profile_photo, u.created_at
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token = ? AND s.expires_at > NOW()'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonError('Invalid or expired token', 401);
    }

    return $row;
}

// ---- Token Generation ----
function generateToken(): string {
    return bin2hex(random_bytes(64)); // 128 char hex string
}

function createSession(int $userId): string {
    $config = require __DIR__ . '/config.php';
    $token = generateToken();
    $lifetime = $config['token_lifetime'];

    $db = getDB();
    $stmt = $db->prepare(
        'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))'
    );
    $stmt->execute([$userId, $token, $lifetime]);

    return $token;
}

function deleteSession(string $token): void {
    $db = getDB();
    $stmt = $db->prepare('DELETE FROM sessions WHERE token = ?');
    $stmt->execute([$token]);
}

// ---- Cleanup expired sessions ----
function cleanupExpiredSessions(): void {
    $db = getDB();
    $db->exec('DELETE FROM sessions WHERE expires_at < NOW()');
}
