"""Exercise the static rose gift at the GitHub Pages path, without external sends."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
import shutil
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path(os.environ.get("CARD_ARTIFACT_DIR", "/tmp/silent-hello-artifacts")) / "rose"
ARTIFACTS.mkdir(parents=True, exist_ok=True)
DAY = 86_400_000


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        return super().translate_path(path.removeprefix("/digital_card"))

    def log_message(self, *_):
        pass


def clean(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
    assert page.locator("button:visible").evaluate_all(
        """buttons => buttons.every(button => {
          const rect = button.getBoundingClientRect();
          return rect.height >= 44 && rect.left >= 0 && rect.right <= innerWidth + 1;
        })"""
    )


def copy_link(page):
    page.get_by_role("button", name="Copy link").click()
    expect(page.locator("#sendStatus")).to_contain_text("Link copied")
    return page.evaluate("navigator.clipboard.readText()")


def expect_art(page, stage):
    expect(page.locator("#giftArt")).to_have_attribute("data-stage", stage)
    assert page.locator("#giftArt img").evaluate("image => image.complete && image.naturalWidth > 0")


with ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=ROOT)) as server:
    Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/digital_card/"
    with sync_playwright() as playwright:
        chromium = playwright.chromium.launch(
            executable_path=os.environ.get("CARD_CHROMIUM_PATH") or shutil.which("chromium"),
            args=["--no-sandbox"],
        )
        for width, height in [(320, 780), (360, 800), (390, 844), (430, 932), (768, 1024), (1440, 960)]:
            context = chromium.new_context(
                viewport={"width": width, "height": height},
                permissions=["clipboard-read", "clipboard-write"],
                reduced_motion="no-preference" if width == 1440 else "reduce",
                has_touch=width <= 430,
            )
            errors = []
            context.on("page", lambda page: page.on("pageerror", lambda error: errors.append(str(error))))
            context.on("response", lambda response: errors.append(response.url) if response.status >= 400 else None)
            context.add_init_script("Date.now = () => 1700000000000 + (window.roseTimeOffset || 0)")
            sender = context.new_page()
            sender.goto(base)
            rose_entry = sender.get_by_role("link", name="Send a rose")
            if not rose_entry.is_visible():
                sender.get_by_role("button", name="Menu").click()
            rose_entry.click()
            expect(sender.get_by_role("heading", name="The Living Rose")).to_be_visible()
            clean(sender)
            greeting = "  To Stacey  "
            message = "Thought you could use a little beauty today.\n\nThinking of you, always. 想你！"
            sender.get_by_label("Greeting").fill(greeting)
            sender.get_by_label("Your message").fill(message)
            sender.get_by_label("Signature").fill("Jamie")
            assert sender.locator('#draftNote [data-note="greeting"]').text_content() == greeting
            preview = sender.get_by_role("button", name="Preview gift")
            preview.focus()
            sender.keyboard.press("Enter")
            expect(sender.get_by_role("dialog")).to_be_visible()
            expect(sender.locator("#previewArt img")).to_have_attribute("alt", "A partly closed blush rosebud on a green stem with two leaf sprigs.")
            assert sender.locator('#previewNote [data-note="message"]').text_content() == message
            clean(sender)
            sender.keyboard.press("Escape")
            expect(preview).to_be_focused()
            expect(sender.get_by_label("Your message")).to_have_value(message)
            if width in [390, 1440]:
                preview.blur()
                sender.screenshot(path=ARTIFACTS / f"creator-{width}.png", full_page=True)
            link = copy_link(sender)
            parsed = urlsplit(link)
            assert parsed.path.endswith("/rose-view.html") and parsed.fragment.startswith("r=") and not parsed.query
            assert copy_link(sender) == link

            recipient = context.new_page()
            recipient.goto(link)
            clean(recipient)
            recipient.keyboard.press("Tab")
            expect(recipient.get_by_role("link", name="Skip to content")).to_be_focused()
            recipient.keyboard.press("Enter")
            expect(recipient.locator("main")).to_be_focused()
            assert recipient.url == link
            open_button = recipient.get_by_role("button", name="Open your rose")
            expect(open_button).to_be_visible()
            assert recipient.evaluate("!Object.keys(localStorage).some(key => key.startsWith('silent-hello.rose'))")
            if width in [390, 1440]:
                recipient.screenshot(path=ARTIFACTS / f"sealed-{width}.png", full_page=True)
            open_button.focus()
            recipient.keyboard.press("Enter")
            expect(recipient.locator("#giftTitle")).to_be_focused()
            expect_art(recipient, "bud")
            assert recipient.locator('#giftNote [data-note="greeting"]').text_content() == greeting
            assert recipient.locator('#giftNote [data-note="message"]').text_content() == message
            assert recipient.locator("#giftNote img").count() == 0
            assert recipient.get_by_role("button", name="Copy link").count() == 0
            if width != 1440:
                assert recipient.locator("#opened").evaluate("element => getComputedStyle(element).animationName") == "none"
            for day, stage in [(2, "opening"), (5, "bloom"), (10, "bloom")]:
                recipient.evaluate("""offset => {
                  window.roseTimeOffset = offset;
                  document.dispatchEvent(new Event("visibilitychange"));
                }""", day * DAY)
                expect_art(recipient, stage)
                clean(recipient)
                if day == 5 and width in [390, 1440]:
                    recipient.locator("#giftTitle").blur()
                    recipient.screenshot(path=ARTIFACTS / f"recipient-{width}.png", full_page=True, animations="disabled")
            recipient.evaluate("window.roseTimeOffset = 14 * 86400000; dispatchEvent(new Event('focus'))")
            expect_art(recipient, "bloom")
            expect(recipient.locator("#giftStage")).to_have_text("Your keepsake")
            expect(recipient.get_by_role("button", name="Keep this rose")).to_be_hidden()
            assert recipient.locator('#giftNote [data-note="message"]').text_content() == message

            sender.get_by_label("Keep it in bloom").check()
            sender.get_by_label("Greeting").fill("")
            sender.get_by_label("Signature").fill("")
            evergreen = copy_link(sender)
            assert evergreen != link
            recipient.evaluate("window.roseTimeOffset = 0")
            recipient.goto(evergreen)
            recipient.get_by_role("button", name="Open your rose").click()
            expect_art(recipient, "bloom")
            expect(recipient.locator('#giftNote [data-note="greeting"]')).to_be_hidden()
            expect(recipient.locator('#giftNote [data-note="signature"]')).to_be_hidden()
            recipient.reload()
            expect_art(recipient, "bloom")
            recipient.get_by_role("button", name="Keep this rose").click()
            expect_art(recipient, "bloom")
            expect(recipient.locator("#giftStage")).to_have_text("Your keepsake")
            expect(recipient.locator("#keepStatus")).to_be_focused()
            recipient.reload()
            expect_art(recipient, "bloom")
            expect(recipient.locator("#giftStage")).to_have_text("Your keepsake")
            assert "/bloom-" in recipient.locator("#giftArt img").evaluate("image => image.currentSrc")
            clean(recipient)
            assert not errors, errors
            print(f"PASS {width}px creator, keyboard preview, share link, all stages, keepsake and overflow", flush=True)
            context.close()

        context = chromium.new_context(permissions=["clipboard-read", "clipboard-write"])
        sender = context.new_page()
        sender.goto(base + "rose.html")
        sender.get_by_label("Your message").fill("x" * 1001)
        expect(sender.locator("#messageError")).to_have_text("Use 1000 characters or fewer.")
        sender.get_by_role("button", name="Copy link").click()
        expect(sender.get_by_label("Your message")).to_be_focused()
        expect(sender.locator("#sendStatus")).to_contain_text("highlighted fields")
        untrusted_note = "A little joy 🌹 <img src=x>"
        sender.get_by_label("Your message").fill(untrusted_note)
        original = copy_link(sender)
        sender.evaluate("""() => {
          Object.defineProperty(navigator, "share", { value: async payload => window.nativePayload = payload });
          window.open = () => ({ location: { set href(value) { window.waUrl = value; } } });
        }""")
        sender.get_by_role("button", name="Share rose").click()
        expect(sender.locator("#sendStatus")).to_contain_text("Rose shared")
        assert sender.evaluate("window.nativePayload.url") == original
        sender.get_by_role("button", name="WhatsApp").click()
        expect(sender.locator("#sendStatus")).to_contain_text("WhatsApp opened")
        whatsapp = urlsplit(sender.evaluate("window.waUrl"))
        assert whatsapp.netloc == "wa.me" and parse_qs(whatsapp.query)["text"][0].endswith(original)
        sender.evaluate("""() => {
          window.open = () => null;
          navigator.clipboard.writeText = async () => { throw new Error("Clipboard denied"); };
        }""")
        sender.get_by_role("button", name="WhatsApp").click()
        expect(sender.locator("#sendStatus")).to_contain_text("blocked")
        expect(sender.locator("#roseLink")).to_have_value(original)
        sender.get_by_role("button", name="Copy link").click()
        expect(sender.locator("#sendStatus")).to_contain_text("Select and copy")
        expect(sender.locator("#roseLink")).to_be_focused()

        recipient = context.new_page()
        recipient.goto(base + "rose-view.html#r=invalid")
        expect(recipient.get_by_role("alert")).to_contain_text("invalid")
        recipient.goto(original)
        recipient.get_by_role("button", name="Open your rose").click()
        expect_art(recipient, "bud")
        recipient.evaluate("""days => {
          const key = Object.keys(localStorage).find(key => key.startsWith("silent-hello.rose"));
          localStorage.setItem(key, JSON.stringify({ openedAt: Date.now() - days * 86400000 }));
        }""", 7)
        recipient.reload()
        expect_art(recipient, "bloom")
        recipient.evaluate("""() => {
          const key = Object.keys(localStorage).find(key => key.startsWith("silent-hello.rose"));
          localStorage.setItem(key, JSON.stringify({ openedAt: Date.now() + 86400000, kept: true }));
        }""")
        recipient.reload()
        expect(recipient.get_by_role("button", name="Open your rose")).to_be_visible()
        context.close()

        context = chromium.new_context()
        context.add_init_script("""Object.defineProperty(window, 'localStorage', {
          get() { throw new DOMException('Storage denied', 'SecurityError'); }
        });""")
        recipient = context.new_page()
        recipient.goto(original)
        recipient.get_by_role("button", name="Open your rose").click()
        expect_art(recipient, "bud")
        expect(recipient.locator("#keepStatus")).to_contain_text("couldn’t remember")
        recipient.get_by_role("button", name="Keep this rose").click()
        expect_art(recipient, "bloom")
        expect(recipient.locator("#keepStatus")).to_contain_text("for this visit")
        expect(recipient.locator('#giftNote [data-note="message"]')).to_have_text(untrusted_note)
        assert recipient.locator("#giftNote img").count() == 0
        print("PASS share fallbacks, malformed links, validation, timed refresh, future timestamps and denied storage", flush=True)
        chromium.close()
    server.shutdown()
