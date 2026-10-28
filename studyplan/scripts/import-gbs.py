"""Refresh public GBS schedule facts only; never store tokens, contact details or meeting passwords."""
import datetime as dt, json, subprocess, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
def get(path):
    return json.loads(subprocess.check_output(['curl', '--fail', '--silent', '--show-error', '--max-time', '30', 'https://gbs.cm.in.tum.de/api/' + path]))
checked = dt.datetime.now(dt.timezone.utc).isoformat()
capacity = {t['id']: t for t in get('tutorials/get_capacity/')}
tutors = {t['id']: ' '.join([t['firstName'], t['lastName']]).strip() for t in get('tutors/get_name_id/')}
days = {'Mo':0,'Di':1,'Mi':2,'Do':3,'Fr':4,'Sa':5,'So':6}
slots = {}
weeks = []
unknown = set()
for n in range(17):
    monday = dt.date(2026,10,26) + dt.timedelta(weeks=n)
    rows = get('tutor_sessions/get_week/?group='+str(monday))
    weeks.append({'week':str(monday),'count':len(rows)})
    for row in rows:
        cap = capacity.get(row['tutorial'])
        if not cap: raise ValueError('Missing room metadata: '+str(row['tutorial']))
        key = 'gbs-'+str(row['tutorial'])
        if key not in slots:
            slots[key] = {'id':key,'course':'gbs','kind':'Help session' if cap['programming_tutorial'] else 'Tutorial','label':row['name'],'source':'https://gbs.cm.in.tum.de/tutorials/','checkedAt':checked,'note':'Published dated sessions. Room is the current tutorial room; check the source for later changes.','occurrences':[]}
        if row['status'] not in ['PLANED','CANCELED','CANCELLED','MODIFIED']: unknown.add(row['status'])
        date = str(monday+dt.timedelta(days=days[row['day']]))
        holiday = '2026-12-24' <= date <= '2027-01-06' or date == '2026-12-03'
        slots[key]['occurrences'].append({'id':'gbs-session-'+str(row['id']),'date':date,'start':row['start'],'end':row['end'],'room':cap['room'] or ('Online' if cap['format']=='ONLINE' else 'Not published'),'tutor':tutors.get(row['tutor'],'Not published'),'status':'source-conflict' if holiday else 'scheduled' if row['status']=='PLANED' else 'cancelled' if row['status'] in ['CANCELED','CANCELLED'] else 'needs-check','source':'https://gbs.cm.in.tum.de/tutorials/sessions/'+str(row['tutorial'])+'/'+str(row['id'])})
(ROOT/'src/gbs.json').write_text(json.dumps(list(slots.values()),ensure_ascii=False,indent=2)+'\n')
(ROOT/'docs/gbs-coverage.json').write_text(json.dumps({'checkedAt':checked,'weeks':weeks,'unknownStatuses':sorted(unknown)},indent=2)+'\n')
print(len(slots),'groups;',sum(len(s['occurrences']) for s in slots.values()),'occurrences; unknown statuses:',unknown)
