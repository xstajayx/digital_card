"""Physical envelope -> extraction -> cover -> inside, legacy compatibility retained."""
from editor_controls import advanced, drafts
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading,os,shutil
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];ART=Path(os.environ.get('CARD_ARTIFACT_DIR',str(ROOT.parent/'onboarding')))/'physical';ART.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kw):super().__init__(*args,directory=str(ROOT.parent),**kw)
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}/{ROOT.name}/'
MESSAGE='A little note, just for you 👩🏽‍🚀.\n\nCafé, 漢字 & all the lovely things.\nHere’s to another wonderful adventure!'
def step(page,n):
 page.locator(f'.steps [data-step="{n}"]').click()
 if n==4:advanced(page)
 drafts(page)
def fit(page,id='cardPreview'):return page.locator('#'+id).evaluate('async e=>{await new Promise(requestAnimationFrame);return e.contentWindow.checkFit()}')
def capture(f,name):f.locator('#cardRoot').screenshot(path=str(ART/name),style='.step-footer,.skip-link{visibility:hidden!important}')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CARD_CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
  for width,height in [(360,800),(390,844),(768,1024),(1440,900)]:
   context=browser.new_context(viewport={'width':width,'height':height},permissions=['clipboard-read','clipboard-write'],has_touch=width<500);errors=[]
   def observe(page):
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:errors.append(f'{r.status} {r.url}') if r.status>=400 else None)
   context.on('page',observe);page=context.new_page();page.goto(BASE+'studio.html');expect(page.locator('.occasion-tile')).to_have_count(28)
   step(page,3);page.locator('#toInput').fill('Maya');page.locator('#messageInput').fill(MESSAGE);page.locator('#fromInput').fill('With love, Alex')
   step(page,4);page.locator('#physicalToggle').check();step(page,2);page.locator('#physical-coverGreeting').fill('A birthday full of little wonders');page.locator('#physical-coverArt').select_option('blue-cake');step(page,4);page.locator('#physical-insideArt').select_option('purple-cake');page.locator('#physical-paper').select_option('linen');step(page,5)
   f=page.frame_locator('#cardPreview');expect(f.locator('#cardRoot')).to_have_attribute('data-physical','true');assert fit(page)
   expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','envelope');expect(f.locator('.paper-envelope-tag')).to_have_text('For Maya');capture(f,f'envelope-{width}.png')
   f.locator('.paper-book').evaluate('e=>window.originalPaperBook=e');f.locator('.paper-envelope-front').focus()
   if width<500:f.locator('.paper-envelope-front').tap()
   else:page.keyboard.press('Enter')
   expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','extracting');assert f.locator('.paper-envelope-flap').evaluate('e=>+getComputedStyle(e).zIndex') < f.locator('.paper-book').evaluate('e=>+getComputedStyle(e).zIndex');capture(f,f'extracting-{width}.png');expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','cover')
   assert f.locator('.paper-book').evaluate('e=>e===window.originalPaperBook'), 'The extracted card must be the same physical component'
   expect(f.locator('.paper-cover-title')).to_have_text('A birthday full of little wonders');expect(f.locator('.paper-cover-art')).to_have_attribute('src',BASE+'stickers/library/blue-cake.svg');capture(f,f'cover-{width}.png')
   f.locator('.paper-cover').focus();page.keyboard.press('Enter');expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','unfolding');capture(f,f'unfolding-{width}.png');expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','inside')
   expect(f.locator('#message')).to_have_text(MESSAGE);expect(f.locator('#from')).to_have_text('With love, Alex');expect(f.locator('.paper-right')).to_have_attribute('aria-hidden','false');assert not f.locator('.paper-right').evaluate('e=>e.inert')
   assert 'Pacifico' in f.locator('#message').evaluate('e=>getComputedStyle(e).fontFamily');assert f.locator('#from').evaluate('e=>e.offsetTop>=document.querySelector("#message").offsetTop+document.querySelector("#message").offsetHeight')
   assert fit(page);capture(f,f'inside-{width}.png')
   f.locator('.paper-action').click();expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','cover');f.locator('.paper-cover').click();expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','inside')
   f.locator('.paper-read').click();expect(f.locator('.paper-reader')).to_be_visible();expect(f.locator('.paper-reader-text')).to_contain_text(MESSAGE);f.locator('.paper-reader-close').click()
   # Explicit drafts retain separate cover, paper and inside choices.
   page.get_by_role('button',name='Save draft',exact=True).click();page.reload();expect(page.locator('.occasion-tile')).to_have_count(28);drafts(page);page.get_by_role('button',name='Restore draft',exact=True).click();step(page,4);expect(page.locator('#physicalToggle')).to_be_checked();expect(page.locator('#physical-paper')).to_have_value('linen');step(page,2);expect(page.locator('#physical-coverArt')).to_have_value('blue-cake');step(page,4)
   for paper in ['ivory','linen','white','kraft','pastel','textured']:
    page.locator('#physical-paper').select_option(paper);step(page,5);assert fit(page);expect(f.locator('#cardRoot')).to_have_attribute('data-paper',paper);step(page,4)
   # The cover accepts text only, independently from the inside message.
   step(page,2);page.locator('#physical-coverGreeting').fill('<img src=x onerror=alert(1)>');step(page,5);assert fit(page);assert f.locator('.paper-cover-title img').count()==0;expect(f.locator('#message')).to_have_text(MESSAGE)
   step(page,2);page.locator('#physical-coverGreeting').fill('A birthday full of little wonders');step(page,4);page.locator('#physical-paper').select_option('linen');step(page,5);assert fit(page)
   page.locator('#shareLinkButton').click();expect(page.locator('#exportStatus')).to_contain_text('Link copied');url=page.evaluate('navigator.clipboard.readText()');assert '#c=5' in url
   viewer=context.new_page();viewer.goto(url);vf=viewer.frame_locator('#viewerFrame');expect(vf.locator('#cardRoot')).to_have_attribute('data-physical-state','envelope');assert fit(viewer,'viewerFrame');expect(vf.locator('.paper-cover-title')).to_have_text('A birthday full of little wonders')
   viewer.emulate_media(reduced_motion='reduce');vf.locator('.paper-envelope-front').click();expect(vf.locator('#cardRoot')).to_have_attribute('data-physical-state','cover');vf.locator('.paper-cover').click();expect(vf.locator('#cardRoot')).to_have_attribute('data-physical-state','inside');expect(vf.locator('#message')).to_have_text(MESSAGE);expect(vf.locator('#from')).to_have_text('With love, Alex');capture(vf,f'recipient-{width}.png');assert viewer.evaluate('document.documentElement.scrollWidth<=innerWidth')
   viewer.locator('#replayButton').click();expect(vf.locator('#cardRoot')).to_have_attribute('data-physical-state','envelope');vf.locator('.paper-skip').click();expect(vf.locator('#cardRoot')).to_have_attribute('data-physical-state','inside');viewer.close();page.bring_to_front()
   # Overfull text is never cut from the accessible reading view; sharing stays blocked.
   step(page,3);long='A thoughtful word 🦋.\n'*180;page.locator('#messageInput').fill(long);step(page,5);assert not fit(page);f.locator('.paper-read').click();expect(f.locator('.paper-reader-text')).to_contain_text(long);f.locator('.paper-reader-close').click();page.locator('#shareLinkButton').click();expect(page.locator('#exportStatus')).to_contain_text('does not fit')
   step(page,3);page.locator('#messageInput').fill(MESSAGE);step(page,5);assert fit(page)
   # Every existing design gets a fitting physical cover and inside without redesign.
   count=page.evaluate('''async()=>{const {loadThemes,cardContent}=await import('./engine/card-data.js');const {defaultPhysical}=await import('./engine/physical-schema.js');const {defaultOpening}=await import('./engine/openings/config.js');const w=document.querySelector('#cardPreview').contentWindow;const themes=await loadThemes();for(const theme of themes){w.setCardData({...cardContent({theme,...theme.defaults,fontId:theme.defaultFontId,textSize:18,watermark:true,physicalConfig:defaultPhysical(),openingConfig:defaultOpening()}),palette:theme.palette,features:theme.features});if(!await w.checkFit())throw Error('Physical design does not fit: '+theme.id);await Promise.all([...w.document.querySelectorAll('.paper-cover-art,.paper-left-art,.paper-inside-art')].filter(i=>!i.hidden).map(i=>i.decode()))}return themes.length}''');assert count==91
   # Turning the enhancement off restores the existing animated renderer.
   step(page,4);page.locator('#physicalToggle').uncheck();step(page,5);assert fit(page);expect(f.locator('.physical-scene')).to_be_hidden();expect(f.locator('#headline')).to_contain_text('Happy Birthday');assert not f.locator('.card').evaluate('e=>e.parentElement.classList.contains("paper-right")')
   assert not errors,errors
   print(f'PASS {width}x{height}: envelope/extraction/same cover/unfold/close/reopen, complete handwriting/Unicode/signature, six papers, v5 draft/share/recipient, reduced motion/skip, long-text reader and legacy restoration',flush=True)
   context.close()
  browser.close()
finally:server.shutdown();server.server_close()
