"""Real browser CRUD, calendar downloads, explicit sender dates and privacy."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os, threading, shutil, re
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
ART=Path(os.environ.get('CARD_ARTIFACT_DIR',str(ROOT/'docs/occasions/screenshots')))/'occasions';ART.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
 def copyfile(self,source,outputfile):
  try:super().copyfile(source,outputfile)
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}/'
KEY='silent-hello.occasions.v1'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CARD_CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
  for width,height in [(320,800),(360,800),(390,844),(412,915),(430,932),(768,1024),(1440,900)]:
   context=browser.new_context(viewport={'width':width,'height':height},permissions=['clipboard-read','clipboard-write'],timezone_id='Europe/London');page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(BASE+'occasions.html');expect(page.locator('#emptyOccasions')).to_be_visible();page.screenshot(path=str(ART/f'empty-{width}.png'),full_page=True)
   page.locator('#addOccasion').focus();page.keyboard.press('Enter');dialog=page.locator('.occasion-dialog:visible');expect(dialog).to_be_visible();expect(dialog.locator('[name=nickname]')).to_be_focused()
   expect(dialog.locator('[name=day]')).to_have_value('');expect(dialog.locator('[name=month]')).to_have_value('');page.screenshot(path=str(ART/f'add-{width}.png'),full_page=False)
   def fill(name,kind,day,month,interval='7',annual=True):
    dialog.locator('[name=nickname]').fill(name);dialog.locator('[name=kind]').select_option(kind);dialog.locator('[name=day]').fill(str(day));dialog.locator('[name=month]').select_option(str(month));dialog.locator('[name=reminderDays]').select_option(interval);dialog.locator('[name=annual]').set_checked(annual)
   fill('Brother','birthday',31,4);dialog.get_by_role('button',name='Save occasion').click();expect(dialog.locator('[data-error]')).to_contain_text('valid day');assert page.evaluate('(key)=>localStorage.getItem(key)',KEY) is None
   fill('Brother','birthday',15,6);dialog.get_by_role('button',name='Save occasion').click();expect(page.locator('.occasion-item h3')).to_have_text('Brother’s Birthday');expect(page.locator('#addOccasion')).to_be_focused()
   page.reload();expect(page.locator('.occasion-item')).to_have_count(1)
   page.locator('#addOccasion').click();fill('Mum & Dad','anniversary',1,1,'14');dialog.get_by_role('button',name='Save occasion').click();expect(page.locator('.occasion-item')).to_have_count(2)
   page.locator('#addOccasion').click();fill('Leap friend','birthday',29,2,'1',False);dialog.get_by_role('button',name='Save occasion').click();expect(page.locator('.occasion-item')).to_have_count(3)
   # The list is sorted by independently calculated next dates.
   records=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).items',KEY);assert all('message' not in item and 'email' not in item for item in records)
   from datetime import date
   today=date(*page.evaluate('() => { const d=new Date(); return [d.getFullYear(),d.getMonth()+1,d.getDate()]; }'))
   def next_date(item):
    for year in range(today.year,today.year+9):
     try:d=date(year,item['month'],item['day'])
     except ValueError:continue
     if d>=today:return d
   expected=[i['nickname'] for i in sorted(records,key=lambda i:(next_date(i),i['nickname']))];actual=page.locator('.occasion-item h3').all_text_contents();assert all(actual[i].startswith(name) for i,name in enumerate(expected))
   brother=page.locator('.occasion-item').filter(has=page.get_by_role('heading',name='Brother’s Birthday',exact=True))
   with page.expect_download() as download:brother.get_by_role('button',name=re.compile('Download calendar')).click()
   dl=download.value;assert dl.suggested_filename.endswith('.ics');raw=Path(dl.path()).read_bytes();assert b'\r\nBEGIN:VALARM\r\n' in raw;assert b'TRIGGER:-P7D' in raw;assert b'RRULE:FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15' in raw
   from icalendar import Calendar
   cal=Calendar.from_ical(raw);event=cal.walk('VEVENT')[0];assert event.decoded('dtstart').month==6;assert str(event['summary'])=='Brother’s Birthday';assert len(event.subcomponents)==1
   page.locator('#calendarAlarm').uncheck()
   with page.expect_download() as download:brother.get_by_role('button',name=re.compile('Download calendar')).click()
   assert b'VALARM' not in Path(download.value.path()).read_bytes()
   brother.get_by_role('button',name=re.compile('Edit:')).click();expect(dialog.locator('[name=day]')).to_have_value('15');dialog.locator('[name=nickname]').fill('Sibling');dialog.get_by_role('button',name='Save occasion').click();expect(page.get_by_role('heading',name='Sibling’s Birthday')).to_be_visible()
   page.screenshot(path=str(ART/f'upcoming-{width}.png'),full_page=True)
   sibling=page.locator('.occasion-item').filter(has=page.get_by_role('heading',name='Sibling’s Birthday',exact=True));sibling.get_by_role('button',name=re.compile('Delete:')).click();page.keyboard.press('Escape');expect(sibling).to_be_visible();sibling.get_by_role('button',name=re.compile('Delete:')).click();page.locator('#confirmDeleteOccasion').click();page.reload();expect(page.locator('.occasion-item')).to_have_count(2)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.locator('#addOccasion').click();assert dialog.evaluate('e=>e.scrollWidth<=e.clientWidth');page.keyboard.press('Escape');assert not errors,errors
   print(f'PASS {width}px: birthday/anniversary CRUD, persistence, explicit date/validation, leap day, chronological order, keyboard dialog, delete/Escape, parsed calendar downloads/optional alarm, no overflow',flush=True)
   context.close()
  context=browser.new_context(viewport={'width':390,'height':844},permissions=['clipboard-read','clipboard-write']);page=context.new_page();page.goto(BASE+'studio.html');expect(page.locator('#rememberOccasionPrompt')).to_be_hidden()
  page.locator('.steps [data-step="3"]').click();page.locator('#toInput').fill('Maya');page.locator('#messageInput').fill('PRIVATE CARD WORDS');page.locator('.steps [data-step="5"]').click();page.locator('#shareLinkButton').click();expect(page.locator('#exportStatus')).to_contain_text('Link copied');expect(page.locator('#rememberOccasionPrompt')).to_be_visible();url=page.evaluate('navigator.clipboard.readText()');assert '#c=' in url
  page.locator('#rememberOccasionButton').click();dialog=page.locator('.occasion-dialog:visible');expect(dialog.locator('[name=nickname]')).to_have_value('Maya');expect(dialog.locator('[name=day]')).to_have_value('');expect(dialog.locator('[name=month]')).to_have_value('');page.screenshot(path=str(ART/'sender-dialog-390.png'),full_page=False)
  dialog.locator('[name=day]').fill('15');dialog.locator('[name=month]').select_option('6');dialog.get_by_role('button',name='Save occasion').click();stored=page.evaluate('(key)=>localStorage.getItem(key)',KEY);assert 'PRIVATE CARD WORDS' not in stored;expect(page.locator('#occasionSavedStatus')).to_contain_text('saved on this device')
  page.goto(BASE+'occasions.html');expect(page.get_by_role('heading',name='Maya’s Birthday')).to_be_visible()
  # Download-start failures are visible and do not claim a completed import.
  page.evaluate('() => { URL.createObjectURL=()=>{throw new Error("blocked")}; }');page.get_by_role('button',name=re.compile('Download calendar')).click();expect(page.locator('#occasionError')).to_contain_text('Allow downloads')
  # Editing in two tabs cannot silently overwrite a newer edit.
  page.get_by_role('button',name=re.compile('Edit:')).click();page.evaluate('key=>{const d=JSON.parse(localStorage.getItem(key));d.items[0].revision++;localStorage.setItem(key,JSON.stringify(d))}',KEY);dialog=page.locator('.occasion-dialog:visible');dialog.get_by_role('button',name='Save occasion').click();expect(dialog.locator('[data-error]')).to_contain_text('another tab');page.keyboard.press('Escape')
  # Corrupt storage is preserved; save errors stay inside the dialog.
  page.evaluate('(key)=>localStorage.setItem(key,"{broken")',KEY);page.reload();expect(page.locator('#occasionError')).to_contain_text('not been overwritten');page.locator('#addOccasion').click();dialog.locator('[name=nickname]').fill('Friend');dialog.locator('[name=day]').fill('1');dialog.locator('[name=month]').select_option('1');dialog.get_by_role('button',name='Save occasion').click();expect(dialog.locator('[data-error]')).to_contain_text('not been overwritten');assert page.evaluate('(key)=>localStorage.getItem(key)',KEY)=='{broken';page.keyboard.press('Escape')
  page.evaluate('Storage.prototype.setItem=()=>{throw new Error("quota")};Storage.prototype.getItem=()=>null');page.locator('#addOccasion').click();dialog.locator('[name=nickname]').fill('Friend');dialog.locator('[name=day]').fill('1');dialog.locator('[name=month]').select_option('1');dialog.get_by_role('button',name='Save occasion').click();expect(dialog.locator('[data-error]')).to_contain_text('could not save');page.keyboard.press('Escape')
  viewer=context.new_page();viewer.goto(url);expect(viewer.frame_locator('#viewerFrame').locator('#message')).to_have_text('PRIVATE CARD WORDS');assert viewer.locator('#rememberOccasionPrompt,.occasion-dialog').count()==0
  page=context.new_page();page.goto(BASE);page.locator('#menuToggle').click();expect(page.get_by_role('link',name='My Occasions',exact=True)).to_be_visible();page.get_by_role('link',name='My Occasions',exact=True).click();expect(page.locator('#occasionsTitle')).to_have_text('Keep their day close.')
  print('PASS sender prepare/share, nickname prefill with blank date, no card text stored, failure handling, conflict handling, shop navigation and recipient isolation',flush=True)
  browser.close()
finally:server.shutdown();server.server_close()
