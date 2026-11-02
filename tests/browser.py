"""Functional and visual regressions. Run: python3 -u tests/browser.py.

Requires Python Playwright and Chromium (system or Playwright-managed).
Starts its own local server with the GitHub Pages /digital_card/ prefix.
WhatsApp and native sharing are intercepted; no messages leave the browser.
"""
import base64
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import threading
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path(os.environ.get("CARD_ARTIFACT_DIR", "/workspace/onboarding/polished-studio"))
ARTIFACTS.mkdir(parents=True, exist_ok=True)
THEMES = [json.loads((ROOT / "themes" / theme / "theme.json").read_text()) for theme in json.loads((ROOT / "themes/themes.json").read_text())]
VIEWPORTS = [(360, 800), (390, 844), (768, 1024), (1440, 900)]
MESSAGE = "A little hello, just for you 👩🏽‍🚀.\n\nCafé, 漢字 & all the lovely things.\nHere’s to your next adventure!"
RESULTS = []
ERRORS = []


class PagesHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if not self.path.startswith("/digital_card/"):
            self.send_error(404)
            return
        self.path = self.path[len("/digital_card"):]
        super().do_GET()

    def log_message(self, *_args):
        pass


def record(label):
    RESULTS.append(label)
    print("PASS " + label, flush=True)


def encoded(data):
    return base64.urlsafe_b64encode(json.dumps(data, ensure_ascii=False).encode()).decode().rstrip("=")


def observe(page):
    page.on("pageerror", lambda error: ERRORS.append(str(error)))
    page.on("console", lambda message: ERRORS.append(message.text) if message.type == "error" else None)
    page.on("response", lambda response: ERRORS.append(f"HTTP {response.status}: {urlsplit(response.url).path}") if response.status >= 400 else None)
    page.on("requestfailed", lambda request: ERRORS.append(f"Failed request: {urlsplit(request.url).path}"))


def step(page, number):
    page.locator(f'.steps button[data-step="{number}"]').click()
    expect(page.locator(f'[data-panel="{number}"]')).to_be_visible()


def fit(page, frame_id="cardPreview"):
    return page.evaluate("""async (id) => {
      await new Promise(requestAnimationFrame);
      return document.getElementById(id).contentWindow.checkFit();
    }""", frame_id)


def frame(page, frame_id="cardPreview"):
    return page.frame_locator("#" + frame_id)


def choose(page, theme):
    step(page, 1)
    page.locator(f'[data-occasion="{theme["occasionId"]}"]').click()
    step(page, 2)
    page.locator(f'[data-theme="{theme["id"]}"]').click()
    step(page, 4)
    page.locator(".none-option").click()
    step(page, 5)
    assert fit(page), f"Default message did not fit: {theme['id']}"
    expect(frame(page).locator("#themeStyles")).to_have_attribute("href", BASE + f'themes/{theme["id"]}/theme.css')


def finish_animation(page, frame_id="cardPreview"):
    page.locator("#" + frame_id).evaluate("e => e.contentDocument.getAnimations().forEach(a => a.finish())")


def geometry(page, frame_id="cardPreview"):
    return page.locator("#" + frame_id).evaluate("""e => {
      const d=e.contentDocument, root=d.querySelector('#cardRoot'), text=d.querySelector('.text-panel');
      const m=d.querySelector('#message'), s=d.querySelector('#from'), art=d.querySelector('.sticker-zone');
      const a=art.getBoundingClientRect(), b=root.getBoundingClientRect(), t=text.getBoundingClientRect();
      return {width:root.clientWidth,height:root.clientHeight,panel:text.clientHeight,
        font:getComputedStyle(m).fontFamily,size:getComputedStyle(m).fontSize,
        gap:s.offsetTop-m.offsetTop-m.offsetHeight,
        centred:Math.abs(a.x+a.width/2-b.x-b.width/2),separation:a.top-t.bottom,
        scroll:root.scrollHeight-root.clientHeight,artHidden:art.hidden};
    }""")


def copy_url(page):
    page.locator("#shareLinkButton").click()
    expect(page.locator("#exportStatus")).to_contain_text("Link copied")
    return page.evaluate("navigator.clipboard.readText()")


