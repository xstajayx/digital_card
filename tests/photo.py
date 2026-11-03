"""Local photo creator: raster safety, crop, physical pages, drafts and share isolation."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import threading,os,shutil,re,struct,base64,json
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];ART=Path(os.environ.get('CARD_ARTIFACT_DIR',str(ROOT/'docs/photo-cards/screenshots')))/'photos';ART.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
 def copyfile(self,s,o):
  try:super().copyfile(s,o)
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}/'
RAW=(ROOT/'tests/fixtures/photo-portrait.jpg').read_bytes()
# A valid EXIF ImageDescription tag, constructed with the standard library.
private=b'PRIVATE-PHOTO-METADATA\0'
tiff=b'II'+struct.pack('<HI',42,8)+struct.pack('<H',1)+struct.pack('<HHII',270,2,len(private),26)+struct.pack('<I',0)+private
payload=b'Exif\0\0'+tiff
JPEG=RAW[:2]+b'\xff\xe1'+struct.pack('>H',len(payload)+2)+payload+RAW[2:]

def upload(page,content=JPEG,mime='image/jpeg',name='portrait.jpg'):
 page.locator('#localPhotoUpload').set_input_files({'name':name,'mimeType':mime,'buffer':content})
def step(page,n):page.locator(f'.steps [data-step="{n}"]').click()
def crop(page):return page.locator('#photoCropCanvas').evaluate('e=>e.toDataURL()')
def slide(page,key,value):page.locator('#photo-'+key).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',str(value))
def capture(page,f,name):
 style=page.add_style_tag(content='.step-footer{visibility:hidden!important}')
 f.locator('.local-card-photo').evaluate('e=>e.decode()')
 f.locator('#cardRoot').screenshot(path=str(ART/name));style.evaluate('e=>e.remove()')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CARD_CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
  for width,height in [(320,800),(360,800),(390,844),(412,915),(430,932),(768,1024),(1440,900)]:
   ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=width<500,permissions=['clipboard-read','clipboard-write']);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'studio.html');expect(page.locator('.occasion-tile')).to_have_count(23)
   step(page,3);page.locator('#toInput').fill('Maya');page.locator('#messageInput').fill('Here’s to all the adventures still to come.\n\nA little birthday joy, just for you.');page.locator('#fromInput').fill('With love, Alex')
   step(page,4);page.locator('#photo-type').select_option('cover');upload(page);expect(page.locator('#photoStatus')).to_contain_text('preview ready',timeout=20000)
   before=crop(page);slide(page,'zoom',2);page.wait_for_function('(before)=>document.querySelector("#photoCropCanvas").toDataURL()!==before',arg=before);zoomed=crop(page);slide(page,'x',.7);slide(page,'y',-.5);page.locator('#photoRotate').focus();page.keyboard.press('Enter');page.wait_for_function('(before)=>document.querySelector("#photoCropCanvas").toDataURL()!==before',arg=zoomed)
   page.locator('#photo-aspect').select_option('square');page.locator('#photo-border').select_option('gold');page.locator('#photo-alt').fill('A portrait of Grace Hopper, test photograph')
   step(page,5);f=page.frame_locator('#cardPreview');root=f.locator('#cardRoot');expect(root).to_have_class(re.compile('local-photo-card'));page.locator('#cardPreview').evaluate('async e=>e.contentWindow.checkFit()');expect(root).to_have_attribute('data-physical-state','envelope');capture(page,f,f'envelope-{width}.png')
   f.locator('.paper-book').evaluate('e=>window.photoBook=e')
   if width<500:f.locator('.paper-envelope-front').tap()
   else:f.locator('.paper-envelope-front').focus();page.keyboard.press('Enter')
   expect(root).to_have_attribute('data-physical-state','cover');assert f.locator('.local-photo-zone').evaluate('e=>e.parentElement.classList.contains("paper-front-face")');assert f.locator('.paper-book').evaluate('e=>e===window.photoBook');capture(page,f,f'cover-{width}.png')
   box=f.locator('.local-photo-zone').bounding_box();assert abs(box['width']/box['height']-1)<.03
   title=f.locator('.paper-cover-title').bounding_box();assert title['y']>=box['y']+box['height']-1
   src=f.locator('.local-card-photo').get_attribute('src');f.locator('.paper-cover').click();expect(root).to_have_attribute('data-physical-state','inside');expect(f.locator('#from')).to_have_text('With love, Alex');f.locator('.paper-action').click();expect(root).to_have_attribute('data-physical-state','cover');f.locator('.paper-cover').click();expect(root).to_have_attribute('data-physical-state','inside');assert f.locator('.local-card-photo').get_attribute('src')==src
   page.locator('#replayButton').click();expect(root).to_have_attribute('data-physical-state','envelope');assert f.locator('.local-card-photo').get_attribute('src')==src
   # All transports reject active photo cards, including missing-photo modes.
   page.locator('#shareLinkButton').click();expect(page.locator('#exportStatus')).to_contain_text('local previews only');expect(page.locator('#shareFallback')).to_be_hidden()
   step(page,4);page.locator('#photo-type').select_option('memory');page.locator('#photo-layout').select_option('inside');page.locator('#photo-border').select_option('paper');page.locator('#photo-aspect').select_option('portrait')
   step(page,5);page.emulate_media(reduced_motion='reduce');f.locator('.paper-envelope-front').click();expect(root).to_have_attribute('data-physical-state','cover');f.locator('.paper-cover').click();expect(root).to_have_attribute('data-physical-state','inside');assert f.locator('.local-photo-zone').evaluate('e=>e.parentElement.classList.contains("paper-left")');assert f.locator('.local-card-photo-back').get_attribute('src')==f.locator('.local-card-photo').get_attribute('src');assert f.locator('.paper-inside-art').evaluate('e=>getComputedStyle(e).display==="none"')
   if width<768:
    page.locator('#photoPage').click();expect(root).to_have_attribute('data-local-page','photo');expect(f.locator('.paper-left')).to_be_visible();assert f.locator('.paper-right').evaluate('e=>e.inert');capture(page,f,f'inside-photo-{width}.png');page.locator('#messagePage').click();assert not f.locator('.paper-right').evaluate('e=>e.inert')
   else:
    a=f.locator('.local-photo-zone').bounding_box();b=f.locator('#message').bounding_box();assert a['x']+a['width']<=b['x']+1
   capture(page,f,f'inside-message-{width}.png');expect(f.locator('#message')).to_contain_text('adventures still to come');assert page.locator('#cardPreview').evaluate('async e=>e.contentWindow.checkFit()')
   step(page,4);(page.get_by_role('button',name='Save draft',exact=True) if width==320 else page.locator('#savePhotoDraft')).click();expect(page.locator('#photoStatus')).to_contain_text('draft saved');assert page.evaluate('localStorage.getItem("silent-hello-draft-v1")') is None
   saved=page.evaluate('''async()=>{const db=await new Promise((r,j)=>{const q=indexedDB.open('silent-hello-photo-drafts-v1',1);q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});const d=await new Promise(r=>{const q=db.transaction('drafts').objectStore('drafts').get('photo');q.onsuccess=()=>r(q.result)});db.close();return {type:d.blob.type,bytes:[...new Uint8Array(await d.blob.arrayBuffer())],edit:d.edit}}''');assert saved['type']=='image/png';assert b'PRIVATE-PHOTO-METADATA' not in bytes(saved['bytes']);assert saved['edit']['zoom']==2 and saved['edit']['rotation']==90
   page.reload();step(page,4);page.locator('#restorePhotoDraft').click();expect(page.locator('#photoStatus')).to_contain_text('draft restored');expect(page.locator('#photo-type')).to_have_value('memory');expect(page.locator('#photo-zoom')).to_have_value('2');expect(page.locator('#photo-layout')).to_have_value('inside')
   # Switching designs keeps photos and the message; switching type restores illustration.
   step(page,1);page.get_by_role('button',name='Anniversary',exact=True).click();step(page,4);expect(page.locator('#photo-type')).to_have_value('memory');page.locator('#photo-type').select_option('illustrated');step(page,5);expect(root).not_to_have_class(re.compile('local-photo-card'));page.locator('#shareLinkButton').click();expect(page.locator('#exportStatus')).to_contain_text('Link copied');url=page.evaluate('navigator.clipboard.readText()');assert '#c=5' in url
   viewer=ctx.new_page();viewer.goto(url);vf=viewer.frame_locator('#viewerFrame');expect(vf.locator('#cardRoot')).to_have_attribute('data-physical-state','envelope');assert vf.locator('.local-photo-zone').count()==0;assert viewer.locator('input[type=file]').count()==0;viewer.close();step(page,4);page.locator('#deletePhotoDraft').click();expect(page.locator('#photoStatus')).to_contain_text('draft deleted');page.locator('#restorePhotoDraft').click();expect(page.locator('#photoError')).to_contain_text('No complete photo draft')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not f.locator('html').evaluate('e=>e.scrollWidth>innerWidth');assert not errors,errors
   print(f'PASS {width}px photo: upload/crop/zoom/reposition/rotation, square gold cover, attached book/open/close/replay, memory inside pages, reduced motion/touch/keyboard, no text overlap, IndexedDB recovery/metadata stripping, design switch, v5 traditional sharing and recipient isolation',flush=True);ctx.close()
  # Broader file, failure, gesture and transport checks use one viewport.
  page=browser.new_page(viewport={'width':390,'height':844});page.goto(BASE+'studio.html');step(page,4);page.locator('#photo-type').select_option('cover');upload(page,b'<svg onload="alert(1)"></svg>','image/jpeg');expect(page.locator('#photoError')).to_contain_text('valid, still');upload(page,b'GIF89a'+bytes(20),'image/gif','animated.gif');expect(page.locator('#photoError')).to_contain_text('not supported')
  for fmt,mime in [('PNG','image/png'),('WEBP','image/webp')]:
   data=page.evaluate("""async ([source,type])=>{const image=new Image();image.src='data:image/jpeg;base64,'+source;await image.decode();const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;c.getContext('2d').drawImage(image,0,0);const b=await new Promise(r=>c.toBlob(r,type));return [...new Uint8Array(await b.arrayBuffer())]}""",[base64.b64encode(RAW).decode(),mime]);upload(page,bytes(data),mime,'photo.'+fmt.lower());expect(page.locator('#photoStatus')).to_contain_text('preview ready')
  # Pointer drag and keyboard sliders both change the crop.
  slide(page,'zoom',2);page.locator('#photo-x').focus();page.keyboard.press('ArrowLeft');expect(page.locator('#photo-x')).not_to_have_value('0');canvas=page.locator('#photoCropCanvas');canvas.scroll_into_view_if_needed();box=canvas.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.mouse.move(box['x']+box['width']*.7,box['y']+box['height']*.6,steps=5);page.mouse.up();assert abs(float(page.locator('#photo-x').input_value()))>.1
  # Full cover retains a separate, readable greeting band.
  page.locator('#photo-layout').select_option('full');step(page,5);f=page.frame_locator('#cardPreview');page.emulate_media(reduced_motion='reduce');f.locator('.paper-envelope-front').click();expect(f.locator('#cardRoot')).to_have_attribute('data-physical-state','cover');capture(page,f,'full-cover-390.png');a=f.locator('.local-photo-zone').bounding_box();b=f.locator('.paper-cover-title').bounding_box();assert b['y']>=a['y']+a['height']-1
  page.evaluate('''()=>{window.transports=0;Object.defineProperty(navigator,'share',{configurable:true,value:()=>{transports++;return Promise.resolve()}});window.open=()=>{transports++;return {opener:null,close(){},location:{}}}}''')
  for selector in ['#shareLinkButton','#nativeShareButton','#emailShareButton','#smsShareButton','#shareWhatsappButton','#quickShareButton']:
   page.locator(selector).click();expect(page.locator('#exportStatus')).to_contain_text('local previews only')
  # A WhatsApp blank window may be reserved by the existing transport, then closed;
  # no card URL or native share payload can be delivered.
  assert page.evaluate('window.transports')<=1
  step(page,4);page.locator('#photoRemove').click();expect(page.locator('#photo-type')).to_have_value('illustrated');step(page,5);expect(f.locator('#cardRoot')).not_to_have_class(re.compile('local-photo-card'))
  # Missing photo drafts leave the current card intact; failed writes do not claim success.
  step(page,4);page.evaluate('''async()=>{const db=await new Promise(r=>{const q=indexedDB.open('silent-hello-photo-drafts-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('drafts');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('drafts','readwrite');t.objectStore('drafts').put({version:1,mode:'cover'},'photo');t.oncomplete=r});db.close()}''');page.locator('#restorePhotoDraft').click();expect(page.locator('#photoError')).to_contain_text('No complete photo draft');expect(page.locator('#photo-type')).to_have_value('illustrated')
  page.locator('#photo-type').select_option('cover');upload(page);expect(page.locator('#photoStatus')).to_contain_text('preview ready');page.evaluate('()=>{indexedDB.open=()=>{throw new Error("blocked")}}');page.locator('#savePhotoDraft').click();expect(page.locator('#photoError')).to_contain_text('blocked or full');page.screenshot(path=str(ART/'editor-390.png'),full_page=True)
  print('PASS format spoof/GIF rejection, real PNG/WebP, pointer/keyboard crop, full cover greeting zone, all share transports blocked, remove, missing draft and storage failure',flush=True)
  browser.close()
finally:server.shutdown();server.server_close()
