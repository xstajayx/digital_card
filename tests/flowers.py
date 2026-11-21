"""Chromium coverage for the full flower journey. No share is sent externally."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
import re
import shutil

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = Path(os.environ.get("CARD_ARTIFACT_DIR", "/tmp/silent-hello-artifacts")) / "flowers"
ART.mkdir(parents=True, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        return super().translate_path(path.removeprefix("/digital_card"))

    def log_message(self, *_):
        pass


def bounded(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
    assert page.locator(".flower-button:visible").evaluate_all(
        "nodes => nodes.every(n => n.getBoundingClientRect().height >= 44)"
    )


def copy_gift(page):
    page.get_by_role("button", name="Copy link").click()
    expect(page.locator("#sendStatus")).to_contain_text("Link copied")
    return page.evaluate("navigator.clipboard.readText()")


def finished(page):
    expect(page.locator("[data-art]")).to_have_attribute("data-bloom", "open")


with ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=ROOT)) as server:
    Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/digital_card/"
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=os.environ.get("CARD_CHROMIUM_PATH") or shutil.which("chromium"),
            args=["--no-sandbox"],
        )
        context = browser.new_context(viewport={"width": 390, "height": 900},
                                      permissions=["clipboard-read", "clipboard-write"])
        errors = []

        def observe(page):
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("response", lambda response: errors.append(response.url) if response.status >= 400 else None)

        context.on("page", observe)
        sender = context.new_page()
        sender.on("dialog", lambda dialog: dialog.accept())
        sender.goto(base + "rose.html")
        expect(sender).to_have_url(base + "flower-studio.html?flower=blush-rose")
        sender.goto(base)
        entry = sender.get_by_role("link", name="Explore Flowers")
        if not entry.is_visible():
            sender.get_by_role("button", name="Menu").click()
        entry.click()
        expect(sender).to_have_url(base + "flowers.html")
        cards = sender.locator(".flower-card")
        expect(cards).to_have_count(14)
        expect(cards.locator("svg")).to_have_count(14)
        entries = cards.locator("a").evaluate_all("links => links.map(a => [a.href, a.querySelector('h2').textContent])")
        for name, count in [("Single flowers", 8), ("Bouquets", 6), ("All flowers", 14)]:
            sender.get_by_role("button", name=name, exact=True).click()
            expect(sender.locator(".flower-card:visible")).to_have_count(count)
        for category in ["Romantic", "Birthday", "Thank you", "Just because"]:
            sender.get_by_role("button", name=category).click()
            assert 0 < sender.locator(".flower-card:visible").count() < 14
        sender.get_by_role("button", name="All flowers").click()
        sender.screenshot(path=ART / "catalogue-mobile.png")
        recipient = context.new_page()
        recipient.clock.install()
        product_links = {}
        message = "Thinking of you, always. 🌻\n\n想你！"
        for url, name in entries:
            sender.goto(base + "flowers.html")
            sender.get_by_role("link", name=re.compile(re.escape(name))).click()
            expect(sender).to_have_url(url)
            expect(sender.locator("#productName")).to_have_text(name)
            bounded(sender)
            sender.get_by_label("Your message").fill(message)
            sender.get_by_label("Greeting").fill("  To Stacey  ")
            sender.get_by_label("Signature").fill("Jamie")
            assert sender.locator('#studioNote [data-note="greeting"]').text_content() == "  To Stacey  "
            link = copy_gift(sender)
            product_links[name] = link
            assert "#f=" in link and "?" not in link
            recipient.goto(link)
            expect(recipient.locator(".flower-brand")).to_have_text("Silent Hello")
            art = recipient.locator("[data-art]")
            expect(art).to_have_attribute("data-bloom", "bud")
            expect(art.locator("svg")).to_have_attribute("aria-label", sender.locator("#productDescription").text_content())
            if name == "A Dozen Red Roses":
                expect(art.locator('[data-species="rose"]')).to_have_count(12)
            expect(recipient.locator("[data-letter]")).to_be_hidden()
            action = recipient.locator("[data-bloom]:is(button)")
            action.click()
            action.dispatch_event("click")
            recipient.clock.fast_forward(1700)
            expect(art).to_have_attribute("data-bloom", "opening")
            recipient.clock.fast_forward(13_000)
            finished(recipient)
            expect(recipient.locator('[data-note="message"]')).to_have_text(message)
            assert recipient.locator('[data-note="greeting"]').text_content() == "  To Stacey  "
            bounded(recipient)
            action.click()
            expect(recipient.locator("[data-letter]")).to_be_visible()
            recipient.clock.fast_forward(13_000)
            recipient.reload()
            finished(recipient)
            expect(action).to_contain_text("bloom again")
            print(f"PASS {name}: catalogue, creator, link, bloom, replay and return", flush=True)
        assert not errors, errors

        sender.goto(entries[8][0])
        sender.get_by_label("Your message").fill(message)
        sender.get_by_label("Greeting").fill("For you")
        sender.get_by_role("button", name="Preview their gift").press("Enter")
        dialog = sender.get_by_role("dialog")
        expect(dialog.locator("[data-art]")).to_have_attribute("data-bloom", "bud")
        expect(dialog.locator('[data-species="rose"]')).to_have_count(12)
        dialog.get_by_role("button", name="Watch your flowers bloom").click()
        sender.wait_for_function("document.querySelector('dialog [data-art]').dataset.bloom === 'open'", timeout=12_000)
        expect(dialog.locator('[data-note="message"]')).to_have_text(message)
        sender.keyboard.press("Escape")
        expect(sender.locator("#openPreview")).to_be_focused()
        expect(sender.get_by_label("Your message")).to_have_value(message)
        sender.get_by_label("Your message").fill("x" * 1001)
        expect(sender.locator("#messageError")).to_contain_text("1000")
        sender.get_by_role("button", name="Copy link").click()
        expect(sender.locator("#sendStatus")).to_contain_text("highlighted fields")
        sender.get_by_label("Your message").fill("<img src=x> 🌺")
        original = copy_gift(sender)
        assert copy_gift(sender) == original
        sender.evaluate("""() => {
          Object.defineProperty(navigator, "share", { configurable: true, value: async data => window.nativeGift = data.url });
          window.open = () => ({ location: { set href(value) { window.whatsAppGift = value; } } });
        }""")
        sender.get_by_role("button", name="Share gift").click()
        expect(sender.locator("#sendStatus")).to_contain_text("was shared")
        assert sender.evaluate("window.nativeGift") == original
        sender.get_by_role("button", name="WhatsApp").click()
        expect(sender.locator("#sendStatus")).to_contain_text("WhatsApp opened")
        assert sender.evaluate("decodeURIComponent(window.whatsAppGift)").endswith(original)
        sender.evaluate("""() => {
          Object.defineProperty(navigator, "share", { value: undefined });
          window.open = () => null;
          navigator.clipboard.writeText = async () => { throw new Error("denied"); };
        }""")
        sender.get_by_role("button", name="Share gift").click()
        expect(sender.locator("#flowerLink")).to_have_value(original)
        sender.get_by_role("button", name="WhatsApp").click()
        expect(sender.locator("#sendStatus")).to_contain_text("blocked")
        legacy = sender.evaluate("""async () => {
          const { encodeRoseGift } = await import('./engine/rose-gift.js');
          return ['evolving', 'everlasting'].map((mode, i) => 'r=' + encodeRoseGift({
            id: String(i).repeat(32), mode, greeting: '', signature: '', message: 'An old rose 🌹'
          }));
        }""")
        for payload in legacy:
            recipient.goto(base + "rose-view.html#" + payload)
            recipient.get_by_role("button", name="Watch your flower bloom").click()
            recipient.clock.fast_forward(7000)
            finished(recipient)
            expect(recipient.locator('[data-note="message"]')).to_have_text("An old rose 🌹")
        recipient.evaluate("""() => {
          localStorage.removeItem('silent-hello.flower.v2.blush-rose.' + '1'.repeat(32));
          localStorage.setItem('silent-hello.rose.v1.' + '1'.repeat(32), JSON.stringify({ kept: true }));
        }""")
        recipient.reload()
        finished(recipient)
        expect(recipient.locator('[data-note="message"]')).to_have_text("An old rose 🌹")
        recipient.goto(base + "rose-view.html#f=invalid")
        expect(recipient.get_by_role("alert")).to_contain_text("invalid")
        sender.goto(base + "flower-studio.html?flower=missing")
        expect(sender.get_by_role("alert")).to_contain_text("unavailable")
        assert not errors, errors
        context.close()

        for width in [320, 360, 390, 430, 768, 1440]:
            context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
            page = context.new_page()
            page.on("dialog", lambda dialog: dialog.accept())
            page.goto(base + "flowers.html")
            bounded(page)
            if width == 1440:
                page.screenshot(path=ART / "catalogue-desktop.png", full_page=True)
            page.goto(entries[10][0])
            bounded(page)
            if width in [390, 1440]:
                page.get_by_label("Your message").fill(message)
                page.screenshot(path=ART / f"creator-{width}.png", full_page=True)
            page.goto(product_links["Sunshine Bouquet"])
            finished(page)
            expect(page.locator("[data-letter]")).to_be_visible()
            expect(page.locator("[data-bloom]:is(button)")).to_be_hidden()
            bounded(page)
            if width in [390, 1440]:
                page.screenshot(path=ART / f"recipient-{width}.png", full_page=True)
            print(f"PASS layout and reduced motion at {width}px", flush=True)
            context.close()

        for fault in ["storage", "render", "animation"]:
            context = browser.new_context()
            if fault == "storage":
                context.add_init_script("Object.defineProperty(window, 'localStorage', { get() { throw Error('blocked'); } });")
            if fault == "render":
                context.add_init_script("document.createElementNS = () => { throw Error('SVG unavailable'); };")
            page = context.new_page()
            page.clock.install()
            page.goto(original)
            if fault == "animation":
                page.evaluate("""() => {
                  const schedule = window.requestAnimationFrame;
                  try {
                    window.requestAnimationFrame = () => { throw Error("interrupted"); };
                    document.querySelector("button[data-bloom]").click();
                  } finally {
                    window.requestAnimationFrame = schedule;
                  }
                }""")
                finished(page)
            if fault == "storage":
                expect(page.locator('[data-note="signature"]')).to_be_hidden()
                page.get_by_role("button", name="Watch your flowers bloom").click()
                page.clock.fast_forward(13_000)
                finished(page)
            expect(page.locator('[data-note="message"]')).to_have_text("<img src=x> 🌺")
            expect(page.locator("[data-letter] img")).to_have_count(0)
            context.close()

        page = browser.new_page(viewport={"width": 390, "height": 900})
        page.clock.install()
        page.goto(product_links["A Dozen Red Roses"])
        page.screenshot(path=ART / "opening-0.png", full_page=True)
        page.locator("[data-art]").screenshot(path=ART / "motion-00.png")
        page.get_by_role("button", name="Watch your flowers bloom").click()
        for index, advance in enumerate([1700, 1800, 2000, 4000], 1):
            page.clock.fast_forward(advance)
            page.screenshot(path=ART / f"opening-{index}.png", full_page=True)
        page.get_by_role("button", name="Watch them bloom again").click()
        for frame in range(1, 22):
            page.clock.fast_forward(460)
            page.locator("[data-art]").screenshot(path=ART / f"motion-{frame:02}.png")
        print("PASS real-time preview, all share fallbacks, both legacy modes, fault handling and motion captures", flush=True)
        browser.close()
    server.shutdown()
