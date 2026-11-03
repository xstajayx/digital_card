"""Independent RFC 5545 parse/round-trip and recurrence checks (development only)."""
from pathlib import Path
from datetime import date
import subprocess,json
from icalendar import Calendar
from dateutil.rrule import rrulestr
ROOT=Path(__file__).resolve().parents[1]
script="""import {calendarEvent} from './engine/occasions.js';
const base={id:'example-123456789',nickname:'Café, 漢字; \\\\ 💌'.repeat(4),kind:'birthday',month:2,day:29,annual:true,year:null,reminderDays:7,revision:2};
console.log(JSON.stringify([calendarEvent(base,{today:{year:2097,month:3,day:1},now:new Date('2026-11-03T00:00:00Z')}),calendarEvent({...base,kind:'anniversary',month:12,day:31,annual:false,year:2027},{today:{year:2026,month:11,day:3},alarm:false})]));"""
texts=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True))
for index,text in enumerate(texts):
 raw=text.encode('utf-8');assert raw.endswith(b'\r\n');assert all(len(line)<=75 for line in raw.split(b'\r\n'));assert b'\n' not in raw.replace(b'\r\n',b'')
 cal=Calendar.from_ical(raw);assert str(cal['VERSION'])=='2.0';event=cal.walk('VEVENT')[0]
 assert isinstance(event.decoded('DTSTART'),date);assert not hasattr(event.decoded('DTSTART'),'hour')
 assert event.decoded('DTEND')>event.decoded('DTSTART');assert str(event['UID'])=='example-123456789@occasions.silenthello.local';assert str(event['SUMMARY']).startswith('Café, 漢字; \\ 💌')
 roundtrip=Calendar.from_ical(cal.to_ical()).walk('VEVENT')[0];assert str(roundtrip['SUMMARY'])==str(event['SUMMARY']);assert roundtrip.decoded('DTSTART')==event.decoded('DTSTART')
 if index==0:
  assert event.decoded('DTSTART')==date(2104,2,29);assert event.decoded('DTEND')==date(2104,3,1)
  alarm=event.walk('VALARM')[0];assert alarm.decoded('TRIGGER').days==-7;assert str(alarm['ACTION'])=='DISPLAY'
  from datetime import datetime
  rule=rrulestr(event['RRULE'].to_ical().decode(),dtstart=datetime(2104,2,29));assert [d.year for d in list(rule[:3])]==[2104,2108,2112]
 else:assert 'RRULE' not in event;assert event.decoded('DTEND')==date(2028,1,1);assert not event.walk('VALARM')
print('PASS independent icalendar parse/serialize/parse: UTF-8 escapes, all-day dates, exclusive end, UID, leap-century recurrence, optional alarms and one-time anniversary')
