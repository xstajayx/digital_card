"""Real stationery on the studio and on reopened folded-card links."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
import shutil

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = Path(os.environ.get("CARD_ARTIFACT_DIR", "/tmp/silent-hello-artifacts")) / "stationery"
ART.mkdir(parents=True, exist_ok=True)
CASES = [
    ("love-rose-note", "rose", "rose"),
    ("birthday-balloons", "star", "birthday"),
    ("christmas", "snowflake", "winter"),
    ("friendship-coffee", "leaf", "coffee"),
]
LONG = "Thinking of the afternoon we lost track of time and took the long way home.\n\n" \
    "Thanks for making room for silly stories, slow walks and the good biscuits.\n\n" \
    "Next time let’s leave early enough to stop for tea and bring the book we keep meaning to swap.\n\n" \
    "Until then, here is a little hello from me."


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


def step(page, number):
    page.locator(f'.steps [data-step="{number}"]').click()


def state(frame, name):
    expect(frame.locator("#cardRoot")).to_have_attribute("data-physical-state", name)


def inside(frame):
    frame.locator(".paper-envelope-front").click()
    state(frame, "cover")
    frame.locator(".paper-cover").click()
    state(frame, "inside")


def bounds(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
    frame = page.frame_locator("#viewerFrame")
    assert frame.locator("#message").evaluate("node => node.scrollHeight <= node.clientHeight + 1")


with ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=ROOT)) as server:
    Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/digital_card/"
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CARD_CHROMIUM_PATH") or shutil.which("chromium"), args=["--no-sandbox"])
        for width, height in [(320, 760), (375, 812), (390, 844), (1440, 950)]:
            context = browser.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce",
                permissions=["clipboard-read", "clipboard-write"])
            errors = []
            context.on("page", lambda page: page.on("pageerror", lambda error: errors.append(str(error))))
            examples = CASES if width == 320 else CASES + [
                ("love", "heart", "hearts"),
                ("moon-cradle", "star", "nursery"),
                ("forget-me-not", "star", "quiet-stem"),
                ("all-i-could-afford", "star", "wallet"),
                ("no-expense-spared", "star", "receipt"),
                ("youd-only-throw-it-away", "star", "recycling"),
                ("saving-the-planet", "star", "hero-tree"),
                ("happy-25th-december", "snowflake", "christmas-calendar"),
                ("happy-four-day-weekend", "flower", "slippers"),
            ]
            for id, stamp, motif in examples:
                sender = context.new_page()
                sender.goto(base + f"studio.html?design={id}")
                expect(sender.locator("#studio")).to_have_attribute("data-step", "2")
                frame = sender.frame_locator("#cardPreview")
                expect(sender.locator("#stickerGallery, #physical-coverArt")).to_have_count(0)
                step(sender, 3)
                toggle = sender.get_by_role("checkbox", name="Inside decoration")
                expect(toggle).to_be_checked()
                sender.locator("#toInput").fill("To Alex")
                sender.locator("#messageInput").fill("Here’s a little joy.\n\nThinking of you today.")
                sender.locator("#fromInput").fill("Sam")
                expect(frame.locator(".physical-scene")).to_have_attribute("data-motif", motif)
                toggle.focus()
                sender.keyboard.press("Space")
                expect(frame.locator(".physical-scene")).to_have_attribute("data-motif", "")
                expect(frame.locator(".paper-envelope-seal")).to_have_attribute("data-stamp", stamp)
                sender.keyboard.press("Space")
                expect(frame.locator(".physical-scene")).to_have_attribute("data-motif", motif)
                if id == "birthday-balloons":
                    step(sender, 4)
                    sender.locator('.font-choice[data-font="nunito"]').click()
                    sender.locator(".extras summary").click()
                    sender.locator("#physical-paper").select_option("lined")
                    expect(frame.locator("#cardRoot")).to_have_attribute("data-paper", "lined")
                    sender.locator("#paperColorInput").fill("#e1eadf")
                    step(sender, 3)
                    message = LONG if width == 1440 else (
                        "Thinking of you today.\n\nThanks for the slow walks.\n\n"
                        "I still laugh at our stories.\n\nLet’s meet for tea soon."
                    )
                    sender.locator("#messageInput").fill(message)
                if id == "friendship-coffee" and width == 1440:
                    toggle.uncheck()
                step(sender, 5)
                sender.get_by_role("button", name="Copy link").click()
                expect(sender.locator("#exportStatus")).to_contain_text("Link copied")
                url = sender.evaluate("navigator.clipboard.readText()")
                if id == "love-rose-note":
                    decorated_url = url
                assert "#c=5" in url
                viewer = context.new_page()
                viewer.goto(url)
                vf = viewer.frame_locator("#viewerFrame")
                state(vf, "envelope")
                expect(viewer.get_by_role("button", name="Open your envelope", exact=True)).to_have_count(1)
                expect(vf.locator(".paper-envelope-seal")).to_have_attribute("data-stamp", stamp)
                expect(vf.locator(".paper-envelope-seal use")).to_have_attribute("href", frame.locator(".paper-envelope-seal use").get_attribute("href"))
                if width in [375, 1440]:
                    viewer.locator("#viewerFrame").screenshot(path=ART / f"{id}-{width}-seal.png")
                inside(vf)
                expect(vf.locator("#headline")).to_have_text("To Alex")
                expect(vf.locator("#from")).to_have_text("Sam")
                expect(vf.locator("#watermark")).to_have_text("Silent Hello")
                expect(vf.locator(".stationery-corner")).to_have_count(1)
                assert vf.locator(".stationery-corner").evaluate("node => getComputedStyle(node).transform") == "none"
                assert vf.locator("#message").text_content() == frame.locator("#message").text_content()
                expected_motif = "" if id == "friendship-coffee" and width == 1440 else motif
                expect(vf.locator(".physical-scene")).to_have_attribute("data-motif", expected_motif)
                if id == "birthday-balloons":
                    expect(vf.locator("#cardRoot")).to_have_attribute("data-paper", "lined")
                    assert vf.locator(".paper-right").evaluate("node => getComputedStyle(node).backgroundImage").startswith("repeating-linear-gradient")
                    assert "Nunito" in vf.locator("#message").evaluate("node => getComputedStyle(node).fontFamily")
                    expect(vf.locator(".paper-right .stationery-corner:visible")).to_have_count(0)
                elif expected_motif:
                    expect(vf.locator(".paper-right .stationery-corner:visible").first).to_be_visible()
                else:
                    expect(vf.locator(".stationery-corner:visible")).to_have_count(0)
                bounds(viewer)
                if width in [375, 1440]:
                    viewer.locator("#viewerFrame").screenshot(path=ART / f"{id}-{width}-inside.png")
                viewer.close()
                sender.close()
                print(f"PASS {width}px {id}: coordinated seal, toggled decoration, envelope, link parity and readable interior", flush=True)
            assert not errors, errors
            context.close()

        context = browser.new_context(reduced_motion="reduce")
        context.route("**/assets/stationery/**", lambda route: route.abort())
        viewer = context.new_page()
        viewer.goto(decorated_url)
        vf = viewer.frame_locator("#viewerFrame")
        inside(vf)
        expect(vf.locator("#message")).to_contain_text("little joy")
        bounds(viewer)
        print("PASS stationery asset errors keep seal controls and full message usable", flush=True)
        browser.close()
    server.shutdown()
