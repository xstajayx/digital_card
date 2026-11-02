"""Universal opening, v4 persistence and messaging draft browser checks."""
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading,shutil,os
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kw):super().__init__(*args,directory=str(ROOT.parent),**kw)
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}/{ROOT.name}/';ART=ROOT.parent/'onboarding'/'interactive';ART.mkdir(parents=True,exist_ok=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CARD_CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
  for width,height in [(360,800),(390,844),(768,1024),(1440,900)]:
   context=browser.new_context(viewport={'width':width,'height':height},permissions=['clipboard-read','clipboard-write'],has_touch=width<500);errors=[]
   context.on('page',lambda page:page.on('pageerror',lambda error:errors.append(str(error))))
   page=context.new_page();page.goto(BASE+'studio.html');expect(page.locator('.occasion-tile')).to_have_count(23)
   page.locator('.steps [data-step="4"]').click();page.locator('#opening-type').select_option('envelope');page.locator('#opening-tone').select_option('blush');page.locator('#opening-effect').select_option('hearts');page.locator('#opening-seal').uncheck();page.locator('.steps [data-step="5"]').click()
   frame=page.frame_locator('#cardPreview');expect(frame.locator('#cardRoot')).to_have_attribute('data-opening-state','ready')
   expect(frame.locator('.opening-seal')).to_be_hidden();frame.locator('#cardRoot').screenshot(path=str(ART/f'envelope-{width}.png'),style='.step-footer,.skip-link{visibility:hidden!important}')
   frame.locator('#cardRoot').evaluate("e=>{window.completions=0;e.addEventListener('card-opening-complete',()=>window.completions++)}")
   button=frame.get_by_role('button',name='Open your card',exact=True)
   if width<500:button.tap()
   else:button.focus();page.keyboard.press('Enter')
   button.dispatch_event('click')
   if width==390:
    page.wait_for_timeout(250);frame.locator('#cardRoot').screenshot(path=str(ART/'envelope-opening.png'),style='.step-footer,.skip-link{visibility:hidden!important}')
   expect(frame.locator('#cardRoot')).to_have_attribute('data-opening-state','complete');assert page.locator('#cardPreview').evaluate('e=>e.contentWindow.completions')==1
   page.locator('#replayButton').click();expect(frame.locator('#cardRoot')).to_have_attribute('data-opening-state','ready');frame.get_by_role('button',name='Skip opening').click();expect(frame.locator('#cardRoot')).to_have_attribute('data-opening-state','complete')
   page.get_by_role('button',name='Save draft',exact=True).click();page.reload();expect(page.locator('.occasion-tile')).to_have_count(23);page.get_by_role('button',name='Restore draft',exact=True).click();page.locator('.steps [data-step="4"]').click();expect(page.locator('#opening-type')).to_have_value('envelope');expect(page.locator('#opening-tone')).to_have_value('blush')
   page.locator('#opening-type').select_option('gift-box');page.locator('#opening-wrap').select_option('striped');page.locator('#opening-effect').select_option('snow');page.locator('.steps [data-step="5"]').click();expect(frame.locator('#cardRoot')).to_have_attribute('data-opening-state','ready');page.locator('#shareLinkButton').click();expect(page.locator('#exportStatus')).to_contain_text('Link copied');url=page.evaluate('navigator.clipboard.readText()');assert '#c=4' in url
   viewer=context.new_page();viewer.goto(url);vf=viewer.frame_locator('#viewerFrame');expect(vf.locator('#cardRoot')).to_have_attribute('data-opening-state','ready');expect(vf.locator('.interactive-opening')).to_have_attribute('data-wrap','striped');expect(viewer.locator('#recipientSubtitle')).to_contain_text('With love')
   vf.locator('#cardRoot').screenshot(path=str(ART/f'gift-recipient-{width}.png'));viewer.emulate_media(reduced_motion='reduce');vf.get_by_role('button',name='Open your card',exact=True).click();expect(vf.locator('#cardRoot')).to_have_attribute('data-opening-state','complete');viewer.close();page.bring_to_front()
   page.locator('#emailShareButton').click();expect(page.locator('.transport-link')).to_have_attribute('href',__import__('re').compile('^mailto:'));assert url in __import__('urllib.parse',fromlist=['unquote']).unquote(page.locator('.transport-link').get_attribute('href'))
   page.locator('#smsShareButton').click();expect(page.locator('.transport-link')).to_have_attribute('href',__import__('re').compile('^sms:'))
   # Exercise every design with each independent opening through the shared renderer.
   result=page.evaluate('''async()=>{const {loadThemes,cardContent}=await import('./engine/card-data.js');const {defaultOpening}=await import('./engine/openings/config.js');const themes=await loadThemes();const w=document.querySelector('#cardPreview').contentWindow;let count=0;for(const theme of themes)for(const type of ['none','envelope','gift-box']){const card={theme,...theme.defaults,fontId:'nunito',textSize:18,watermark:true,openingConfig:defaultOpening(type)};w.setCardData({...cardContent(card),palette:theme.palette,features:theme.features,milestone:theme.milestone});if(!await w.checkFit())throw Error('Fit failed: '+theme.id);if(type!=='none'){if(w.document.querySelector('#cardRoot').dataset.openingState!=='ready')throw Error('Opening not ready');w.document.querySelector('.opening-skip').click();}count++}return count}''')
   assert result==84
   page.locator('#cardPreview').evaluate("async e=>{e.contentWindow.Element.prototype.animate=undefined;await e.contentWindow.play()}");expect(frame.locator('.interactive-opening')).to_be_hidden()
   assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   print(f'PASS {width}x{height}: all 28 designs × 3 opening choices, touch/keyboard, duplicate activation, replay/skip, v4 draft/link/recipient parity, reduced motion, email/SMS drafts',flush=True)
   context.close()
  browser.close()
finally:server.shutdown();server.server_close()
