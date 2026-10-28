# Studyplan

An independent tutorial timetable for winter semester 2026/27, prepared for **studyplan.ardatas.com**. Browse four courses, select weekly slots, inspect dated sessions, avoid overlaps, and export a calendar.

## Manual deployment

This copy is deployed through `ardatas/ardatas.com` on branch `main`, which is the remote configured in cPanel. **Update from Remote** fetches the committed build, and **Deploy HEAD Commit** publishes it. The root deployment configuration targets the separate Studyplan document root. Run the commands below from this `studyplan/` directory; commit updated `dist/` files after rebuilding.

## Run

```sh
npm ci
npm run dev
```

Production preview: `npm run build && npm run preview`. The app runs at `/`, including on its dedicated subdomain. See [deployment instructions](docs/DEPLOYMENT.md).

## Features

- Month, week, day, and list calendars with Berlin time, today highlighting, and a live time line.
- Course, tutor, room, and session-type filters; detailed date and official source links.
- Device-local saved plans and course/search/type filters, guarded reset, shared URL previews, manual date exclusions, and actual-date overlap warnings.
- ICS export with explicit UTC events, stable IDs, UTF-8 line folding, escaped text, semester bounds, cancellations, and holiday exceptions. Provisional GDB dates require opt-in.
- Responsive controls and readable concurrent tutorial blocks; desktop weekdays always fit the viewport; overlapping sessions open an accessible options picker.
- Self-hosted fonts; no analytics, accounts, or plan uploads.

## Data and limits

Snapshot checked 28 October 2026: 107 slots across GBS, GDB, Analysis, and IT Security. See [source provenance](docs/SOURCES.md). GDB's published table supplies a weekly pattern, not dated sessions; generated dates remain provisional. Analysis and GDB lectures are not included because precise source details have not been verified. Planning does not register a student for a tutorial.

Default range: 28 October 2026 through the published teaching-period end, 5 February 2027. Extending the range never generates extra unsourced sessions. Exports are snapshots, not subscriptions; source updates require a rebuild and a fresh import into a separate calendar.

## Verify and package

```sh
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
npm run package
```

Core tests cover dates, Berlin daylight saving time, source exceptions, overlap layout, plan validation and RFC 5545 output parsed by ical.js. Browser tests cover desktop Chromium and mobile WebKit, selection, persistence, sharing, navigation, export content and responsive layout.

## Implementation

React, TypeScript, Vite, Tailwind CSS and Radix Dialog. `src/model.ts` owns plan validation, dates, exclusions and overlaps; `src/calendar.ts` creates ICS files; `src/components/ui/event-manager.tsx` renders calendar views. The calendar structure and UI primitives adapt the user's supplied EventManager reference. Published source times are immutable; selection never reschedules a course.

Studyplan uses a dark blue viewport layout with a compact academic heading, DM Sans, high-contrast course colors, and a course dropdown. Font licenses are shipped in the release. No TUM logos or personal-site assets are used.
