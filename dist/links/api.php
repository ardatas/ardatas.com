<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
ini_set('display_errors', '0');
umask(0077);

function reply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
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

function database(string $dir): PDO {
    $db = new PDO('sqlite:' . $dir . '/board.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5,
    ]);
    // Established boards serve public reads without acquiring a database write lock.
    if ($db->query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='notes'")->fetchColumn()) return $db;
    $db->exec('CREATE TABLE IF NOT EXISTS attempts (ip TEXT PRIMARY KEY, started INTEGER, count INTEGER)');
    $db->exec('BEGIN IMMEDIATE');
    if (!$db->query("SELECT 1 FROM sqlite_master WHERE type='table' AND name='notes'")->fetchColumn()) {
        $db->exec('CREATE TABLE notes (seq INTEGER PRIMARY KEY, id TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL, url TEXT NOT NULL, description TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1)');
        $insert = $db->prepare('INSERT INTO notes (id,title,url,description) VALUES (?,?,?,?)');
        foreach ([
            ['OpenCourseWare', 'https://ocw.mit.edu/', 'Course notes and problem sets from MIT.'],
            ['Hugging Face Spaces', 'https://huggingface.co/spaces', 'A place to try community-built AI demos.'],
            ['Startup School', 'https://www.startupschool.org/', 'Y Combinator’s free program for founders.'],
        ] as $note) {
            $insert->execute(array_merge([bin2hex(random_bytes(16))], $note));
        }
    }
    $db->exec('COMMIT');
    return $db;
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
    ini_set('session.use_strict_mode', '1');
    session_name('ardatas_links');
    $local = PHP_SAPI === 'cli-server' && in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1'], true);
    session_set_cookie_params(['path' => '/links', 'httponly' => true, 'samesite' => 'Strict', 'secure' => !$local]);
    if (($method === 'POST' || isset($_COOKIE[session_name()])) && !session_start()) {
        throw new RuntimeException('Session unavailable');
    }
    $action = $method === 'GET' ? 'list' : ($input['action'] ?? '');
    if ($action === 'lock') {
        $_SESSION = [];
        session_destroy();
        setcookie(session_name(), '', ['expires' => 1, 'path' => '/links', 'httponly' => true, 'samesite' => 'Strict', 'secure' => !$local]);
    }
    $canWrite = ($_SESSION['until'] ?? 0) > time();
    if (!in_array($action, ['list', 'unlock', 'lock'], true) && !$canWrite) {
        failRequest(401, 'Enter the password to change saved links.');
    }

    $dir = getenv('LINKS_PRIVATE_DIR') ?: dirname($_SERVER['DOCUMENT_ROOT']) . '/.ardatas-links';
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
        $canWrite = true;
    } elseif (!in_array($action, ['list', 'lock'], true)) {
        $id = field($input, 'id', 36);
        if (!preg_match('/^[a-f0-9-]{32,36}$/D', $id)) failRequest(422, 'Invalid note.');
        if ($action === 'create' || $action === 'edit') {
            $title = field($input, 'title', 400);
            $url = field($input, 'url', 2048);
            $description = field($input, 'description', 2400, false);
            if (!filter_var($url, FILTER_VALIDATE_URL) || !in_array(strtolower(parse_url($url, PHP_URL_SCHEME)), ['http', 'https'], true)
                || str_contains($url, '\\') || parse_url($url, PHP_URL_USER) !== null) {
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
    reply(200, ['canWrite' => $canWrite, 'notes' => $db->query('SELECT id,title,url,description,revision,seq FROM notes ORDER BY seq DESC')->fetchAll()]);
} catch (Throwable $error) {
    error_log('Links board: ' . get_class($error));
    failRequest(503, 'The board could not be reached. Please try again.');
}