server = ThreadingHTTPServer(("127.0.0.1", 0), PagesHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = os.environ.get("CARD_TEST_URL", f"http://127.0.0.1:{server.server_port}/digital_card/")
try:
    with sync_playwright() as p:
        chromium = os.environ.get("CARD_CHROMIUM_PATH") or shutil.which("chromium")
        options = {"args": ["--no-sandbox"]}
        if chromium:
            options["executable_path"] = chromium
        browser = p.chromium.launch(**options)
        for width, height in VIEWPORTS:
            context = browser.new_context(viewport={"width": width, "height": height}, permissions=["clipboard-read", "clipboard-write"])
            context.on("page", observe)
            page = context.new_page()
            page.goto(BASE+"studio.html")
            expect(page.locator(".occasion-tile")).to_have_count(23)
            assert page.locator('input[type="file"]').count() == 0
            assert not page.get_by_role("button", name="GIF", exact=False).count()
            # Search, category filters and accessible selected-state feedback.
            page.locator("#occasionSearch").fill("wedding")
            expect(page.locator(".occasion-tile:visible")).to_have_count(1)
            page.locator("#occasionSearch").fill("")
            page.get_by_role("button", name="Seasonal", exact=True).click()
            expect(page.locator(".occasion-tile:visible")).to_have_count(3)
            page.get_by_role("button", name="All", exact=True).click()
            step(page,5); assert fit(page); finish_animation(page); step(page,1)
            page.screenshot(path=str(ARTIFACTS / f"studio-occasions-{width}.png"), full_page=True)
            # Every design through real editor controls, with and without artwork.
            for theme in THEMES:
                choose(page, theme)
                without = geometry(page)
                assert abs(without["height"] / without["width"] - 5 / 3) < 0.01
                assert without["scroll"] <= 1, (theme["id"], width, without)
                step(page, 4)
                expect(page.locator("#fontSelect option")).to_have_count(6)
                tiles = page.locator(".sticker-tile")
                choices = range(1, tiles.count()) if width == 1440 else [1]
                for index in choices:
                    tiles.nth(index).click()
                    step(page, 5)
                    assert fit(page), f"Illustrated default failed: {theme['id']} / {index} / {width}"
                    expect(frame(page).locator("#stickerImg")).to_be_visible()
                    assert frame(page).locator("#stickerImg").evaluate("e => e.complete && e.naturalWidth > 0")
                    finish_animation(page)
                    art = geometry(page)
                    assert art["centred"] < 1 and art["separation"] >= 11
                    assert art["panel"] < without["panel"], "No illustration must free space for text"
                    assert art["scroll"] <= 1
                    if width == 1440 and index == 1 and theme["id"] in ["birthday-midnight", "love-letters", "christmas", "wedding"]:
                        frame(page).locator("#cardRoot").screenshot(path=str(ARTIFACTS / f'design-{theme["id"]}.png'))
                    step(page, 4)
                page.locator(".none-option").click()
                step(page, 5)
                assert fit(page)
            record(f"{width}x{height}: all 23 occasions / 28 designs, fonts available, artwork loads, proportional layout and no overlap")

            choose(page, THEMES[0])
            step(page, 3)
            page.locator("#toInput").fill("Maya")
            page.locator("#messageInput").fill(MESSAGE)
            page.locator("#fromInput").fill("With love, Alex")
            step(page, 4)
            for font_id, family in [("fredoka", "Fredoka"), ("pacifico", "Pacifico"), ("quicksand", "Quicksand"), ("poppins", "Poppins"), ("nunito", "Nunito"), ("playfair", "Playfair Display")]:
                page.locator("#fontSelect").select_option(font_id)
                step(page, 5)
                assert fit(page), f"Multiline text fit: {font_id} / {width}"
                for selector in ["#message", "#headline", "#from"]:
                    assert family in frame(page).locator(selector).evaluate("e => getComputedStyle(e).fontFamily")
                    assert frame(page).locator(selector).evaluate("e => document.fonts.check(getComputedStyle(e).font)")
                expect(frame(page).locator("#message")).to_have_text(MESSAGE)
                step(page, 4)
            page.locator("#fontSelect").select_option("pacifico")
            step(page, 5)
            assert fit(page)
            finish_animation(page)
            frame(page).locator("#cardRoot").screenshot(path=str(ARTIFACTS / f"pacifico-multiline-{width}.png"), style=".step-footer,.skip-link{visibility:hidden!important}")
            record(f"{width}x{height}: six loaded fonts affect headline/body/signature; Pacifico multiline, Unicode and paragraphs fit")

            # Neither gallery node identity nor animation count changes while typing.
            page.evaluate("window.savedOccasion=document.querySelector('.occasion-tile');window.savedSticker=document.querySelector('.sticker-tile')")
            before_replay = frame(page).locator("#cardRoot").get_attribute("data-replays")
            before_updates = int(frame(page).locator("#cardRoot").get_attribute("data-updates"))
            step(page, 3)
            page.locator("#messageInput").focus()
            page.locator("#messageInput").press("End")
            page.locator("#messageInput").press_sequentially(" More joy!", delay=20)
            expect(page.locator("#messageInput")).to_be_focused()
            assert page.evaluate("savedOccasion===document.querySelector('.occasion-tile') && savedSticker===document.querySelector('.sticker-tile')")
            step(page, 4)
            page.locator("#paperColorInput").fill("#edf5ff")
            page.locator("#inkColorInput").fill("#263449")
            page.locator("#fontSelect").select_option("nunito")
            step(page, 5)
            assert fit(page)
            assert frame(page).locator("#cardRoot").get_attribute("data-replays") == before_replay
            assert int(frame(page).locator("#cardRoot").get_attribute("data-updates")) - before_updates <= 14
            page.locator("#replayButton").click()
            expect(frame(page).locator("#cardRoot")).to_have_attribute("data-replays", str(int(before_replay) + 1))
            expect(frame(page).locator("#message")).to_contain_text("More joy!")
            record(f"{width}x{height}: editing preserves focus/gallery nodes; single updates; only explicit Replay restarts opening")

            # Too much text is preserved in full, with explicit feedback and blocked sharing.
            long_message = "A wonderful wish 🦋.\n" * 180
            step(page, 3)
            page.locator("#messageInput").fill(long_message)
            step(page, 5)
            assert not fit(page)
            expect(page.locator("#fitStatus")).to_contain_text("needs more room")
            expect(page.locator("#fullMessage")).to_be_visible()
            assert long_message in page.locator("#fullMessageText").inner_text()
            expect(frame(page).locator("#message")).to_have_text(long_message)
            assert float(frame(page).locator("#message").evaluate("e=>parseFloat(getComputedStyle(e).fontSize)")) >= 14
            page.locator("#shareLinkButton").click()
            expect(page.locator("#exportStatus")).to_contain_text("does not fit")
            step(page, 3)
            page.locator("#messageInput").fill("A short note. A whole lot of love.")
            page.locator("#birthdayNumberToggle").check()
            for number, suffix in [(1,"st"),(2,"nd"),(3,"rd"),(4,"th"),(11,"th"),(12,"th"),(13,"th"),(18,"th"),(21,"st"),(40,"th"),(50,"th"),(100,"th"),(120,"th")]:
                page.locator("#birthdayNumberInput").fill(str(number))
                page.evaluate("() => new Promise(requestAnimationFrame)")
                expect(frame(page).locator("#headline")).to_contain_text(f"{number}{suffix} Birthday")
            page.locator("#birthdayNumberInput").fill("121")
            expect(page.locator("#birthdayNumberInput")).to_have_attribute("aria-invalid", "true")
            page.locator("#birthdayNumberInput").fill("21")
            step(page, 4)
            page.locator("#paperColorInput").fill("#ffffff"); page.locator("#inkColorInput").fill("#eeeeee")
            expect(page.locator("#contrastStatus")).to_contain_text("Low contrast")
            page.get_by_role("button", name="Garden colours").click()
            expect(page.locator("#contrastStatus")).to_contain_text("Easy to read")
            page.locator("#resetColorsButton").click()
            expect(page.locator("#paperColorInput")).to_have_value(THEMES[0]["palette"]["paper"])
            page.locator(".extras summary").click()
            page.locator("#giftToggle").check()
            page.locator("#giftInput").fill("javascript:alert(1)")
            step(page, 5)
            page.locator("#shareLinkButton").click()
            expect(page.locator("#exportStatus")).to_contain_text("valid HTTPS")
            step(page, 4)
            page.locator("#resetDesignButton").click()
            expect(page.locator("#fontSelect")).to_have_value("fredoka")
            expect(page.locator("#giftToggle")).not_to_be_checked()
            expect(page.locator("#textSize")).to_have_value("18")
            expect(page.locator(".none-option")).to_have_attribute("aria-pressed", "true")
            step(page, 3)
            expect(page.locator("#toInput")).to_have_value("Maya")
            expect(page.locator("#fromInput")).to_have_value("With love, Alex")
            expect(page.locator("#messageInput")).to_have_value("A short note. A whole lot of love.")
            record(f"{width}x{height}: long/short messages, readable minimum, overflow blocks share, ordinals, contrast and safe Reset Design")

            # Prepare the same illustrated, personalised card in editor and viewer.
            page.locator("#messageInput").fill(MESSAGE)
            page.locator("#birthdayNumberToggle").check(); page.locator("#birthdayNumberInput").fill("21")
            step(page, 4)
            page.locator("#fontSelect").select_option("quicksand")
            page.locator("#textSize").select_option("16")
            page.locator("#paperColorInput").fill("#edf5ff"); page.locator("#inkColorInput").fill("#263449")
            page.locator('[data-sticker="purple-cake"]').click()
            page.locator("#watermarkToggle").uncheck()
            page.locator("#giftToggle").check(); page.locator("#giftInput").fill("https://example.com/gift")
            step(page, 5)
            assert fit(page)
            url = copy_url(page)
            assert url.startswith(BASE + "view.html#c=3") and "?d=" not in url
            assert len(url) < 1500
            viewer = context.new_page(); viewer.goto(url)
            expect(frame(viewer, "viewerFrame").locator("#cardRoot")).to_have_attribute("data-ready", "true")
            assert fit(viewer, "viewerFrame")
            expect(frame(viewer, "viewerFrame").locator("#message")).to_have_text(MESSAGE)
            expect(frame(viewer, "viewerFrame").locator("#headline")).to_contain_text("21st Birthday")
            expect(frame(viewer, "viewerFrame").locator("#watermark")).to_be_hidden()
            expect(frame(viewer, "viewerFrame").locator("#giftButton")).to_have_attribute("href", "https://example.com/gift")
            finish_animation(page); finish_animation(viewer, "viewerFrame")
            assert geometry(page) == geometry(viewer, "viewerFrame"), "Editor/recipient geometry must match at the same viewport"
            for target, fid in [(page,"cardPreview"), (viewer,"viewerFrame")]:
                assert frame(target,fid).locator("#cardRoot").evaluate("e => getComputedStyle(e).backgroundColor") == "rgb(237, 245, 255)"
                assert frame(target,fid).locator("#message").evaluate("e => getComputedStyle(e).color") == "rgb(38, 52, 73)"
                assert target.evaluate("document.documentElement.scrollWidth <= innerWidth")
            page.screenshot(path=str(ARTIFACTS / f"studio-share-{width}.png"), full_page=True)
            viewer.screenshot(path=str(ARTIFACTS / f"recipient-{width}.png"), full_page=True)
            frame(page).locator("#cardRoot").screenshot(path=str(ARTIFACTS / f"editor-card-{width}.png"), style=".step-footer,.skip-link{visibility:hidden!important}")
            frame(viewer,"viewerFrame").locator("#cardRoot").screenshot(path=str(ARTIFACTS / f"recipient-card-{width}.png"))
            assert viewer.locator("#messageInput").count() == 0
            viewer.locator("#copyButton").click(); expect(viewer.locator("#status")).to_contain_text("Link copied")
            viewer.close(); page.bring_to_front()
            record(f"{width}x{height}: compact share URL, viewer matches preview geometry/colours/font/artwork/gift/watermark; screenshots captured")
            context.close()

        # Broader interaction/security tests only need one viewport.
        context = browser.new_context(viewport={"width":390,"height":844}, permissions=["clipboard-read","clipboard-write"])
        context.on("page", observe)
        page=context.new_page(); page.goto(BASE+"studio.html")
        expect(page.locator(".occasion-tile")).to_have_count(23)
        step(page,3)
        for field in ["toInput", "messageInput", "fromInput"]: page.locator("#"+field).fill("")
        step(page,5); assert fit(page), "Blank optional names, message and signature must remain valid"
        step(page,3);page.locator("#fromInput").fill("With love")
        # A milestone has a prominent age; explicit font choice survives a new design.
        milestone=next(t for t in THEMES if t["id"]=="birthday-milestone")
        choose(page,milestone);step(page,3)
        page.locator("#birthdayNumberToggle").check();page.locator("#birthdayNumberInput").fill("40")
        step(page,5);assert fit(page)
        expect(frame(page).locator("#ageMark")).to_be_visible()
        assert frame(page).locator("#ageMark").evaluate("e=>parseFloat(getComputedStyle(e).fontSize)") >= 60
        finish_animation(page)
        frame(page).locator("#cardRoot").screenshot(path=str(ARTIFACTS/"milestone-40.png"),style=".step-footer,.skip-link{visibility:hidden!important}")
        step(page,4);page.locator("#fontSelect").select_option("poppins")
        step(page,1);page.locator('[data-occasion="love"]').click()
        step(page,4);expect(page.locator("#fontSelect")).to_have_value("poppins")
        step(page,5)
        # Rapid design changes settle on the final theme; personal text survives.
        step(page,3);page.locator("#messageInput").fill("Keep this personal message.")
        step(page,1)
        page.evaluate("""() => { for (let i=0;i<12;i++) for(const id of ['love','christmas','birthday']) document.querySelector(`[data-occasion="${id}"]`).click(); }""")
        step(page,5);assert fit(page)
        expect(frame(page).locator("#themeStyles")).to_have_attribute("href",BASE+"themes/birthday-balloons/theme.css")
        expect(frame(page).locator("#message")).to_have_text("Keep this personal message.")
        # Keyboard operation, focus placement and visible focus treatment.
        page.locator('.steps button[data-step="3"]').focus();page.keyboard.press("Enter")
        expect(page.locator("#messageTitle")).to_be_focused()
        page.keyboard.press("Tab");expect(page.locator("#toInput")).to_be_focused()
        assert page.locator("#toInput").evaluate("e=>getComputedStyle(e).outlineStyle") != "none"
        step(page,1);tile=page.locator('[data-occasion="love"]');tile.focus();page.keyboard.press("Enter")
        expect(tile).to_have_attribute("aria-pressed","true")
        step(page,3);page.locator("#toInput").fill('<img src=x onerror=alert(1)>')
        step(page,5);assert fit(page)
        assert frame(page).locator("#headline img").count()==0
        step(page,3);page.locator("#toInput").fill("Friend");step(page,5)
        # Intercept all share transports. Never actually open WhatsApp or the native sheet.
        page.evaluate("""() => { window.shareCalls=0;Object.defineProperty(navigator,'share',{configurable:true,value:payload=>{window.sharedPayload=payload;shareCalls++;return new Promise(resolve=>window.finishShare=resolve)}}); }""")
        page.locator("#nativeShareButton").click()
        page.wait_for_function("window.shareCalls===1")
        page.locator("#nativeShareButton").dispatch_event("click")
        assert page.evaluate("shareCalls")==1
        page.evaluate("window.finishShare()")
        expect(page.locator("#nativeShareButton")).to_be_enabled()
        expect(page.locator("#exportStatus")).to_contain_text("Card shared")
        expect(page.locator("#quickShareButton")).to_be_visible()
        page.locator("#quickShareButton").click()
        page.wait_for_function("window.shareCalls===2");page.evaluate("window.finishShare()")
        expect(page.locator("#quickShareButton")).to_be_enabled()
        page.evaluate("""() => { window.open=()=>({opener:null,location:{set href(url){window.whatsappUrl=url}},close(){window.popupClosed=true}}); }""")
        page.locator("#shareWhatsappButton").click()
        expect(page.locator("#exportStatus")).to_contain_text("WhatsApp opened")
        whatsapp=page.evaluate("window.whatsappUrl")
        assert whatsapp.startswith("https://wa.me/?text=")
        assert BASE+"view.html#c=3" in parse_qs(urlsplit(whatsapp).query)["text"][0]
        page.evaluate("window.open=()=>null")
        page.locator("#shareWhatsappButton").click()
        expect(page.locator("#shareFallback")).to_be_visible()
        expect(page.locator("#exportStatus")).to_contain_text("blocked")
        page.evaluate("""() => Object.defineProperty(navigator,'share',{configurable:true,value:()=>Promise.reject(new DOMException('cancelled','AbortError'))})""")
        page.locator("#nativeShareButton").click();expect(page.locator("#exportStatus")).to_contain_text("cancelled")
        page.evaluate("""() => { Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});Object.defineProperty(navigator,'share',{configurable:true,value:undefined}); }""")
        page.locator("#nativeShareButton").click();expect(page.locator("#shareFallback")).to_be_visible()
        expect(page.locator("#shareUrl")).to_be_focused()
        record("native sharing, duplicate prevention, WhatsApp construction/popup fallback, cancellation, clipboard fallback, keyboard and rapid theme switching")

        # All supported legacy versions, old illustration aliases and invalid data states.
        viewer=context.new_page()
        old={"v":1,"themeId":"love","to":"Old friend","message":"An old card 💌\n\nStill here.","from":"Me","fontId":"pacifico","stickerId":"heart-red.png"}
        for version in [1,2]:
            viewer.goto(BASE+"view.html?d="+encoded({**old,"v":version}))
            expect(frame(viewer,"viewerFrame").locator("#message")).to_have_text(old["message"])
            expect(frame(viewer,"viewerFrame").locator("#stickerImg")).to_have_attribute("src",BASE+"stickers/library/red-heart.svg")
            assert fit(viewer,"viewerFrame")
        for bad in ["../../secret.png","https://example.com/image.png"]:
            viewer.goto(BASE+"view.html?d="+encoded({**old,"stickerId":bad,"giftUrl":"javascript:alert(1)"}))
            expect(frame(viewer,"viewerFrame").locator(".sticker-zone")).to_be_hidden()
            expect(frame(viewer,"viewerFrame").locator("#giftButton")).to_be_hidden()
        for payload in ["bad",encoded({**old,"v":99}),encoded({**old,"message":{}}),encoded({**old,"themeId":"missing"})]:
            viewer.goto(BASE+"view.html?d="+payload)
            expect(viewer.locator("#cardError")).to_be_visible()
            expect(viewer.locator("#cardPresentation")).to_be_hidden()
            expect(viewer.locator("#errorReason")).not_to_be_empty()
        viewer.goto(BASE+"view.html")
        expect(viewer.locator("#cardError")).to_be_visible()
        record("v1/v2 migration, legacy artwork aliases, HTML/path/URL injection rejection, invalid/missing/future-version error states")
        viewer.close()
        # Text scaling and reduced motion: explicit overflow fallback, no clipped secret text or continuous motion.
        page.emulate_media(reduced_motion="reduce")
        page.locator("#replayButton").click();assert fit(page)
        assert page.locator("#cardPreview").evaluate("e=>e.contentWindow.matchMedia('(prefers-reduced-motion: reduce)').matches")
        assert page.locator("#cardPreview").evaluate("e=>e.contentDocument.getAnimations().filter(a=>a.playState==='running').length") == 0
        page.locator("#cardPreview").evaluate("e=>e.contentDocument.documentElement.style.fontSize='32px'")
        if not fit(page):
            expect(page.locator("#fullMessage")).to_be_visible()
        else:
            assert frame(page).locator("#message").evaluate("e=>parseFloat(getComputedStyle(e).fontSize)") >= 28
        page.locator("#cardPreview").evaluate("e=>e.contentDocument.documentElement.style.fontSize=''")
        assert fit(page)
        record("reduced-motion preference stops running animations; 200% text scaling preserves readable text or explicit full-message fallback")
        assert not ERRORS, ERRORS
        record("no JavaScript console/page errors, failed local requests, or missing assets")
        context.close();browser.close()
    (ARTIFACTS/"results.json").write_text(json.dumps({"status":"passed","viewports":VIEWPORTS,"passed_groups":RESULTS,"errors":ERRORS},indent=2)+"\n")
    print(f"PASS {len(RESULTS)} browser check groups. Screenshots: {ARTIFACTS}")
finally:
    server.shutdown();server.server_close()
