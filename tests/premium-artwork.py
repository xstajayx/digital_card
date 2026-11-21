"""Exercise the four upgraded covers and their original v5 artwork IDs."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

import os
import shutil
import re

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = Path(os.environ.get("CARD_ARTIFACT_DIR", "/tmp/silent-hello-artifacts")) / "premium-artwork"
ART.mkdir(parents=True, exist_ok=True)
DESIGNS = {
    "tulip-market": "Tulip Market",
    "forget-me-not": "Forget Me Not",
    "snow-globe-train": "Snow Globe Train",
    "interlocking-rings": "Interlocking Rings",
}


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def assert_art(art, folder, design):
    expect(art).to_have_attribute("src", re.compile(f"/stickers/{folder}/{design}\\.svg$"))
    expect(art).to_be_visible()
    expect(art).to_have_js_property("complete", True)
    assert art.evaluate("img => img.naturalWidth > 0")


with ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=ROOT.parent)) as server:
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
            for design, name in DESIGNS.items():
                page.goto(base + "cards.html")
                expect(page.locator(".shop-card")).to_have_count(127)
                page.locator("#search").fill(name)
                expect(page.locator("#catalogueStatus")).to_have_text("Showing 1–1 of 1 cards")
                tile = page.locator(f'.shop-card[data-id="{design}"]')
                assert_art(tile.locator("img"), "illustrated", design)
                tile.get_by_role("button", name=f"Preview {name}").click()
                assert_art(page.frame_locator("#shopPreview").locator(".paper-cover-art"), "illustrated", design)
                page.locator("#previewCustomise").click()
                expect(page.locator("#studio")).to_have_attribute("data-step", "2")
                page.locator('.steps [data-step="3"]').click()
                page.locator("#messageInput").fill("A little joy for you!")
                page.locator('.steps [data-step="5"]').click()
                page.get_by_role("button", name="Copy link").click()
                expect(page.locator("#exportStatus")).to_contain_text("Link copied")
                url = page.evaluate("navigator.clipboard.readText()")
                legacy_urls = page.evaluate("""async ({url, design}) => {
                    const {encodeCard, decodeCard} = await import('./engine/share-codec.js');
                    const raw = await decodeCard(url.split('#c=')[1]);
                    return Promise.all([design, ''].map(async id => {
                        const old = { ...raw, stickerId: id, physicalConfig: { ...raw.physicalConfig, coverArt: id } };
                        return url.split('#')[0] + '#c=' + await encodeCard(old);
                    }));
                }""", {"url": url, "design": design})
                for opened, folder in [(url, "illustrated")] + ([(link, "packs") for link in legacy_urls] if width == 1440 else []):
                    page.goto("about:blank")
                    page.goto(opened)
                    frame = page.frame_locator("#viewerFrame")
                    page.get_by_role("button", name="Open your envelope", exact=True).press("Enter")
                    cover = frame.locator(".paper-cover")
                    expect(frame.locator("#cardRoot")).to_have_attribute("data-physical-state", "cover")
                    assert_art(cover.locator("img.paper-cover-art"), folder, design)
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                    assert cover.locator(".paper-cover-title").evaluate(
                        "node => node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight")
                    if width in [375, 1440]:
                        cover.screenshot(path=ART / f"{design}-{width}-{folder}.png")
                    expect(cover).to_be_enabled()
                    cover.press("Enter")
                    expect(frame.locator("#cardRoot")).to_have_attribute("data-physical-state", "inside")
                    expect(frame.locator("#message")).to_have_text("A little joy for you!")
                    expect(frame.locator("#watermark")).to_have_text("Silent Hello")
            if width == 1440:
                page.goto(base + "cards.html")
                expect(page.locator(".shop-card")).to_have_count(127)
                grid = page.locator("#cardGrid")
                # Keep application-rendered tiles and their original order in a curated contact sheet.
                grid.evaluate("""(grid, ids) => {
                    for (const tile of grid.querySelectorAll('.shop-card')) {
                        tile.hidden = !ids.includes(tile.dataset.id);
                        if (!tile.hidden) tile.querySelector('img').loading = 'eager';
                    }
                }""", [*DESIGNS, "all-i-could-afford", "no-expense-spared"])
                page.wait_for_function("[...document.querySelectorAll('.shop-card:not([hidden]) img')].every(i => i.complete && i.naturalWidth > 0)")
                grid.screenshot(path=ART / "catalogue.png")
            assert not errors, errors
            context.close()
            print(f"PASS {width}px: four catalogue previews, sender links, recipient folds and artwork", flush=True)
        browser.close()
    server.shutdown()
