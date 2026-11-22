<?php
declare(strict_types=1);

require_once __DIR__ . '/board.php';
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: private, no-store');

try {
    boardSession();
    $board = boardSnapshot(database(boardDirectory()));
} catch (Throwable $error) {
    error_log('Links page: ' . get_class($error));
    http_response_code(503);
    $board = ['notes' => null, 'canWrite' => false, 'error' => 'The board could not be reached. Please try again.'];
}

function escapeBoardText(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
require __DIR__ . '/board-view.php';
