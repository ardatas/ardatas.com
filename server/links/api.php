<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
require_once __DIR__ . '/board.php';

function reply(int $status, array $body): void {
    $json = json_encode($body, JSON_UNESCAPED_SLASHES);
    if ($json === false) throw new RuntimeException('Invalid board response');
    http_response_code($status);
    echo $json;
    exit;
}

function failRequest(int $status, string $message): void {
    reply($status, ['error' => $message]);
}

function field(array $input, string $name, int $max, bool $required = true): string {
    $value = $input[$name] ?? '';
    if (!is_string($value) || strlen($value) > $max || ($required && trim($value) === '')) {
        failRequest(422, "Check the $name and try again.");
    }
    return trim($value);
}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    if (!in_array($method, ['GET', 'POST'], true)) failRequest(405, 'Use GET or POST.');
    $input = [];
    if ($method === 'POST') {
        // A cross-origin page cannot set this header without a successful CORS preflight.
        if (($_SERVER['HTTP_X_LINKS_BOARD'] ?? '') !== '1' ||
            explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0] !== 'application/json') {
            failRequest(403, 'Open the board to make changes.');
        }
        $body = file_get_contents('php://input', false, null, 0, 16385);
        if (strlen($body) > 16384) failRequest(413, 'This note is too long.');
        $input = json_decode($body, true);
        if (!is_array($input)) failRequest(400, 'Invalid request.');
    }
    $cookie = boardSession($method === 'POST');
    $action = $method === 'GET' ? 'list' : ($input['action'] ?? '');
    if ($action === 'lock') {
        $_SESSION = [];
        session_destroy();
        setcookie(session_name(), '', ['expires' => 1] + $cookie);
    }
    if (!in_array($action, ['list', 'unlock', 'lock'], true) && !boardCanWrite()) {
        failRequest(401, 'Enter the password to change saved links.');
    }

    $dir = boardDirectory();
    $db = database($dir);
    if ($action === 'unlock') {
        $hash = is_readable($dir . '/password.hash') ? trim(file_get_contents($dir . '/password.hash')) : '';
        if (!$hash) failRequest(503, 'Editing is unavailable. Try again later.');
        $password = $input['password'] ?? null;
        if (!is_string($password) || strlen($password) > 256) failRequest(422, 'Enter a valid password.');
        $ip = hash('sha256', $_SERVER['REMOTE_ADDR']);
        $db->exec('BEGIN IMMEDIATE');
        $db->prepare('DELETE FROM attempts WHERE started <= ?')->execute([time() - 600]);
        $db->prepare('INSERT OR IGNORE INTO attempts VALUES (?,?,0)')->execute([$ip, time()]);
        $db->prepare('UPDATE attempts SET count=count+1 WHERE ip=?')->execute([$ip]);
        $query = $db->prepare('SELECT count FROM attempts WHERE ip=?');
        $query->execute([$ip]);
        $count = $query->fetchColumn();
        $db->exec('COMMIT');
        if ($count > 10) failRequest(429, 'Too many attempts. Try again in ten minutes.');
        if (!password_verify($password, $hash)) failRequest(401, 'That password didn’t match. Try again.');
        $db->prepare('DELETE FROM attempts WHERE ip=?')->execute([$ip]);
        session_regenerate_id(true);
        $_SESSION['until'] = time() + 12 * 3600;
    } elseif (!in_array($action, ['list', 'lock'], true)) {
        $id = field($input, 'id', 36);
        if (!preg_match('/^[a-f0-9-]{32,36}$/D', $id)) failRequest(422, 'Invalid note.');
        if ($action === 'create' || $action === 'edit') {
            $title = field($input, 'title', 400);
            $url = field($input, 'url', 2048);
            $description = field($input, 'description', 2400, false);
            if (!filter_var($url, FILTER_VALIDATE_URL) || !in_array(strtolower(parse_url($url, PHP_URL_SCHEME)), ['http', 'https'], true)
                || strpos($url, '\\') !== false || parse_url($url, PHP_URL_USER) !== null) {
                failRequest(422, 'Enter an http or https link without sign-in details.');
            }
            if ($action === 'create') {
                // A retried save with the same client-generated ID creates one note.
                $db->prepare('INSERT OR IGNORE INTO notes (title,url,description,id) VALUES (?,?,?,?)')
                    ->execute([$title, $url, $description, $id]);
            } else {
                $query = $db->prepare('UPDATE notes SET title=?, url=?, description=?, revision=revision+1 WHERE id=? AND revision=?');
                $query->execute([$title, $url, $description, $id, (int)($input['revision'] ?? 0)]);
            }
        } elseif ($action === 'delete') {
            $query = $db->prepare('DELETE FROM notes WHERE id=? AND revision=?');
            $query->execute([$id, (int)($input['revision'] ?? 0)]);
        } else {
            failRequest(400, 'Unknown action.');
        }
        if ($action !== 'create' && !$query->rowCount()) failRequest(409, 'This note changed. Reopen it from the board.');
    }
    reply(200, boardSnapshot($db));
} catch (Throwable $error) {
    error_log('Links board: ' . get_class($error));
    failRequest(503, 'The board could not be reached. Please try again.');
}
