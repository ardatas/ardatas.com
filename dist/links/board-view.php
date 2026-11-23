<?php if (!isset($board)) { http_response_code(404); exit; } ?>



<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <link rel="icon" type="image/x-icon" sizes="16x16 32x32 48x48 64x64 128x128 256x256" href="/favicon.ico?v=07b11e185c1d" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=a468793563a0" />
    <link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg?v=64398e270667" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=1f8131d0b843" />
    <title>Links | Arda Tas</title>

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400;1,700&family=Instrument+Sans:wdth,wght@75..100,400..600&display=swap"
      rel="stylesheet"
    />

    <link rel="stylesheet" href="/index.css?v=db9f24f6a5cc" />

    <link rel="stylesheet" href="/site-path.css?v=db66aeaf8a44" />

    <script src="/site-path.js?v=ccac3088c3db" defer></script>


    <script src="/link-conversion.js?v=33de9b6de076" defer></script>
    <script>
      /*to prevent Firefox FOUC, this must be here*/
      let FF_FOUC_FIX;
    </script>


    <meta name="referrer" content="no-referrer" />
    <link rel="stylesheet" href="/links/links.css?v=8af319bb0757" />
    <script type="module" src="/links/links.js?v=4e2e133f3d67"></script>

  </head>
  <body id="top" class="text-[#101114]">

    <div
      class="flex min-h-screen flex-col max-w-5xl mx-auto px-4 py-3 sm:py-8 text-[15px] leading-5 font-normal tracking-[-0.005em] antialiased font-sans"
    >




<div id="portfolio-path">
  <nav class="nimbus-nav" data-compact="false" aria-label="Portfolio path">
    <span class="nimbus-glass" aria-hidden="true"></span>

      <a class="nimbus-item" href="/" data-fx="glow"

         >
        <svg aria-hidden="true" focusable="false" class="ui-icon " width="18" height="18" viewBox="0 0 24 24"><use href="/assets/hugeicons.svg?v=8db57b131cc8#home-01"></use></svg><span class="nimbus-label">Home</span>
      </a>

      <a class="nimbus-item" href="/links/" data-fx="pop"

         aria-current="page">
        <svg aria-hidden="true" focusable="false" class="ui-icon " width="18" height="18" viewBox="0 0 24 24"><use href="/assets/hugeicons.svg?v=8db57b131cc8#chain-link"></use></svg><span class="nimbus-label">Links</span>
      </a>

      <a class="nimbus-item" href="https://linkedin.com/in/arda-tas" data-fx="pop"
         target="_blank" rel="noopener noreferrer" aria-label="LinkedIn (opens in a new tab)"
         >
        <svg aria-hidden="true" focusable="false" class="ui-icon " width="18" height="18" viewBox="0 0 24 24"><use href="/assets/hugeicons.svg?v=8db57b131cc8#linkedin-01"></use></svg><span class="nimbus-label">LinkedIn</span>
      </a>

      <a class="nimbus-item" href="https://github.com/ardatas" data-fx="pop"
         target="_blank" rel="noopener noreferrer" aria-label="GitHub (opens in a new tab)"
         >
        <svg aria-hidden="true" focusable="false" class="ui-icon " width="18" height="18" viewBox="0 0 24 24"><use href="/assets/hugeicons.svg?v=8db57b131cc8#github"></use></svg><span class="nimbus-label">GitHub</span>
      </a>

  </nav>
