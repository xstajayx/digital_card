"""Detect viewport AND container clipping, including zero-width flex controls."""
from editor_controls import advanced
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading,subprocess,os,shutil,json
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];ART=Path(os.environ.get('CARD_ARTIFACT_DIR',str(ROOT.parent/'onboarding')))/'responsive';ART.mkdir(parents=True,exist_ok=True)
BASELINE=os.environ.get('RESPONSIVE_BASELINE_REF')
BEFORE={p:subprocess.check_output(['git','show',BASELINE+':'+p]) for p in ['assets/app.css','assets/shop.css','app/main.js','app/opening-picker.js','studio.html']} if BASELINE else {}
class Handler(SimpleHTTPRequestHandler):
 baseline=False
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT.parent),**k)
 def do_GET(self):
  relative=self.path.split('?',1)[0].removeprefix('/'+ROOT.name+'/')
  if self.baseline and relative in BEFORE:
   data=BEFORE[relative];self.send_response(200);self.send_header('Content-Type','text/css' if relative.endswith('.css') else 'text/javascript' if relative.endswith('.js') else 'text/html');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
  else:super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}/{ROOT.name}/'
CHECK='''()=>{
 const failures=[];const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility==='visible'&&!e.closest('.sr-only,.skip-link,[aria-hidden="true"],[inert]');
 const describe=e=>e.id||e.className||e.tagName;
 for(const e of document.querySelectorAll('input,select,textarea,button,.field,.toggle,legend,nav a')){
  if(!visible(e))continue;const r=e.getBoundingClientRect();
  if(r.width<1||r.left<-.5||r.right>innerWidth+.5)failures.push([describe(e),'viewport/zero width',r.x,r.width,innerWidth]);
  const container=e.matches('input,select,textarea')?e.closest('.field,.toggle'):e.closest('.editor-panel,.shop-card,.shop-nav,.shop-footer,.step-footer');
  if(container){const c=container.getBoundingClientRect();if(r.left<c.left-.5||r.right>c.right+.5)failures.push([describe(e),'container',r.left,r.right,c.left,c.right]);}
  if(e.matches('button')){const walk=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);while(walk.nextNode()){const node=walk.currentNode;if(!node.textContent.trim()||node.parentElement.closest('[aria-hidden="true"]'))continue;const range=document.createRange();range.selectNodeContents(node);for(const text of range.getClientRects())if(text.left<r.left-1||text.right>r.right+1)failures.push([describe(e),'clipped button text',text.left,text.right,r.left,r.right]);}}
  if(e.matches('input:not([type=checkbox]):not([type=color]),select,textarea')&&e.closest('.field')&&r.width<80)failures.push([describe(e),'collapsed control',r.width]);
  if(e.matches('button,input,select,textarea,nav a')&&!e.disabled){const target=e.matches('[type=checkbox]')?e.closest('label'):e;const t=target.getBoundingClientRect();if(t.height<43.5)failures.push([describe(e),'touch height',t.height]);}
 }
 if(document.documentElement.scrollWidth>innerWidth+1)failures.push(['document','horizontal scroll',document.documentElement.scrollWidth,innerWidth]);
 return failures;
}'''
def check(page,label):
 errors=page.evaluate(CHECK);assert not errors,(label,errors)
