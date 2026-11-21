"""Check versioned production artwork in real catalogue, studio and gift views."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
import shutil

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = Path(os.environ.get("CARD_ARTIFACT_DIR", "/tmp/silent-hello-artifacts")) / "cover-editions"
ART.mkdir(parents=True, exist_ok=True)
FEATURED = [
    "birthday-balloons", "birthday-gaming", "birthday-milestone", "kids-dinosaur",
    "christmas-robin", "mum-garden", "dad-fishing", "easter-meadow", "valentines-day",
    "paired-swans", "new-baby", "home-keys", "sympathy-lilies", "thinking-coast",
    "wedding-arch", "diamond-rays", "congrats-ribbons", "graduation-world",
    "thanks-peonies", "friendship-coffee", "belated-snail", "all-i-could-afford",
]


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def check_width(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")


def assert_loaded(img):
    expect(img).to_be_visible()
    expect(img).to_have_js_property("complete", True)
    assert img.evaluate("img => img.naturalWidth > 0")


with ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=ROOT.parent)) as server:
    Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/{ROOT.name}/"
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CARD_CHROMIUM_PATH") or shutil.which("chromium"), args=["--no-sandbox"])
        for width in [320, 375, 390, 1440]:
            context = browser.new_context(viewport={"width": width, "height": 900},
                permissions=["clipboard-read", "clipboard-write"],
                reduced_motion="no-preference" if width == 1440 else "reduce")
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(base + "cards.html")
            expect(page.locator(".shop-card")).to_have_count(121)
            check_width(page)
            if width in [375, 1440]:
                captured = page.evaluate("""async () => {
                    const {ILLUSTRATIONS, illustrationUrl} = await import('./engine/illustrations.js');
                    const entries = [...document.querySelectorAll('.shop-card')];
                    await Promise.all(entries.map(async node => {
                        const image = node.querySelector('img');
                        const expected = illustrationUrl(ILLUSTRATIONS[node.dataset.id][0]);
                        if (image.src !== expected) throw Error(node.dataset.id + ' thumbnail differs');
                        image.loading = 'eager';
                        await image.decode();
                    }));
                    return entries.map(node => node.dataset.id);
                }""")
                assert len(captured) == 121 and len(set(captured)) == 121
                grid = page.locator("#cardGrid")
                for start in range(0, len(captured), 24) if width == 1440 else []:
                    grid.evaluate("""(grid, ids) => {
                        for (const tile of grid.querySelectorAll('.shop-card'))
                            tile.hidden = !ids.includes(tile.dataset.id);
                    }""", captured[start:start + 24])
                    grid.screenshot(path=ART / f"catalogue-all-{start // 24 + 1}.png")
                grid.evaluate("""(grid, ids) => {
                    for (const tile of grid.querySelectorAll('.shop-card'))
                        tile.hidden = !ids.includes(tile.dataset.id);
                }""", FEATURED)
                assert grid.locator(".shop-card:visible .shop-thumbnail").evaluate_all(
                    "tiles => tiles.every(tile => tile.scrollWidth <= tile.clientWidth + 1)")
                grid.screenshot(path=ART / f"catalogue-featured-{width}.png")

            for design in ["birthday-gaming", "new-baby", "christmas-robin"]:
                page.goto(base + "cards.html")
                expect(page.locator(".shop-card")).to_have_count(121)
                tile = page.locator(f'.shop-card[data-id="{design}"]')
                name = tile.locator("h3").text_content()
                page.locator("#search").fill(name)
                tile.wait_for(state="visible")
                # Wait for the debounced search before clicking the preview.
                expect(page.locator("#catalogueStatus")).to_have_text("Showing 1–1 of 1 cards")
                assert_loaded(tile.locator("img"))
                expected = base + f"stickers/covers/{design}.webp"
                expect(tile.locator("img")).to_have_attribute("src", expected)
                tile.get_by_role("button", name=f"Preview {name}").click()
                preview = page.frame_locator("#shopPreview").locator(".paper-cover-art")
                expect(preview).to_have_attribute("src", expected)
                assert_loaded(preview)
                page.locator("#previewCustomise").click()
                expect(page.locator("#studio")).to_have_attribute("data-step", "2")
                expect(page.locator("#stickerGallery, #physical-coverArt")).to_have_count(0)
                sender = page.frame_locator("#cardPreview")
                expect(sender.locator(".paper-cover-art")).to_have_attribute("src", expected)
                page.locator('.steps [data-step="3"]').click()
                page.locator("#toInput").fill("To Alex")
                page.locator("#messageInput").fill("For a day worth remembering. 🌷")
                page.locator('.steps [data-step="5"]').click()
                page.get_by_role("button", name="Copy link").click()
                expect(page.locator("#exportStatus")).to_contain_text("Link copied")
                link = page.evaluate("navigator.clipboard.readText()")
                old_link = None
                if width == 1440:
                    old_link = page.evaluate("""async ({link, design}) => {
                        const {decodeCard, encodeCard} = await import('./engine/share-codec.js');
                        const {ILLUSTRATIONS} = await import('./engine/illustrations.js');
                        const oldArtwork = ILLUSTRATIONS[design].find(art => !art.cover);
                        const raw = await decodeCard(link.split('#c=')[1]);
                        raw.stickerId = '';
                        raw.physicalConfig.coverArt = '';
                        return {
                            url: link.split('#')[0] + '#c=' + await encodeCard(raw),
                            artwork: oldArtwork.asset,
                        };
                    }""", {"link": link, "design": design})
                page.goto(link)
                page.get_by_role("button", name="Open your envelope", exact=True).press("Enter")
                recipient = page.frame_locator("#viewerFrame")
                root = recipient.locator("#cardRoot")
                expect(root).to_have_attribute("data-physical-state", "cover")
                expect(recipient.locator(".paper-cover-art")).to_have_attribute("src", expected)
                assert_loaded(recipient.locator(".paper-cover-art"))
                assert recipient.locator(".paper-cover-title").evaluate(
                    "e => e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1"
                )
                check_width(page)
                if width in [375, 1440]:
                    recipient.locator(".paper-cover").screenshot(path=ART / f"{design}-{width}.png")
                expect(page.get_by_role("button", name="Open your card", exact=True)).to_be_enabled()
                page.get_by_role("button", name="Open your card", exact=True).press("Enter")
                expect(root).to_have_attribute("data-physical-state", "inside")
                expect(recipient.locator("#headline")).to_have_text("To Alex")
                expect(recipient.locator("#watermark")).to_have_text("Silent Hello")
                check_width(page)
                if old_link:
                    page.goto("about:blank")
                    page.goto(old_link["url"])
                    page.get_by_role("button", name="Open your envelope", exact=True).press("Enter")
                    expect(root).to_have_attribute("data-physical-state", "cover")
                    expect(recipient.locator(".paper-cover-art")).to_have_attribute(
                        "src", base + "stickers/" + old_link["artwork"])
            assert not errors, errors
            context.close()
            print(f"PASS {width}px: catalogue artwork, automatic sender selection, share and recipient", flush=True)
        browser.close()
    server.shutdown()
