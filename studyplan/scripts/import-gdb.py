"""Import the public GDB weekly pattern without contact details."""
import re,json,subprocess,datetime as dt,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
url='https://erdbtutor.db.in.tum.de/schedule?course_id=19'
html=subprocess.check_output(['curl','-fsS',url]).decode()
rows=json.loads(re.search(r'groups\s*=\s*(\[.*?\]);',html,re.S).group(1))
checked=dt.datetime.now(dt.timezone.utc).isoformat()
slots=[]
for r in rows:
 start=dt.datetime.fromisoformat(r['start']);day=start.weekday();time=start.strftime('%H:%M');end=(start+dt.timedelta(minutes=90)).strftime('%H:%M')
 id='gdb-'+r['name'].split()[-1];events=[]
 date=dt.date(2026,10,19)+dt.timedelta(days=day)
 while date<=dt.date(2027,2,5):
  d=str(date)
  if not ('2026-12-24'<=d<='2027-01-06' or d=='2026-12-03'):
   events.append(dict(id=id+'-'+d,date=d,start=time,end=end,room=r['room'],tutor=r['user']['firstname']+' '+r['user']['lastname'],status='provisional',source=url))
  date+=dt.timedelta(days=7)
 slots.append(dict(id=id,course='gdb',kind='Tutorial',label=r['name'],source=url,checkedAt=checked,note='Published weekly pattern (90 minutes). Dates expanded within TUM teaching dates; course-specific recurrence exceptions and end date are unverified. Export is opt-in.',occurrences=events))
(root/'src/gdb.json').write_text(json.dumps(slots,ensure_ascii=False,indent=2)+'\n')
print(len(slots),'GDB groups')
