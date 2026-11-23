<?php
declare(strict_types=1);

ini_set('display_errors', '0');
umask(0077);

function boardDirectory(): string {
    return getenv('LINKS_PRIVATE_DIR') ?: dirname($_SERVER['DOCUMENT_ROOT']) . '/.ardatas-links';
}

function boardSession(bool $write = false): array {
    if (PHP_VERSION_ID < 80513) throw new RuntimeException('The server PHP runtime needs an update.');
    ini_set('session.use_strict_mode', '1');
    session_name('ardatas_links');
    $local = PHP_SAPI === 'cli-server' && in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1'], true);
    $cookie = ['path' => '/links', 'secure' => !$local, 'httponly' => true, 'samesite' => 'Strict'];
    session_set_cookie_params($cookie);
    if (($write || isset($_COOKIE[session_name()])) && !session_start(['read_and_close' => !$write])) {
        throw new RuntimeException('Session unavailable');
    }
    return $cookie;
}

function boardCanWrite(): bool {
    return ($_SESSION['until'] ?? 0) > time();
}

function database(string $dir): PDO {
    $db = new PDO('sqlite:' . $dir . '/board.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5,
    ]);
    $db->exec('PRAGMA foreign_keys = ON');
    if ((int)$db->query('PRAGMA user_version')->fetchColumn() >= 1) return $db;
    $db->exec('BEGIN IMMEDIATE');
    $db->exec('CREATE TABLE IF NOT EXISTS attempts (ip TEXT PRIMARY KEY, started INTEGER, count INTEGER)');
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
    if ((int)$db->query('PRAGMA user_version')->fetchColumn() < 1) {
        $db->exec('CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
            icon TEXT NOT NULL, colour TEXT NOT NULL)');
        $db->exec('ALTER TABLE notes ADD COLUMN tagId TEXT REFERENCES tags(id)');
        $db->exec('PRAGMA user_version = 1');
    }
    $db->exec('COMMIT');
    return $db;
}

function boardSnapshot(PDO $db): array {
    $notes = $db->query('SELECT id,title,url,description,revision,seq,tagId FROM notes ORDER BY seq DESC')->fetchAll();
    $tags = $db->query('SELECT id,name,icon,colour FROM tags ORDER BY name')->fetchAll();
    return ['notes' => $notes, 'tags' => $tags, 'canWrite' => boardCanWrite()];
}