</div>
      <main class="flex flex-col">

    <div id="links-board" aria-label="Saved links">

      <?php if ($board['notes'] === null): ?>
        <div class="board-loading"><p role="alert"><?= escapeBoardText($board['error']) ?></p><a class="text-btn" href="/links/">Try again</a></div>
      <?php else: ?>
        <section class="board-desk">
          <header class="board-head">
            <div><div class="board-counter"><?= count($board['notes']) ?> <?= count($board['notes']) === 1 ? 'note' : 'notes' ?></div><h1>Saved links</h1></div>
            <div class="board-actions"><button class="ink-btn" disabled><svg aria-hidden="true" focusable="false" class="ui-icon " width="17" height="17" viewBox="0 0 24 24"><use href="/assets/hugeicons.svg?v=8db57b131cc8#plus-sign"></use></svg> New note</button></div>
          </header>
          <?php if (!$board['notes']): ?><p class="empty-board">Save your first link with “New note”.</p><?php endif; ?>
          <?php
            $tagsById = array_column($board['tags'], null, 'id');
            $groups = [];
            foreach ($board['notes'] as $note) $groups[$note['tagId'] ?? ''][] = $note;
            foreach ($groups as $id => $notes): $tag = $tagsById[$id] ?? null;
          ?>
          <section class="note-group">
            <h2 class="note-group-title"><?php if ($tag): ?><span aria-hidden="true"><?= escapeBoardText($tag['icon']) ?> </span><?= escapeBoardText($tag['name']) ?><?php else: ?>Untagged<?php endif; ?></h2>
            <ul class="note-grid">
              <?php foreach ($notes as $note): ?>
              <li class="note-slot" data-tone="<?= ((int)$note['seq'] - 1) % 4 ?>"<?php if ($tag): ?> style="--paper: <?= escapeBoardText($tag['colour']) ?>"<?php endif; ?>>
                <div class="note-sheet">
                  <div class="note-top"><span class="note-host"><?= escapeBoardText(preg_replace('/^www\./i', '', (string)parse_url($note['url'], PHP_URL_HOST))) ?></span></div>
                  <?php if ($tag): ?><div class="note-tag"><span aria-hidden="true"><?= escapeBoardText($tag['icon']) ?></span> <?= escapeBoardText($tag['name']) ?></div><?php endif; ?>
                  <a class="note-link" href="<?= escapeBoardText($note['url']) ?>" target="_blank" rel="noopener noreferrer"><span><?= escapeBoardText($note['title']) ?></span><span class="note-arrow" aria-hidden="true">↗</span></a>
                  <?php if ($note['description'] !== ''): ?><p class="note-description"><?= escapeBoardText($note['description']) ?></p><?php endif; ?>
                  <span class="paper-corner" aria-hidden="true"></span>
                </div>
              </li>
            <?php endforeach; ?>
            </ul>
          </section>
          <?php endforeach; ?>
        </section>
      <?php endif; ?>

    </div>

    <script type="application/json" id="initial-links"><?= json_encode($board, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_INVALID_UTF8_SUBSTITUTE) ?></script>


      </main>
      <footer id="links" class="links-footer mt-3" aria-labelledby="links-title">
        <div id="footer-plane" aria-hidden="true"></div>
        <h2 id="links-title" class="section-title font-mono italic tracking-tight">cat ~/links.md</h2>
        <ul class="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm">

            <li><a class="social-link inline-flex min-h-8 items-center gap-1.5" href="https://linkedin.com/in/arda-tas" target="_blank" rel="noopener noreferrer">
              <svg aria-hidden="true" focusable="false" class="ui-icon " width="16" height="16" viewBox="0 0 24 24"><use href="/assets/hugeicons.svg?v=8db57b131cc8#linkedin-01"></use></svg> LinkedIn
            </a></li>

            <li><a class="social-link inline-flex min-h-8 items-center gap-1.5" href="https://github.com/ardatas" target="_blank" rel="noopener noreferrer">
              <svg aria-hidden="true" focusable="false" class="ui-icon " width="16" height="16" viewBox="0 0 24 24"><use href="/assets/hugeicons.svg?v=8db57b131cc8#github"></use></svg> GitHub
            </a></li>

        </ul>

      </footer>
    </div>
    <script type="module">
      const plane = document.getElementById("footer-plane");
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          import("/footer-plane.js?v=6438e1fd0a05");
        }
      });
      observer.observe(plane);
    </script>

  </body>
</html>
