# Studyplan overnight QA · 17 November 2026

Two reproduced bugs are fixed on `codex/studyplan-overnight-qa`. The final production build passed 54 browser tests, 20 core tests, and 2 importer tests. Nothing was pushed or deployed.

The worktree is `/Users/ardatas/Desktop/Projects/ardatas-studyplan-qa`, based on `a964a37`. The original checkout remains on `main`; its three existing edits match their pre-QA contents byte for byte. [Preservation evidence](logs/preservation.txt).

## Fixes

| Priority | Reproduction and impact | Result |
| --- | --- | --- |
| P1 | Open two ordinary tabs. Add IT Security Group 16 in the first, then Group 17 in the second. Reload: only Group 17 remained. | Ordinary tabs now consume saved-plan storage updates. Both selections survive. The handler reads the latest stored value rather than replaying an older queued event. |
| P2 | Block localStorage, then click “Dismiss notice.” The warning remained because the handler cleared only the ordinary notice, not storage errors. | Dismiss clears the displayed error states. Another failed save shows the warning again; the plan still reports “Unsaved.” |

The fixes are in [main.tsx](../../../src/main.tsx). [Regression tests](../../../tests/e2e/overnight-qa.spec.ts) cover both fixes, shared-preview isolation, saving a copy, reset propagation, focus after removing the last selection, the last catalogue action, and responsive views.

Both bugs failed in Chromium and mobile WebKit before the fixes. See the [data-loss reproduction](logs/data-loss-before.log) and [original regression failures](logs/regressions-before.log). Shared previews continue to ignore ordinary saved-plan updates until the user chooses “Save a copy.”

## Verification

Commands ran from `studyplan/` in the QA worktree, using Node v22.15.0. Saved log copies have trailing whitespace removed. Browser tests used the locally built production files through Vite preview.

| Check | Result | Evidence |
| --- | --- | --- |
| Existing browser suite before changes | 42 passed | [Baseline log](logs/baseline-browser.log) |
| `npm test` | 20 passed | [Core tests](logs/final-unit.log) |
| `python3 -m unittest discover -s tests -p 'test_*.py'` | 2 passed | [Importer tests](logs/final-importer.log) |
| `npm run build` | Passed: TypeScript and Vite | [Build log](logs/final-build.log) |
| `npm run test:e2e -- --workers=2` | 54 passed; 27 per browser project | [Browser log](logs/final-browser.log) |
| `git diff --check` | Passed | Checked before commit |

Coverage includes all five courses, selection and reload persistence, filters, month/week/day/list navigation, sticky weekdays, overlapping sessions, skipped dates, malformed share links, unavailable storage, guarded reset, ICS contents and download, private weekly visits, Monday expiry, the tutor wheel, reduced motion, keyboard interaction, and iframe storage isolation.

The added layout sweep checks 320×568, 390×844, 844×390, 768×1024, 1024×768, and 1440×900 in both browser projects. It checks horizontal overflow and dialog fit, and records uncaught page errors. Existing tests add other viewport sizes. Tests pin the clock to 4 November for established fixtures and 17 November for the new layout screenshots.

## Screenshots

These screenshots came from the passing production-build browser run. Desktop and phone screenshots were visually inspected along with landscape and error states.

### Desktop · all courses

![Desktop calendar](screenshots/desktop-week.png)

### Mobile WebKit · portrait

![Mobile calendar](screenshots/mobile-week.png)

### Mobile WebKit · landscape

![Landscape calendar](screenshots/mobile-landscape.png)

Additional captures: [tutor wheel](screenshots/mobile-tutor-wheel.png), [storage warning after another failed save](screenshots/mobile-storage-warning.png).

## Limits and remaining observations

- Mobile coverage uses Playwright's iPhone 13/WebKit emulation, not a physical iPhone or Android device. Native calendar-app import was not tested; exported ICS data and browser downloads were tested.
- The checked timetable remains the repository's 28 October source snapshot. Official course pages were not refreshed in this QA pass.
- Sequential edits across tabs, reset propagation, and preview isolation are covered. Simultaneous writes are not transactional; adversarial same-instant write races were not tested.
- `npm audit` reported four high-severity entries in the existing Vite/picomatch build-tool dependency tree. Its proposed automatic fix changes Vite's major version; dependencies were left unchanged. [Audit output](logs/dependency-audit.json).
- Vite still reports a JavaScript chunk above 500 kB and ignored dependency “use client” directives. The build succeeds; no performance benchmark was run.
- The optional `21st review` CLI was unavailable. Source inspection, browser assertions, and screenshot review were used instead.

The commit uses the GitHub noreply identity for account `ardatas` (verified account ID 85059535), supplied only through the commit command's environment. No Git or GitHub configuration was changed. The checked-in Studyplan build is updated for review; publishing remains a separate action.