def step(page,n):page.locator(f'.steps [data-step="{n}"]').click();expect(page.locator(f'[data-panel="{n}"]')).to_be_visible();advanced(page)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('CARD_CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
  # Actual baseline source, rather than a fabricated CSS reconstruction.
  Handler.baseline=True
  for width in ([360,390] if BASELINE else []):
   page=b.new_page(viewport={'width':width,'height':844});page.goto(BASE+'studio.html');expect(page.locator('.occasion-tile')).to_have_count(23);step(page,4);page.locator('#physicalToggle').check();bad=page.evaluate(CHECK);assert any(x[0]=='physicalToggle' for x in bad),bad;assert any(x[0]=='opening-type' for x in bad),bad;page.screenshot(path=str(ART/f'before-step4-{width}.png'),full_page=True);page.close()
  Handler.baseline=False
  sizes=[(320,800),(360,800),(390,844),(412,915),(430,932),(768,1024),(1024,768),(1440,900),(800,360),(844,390)]
  for width,height in sizes:
   ctx=b.new_context(viewport={'width':width,'height':height},permissions=['clipboard-read','clipboard-write']);errors=[];ctx.on('page',lambda page:page.on('pageerror',lambda err:errors.append(str(err))));page=ctx.new_page();page.goto(BASE+'studio.html');expect(page.locator('.occasion-tile')).to_have_count(23)
   for n in range(1,6):
    step(page,n)
    if n==4:page.locator('#physicalToggle').uncheck();page.locator('#opening-type').select_option('gift-box')
    if n==5:assert page.locator('#cardPreview').evaluate('async e=>{await new Promise(requestAnimationFrame);return e.contentWindow.checkFit()}')
    check(page,f'{width} step {n}')
    if width in [360,390,1440]:page.screenshot(path=str(ART/f'after-step{n}-{width}.png'),full_page=True);page.screenshot(path=str(ART/f'after-step{n}-{width}-viewport.png'))
   step(page,4);page.locator('#physicalToggle').check()
   if width in [360,390,1440]:page.screenshot(path=str(ART/f'after-step4-paper-{width}.png'),full_page=True)
   advanced(page);page.locator('#giftToggle').check();check(page,f'{width} expanded physical/extras');expect(page.locator('#opening-description')).to_contain_text('Traditional paper card')
   if width in [360,390,1440]:page.screenshot(path=str(ART/f'after-step4-expanded-{width}.png'),full_page=True)
   # Every enabled field can be scrolled above the fixed bottom bar.
   if width<900:
    page.locator('#giftInput').scroll_into_view_if_needed();page.locator('#giftInput').evaluate("e=>e.scrollIntoView({block:'center'})");footer=page.locator('.step-footer').bounding_box();field=page.locator('#giftInput').bounding_box();assert field['y']+field['height']<=footer['y']+1
    page.set_viewport_size({'width':width,'height':max(320,height//2)});page.locator('#giftInput').focus();page.locator('#giftInput').evaluate("e=>e.scrollIntoView({block:'center'})");check(page,f'{width} keyboard-sized viewport');target=page.locator('#giftInput').bounding_box();bar=page.locator('.step-footer').bounding_box();assert target['y']>=0 and target['y']+target['height']<=bar['y']+1,(width,target,bar);page.set_viewport_size({'width':width,'height':height})
   # Text resizing exercises intrinsic widths without shrinking fonts to hide overflow.
   page.locator('html').evaluate("e=>e.style.fontSize='200%'")
   for n in range(1,6):step(page,n);check(page,f'{width} step {n} 200% text')
   page.locator('html').evaluate("e=>e.style.fontSize=''");step(page,4)
   # Native focus/keyboard operation after reflow.
   page.locator('#opening-effect').focus();expect(page.locator('#opening-effect')).to_be_focused();page.keyboard.press('Tab');expect(page.locator('.extras summary')).to_be_focused()
   if width<900:
    target=page.locator('.extras summary').bounding_box();bar=page.locator('.step-footer').bounding_box();assert target['y']>=0 and target['y']+target['height']<=bar['y']+1,(width,target,bar)
   page.locator('#physicalToggle').uncheck();page.locator('#opening-type').select_option('gift-box');step(page,5);f=page.frame_locator('#cardPreview');expect(f.locator('#cardRoot')).to_have_attribute('data-opening-state','ready');f.get_by_role('button',name='Skip opening').click()
   for opening in ['envelope','gift-box']:
    step(page,4);page.locator('#opening-type').select_option(opening);step(page,5);f=page.frame_locator('#cardPreview');expect(f.locator('#cardRoot')).to_have_attribute('data-opening-state','ready');assert not f.locator('html').evaluate(CHECK),(width,opening,f.locator('html').evaluate(CHECK));f.get_by_role('button',name='Skip opening').click()
   step(page,4);page.locator('#physicalToggle').check();step(page,5);f=page.frame_locator('#cardPreview');expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','envelope');assert not f.locator('html').evaluate(CHECK),(width,'paper',f.locator('html').evaluate(CHECK));page.locator('#shareLinkButton').click();expect(page.locator('#exportStatus')).to_contain_text('Link copied');url=page.evaluate('navigator.clipboard.readText()');viewer=ctx.new_page();viewer.goto(url);vf=viewer.frame_locator('#viewerFrame');expect(vf.locator('#cardRoot')).to_have_attribute('data-physical-state','envelope');check(viewer,f'{width} recipient');assert not vf.locator('html').evaluate(CHECK),(width,'recipient paper',vf.locator('html').evaluate(CHECK));viewer.close();page.bring_to_front()
   for path in ['', 'ai.html','information.html']:
    page.goto(BASE+path)
    if not path:expect(page.locator('.shop-card')).to_have_count(28)
    check(page,f'{width} {path or "shop"}');page.locator('html').evaluate("e=>e.style.fontSize='200%'");check(page,f'{width} {path} 200%');page.locator('html').evaluate("e=>e.style.fontSize=''")
   # A scaled iframe still exposes every action and reserves the action row below paper.
   page.goto(BASE+'studio.html');expect(page.locator('.occasion-tile')).to_have_count(23);step(page,4);page.locator('#physicalToggle').check();step(page,5);f=page.frame_locator('#cardPreview');expect(f.locator('#cardRoot')).to_have_attribute('data-physical','true');f.locator('html').evaluate("e=>e.style.fontSize='200%'")
   page.locator('#cardPreview').evaluate('async e=>{await new Promise(requestAnimationFrame);await e.contentWindow.checkFit()}')
   rects=f.locator('html').evaluate("()=>({stage:document.querySelector('.physical-stage').getBoundingClientRect().bottom,controls:document.querySelector('.paper-controls').getBoundingClientRect().top,buttons:[...document.querySelectorAll('.paper-controls button')].filter(e=>e.getClientRects().length).map(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})),height:innerHeight})")
   assert rects['stage']<=rects['controls']+1,(width,rects);assert all(r['top']>=0 and r['bottom']<=rects['height'] for r in rects['buttons']),(width,rects)
   assert not errors,errors
   print(f'PASS {width}x{height}: five steps, expanded settings, field/container bounds, targets, keyboard-sized viewport, 200% text, keyboard navigation and public pages',flush=True);ctx.close()
  b.close()
finally:server.shutdown();server.server_close()
