"""Exercise UK timing, actual catalogue destinations and artwork under /digital_card/."""
import os
import shutil
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = Path(os.environ.get("CARD_ARTIFACT_DIR", "/tmp/silent-hello-artifacts")) / "seasonal"
ART.mkdir(parents=True, exist_ok=True)
CASES = [
    ("christmas", "2026-12-01T12:00:00Z", "Explore Christmas Cards"),
    ("valentines", "2026-02-10T12:00:00Z", "Explore Valentine’s Cards"),
    ("mothers-day", "2026-03-08T12:00:00Z", "Explore Mother’s Day Cards"),
    ("easter", "2026-04-05T12:00:00Z", "Explore Easter Cards"),
    ("fathers-day", "2026-06-15T12:00:00Z", "Explore Father’s Day Cards"),
    ("evergreen", "2026-08-10T12:00:00Z", "Explore Greeting Cards"),
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


with ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=ROOT)) as server:
    Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/digital_card/"
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CARD_CHROMIUM_PATH") or shutil.which("chromium"), args=["--no-sandbox"])
        for width, height in [(320, 720), (390, 844), (1440, 900)]:
            context = browser.new_context(viewport={"width": width, "height": height}, timezone_id="Pacific/Honolulu",
                                          reduced_motion="reduce")
            errors = []
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            for promotion, date, cta in CASES:
                page.clock.set_fixed_time(datetime.fromisoformat(date))
                page.goto(base)
                banner = page.locator("#seasonalBanner")
                expect(banner).to_have_attribute("data-promotion", promotion)
                expect(banner.locator("h1")).to_be_visible()
                expect(page.locator("h1")).to_have_count(1)
                expect(banner.locator("img")).to_have_attribute("src", f"./assets/seasonal/{promotion}.svg")
                assert banner.locator("img").evaluate("image => image.decode().then(() => image.naturalWidth > 0)")
                link = banner.get_by_role("link", name=cta)
                assert link.bounding_box()["height"] >= 44
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
                assert page.locator(".home-collections > section").count() == 2
                assert page.locator("#homeJarTitle").count() == 1
                if width in [390, 1440]:
                    page.evaluate("document.fonts.ready")
                    banner.screenshot(path=ART / f"{promotion}-{width}.png")
                if width == 390:
                    link.press("Enter")
                    if promotion != "evergreen":
                        expect(page.locator("#occasion")).to_have_value(promotion)
                    expect(page.locator(".shop-card:visible").first).to_be_visible()
            assert not errors, errors
            context.close()
            print(f"PASS {width}px: all active and evergreen banners, artwork and responsive layout", flush=True)

        context = browser.new_context(timezone_id="Pacific/Honolulu")
        page = context.new_page()
        page.clock.install(time=datetime.fromisoformat("2026-12-25T23:59:45Z"))
        page.goto(base)
        banner = page.locator("#seasonalBanner")
        expect(banner).to_have_attribute("data-promotion", "christmas")
        page.clock.fast_forward(20_000)
        expect(banner).to_have_attribute("data-promotion", "evergreen")
        page.clock.set_system_time(datetime.fromisoformat("2026-02-10T12:00:00Z"))
        page.evaluate("window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}))")
        expect(banner).to_have_attribute("data-promotion", "valentines")
        page.clock.set_system_time(datetime.fromisoformat("2026-02-15T00:00:00Z"))
        page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
        expect(banner).to_have_attribute("data-promotion", "evergreen")
        page.clock.set_system_time(datetime.fromisoformat("2026-10-30T12:00:00Z"))
        page.reload()
        expect(banner).to_have_attribute("data-promotion", "evergreen")
        context.close()

        context = browser.new_context()
        page = context.new_page()
        page.route("**/assets/seasonal/christmas.svg", lambda route: route.abort())
        page.clock.set_fixed_time(datetime.fromisoformat("2026-12-01T12:00:00Z"))
        page.goto(base)
        expect(page.locator("#seasonalBanner")).to_have_attribute("data-promotion", "evergreen")
        expect(page.get_by_role("link", name="Explore Greeting Cards")).to_have_attribute("href", "./cards.html")
        context.close()
        context = browser.new_context(java_script_enabled=False)
        page = context.new_page()
        page.goto(base)
        expect(page.get_by_role("heading", name="Send a Little Joy")).to_be_visible()
        expect(page.get_by_role("link", name="Explore Greeting Cards")).to_be_visible()
        browser.close()
        print("PASS live UK midnight, resumed pages, blocked artwork and JavaScript-free fallback", flush=True)
    server.shutdown()
