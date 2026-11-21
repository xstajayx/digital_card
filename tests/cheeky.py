"""Verify the six illustrated jokes through the public catalogue and shared cards."""
import os
import re
import shutil
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = Path(os.environ.get("CARD_ARTIFACT_DIR", "/tmp/silent-hello-artifacts")) / "cheeky"
ART.mkdir(parents=True, exist_ok=True)
CASES = [
    ("all-i-could-afford", "This is all I could afford.", "Actually, that's a lie. I just didn't want to spend any money. Happy Birthday!"),
    ("no-expense-spared", "No expense spared.", "Not a single penny. You're welcome."),
    ("youd-only-throw-it-away", "I was going to buy you a proper card…", "…but you'd only throw it away. I've saved us both the trouble."),
    ("saving-the-planet", "Sending a digital card isn't being cheap.", "It's saving trees. I'm basically a hero. You're welcome."),
    ("happy-25th-december", "Happy 25th December.", "Enjoy your bank holiday. Whatever you choose to call it."),
    ("happy-four-day-weekend", "Happy four-day weekend!", "Apparently there's a religious holiday involved. Anyway, enjoy the lie-in."),
]


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        return super().translate_path(path.removeprefix("/digital_card"))

    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


def verify_cover(frame, name, cover):
    expect(frame.locator(".paper-cover-title")).to_have_text(cover)
    image = frame.locator(".paper-cover-art")
    expect(image).to_have_attribute("src", re.compile(f"/packs/{name}\\.svg$"))
    assert image.evaluate("image => image.decode().then(() => image.naturalWidth > 0)")
    assert image.evaluate("""image => {
        const r = image.getBoundingClientRect();
        const c = image.closest('.paper-cover').getBoundingClientRect();
        return r.width > 0 && r.left >= c.left - 1 && r.right <= c.right + 1 &&
          r.top >= c.top - 1 && r.bottom <= c.bottom + 1;
    }""")
    expect(frame.locator(".paper-cover-name")).to_have_text("")


with ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=ROOT)) as server:
    Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/digital_card/"
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CARD_CHROMIUM_PATH") or shutil.which("chromium"), args=["--no-sandbox"])
        widths = [(320, 760), (390, 844), (1440, 900)]
        requested = os.environ.get("CHEEKY_WIDTH")
        for width, height in widths:
            if requested and width != int(requested):
                continue
            context = browser.new_context(viewport={"width": width, "height": height}, has_touch=width < 500,
                reduced_motion="reduce" if width != 1440 else "no-preference", permissions=["clipboard-read", "clipboard-write"])
            errors = []
            context.on("page", lambda page: page.on("pageerror", lambda error: errors.append(str(error))))
            for id, cover, punchline in CASES:
                sender = context.new_page()
                sender.goto(base + "cards.html")
                sender.get_by_role("button", name=re.compile("Cheeky & Clever")).click()
                expect(sender.locator(".shop-card:visible")).to_have_count(6)
                expect(sender.locator(f'.shop-card[data-id="{id}"] img')).to_have_attribute("src", re.compile(f"/packs/{id}\\.svg$"))
                sender.locator(f'.shop-card[data-id="{id}"] button').click()
                shop = sender.frame_locator("#shopPreview")
                expect(shop.locator("#cardRoot")).to_have_attribute("data-physical-state", "cover")
                verify_cover(shop, id, cover)
                sender.locator("#previewCustomise").click()
                expect(sender).to_have_url(base + f"studio.html?design={id}")
                expect(sender.locator("#studio")).to_have_attribute("data-step", "2")
                sender.locator('.steps [data-step="3"]').click()
                expect(sender.locator("#messageInput")).to_have_value(punchline)
                sender.locator("#toInput").fill("Alex")
                sender.locator("#fromInput").fill("Sam")
                sender.locator('.steps [data-step="5"]').click()
                sender.get_by_role("button", name="Copy link").click()
                expect(sender.locator("#exportStatus")).to_contain_text("Link copied")
                link = sender.evaluate("navigator.clipboard.readText()")
                assert "#c=5" in link
                sender_frame = sender.frame_locator("#cardPreview")
                expect(sender_frame.locator("#cardRoot")).to_have_attribute("data-physical-state", "envelope")
                expect(sender_frame.locator(".paper-envelope-tag")).to_have_text("For Alex")
                sender_frame.locator(".paper-envelope-front").click()
                verify_cover(sender_frame, id, cover)
                sender_frame.locator(".paper-cover").click()
                expect(sender_frame.locator("#headline")).to_have_text("Alex")
                expect(sender_frame.locator("#message")).to_have_text(punchline)
                viewer = context.new_page()
                viewer.goto(link)
                expect(viewer.get_by_role("link", name=re.compile("Send a little joy of your own"))).to_be_visible()
                frame = viewer.frame_locator("#viewerFrame")
                root = frame.locator("#cardRoot")
                expect(root).to_have_attribute("data-physical-state", "envelope")
                if width < 500:
                    frame.locator(".paper-envelope-front").tap()
                else:
                    frame.locator(".paper-envelope-front").press("Enter")
                expect(root).to_have_attribute("data-physical-state", "cover")
                verify_cover(frame, id, cover)
                if width == 390:
                    viewer.wait_for_timeout(400)  # Let Chromium’s touch highlight clear before capture.
                if width != 320:
                    viewer.locator("#viewerFrame").screenshot(path=ART / f"{id}-{width}-front.png", animations="disabled")
                if width < 500:
                    frame.locator(".paper-cover").tap()
                else:
                    frame.locator(".paper-cover").press("Enter")
                expect(root).to_have_attribute("data-physical-state", "inside")
                expect(frame.locator("#message")).to_have_text(punchline)
                expect(frame.locator("#headline")).to_have_text("Alex")
                expect(frame.locator("#from")).to_have_text("Sam")
                assert viewer.locator("#viewerFrame").evaluate("iframe => iframe.contentWindow.checkFit()")
                assert viewer.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
                if width == 390:
                    viewer.wait_for_timeout(400)  # Let Chromium’s touch highlight clear before capture.
                if width != 320:
                    viewer.locator("#viewerFrame").screenshot(path=ART / f"{id}-{width}-inside.png", animations="disabled")
                viewer.close()
                sender.close()
                print(f"PASS {width}px {id}: art, exact cover and punchline, folded preview and shared gift", flush=True)
            assert not errors, errors
            context.close()
        browser.close()
    server.shutdown()
