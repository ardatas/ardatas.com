# Source provenance — 28 October 2026

Source facts were checked from the user's open Safari course pages and published public endpoints. No private contact details, account identifiers, or login tokens are bundled.

| Course | Included | Basis and limits |
| --- | --- | --- |
| GBS | 26 tutorial groups and two lecture series | Public tutoring API supplies individual dates, tutor, room and cancellation state. Moodle supplies an explicit lecture-date plan. |
| GDB | 32 tutorial groups | Tutor schedule publishes group, weekday, start, room and tutor. Its embedded 2012 dates are layout anchors, not 2026 occurrences. Generated 2026/27 dates are provisional; export requires opt-in. |
| Analysis | 16 tutorial groups and one homework-help session | Moodle detailed group table supplies exact times, tutors and rooms. Detailed times take precedence over the coarse two-hour overview. Weekly sessions begin 19 October. Lecture times/rooms are not yet verified. |
| IT Security | 28 active tutorials, one cancelled group and one lecture series | Moodle publishes weekly groups. Group 13 is cancelled. The Friday lecture is a replacement on 20 November for 10 November, not a general weekly Friday lecture. |

| NumProg | 18 active tutorial options | Moodle overrides TUMonline room reservation windows. Includes split groups 04a, 18a/18b and an unnumbered Thursday 16:00 online session. Groups 04b, 10 and 17 do not take place and are excluded. |

## Official sources

- [GBS tutoring](https://gbs.cm.in.tum.de/tutorials/): `api/tutorials/get_capacity/`, `api/tutors/get_name_id/`, and `api/tutor_sessions/get_week/?group=YYYY-MM-DD`. Importer only stores timetable facts and tutor names.
- [GBS Moodle lecture plan](https://www.moodle.tum.de/course/view.php?id=121267): Monday 13:45–15:15, MW 2001, with online sessions on 16 November and 25 January; Wednesday 13:00–14:00, MW 0001. Only listed dates are included.
- [GDB Tutor schedule](https://erdbtutor.db.in.tum.de/schedule?course_id=19): GDB2627, 90-minute weekly tutorials.
- [Analysis tutorial page](https://www.moodle.tum.de/course/view.php?id=123567&section=2): exact quarter-hour times and English groups retained. Homework help is separate from registration tutorials.
- [IT Security Moodle](https://www.moodle.tum.de/course/view.php?id=121396): missing tutor names remain “Not published”.
- [NumProg Moodle](https://www.moodle.tum.de/course/view.php?id=121375): authenticated tutorial table checked 28 October. Full two-hour sessions, corrected times and rooms, tutors and teaching languages retained. Recurrence begins in the first published exercise week (19 October) and ends within the teaching period. Online joining links remain on Moodle.
- [TUM official dates and holidays](https://www.tum.de/fileadmin/w00bfo/www/Studium/Im_Studium/Termine_Fristen/251118__Rundschreiben__Termine_und_Feiertage_2026-2027_final.pdf): teaching 12 October–5 February; 3 December and 24 December–6 January excluded.

## Exceptions and uncertainty

The university notice also suspends teaching in Garching on 28 October (FVV) and 10 November (SVV), 10:00–11:30. Overlapping sessions in verified Garching rooms are marked as source conflicts, with original times and status preserved; they are excluded pending course verification. Sessions ending at 10:00 or starting at 11:30 are unaffected. Unknown campuses are not inferred.

Some GBS API sessions fall on published university holidays. They remain visible in details as source conflicts and are always excluded from calendar and export. Cancelled sessions are likewise retained for inspection and excluded from exports. Unknown API states are marked for checking rather than silently treated as scheduled.

Moodle weekly tables are expanded within the published teaching period, omitting university holidays. They do not guarantee that later course-specific cancellations will not occur. Every slot carries its source URL, check date and explanatory note.

GBS's currently published tutorial endpoint has no sessions for the weeks beginning 8 or 15 February. Those dates are not fabricated when a user extends the planning range.

## Calendar format

Exports follow [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545). Repeated meetings are explicit VEVENTs, preserving date-specific rooms, tutors, cancellations and skipped dates without an unbounded recurrence rule. Berlin local times convert to UTC using IANA timezone rules. Actual Google Calendar or Apple Calendar account imports have not been performed; parser and browser-download tests establish file behavior only.
