"""Browser regression checks. Requires Python Playwright and system Chromium."""
import base64,json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('CARD_TEST_URL','http://127.0.0.1:8001/digital_card/')
ROOT=Path(__file__).resolve().parents[1]
def encoded(data):return base64.urlsafe_b64encode(json.dumps(data,ensure_ascii=False).encode()).decode().rstrip('=')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(permissions=['clipboard-read','clipboard-write'])
 errors=[]
 def observe(page):
  page.on('pageerror',lambda err:errors.append(str(err)))
  page.on('console',lambda msg:errors.append(msg.text) if msg.type=='error' else None)
 context.on('page',observe)
 page=context.new_page()
 for width in [360,390,1280]:
  page.set_viewport_size({'width':width,'height':900})
  page.goto(BASE)
  expect(page.locator('.theme-tile')).to_have_count(15)
  frame=page.frame_locator('#cardPreview')
  expect(frame.locator('#cardRoot')).to_have_attribute('data-fits','true')
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  # Signature follows message instead of being pushed to a separate image panel.
  box=frame.locator('.text-panel').evaluate('e=>({message:e.querySelector(".message").offsetTop+e.querySelector(".message").offsetHeight,signature:e.querySelector(".from").offsetTop})')
  assert 0<=box['signature']-box['message']<=16,box
  assert frame.locator('.sticker-zone').evaluate('e=>e.offsetHeight')==0
  height=frame.locator('.text-panel').evaluate('e=>e.offsetHeight')
  page.locator('.sticker-tile').nth(1).click()
  expect(frame.locator('#stickerImg')).to_be_visible()
  assert frame.locator('#stickerImg').evaluate('e=>e.complete && e.naturalWidth>0')
  assert frame.locator('.text-panel').evaluate('e=>e.offsetHeight')<height
  geometry=frame.locator('#stickerImg').evaluate('e=>{const a=e.getBoundingClientRect(),b=document.querySelector(".card-root").getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2)}')
  assert geometry<2,geometry
  page.locator('.none-option').click()
  message='Paragraph one 👩🏽‍🚀 café 漢字.\n\nParagraph two: '+('Wonderful wishes for you. '*3)
  page.locator('#toInput').fill('<img src=x onerror=alert(1)>')
  page.locator('#messageInput').fill(message)
  assert frame.locator('#headline img').count()==0
  page.locator('#toInput').fill('Cloud Tester')
  for font in ['fredoka','pacifico','quicksand','poppins','nunito','playfair']:
   page.locator('#fontSelect').select_option(font)
   expect(frame.locator('#message')).to_have_text(message)
   assert frame.locator('#headline img').count()==0
   assert frame.locator('#message').evaluate('e=>document.fonts.check(getComputedStyle(e).font)')
   page.locator('#shareLinkButton').click()
   expect(page.locator('#exportStatus')).to_contain_text('copied')
   url=page.evaluate('navigator.clipboard.readText()')
   viewer=context.new_page();viewer.goto(url)
   expect(viewer.frame_locator('#viewerFrame').locator('#message')).to_have_text(message)
   expect(viewer.frame_locator('#viewerFrame').locator('#cardRoot')).to_have_attribute('data-fits','true')
   assert viewer.frame_locator('#viewerFrame').locator('#message').evaluate('e=>getComputedStyle(e).fontFamily')==frame.locator('#message').evaluate('e=>getComputedStyle(e).fontFamily')
   viewer.close();page.bring_to_front()
  page.locator('#messageInput').fill('Long message 🦋\n'*100)
  expect(page.locator('#fitStatus')).to_contain_text('does not fit')
  expect(frame.locator('#message')).to_have_text('Long message 🦋\n'*100)
  page.locator('#shareLinkButton').click()
  expect(page.locator('#exportStatus')).to_contain_text('does not fit')
  page.locator('#messageInput').fill('Happy day!')
  page.locator('#resetDesignButton').click()
  expect(page.locator('#messageInput')).to_have_value('Happy day!')
  expect(page.locator('#fontSelect')).to_have_value('fredoka')
  # Each theme, every locally allowlisted illustration, matching viewer appearance.
  for i,theme in enumerate(json.loads((ROOT/'themes/themes.json').read_text())):
   page.locator('.theme-tile').nth(i).click()
   expect(frame.locator('#themeStyles')).to_have_attribute('href',f'../themes/{theme}/theme.css')
   for j in range(1,page.locator('.sticker-tile').count()):
    page.locator('.sticker-tile').nth(j).click()
    assert frame.locator('#stickerImg').evaluate('e=>e.complete && e.naturalWidth>0')
   page.locator('.sticker-tile').nth(1).click()
   page.locator('#paperColorInput').fill('#abcdef');page.locator('#inkColorInput').fill('#123456')
   page.locator('#shareLinkButton').click();expect(page.locator('#exportStatus')).to_contain_text('copied')
   viewer=context.new_page();viewer.goto(page.evaluate('navigator.clipboard.readText()'))
   vf=viewer.frame_locator('#viewerFrame')
   expect(vf.locator('#cardRoot')).to_have_attribute('data-fits','true')
   expect(vf.locator('#stickerImg')).to_have_attribute('src',re.compile('/stickers/'+theme+'/illustration-1.svg$'))
   assert vf.locator('#cardRoot').evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(171, 205, 239)'
   assert vf.locator('#message').evaluate('e=>getComputedStyle(e).color')=='rgb(18, 52, 86)'
   viewer.close();page.bring_to_front()
  page.locator('.theme-tile').first.click()
  page.locator('#birthdayNumberToggle').check()
  for n,suffix in [(1,'st'),(2,'nd'),(3,'rd'),(11,'th'),(12,'th'),(13,'th'),(21,'st'),(120,'th')]:
   page.locator('#birthdayNumberInput').fill(str(n))
   expect(frame.locator('#headline')).to_contain_text(f'{n}{suffix} Birthday')
  page.evaluate('window.open=(url)=>{window.openedUrl=url}')
  page.locator('#shareWhatsappButton').click()
  expect(page.locator('#exportStatus')).to_contain_text('WhatsApp')
  assert page.evaluate('window.openedUrl').startswith('https://wa.me/?text=')
  page.wait_for_timeout(3500)
  assert frame.locator('#headline').evaluate('e=>getComputedStyle(e).animationName')=='popIn'
  assert frame.locator('#message').evaluate('e=>getComputedStyle(e).opacity')=='1'
  frame.locator('#cardRoot').screenshot(path=f'/workspace/onboarding/card-{width}.png')
  page.screenshot(path=f'/workspace/onboarding/editor-{width}.png',full_page=True)
  print(f'PASS viewport {width}: editor, layout, six fonts, all themes, sharing, overflow, reset, birthday')
 # Legacy payload and malicious paths/data.
 viewer=context.new_page()
 old={'v':1,'themeId':'love','to':'Old friend','message':'Old shared card\nkeeps newlines','from':'Me','stickerId':'heart-red.png','fontId':'pacifico'}
 viewer.goto(BASE+'view.html?d='+encoded(old));vf=viewer.frame_locator('#viewerFrame')
 expect(vf.locator('#message')).to_have_text(old['message'])
 expect(vf.locator('#stickerImg')).to_have_attribute('src',re.compile('/stickers/love/illustration-1.svg$'))
 for bad in ['../../secret.png','https://example.com/image.png']:
  viewer.goto(BASE+'view.html?d='+encoded({**old,'stickerId':bad,'giftUrl':'javascript:alert(1)'}))
  expect(viewer.frame_locator('#viewerFrame').locator('.sticker-zone')).to_be_hidden()
  expect(viewer.frame_locator('#viewerFrame').locator('#giftButton')).to_be_hidden()
 viewer.goto(BASE+'view.html?d='+encoded({**old,'to':{'bad':True}}));expect(viewer.locator('#status')).to_contain_text('Invalid to')
 viewer.goto(BASE+'view.html?d=bad');expect(viewer.locator('#status')).not_to_be_empty()
 # Receiver actions, gift validation, and an illustrated visual artifact.
 card={**old,'themeId':'birthday-balloons','stickerId':'cake-pink.png','birthdayNumber':'21','giftUrl':'https://example.com/gift','paperOverride':'#edf5ff','inkOverride':'#263449'}
 viewer.goto(BASE+'view.html?d='+encoded(card));vf=viewer.frame_locator('#viewerFrame')
 expect(vf.locator('#headline')).to_contain_text('21st Birthday')
 expect(vf.locator('#giftButton')).to_have_attribute('href','https://example.com/gift')
 viewer.locator('#copyButton').click();expect(viewer.locator('#status')).to_have_text('Link copied!')
 assert viewer.evaluate('navigator.clipboard.readText()')==viewer.url
 viewer.evaluate('window.open=url=>{window.openedUrl=url}')
 viewer.locator('#shareButton').click();assert viewer.evaluate('window.openedUrl').startswith('https://wa.me/?text=')
 viewer.set_viewport_size({'width':390,'height':900});viewer.wait_for_timeout(3500)
 vf.locator('#cardRoot').screenshot(path='/workspace/onboarding/shared-illustration-390.png')
 for bad in ['http://example.com','https://user:password@example.com','javascript:alert(1)']:
  viewer.goto(BASE+'view.html?d='+encoded({**card,'giftUrl':bad}))
  expect(viewer.frame_locator('#viewerFrame').locator('#giftButton')).to_be_hidden()
 assert not errors,errors
 assert not list((ROOT/'vendor').glob('*'))
 for path in [*list((ROOT/'engine').glob('*')),*list((ROOT/'app').glob('*'))]:
  assert not re.search(r'html2canvas|gif\.js|wrapAndClampMessage|photoData|photoInput',path.read_text()),path
 print('PASS legacy URLs, decoded-data validation, injection/path rejection, legacy removal; no JavaScript errors')
 browser.close()
