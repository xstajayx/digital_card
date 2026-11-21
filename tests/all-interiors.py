"""Verify decoration for every real sender design and local gift link."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
import shutil

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = Path(os.environ.get("CARD_ARTIFACT_DIR", "/tmp/silent-hello-artifacts")) / "all-interiors"
ART.mkdir(parents=True, exist_ok=True)
SHORT = "Thinking of you today."
DENSE = "Thinking of you today.\n\nThanks for the long walks.\n\nI still laugh at our stories.\n\nLet’s meet for tea soon."
EXAMPLES = {"birthday-gaming", "christmas-robin", "dad-fishing", "engagement", "sympathy-lilies"}


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


def corner_is_clear(corner):
    return corner.evaluate("""node => {
        const style = getComputedStyle(node);
        const hint = node.getBoundingClientRect();
        if (style.transform !== 'none' || style.maskImage === 'none' || !hint.width) return false;
        for (const selector of ['#headline', '#message', '#from']) {
            const r = node.ownerDocument.querySelector(selector).getBoundingClientRect();
            if (hint.top < r.bottom && hint.bottom > r.top && hint.left < r.right && hint.right > r.left)
                return false;
        }
        return true;
    }""")


def open_inside(page):
    frame = page.frame_locator("#viewerFrame")
    expect(frame.locator("#cardRoot")).to_have_attribute("data-physical-state", "envelope")
    frame.locator(".paper-envelope-front").click()
    expect(frame.locator("#cardRoot")).to_have_attribute("data-physical-state", "cover")
    frame.locator(".paper-cover").click()
    expect(frame.locator("#cardRoot")).to_have_attribute("data-physical-state", "inside")
    return frame


with ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=ROOT)) as server:
    Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/digital_card/"
    widths = (int(value) for value in os.environ.get("INTERIOR_WIDTHS", "320,1440").split(","))
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CARD_CHROMIUM_PATH") or shutil.which("chromium"), args=["--no-sandbox"])
        for width in widths:
            context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce",
                permissions=["clipboard-read", "clipboard-write"])
            sender, recipient = context.new_page(), context.new_page()
            errors = []
            for page in (sender, recipient):
                page.on("pageerror", lambda error: errors.append(str(error)))
            sender.goto(base + "studio.html")
            designs = sender.evaluate("""async () => {
                const {loadThemes} = await import('./engine/card-data.js');
                const {stationeryFor} = await import('./engine/stationery.js');
                return Promise.all((await loadThemes()).map(async theme => {
                    const stationery = stationeryFor(theme.id, theme.catalogue);
                    const result = await fetch(stationery.motifUrl);
                    if (!result.ok || !(await result.text()).startsWith('<svg')) throw Error(theme.id);
                    return [theme.id, stationery.motif, stationery.motifUrl];
                }));
            }""")
            assert len(designs) == 127
            for number, (design, motif, source) in enumerate(designs, start=1):
                sender.goto(base + f"studio.html?design={design}", wait_until="domcontentloaded")
                expect(sender.locator("#studio")).to_have_attribute("data-step", "2")
                step(sender, 3)
                sender.locator("#toInput").fill("To Alex")
                sender.locator("#fromInput").fill("Sam")
                sender.locator("#messageInput").fill(SHORT)
                toggle = sender.get_by_role("checkbox", name="Inside decoration")
                expect(toggle).to_be_checked()
                preview = sender.frame_locator("#cardPreview")
                scene = preview.locator(".physical-scene")
                expect(scene).to_have_attribute("data-motif", motif)
                assert source in scene.evaluate("node => node.style.getPropertyValue('--stationery-art')")
                toggle.uncheck()
                expect(scene).to_have_attribute("data-motif", "")
                toggle.check()
                expect(scene).to_have_attribute("data-motif", motif)
                step(sender, 5)
                sender.get_by_role("button", name="Copy link").click()
                expect(sender.locator("#exportStatus")).to_contain_text("Link copied")
                link = sender.evaluate("navigator.clipboard.readText()")
                recipient.goto(link, wait_until="domcontentloaded")
                frame = open_inside(recipient)
                expect(frame.locator(".physical-scene")).to_have_attribute("data-motif", motif)
                corner = frame.locator(".stationery-corner")
                expect(corner).to_have_count(1)
                expect(corner).to_be_visible()
                assert corner_is_clear(corner), (width, design)
                assert source in corner.evaluate("node => getComputedStyle(node).maskImage")
                assert recipient.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
                if design in EXAMPLES:
                    recipient.locator("#viewerFrame").screenshot(path=ART / f"{design}-{width}.png")

                long_link = sender.evaluate("""async ({link, message}) => {
                    const {decodeCard, encodeCard} = await import('./engine/share-codec.js');
                    const short = new URL(link);
                    const card = await decodeCard(short.hash.slice(3));
                    card.message = message;
                    card.physicalConfig.paper = 'lined';
                    short.searchParams.set('check', 'long');
                    short.hash = 'c=' + await encodeCard(card);
                    return short.href;
                }""", {"link": link, "message": DENSE})
                recipient.goto(long_link, wait_until="domcontentloaded")
                frame = recipient.frame_locator("#viewerFrame")
                frame.locator(".paper-skip").press("Enter")
                expect(frame.locator("#cardRoot")).to_have_attribute("data-physical-state", "inside")
                expect(frame.locator("#cardRoot")).to_have_attribute("data-paper", "lined")
                expect(frame.locator(".physical-scene")).to_have_attribute("data-motif", motif)
                expect(frame.locator(".stationery-corner")).to_be_hidden()
                assert DENSE in recipient.locator("#fullMessageText").text_content()
                assert recipient.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
                if number % 20 == 0:
                    print(f"PASS {width}px {number}/127 designs", flush=True)
            assert not errors, errors
            print(f"PASS {width}px: all 127 designs, real creator toggle, viewer parity, short ivory and dense lined messages", flush=True)
            context.close()
        browser.close()
    server.shutdown()
