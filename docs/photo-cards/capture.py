from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[2];ART=ROOT/'docs/photo-cards/screenshots/photos'
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import threading
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
 def copyfile(self,s,o):
  try:super().copyfile(s,o)
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}/'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for width,height in [(390,844),(1440,900)]:
   page=b.new_page(viewport={'width':width,'height':height});page.goto(BASE+'studio.html');page.emulate_media(reduced_motion='reduce')
   page.locator('.steps [data-step="3"]').click();page.locator('#toInput').fill('Maya');page.locator('#messageInput').fill('Here’s to a year of little wonders, brave adventures and lovely memories.\n\nA little birthday joy, just for you.');page.locator('#fromInput').fill('With love, Alex')
   page.locator('.steps [data-step="4"]').click();page.locator('#photo-type').select_option('cover');page.locator('#localPhotoUpload').set_input_files(str(ROOT/'tests/fixtures/photo-portrait.jpg'));expect(page.locator('#photoStatus')).to_contain_text('preview ready');page.locator('#photo-border').select_option('gold');page.locator('#physical-coverGreeting').fill('A little birthday joy');page.locator('#photo-alt').fill('A test portrait of Rear Admiral Grace Hopper')
   if width==390:
    page.locator('#photoCropCanvas').scroll_into_view_if_needed();page.screenshot(path=str(ART/'showcase-editor-390.png'))
   page.locator('.steps [data-step="5"]').click();f=page.frame_locator('#cardPreview');f.locator('.paper-envelope-front').click();expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','cover')
   def capture(name):
    style=page.add_style_tag(content='.step-footer{visibility:hidden!important}');f.locator('.local-card-photo').evaluate('e=>e.decode()');f.locator('.local-card-photo-back[src]').evaluate_all('els=>Promise.all(els.map(e=>e.decode()))');assert page.locator('#cardPreview').evaluate('async e=>e.contentWindow.checkFit()');f.locator('#cardRoot').screenshot(path=str(ART/name));style.evaluate('e=>e.remove()')
   capture(f'showcase-cover-{width}.png')
   page.locator('.steps [data-step="4"]').click();page.locator('#photo-type').select_option('memory');page.locator('#photo-layout').select_option('inside');page.locator('#photo-border').select_option('paper');page.locator('.steps [data-step="5"]').click();f.locator('.paper-cover').click();expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','inside')
   if width==390:
    page.locator('#photoPage').click();capture('showcase-inside-photo-390.png');page.locator('#messagePage').click();capture('showcase-inside-message-390.png')
   else:
    expect(f.locator('.local-photo-zone')).to_be_visible();assert f.locator('.local-photo-zone').evaluate('e=>e.parentElement.classList.contains("paper-left")');capture('showcase-inside-1440.png')
   if width==1440:
    page.locator('.steps [data-step="3"]').click();long='A memory worth keeping.\n'*160;page.locator('#messageInput').fill(long);page.locator('.steps [data-step="5"]').click();assert not page.locator('#cardPreview').evaluate('async e=>e.contentWindow.checkFit()');f.locator('.paper-read').click();expect(f.locator('.paper-reader-text')).to_contain_text(long);expect(f.locator('.paper-reader-text')).to_contain_text('With love, Alex');f.locator('.paper-reader-close').click()
   page.close()
  b.close()
 print('PASS upright photo showcases: cover and handwritten inside, mobile page views and desktop spread, current text-fit checks and complete long-message reading fallback')
finally:server.shutdown();server.server_close()
