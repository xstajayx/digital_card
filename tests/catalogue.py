"""Static-only catalogue integration; all external/backend requests are blocked."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, os, shutil, threading
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
ART=Path(os.environ.get('CARD_ARTIFACT_DIR','/workspace/onboarding/catalogue'))/'catalogue'
ART.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT.parent),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}/{ROOT.name}/'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CARD_CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
  for width,height in [(360,800),(390,844),(768,1024),(1440,900)]:
   context=browser.new_context(viewport={'width':width,'height':height},permissions=['clipboard-read','clipboard-write'],reduced_motion='reduce')
   errors=[];external=[]
   def route(r):
    # Simulate a configured but unreachable hosted service. Standard cards must
    # still send locally without making a single request to it.
    if urlsplit(r.request.url).path.endswith('/app/hosted-config.js'):
     source=(ROOT/'app/hosted-config.js').read_text().replace('export const HOSTED_API = "";', 'export const HOSTED_API = "https://backend-disabled.invalid";')
     r.fulfill(status=200,content_type='text/javascript',body=source);return
    if urlsplit(r.request.url).hostname not in ['127.0.0.1','localhost']:
     external.append(r.request.url);r.abort()
    else:r.continue_()
   context.route('**/*',route)
   def observe(page):
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    page.on('response',lambda r:errors.append(f'HTTP {r.status}: {r.url}') if r.status>=400 else None)
   context.on('page',observe)
   page=context.new_page();page.goto(BASE)
   expect(page.locator('.shop-card')).to_have_count(91)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.locator('.shop-thumbnail img').evaluate_all("items=>items.forEach(i=>i.loading='eager')")
   page.wait_for_function("[...document.querySelectorAll('.shop-thumbnail img')].every(i=>i.complete&&i.naturalWidth)")
   page.locator('.browse-more').evaluate('e=>e.open=true')
   for id,value in [('style','gold'),('relationship','grandad'),('interest','fishing'),('tone','funny'),('occasion','sympathy')]:
    page.locator('#filters').evaluate('e=>e.reset()')
    page.locator('#'+id).select_option(value)
    expect(page.locator('.shop-card:visible').first).to_be_visible()
    assert page.locator('.shop-card:visible').count()<91
   page.locator('#filters').evaluate('e=>e.reset()');expect(page.locator('.shop-card:visible')).to_have_count(91)
   page.locator('#search').fill('no such design xxxxx');expect(page.locator('#catalogueStatus')).to_contain_text('No matching')
   page.locator('#filters').evaluate('e=>e.reset()');expect(page.locator('.shop-card:visible')).to_have_count(91)
   page.locator('[data-collection="winter"]').click()
   expect(page.locator('.shop-card:visible')).to_have_count(7)
   page.locator('#filters').evaluate('e=>e.reset()')
   page.locator('.browse-more').evaluate('e=>e.open=false')
   page.locator('#catalogueResults').scroll_into_view_if_needed()
   page.screenshot(path=str(ART/f'shop-{width}.png'))
   page.locator('.shop-card[data-id="christmas-robin"] .text-button').click()
   expect(page.locator('#designPreview')).to_be_visible()
   f=page.frame_locator('#shopPreview')
   expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','cover')
   expect(f.locator('.paper-cover-art')).to_have_attribute('src',BASE+'stickers/packs/robin-winter.svg')
   for stage in ['envelope','inside','cover']:
    page.locator(f'#previewStages [data-stage="{stage}"]').click()
    expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state',stage)
   page.screenshot(path=str(ART/f'quick-preview-{width}.png'))
   page.keyboard.press('Escape');expect(page.locator('#designPreview')).not_to_be_visible()
   page.goto(BASE+'studio.html?design=birthday-fishing')
   expect(page.locator('.occasion-tile')).to_have_count(28)
   f=page.frame_locator('#cardPreview')
   expect(f.locator('#cardRoot')).to_have_attribute('data-physical','true')
   expect(f.locator('.paper-cover-art')).to_have_attribute('src',BASE+'stickers/packs/fishing-lake.svg')
   expect(page.locator('#physical-coverArt')).to_have_value('fishing-lake')
   expect(f.locator('.paper-cover-name')).to_have_text('')
   # Rapid design changes: last choice owns artwork, envelope, font and palette.
   page.locator('.steps [data-step="1"]').click()
   for design in ['birthday-garden','birthday-gaming','birthday-football','birthday-fishing']:
    page.locator(f'[data-theme="{design}"]').click()
   expect(f.locator('.paper-cover-art')).to_have_attribute('src',BASE+'stickers/packs/fishing-lake.svg')
   page.locator('.steps [data-step="3"]').click()
   message='A quiet lake, a good book, and a whole day just for you.\n\nHappy birthday! 🐟 café'
   page.locator('#toInput').fill('Jamie');page.locator('#messageInput').fill(message);page.locator('#fromInput').fill('With love')
   page.locator('.steps [data-step="5"]').click();page.locator('#shareLinkButton').click()
   expect(page.locator('#exportStatus')).to_contain_text('Link copied')
   link=page.evaluate('navigator.clipboard.readText()');assert '#c=5' in link and len(link)<1600
   viewer=context.new_page();viewer.goto(link);vf=viewer.frame_locator('#viewerFrame')
   expect(vf.locator('#cardRoot')).to_have_attribute('data-physical-state','envelope')
   vf.locator('.paper-envelope-front').click();expect(vf.locator('#cardRoot')).to_have_attribute('data-physical-state','cover')
   expect(vf.locator('.paper-cover-name')).to_have_text('')
   expect(vf.locator('.paper-cover-art')).to_have_attribute('src',BASE+'stickers/packs/fishing-lake.svg')
   viewer.screenshot(path=str(ART/f'recipient-cover-{width}.png'))
   vf.locator('.paper-cover').click();expect(vf.locator('#message')).to_have_text(message)
   assert not viewer.locator('.steps').count()
   assert viewer.evaluate('document.documentElement.scrollWidth<=innerWidth')
   viewer.screenshot(path=str(ART/f'recipient-inside-{width}.png'))
   viewer.close();page.bring_to_front()
   # Exercise every added design with its actual loaded font and static assets.
   count=page.evaluate('''async()=>{
    const {loadThemes,cardContent}=await import('./engine/card-data.js');
    const {designDefaults}=await import('./engine/catalogue.js');
    const w=document.getElementById('cardPreview').contentWindow;
    const themes=(await loadThemes()).filter(t=>t.catalogue);
    for(const theme of themes){
     const content=cardContent({theme,...theme.defaults,...designDefaults(theme),to:'',from:'',textSize:18,watermark:true});
     w.setCardData({...content,palette:theme.palette,features:theme.features,milestone:theme.milestone});
     const fit=await Promise.race([w.checkFit(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Fit timeout: '+theme.id)),10000))]);
     if(!fit)throw Error('Fit failed: '+theme.id);
     const img=w.document.querySelector('.paper-cover-art');await img.decode();
     if(w.document.querySelector('.paper-cover-name').textContent)throw Error('Cover name leak');
    }return themes.length;
   }''');assert count==63
   # Milestone entry applies default pack art and prominent ordinal without a name.
   page.goto(BASE+'studio.html?design=milestone-candles');expect(page.locator('.occasion-tile')).to_have_count(28)
   page.locator('#birthdayNumberInput').fill('40');f=page.frame_locator('#cardPreview')
   expect(f.locator('.paper-cover-title')).to_have_text('Happy 40th Birthday!')
   assert not errors,errors
   assert not external,external
   print(f'PASS {width}x{height}: 91 thumbnails, filters, folded preview, creator defaults, rapid design changes, static v5 recipient journey, all 63 new covers/fonts/assets fit, milestone; zero external/backend requests or console errors',flush=True)
   context.close()
  browser.close()
finally:server.shutdown();server.server_close()
