"""Additive storefront, draft and interactive-opening regressions."""
from editor_controls import legacy, drafts
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT.parent),**kw)
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/{ROOT.name}/'
artifacts=ROOT.parent/'onboarding'/'silent-hello';artifacts.mkdir(parents=True,exist_ok=True)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=__import__('os').environ.get('CARD_CHROMIUM_PATH') or __import__('shutil').which('chromium'),args=['--no-sandbox'])
  for width,height in [(360,800),(390,844),(768,1024),(1440,900)]:
   context=b.new_context(viewport={'width':width,'height':height});errors=[]
   context.on('page',lambda pg:pg.on('pageerror',lambda e:errors.append(str(e))))
   pg=context.new_page();pg.goto(base);expect(pg.locator('.shop-card')).to_have_count(28)
   pg.locator('.shop-thumbnail img').evaluate_all("images=>images.forEach(i=>i.loading='eager')");pg.wait_for_function("[...document.querySelectorAll('.shop-thumbnail img')].every(i=>i.complete&&i.naturalWidth>0)")
   pg.locator('#search').fill('birthday');assert pg.locator('.shop-card:visible').count()>=4
   pg.locator('#filters').evaluate('e=>e.reset()');expect(pg.locator('.shop-card:visible')).to_have_count(28)
   pg.locator('#opening').select_option('envelope');expect(pg.locator('.shop-card:visible')).to_have_count(1)
   pg.locator('.shop-card:visible .text-button').click();expect(pg.locator('#designPreview')).to_be_visible();pg.locator('#closePreview').click()
   pg.locator('#filters').evaluate('e=>e.reset()');expect(pg.locator('.shop-card:visible')).to_have_count(28)
   assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
   pg.screenshot(path=str(artifacts/f'shop-{width}.png'),full_page=True)
   pg.goto(base+'studio.html?design=birthday-envelope');expect(pg.locator('.occasion-tile')).to_have_count(23);legacy(pg);drafts(pg)
   pg.locator('.steps [data-step="5"]').click();f=pg.frame_locator('#cardPreview');expect(f.locator('#cardRoot')).to_have_attribute('data-opening-state','ready')
   f.get_by_role('button',name='Open your card',exact=True).focus();pg.keyboard.press('Enter');expect(f.locator('#cardRoot')).to_have_attribute('data-opening-state','complete')
   pg.locator('#replayButton').click();expect(f.locator('#cardRoot')).to_have_attribute('data-opening-state','ready');f.get_by_role('button',name='Skip opening').click();expect(f.locator('#cardRoot')).to_have_attribute('data-opening-state','complete')
   pg.locator('.steps [data-step="3"]').click();pg.locator('#messageInput').fill('Remember this little hello.');pg.get_by_role('button',name='Save draft',exact=True).click();pg.reload();expect(pg.locator('.occasion-tile')).to_have_count(23);legacy(pg);drafts(pg)
   pg.get_by_role('button',name='Restore draft',exact=True).click();pg.locator('.steps [data-step="3"]').click();expect(pg.locator('#messageInput')).to_have_value('Remember this little hello.')
   pg.get_by_role('button',name='Delete draft',exact=True).click();assert pg.evaluate("localStorage.getItem('silent-hello-draft-v1')") is None
   pg.goto(base+'studio.html?design=christmas-gift');expect(pg.locator('.occasion-tile')).to_have_count(23);legacy(pg);drafts(pg);pg.locator('.steps [data-step="5"]').click();pg.emulate_media(reduced_motion='reduce');f=pg.frame_locator('#cardPreview');expect(f.locator('#cardRoot')).to_have_attribute('data-opening-state','ready');f.get_by_role('button',name='Open your card',exact=True).click();expect(f.locator('#cardRoot')).to_have_attribute('data-opening-state','complete')
   payload=pg.evaluate("""async()=>{const {encodeCard}=await import('./engine/share-codec.js');return encodeCard({themeId:'christmas-gift',to:'Friend',message:'A shared surprise',from:'Me',fontId:'nunito',textSize:18,watermark:true})}""")
   pg.goto(base+'view.html#c='+payload);vf=pg.frame_locator('#viewerFrame');expect(vf.locator('#cardRoot')).to_have_attribute('data-opening-state','ready');vf.get_by_role('button',name='Skip opening').click();expect(vf.locator('#message')).to_have_text('A shared surprise');expect(vf.locator('#cardRoot')).to_have_attribute('data-opening-state','complete')
   assert not errors,errors
   print(f'PASS {width}x{height}: shop, filters, preview, design routing, keyboard openings/replay/skip, reduced motion and draft recovery/deletion',flush=True)
   context.close()
  b.close()
finally:server.shutdown();server.server_close()
