"""Recipient journey, layout, keyboard, reading mode and legacy link coverage."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading, shutil, os, base64, json
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
ART=Path(os.environ.get('CARD_ARTIFACT_DIR', str(ROOT/'docs/recipient-redesign')));ART.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
 def copyfile(self,source,outputfile):
  try:super().copyfile(source,outputfile)
  except (BrokenPipeError, ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}/'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('CARD_CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
  page=b.new_page();page.goto(BASE)
  def payload(version=5,message='Here’s to another wonderful adventure!\n\nWishing you a day full of little wonders.'):
   return page.evaluate('''async ([v,message])=>{const {encodeCard}=await import('./engine/share-codec.js');const {defaultPhysical}=await import('./engine/physical-schema.js');const {defaultOpening}=await import('./engine/openings/config.js');return encodeCard({v,themeId:'birthday-balloons',to:'Maya',message,from:'With love, Alex',fontId:'nunito',textSize:18,watermark:true,physicalConfig:defaultPhysical(),openingConfig:defaultOpening('envelope')})}''',[version,message])
  card=payload();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  for width,height in [(320,800),(360,800),(390,844),(412,915),(430,932),(768,1024),(1440,900)]:
   page.set_viewport_size({'width':width,'height':height});page.goto(BASE);page.goto(BASE+'view.html#c='+card)
   f=page.frame_locator('#viewerFrame');root=f.locator('#cardRoot');action=page.locator('#openingAction button')
   def state(s):expect(root).to_have_attribute('data-physical-state',s)
   def capture(s):page.screenshot(path=str(ART/f'{s}-{width}.png'),full_page=True)
   def bounds():
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    box=action.bounding_box();frame=page.locator('#viewerFrame').bounding_box();assert box['y']+box['height']<=frame['y'];assert box['y']<height
    assert not f.locator('html').evaluate('e=>e.scrollWidth>innerWidth')
   state('envelope');expect(action).to_have_text('Open your envelope');expect(page.locator('#replayButton')).to_be_hidden();bounds();capture('envelope')
   f.locator('.paper-envelope-front').click();state('cover');expect(action).to_have_text('Open your card');bounds();capture('cover')
   f.locator('.paper-cover').focus();page.keyboard.press('Enter');state('inside');expect(action).to_have_text('Close card');bounds();capture('inside');expect(f.locator('#from')).to_have_text('With love, Alex')
   action.click();state('cover');expect(action).to_have_text('Open your card');action.click();state('inside')
   page.locator('#replayButton').click();state('envelope');page.emulate_media(reduced_motion='reduce');action.click();state('cover');action.click();state('inside')
   page.get_by_text('Read comfortably',exact=True).click();expect(page.locator('#fullMessageText')).to_contain_text('With love, Alex');capture('reading')
   assert not page.get_by_role('button',name=__import__('re').compile('Share card|Copy link|Email draft|SMS draft|WhatsApp')).count()
   page.emulate_media(reduced_motion='no-preference');print(f'PASS recipient {width}: journey, top action, direct taps, keyboard, close/reopen, replay, reading, reduced motion, overflow',flush=True)
  for version in [1,2,3,4]:
   if version<3:
    raw={'v':version,'themeId':'birthday-balloons','to':'Maya','message':'Legacy words','from':'Alex','fontId':'nunito','textSize':18,'watermark':True};link='?d='+base64.urlsafe_b64encode(json.dumps(raw).encode()).decode().rstrip('=')
   else:link='#c='+payload(version,'Legacy words')
   page.goto(BASE);page.goto(BASE+'view.html'+link);f=page.frame_locator('#viewerFrame');expect(f.locator('#message')).to_have_text('Legacy words');expect(page.locator('#cardError')).to_be_hidden()
   action=page.locator('#openingAction button:visible')
   if action.count():page.emulate_media(reduced_motion='reduce');action.click()
   expect(page.locator('#replayButton')).to_be_visible();print(f'PASS legacy v{version}',flush=True)
  long='A thoughtful word 🦋.\n'*180;page.goto(BASE);page.goto(BASE+'view.html#c='+payload(5,long));expect(page.locator('#fullMessage')).to_be_visible();page.locator('#fullMessage summary').click();assert page.locator('#fullMessageText').inner_text().count('A thoughtful word')==180;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(ART/'long-message.png'),full_page=True)
  page.goto(BASE);page.goto(BASE+'view.html#c='+card);f=page.frame_locator('#viewerFrame');expect(f.locator('.paper-skip')).to_be_attached();f.locator('.paper-skip').focus();page.keyboard.press('Enter');expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','inside');expect(page.locator('#replayButton')).to_be_visible()
  assert not errors,errors;print('PASS long message, full signature, keyboard skip and no page errors',flush=True);b.close()
finally:server.shutdown();server.server_close()
