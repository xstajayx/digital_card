"""Navigation and homepage behavior under the GitHub Pages project prefix."""
import os
import shutil
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = Path(os.environ.get("CARD_ARTIFACT_DIR", "/tmp/silent-hello-artifacts")) / "site-integration"
ART.mkdir(parents=True, exist_ok=True)
LINKS = ["Home", "Greeting Cards", "Digital Flowers", "My Occasions", "About Silent Hello"]
ROUTES = {
    "": ("Home", "page"),
    "cards.html": ("Greeting Cards", "page"),
    "studio.html?design=birthday-midnight": ("Greeting Cards", "location"),
    "flowers.html": ("Digital Flowers", "page"),
    "flower-studio.html?flower=purple-orchid": ("Digital Flowers", "location"),
    "occasions.html": ("My Occasions", "page"),
    "prepared.html": ("My Occasions", "location"),
    "how-it-works.html": ("About Silent Hello", "page"),
    "information.html": ("About Silent Hello", "location"),
}


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


def bounded(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), page.url


with ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=ROOT)) as server:
    Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/digital_card/"
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=os.environ.get("CARD_CHROMIUM_PATH") or shutil.which("chromium"),
            args=["--no-sandbox"],
        )
        for width in [320, 360, 390, 430, 768, 1440]:
            page = browser.new_page(viewport={"width": width, "height": 900})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(base)
            cards = page.get_by_role("link", name="Browse Cards")
            flowers = page.get_by_role("link", name="Explore Flowers")
            expect(cards).to_have_attribute("href", "./cards.html")
            expect(flowers).to_have_attribute("href", "./flowers.html")
            assert page.locator(".home-art img").evaluate_all(
                "images => images.every(img => img.complete && img.naturalWidth > 0)"
            )
            geometry = page.locator(".home-collection").evaluate_all(
                "nodes => nodes.map(node => ({width:node.offsetWidth, top:node.offsetTop}))"
            )
            assert abs(geometry[0]["width"] - geometry[1]["width"]) < 2
            assert (geometry[0]["top"] == geometry[1]["top"]) == (width >= 768)
            page.evaluate("document.fonts.ready")
            if width in [390, 1440]:
                page.screenshot(path=ART / f"after-{width}.png", full_page=width == 390)
            menu = page.locator("#menuToggle")
            navigation = page.get_by_role("navigation", name="Main navigation")
            menu.focus()
            page.keyboard.press("Enter")
            expect(menu).to_have_attribute("aria-expanded", "true")
            expect(navigation.get_by_role("link")).to_have_text(LINKS)
            bounded(page)
            if width == 390:
                menu.blur()
                page.screenshot(path=ART / "mobile-menu.png")
                menu.focus()
            page.keyboard.press("Tab")
            expect(navigation.get_by_role("link", name="Home")).to_be_focused()
            page.keyboard.press("Escape")
            expect(menu).to_be_focused()
            expect(menu).to_have_attribute("aria-expanded", "false")
            page.locator("html").evaluate('el => el.style.fontSize = "200%"')
            menu.click()
            bounded(page)
            page.evaluate('document.documentElement.style.fontSize = ""')
            for path, (label, current) in ROUTES.items():
                page.goto(base + path)
                expect(menu).to_have_attribute("aria-expanded", "false")
                menu.click()
                expect(navigation.get_by_role("link")).to_have_text(LINKS)
                expect(navigation.get_by_role("link", name=label)).to_have_attribute("aria-current", current)
                bounded(page)
                if width == 390 and path.startswith("flower-studio"):
                    page.screenshot(path=ART / "mobile-creator-menu.png")
                page.keyboard.press("Escape")
                expect(navigation).to_be_hidden()
            assert not errors, errors
            page.close()
            print(f"PASS shared menus and homepage at {width}px", flush=True)

        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.goto(base + "?occasion=birthday#catalogue")
        expect(page).to_have_url(base + "cards.html?occasion=birthday#catalogue")
        expect(page.get_by_role("combobox", name="Occasion", exact=True)).to_have_value("birthday")
        page.goto(base + "index.html#catalogue")
        expect(page).to_have_url(base + "cards.html#catalogue")
        page.get_by_role("link", name="Create Your Own").click()
        expect(page.locator(".occasion-tile")).to_have_count(28)
        page.locator('.steps [data-step="3"]').click()
        page.locator("#messageInput").fill("My unsaved card")
        prompts = []
        def cancel_leave(dialog):
            prompts.append(dialog.type)
            dialog.dismiss()

        page.on("dialog", cancel_leave)
        page.get_by_role("link", name="← Greeting Cards").click(no_wait_after=True)
        expect(page.locator("#messageInput")).to_have_value("My unsaved card")
        assert prompts == ["beforeunload"]
        page.locator(".draft-menu summary").click()
        page.get_by_role("button", name="Save draft", exact=True).click()
        expect(page.get_by_text("Draft saved on this browser", exact=False)).to_be_visible()
        page.get_by_role("link", name="← Greeting Cards").click()
        expect(page).to_have_url(base + "cards.html")
        page.goto(base + "flower-studio.html?flower=purple-orchid")
        page.get_by_label("Your message").fill("My unsaved flower")
        page.get_by_role("link", name="← Digital Flowers").click(no_wait_after=True)
        expect(page.get_by_label("Your message")).to_have_value("My unsaved flower")
        assert prompts == ["beforeunload", "beforeunload"]
        page.get_by_role("button", name="Preview their gift").click()
        page.keyboard.press("Escape")
        expect(page.locator("#productName")).to_have_text("Purple Orchid")
        expect(page.get_by_label("Your message")).to_have_value("My unsaved flower")
        page.remove_listener("dialog", cancel_leave)
        page.once("dialog", lambda dialog: dialog.accept())
        page.get_by_role("link", name="← Digital Flowers").click()
        expect(page).to_have_url(base + "flowers.html")
        page.go_back()
        expect(page.locator("#productName")).to_have_text("Purple Orchid")
        print("PASS old catalogue URLs, existing card creator, draft leave prompts, preview inputs and browser Back", flush=True)
        page.close()

        context = browser.new_context(java_script_enabled=False)
        page = context.new_page()
        page.goto(base)
        page.locator("#menuToggle").click()
        expect(page.get_by_role("navigation", name="Main navigation").get_by_role("link")).to_have_text(LINKS)
        page.get_by_role("link", name="Digital Flowers", exact=True).click()
        expect(page).to_have_url(base + "flowers.html")
        context.close()
        print("PASS native menu without JavaScript", flush=True)
        browser.close()
    server.shutdown()
