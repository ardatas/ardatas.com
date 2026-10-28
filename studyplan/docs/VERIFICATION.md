# Verification — 28 October 2026

## Published release

Live at https://studyplan.ardatas.com/ in the dedicated document root `/home/ardatas/studyplan.ardatas.com`.

- Release: `artifacts/studyplan-2026-10-28T04-15-17-267Z.zip`.
- Upload: `artifacts/studyplan-v2-upload.zip`, SHA-256 `1ed8a6678e82a909534f6516e5e7f685d33303f739adacba2d47825c7fcdd05f`.
- The uploaded ZIP matched local bytes before extraction. All 11 deployed app files subsequently matched `dist/` by SHA-256 over valid HTTPS (`node scripts/verify-live.mjs`). Report: `artifacts/live-verification.json`, checked at 05:46:46 UTC.
- The NumProg upload `studyplan-numprog.zip` was moved to account home outside the public root; its public URL returns 404. Previous release archives remain outside the public root.
- Hosting-generated `.htaccess`, `.user.ini`, and `php.ini` were preserved. The personal homepage remains HTTP 200.
- HTTP also serves the app; forced HTTPS redirect has not been enabled.
- Deployment used cPanel File Manager. Local commits have not been pushed to the source remote.

## Final design and checks

The published build includes distinct course colours, lighter lecture shades within each course palette, darker tutorial surfaces, and larger short course/group labels. Find tutorials and My plan have prominent controls. Table padding is increased. The full 07:00–20:00 range fits vertically, with overlapping sessions in individual clickable lanes bounded by their time slot.

- TypeScript and Vite production build passed before packaging.
- All 13 logic tests passed: 125 sourced slots, Berlin DST, exceptions, assembly suspensions, overlap layout, plan parsing and ICS parsing/UTF-8 folding.
- All 26 browser tests passed against the live HTTPS site in desktop Chromium and mobile WebKit: `STUDYPLAN_BASE_URL=https://studyplan.ardatas.com/ npm run test:e2e`.
- Browser coverage includes selection and persistence, course/search/type filters, guarded reset, safe shared previews, unavailable/corrupt storage, keyboard and outside dismissal, focus return, ICS downloads, exclusions, provisional export, range navigation, full-day fit and separate nonintersecting overlap lanes.
- Responsive checks cover 320, 390, 768, 1024 and 1440px. Desktop Week fits five weekdays; mobile Week scrolls horizontally with a sticky time axis. Day and Week need no vertical timetable scrolling.
- The live desktop Week screenshot was inspected, including lecture/tutorial shade distinction and enlarged compact labels. Browser screenshots are in `artifacts/`.

The NumProg update adds 18 active tutorial options from the authenticated Moodle table, with corrected two-hour times, rooms, tutors, teaching languages and online sessions. Cancelled groups are omitted; split group suffixes remain distinct in compact cards. The additional browser test verifies NumProg and IT Security selections persist together and export correctly.

## Data limits

No Apple or Google Calendar account was modified. ICS compatibility is supported by parser and actual browser download checks. GDB dates remain provisional and require export opt-in. Unverified Analysis and GDB lectures are omitted. Course data is a checked snapshot, not a live subscription.
