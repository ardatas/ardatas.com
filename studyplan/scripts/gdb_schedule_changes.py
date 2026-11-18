"""Dated course announcements that override the undated public weekly table."""
import datetime as dt


def apply_schedule_changes(slot, calendar):
    if slot['id'] != 'gdb-48':
        return
    template = slot['occurrences'][0]
    events = []
    date = dt.date(2026, 10, 22)
    while date <= dt.date(2027, 2, 5):
        moved = date >= dt.date(2026, 11, 23)
        day = date.isoformat()
        if day not in calendar['days'] and not any(p['from'] <= day <= p['to'] for p in calendar['breaks']):
            events.append({**template, 'id': 'gdb-48-' + day, 'date': day,
                           'start': '08:15', 'end': '09:45',
                           'room': '02.11.018' if moved else '00.08.038'})
        date = dt.date(2026, 11, 23) if date == dt.date(2026, 11, 19) else date + dt.timedelta(days=7)
    slot['occurrences'] = events
    slot['note'] += ' Course announcement supplied 18 November 2026: from 23 November through semester end, Gruppe 48 moves from Thursday to Monday, 08:15–09:45, room 02.11.018. Earlier Thursday sessions are preserved.'
