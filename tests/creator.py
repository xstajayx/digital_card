"""Real simplified creator UX, actual iframe preview and unchanged historical links."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import threading,os,shutil,json,base64
from playwright.sync_api import sync_playwright,expect
ROOT=Path(os.environ.get('CREATOR_ROOT',Path(__file__).resolve().parents[1]));ART=Path(os.environ.get('CARD_ARTIFACT_DIR','/workspace/creator-validation/final'))/'creator';ART.mkdir(parents=True,exist_ok=True)
BEFORE=os.environ.get('CREATOR_BEFORE')=='1'
class H(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
 def copyfile(self,s,o):
  try:super().copyfile(s,o)
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}/'
def step(page,n):page.locator(f'.steps [data-step="{n}"]').click();expect(page.locator(f'[data-panel="{n}"]')).to_be_visible()
def fits(page):return page.locator('#cardPreview').evaluate('async e=>{await new Promise(requestAnimationFrame);return e.contentWindow.checkFit()}')
def clean(page):
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 bad=page.evaluate('''()=>[...document.querySelectorAll('button,input,textarea,select')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden]')).filter(e=>{let r=e.getBoundingClientRect();return r.width<1||r.left<-.5||r.right>innerWidth+.5}).map(e=>e.id||e.textContent)''');assert not bad,bad
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('CARD_CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
  sizes=[(390,844),(1440,900)] if BEFORE else [(320,800),(360,800),(390,844),(412,915),(430,932),(768,1024),(1024,768),(1440,900),(844,390)]
  if os.environ.get('CREATOR_WIDTH'):sizes=[v for v in sizes if v[0] in {int(x) for x in os.environ['CREATOR_WIDTH'].split(',')}]
  for width,height in sizes:
   ctx=b.new_context(viewport={'width':width,'height':height},permissions=['clipboard-read','clipboard-write'],reduced_motion='reduce',has_touch=width<500);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:errors.append(str(r.status)+' '+r.url) if r.status>=400 else None)
   page.goto(BASE+'studio.html');expect(page.locator('.occasion-tile')).to_have_count(23)
   if BEFORE:
    for n in range(1,6):step(page,n);page.screenshot(path=str(ART/f'before-step{n}-{width}.png'),full_page=True)
    ctx.close();continue
   expect(page.locator('.steps button')).to_have_text(['1Choose card','2Front cover','3Message','4Style','5Preview & send'])
   page.goto(BASE+'studio.html?design=birthday-midnight');expect(page.locator('#studio')).to_have_attribute('data-step','2');expect(page.locator('#creatorPreviewDialog')).to_have_attribute('open','')
   f=page.frame_locator('#cardPreview');expect(f.locator('#cardRoot')).to_have_attribute('data-physical','true');expect(f.locator('.paper-cover-name')).to_have_text('');expect(page.locator('#coverNameToggle')).not_to_be_checked();assert f.locator('.physical-scene').evaluate('e=>e.style.getPropertyValue("--envelope-paper").trim()')==f.locator('#cardRoot').evaluate('e=>e.style.getPropertyValue("--paper").trim()')
   # The name can be explicitly enabled even before To is filled.
   page.locator('#coverNameToggle').check();page.locator('#coverNameInput').fill('Birthday star');page.locator('#physical-coverGreeting').fill('A day full of little wonders');page.locator('#birthdayNumberInput').fill('21');page.locator('#coverNameToggle').uncheck()
   step(page,3);expect(page.locator('#messageTitle')).to_have_text('Write your message');page.locator('#toInput').fill('Jamie');page.locator('#messageInput').fill('Hope you have a wonderful birthday.\n\nHere’s to an amazing year ahead!');page.locator('#fromInput').fill('Love, Stacey')
   message=page.locator('#messageInput').input_value();page.locator('#suggestMessage').click();page.locator('#undoSuggestion').click();expect(page.locator('#messageInput')).to_have_value(message)
   step(page,4);expect(page.locator('.font-choice')).to_have_count(6)
   for font,family in [('fredoka','Fredoka'),('pacifico','Pacifico'),('quicksand','Quicksand'),('poppins','Poppins'),('nunito','Nunito'),('playfair','Playfair Display')]:
    page.locator(f'.font-choice[data-font="{font}"]').click();expect(page.locator(f'.font-choice[data-font="{font}"]')).to_have_attribute('aria-pressed','true');assert family in page.locator(f'.font-choice[data-font="{font}"]').evaluate('e=>getComputedStyle(e).fontFamily');assert page.locator(f'.font-choice[data-font="{font}"]').evaluate('e=>document.fonts.check(getComputedStyle(e).font)');assert fits(page);assert family in f.locator('#message').evaluate('e=>getComputedStyle(e).fontFamily')
   page.locator('.font-choice[data-font="quicksand"]').click();page.get_by_role('button',name='Blush colours').click();expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','cover');page.locator('#opening-effect').select_option('hearts');expect(f.locator('.paper-cover-title')).to_have_text('A day full of little wonders');expect(f.locator('.paper-cover-name')).to_have_text('');expect(f.locator('.paper-envelope-tag')).to_have_text('For Jamie');assert f.locator('#cardRoot').evaluate('e=>getComputedStyle(e).getPropertyValue("--paper").trim()')=='#fff0f1'
   page.locator('.none-option').click();expect(f.locator('.paper-cover-art')).to_have_attribute('hidden','');page.locator('.sticker-tile').nth(1).click();expect(f.locator('.paper-cover-art')).not_to_have_attribute('hidden','');expect(page.locator('.extras')).not_to_have_attribute('open','')
   # Same actual iframe: opening modal never reloads the engine or loses edit position.
   step(page,3);page.locator('#messageInput').focus();page.locator('#cardPreview').evaluate('e=>e.contentWindow.creatorIdentity="same-frame"');page.locator('#previewJump').click();expect(page.locator('#creatorPreviewDialog')).to_be_visible();assert page.locator('#creatorPreviewDialog').evaluate('e=>e.matches(":modal")');assert page.locator('#cardPreview').evaluate('e=>e.contentWindow.creatorIdentity')=='same-frame'
   expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','envelope');f.locator('.paper-envelope-front').click();expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','cover');expect(f.locator('.paper-cover-name')).to_have_text('');f.locator('.paper-cover').click();expect(f.locator('#message')).to_have_text(message);valid=fits(page)
   assert valid
   if width in [390,1440]:page.screenshot(path=str(ART/f'preview-inside-{width}.png'))
   page.locator('#closeCreatorPreview').click();expect(page.locator('#studio')).to_have_attribute('data-step','3');expect(page.locator('#messageInput')).to_have_value(message);expect(page.locator('#previewJump')).to_be_focused()
   step(page,2);page.locator('#physical-coverGreeting').fill('');
   for age,ordinal in [('11','11th'),('12','12th'),('13','13th'),('18','18th'),('21','21st'),('22','22nd'),('23','23rd'),('30','30th'),('40','40th')]:
    page.locator('#birthdayNumberInput').fill(age);expect(f.locator('.paper-cover-title')).to_have_text('Happy '+ordinal+' Birthday!')
   page.locator('#birthdayNumberInput').fill('');expect(page.locator('#birthdayNumberInput')).to_have_attribute('aria-invalid','false');page.locator('#birthdayNumberInput').fill('121');expect(page.locator('#birthdayNumberInput')).to_have_attribute('aria-invalid','true');page.locator('#birthdayNumberInput').fill('21')
   page.locator('#coverNameToggle').check();page.locator('#coverNameInput').fill('Jamie, the birthday star');page.locator('#previewJump').click();page.get_by_role('button',name='Front cover',exact=True).click();expect(f.locator('.paper-cover-name')).to_have_text('Jamie, the birthday star');page.keyboard.press('Escape');expect(page.locator('#studio')).to_have_attribute('data-step','2');page.locator('#coverNameToggle').uncheck()
   # Local save/restore and new share retain explicit no-cover-name policy.
   page.locator('.draft-menu summary').click();page.get_by_role('button',name='Save draft',exact=True).click();page.reload();expect(page.locator('.occasion-tile')).to_have_count(23);page.locator('.draft-menu summary').click();page.get_by_role('button',name='Restore draft',exact=True).click();page.locator('.draft-menu summary').click();step(page,3);expect(page.locator('#messageInput')).to_have_value(message);step(page,5);assert fits(page);page.locator('#shareLinkButton').click();expect(page.locator('#exportStatus')).to_contain_text('Link copied');url=page.evaluate('navigator.clipboard.readText()');assert '#c=5' in url
   viewer=ctx.new_page();viewer.goto(url);vf=viewer.frame_locator('#viewerFrame');expect(vf.locator('.paper-envelope-tag')).to_have_text('For Jamie');expect(vf.locator('.paper-cover-name')).to_have_text('');vf.locator('.paper-envelope-front').click();vf.locator('.paper-cover').click();expect(vf.locator('#message')).to_have_text(message);assert viewer.locator('.steps,#previewJump').count()==0;viewer.close()
   for n in range(1,6):
    step(page,n);clean(page)
    if width in [390,1440]:page.screenshot(path=str(ART/f'after-step{n}-{width}.png'),full_page=True)
   page.locator('html').evaluate('e=>e.style.fontSize="200%"')
   for n in range(1,6):step(page,n);clean(page)
   page.locator('html').evaluate('e=>e.style.fontSize=""');step(page,4);page.locator('.font-choice[data-font="nunito"]').focus();page.keyboard.press('Enter');expect(page.locator('.font-choice[data-font="nunito"]')).to_have_attribute('aria-pressed','true')
   assert not errors,errors
   print(f'PASS {width}x{height}: five steps, shop entry, default folded/matching envelope, opt-in editable cover name, greeting/ordinals, six actual fonts, palette/effects/art, same-frame modal and focus return, suggestion undo, local draft, v5 share/recipient, keyboard, 200% text and no clipping',flush=True);ctx.close()
  if not BEFORE:
   # Every catalogue design: generated folded defaults, complete artwork and valid fitting.
   page=b.new_page(viewport={'width':390,'height':844});page.goto(BASE+'studio.html');expect(page.locator('.occasion-tile')).to_have_count(23);step(page,5)
   count=page.evaluate('''async()=>{const {loadThemes,cardContent}=await import('./engine/card-data.js');const {defaultPhysical}=await import('./engine/physical-schema.js');const {defaultOpening}=await import('./engine/openings/config.js');const w=document.querySelector('#cardPreview').contentWindow;let n=0;for(const theme of await loadThemes()){w.setCardData({...cardContent({theme,...theme.defaults,to:'Jamie',fontId:theme.defaultFontId,textSize:18,physicalConfig:{...defaultPhysical(),coverName:''},openingConfig:{...defaultOpening(),tone:'theme'}}),palette:theme.palette,features:theme.features});if(!await w.checkFit())throw Error('Fit: '+theme.id);if(w.document.querySelector('.paper-cover-name').textContent)throw Error('Name leak');await Promise.all([...w.document.querySelectorAll('.paper-cover-art')].filter(i=>!i.hidden).map(i=>i.decode()));n++}return n}''');assert count==28
   print('PASS all 28 existing designs: folded cover/inside fitting, real art and no example-name leakage',flush=True)
   step(page,3);page.locator('#toInput').fill('Zoe');page.locator('#fromInput').fill('With love');step(page,1);page.locator('[data-occasion="love"]').click();step(page,3);expect(page.locator('#toInput')).to_have_value('Zoe');expect(page.locator('#fromInput')).to_have_value('With love');print('PASS design switches preserve names even when they match a historical example name',flush=True)
  b.close()
finally:server.shutdown();server.server_close()
