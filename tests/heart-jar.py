"""Heart Jar customer flow, checked under the GitHub Pages path."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import os
import re
import shutil

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = Path(os.environ.get("CARD_ARTIFACT_DIR", "/tmp/silent-hello-artifacts")) / "heart-jar"
ART.mkdir(parents=True, exist_ok=True)


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


def fits(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), page.url


def add(page, text):
    page.get_by_label("Heart message").fill(text)
    page.get_by_role("button", name="Add to Jar").click()


with ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=ROOT)) as server:
    Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}/digital_card/"
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("CARD_CHROMIUM_PATH") or shutil.which("chromium"), args=["--no-sandbox"])
        for width, height in [(320,700),(360,800),(390,844),(430,932),(768,1024),(1440,900),(1920,1080)]:
            context = browser.new_context(viewport={"width": width, "height": height},
                                          permissions=["clipboard-read", "clipboard-write"],
                                          reduced_motion="no-preference" if width == 1440 else "reduce")
            errors = []
            context.on("page", lambda page: page.on("pageerror", lambda error: errors.append(str(error))))
            page = context.new_page()
            page.goto(base)
            page.get_by_role("link", name="Create a Heart Jar").click()
            expect(page.locator(".jar-tile")).to_have_count(6)
            fits(page)
            if width in [390, 1440]:
                page.screenshot(path=ART / f"collection-{width}.png", full_page=True)
            page.get_by_role("link", name="Choose Love Notes").click()
            page.get_by_role("textbox", name="Recipient Optional").fill("To Jamie")
            page.get_by_label("Jar title").fill("A jar for you")
            page.get_by_label("Signature").fill("Stacey")
            page.get_by_label("Opening greeting").fill("A little joy.")
            page.get_by_role("button", name="Preview Jar").click()
            expect(page.locator("#shareStatus")).to_contain_text("at least 3")
            if width in [390, 1440]:
                typed = page.get_by_label("Heart message")
                typed.fill("Something I wrote myself")
                toggle = page.get_by_role("button", name="Give me some ideas")
                toggle.press("Enter")
                ideas = page.locator("#jarIdeasList button")
                expect(toggle).to_have_attribute("aria-expanded", "true")
                expect(ideas).to_have_count(4)
                expect(ideas.first).to_be_focused()
                assert ideas.first.evaluate("element => element.matches(':focus-visible')")
                first_batch = set(ideas.all_text_contents())
                page.locator("#jarIdeas").scroll_into_view_if_needed()
                page.screenshot(path=ART / f"ideas-{width}.png")
                page.get_by_role("button", name="Show me more ideas").click()
                assert first_batch.isdisjoint(ideas.all_text_contents())
                idea = ideas.first.text_content()
                ideas.first.press("Enter")
                expect(typed).to_have_value("Something I wrote myself")
                expect(page.get_by_role("button", name="Keep my text")).to_be_focused()
                page.get_by_role("button", name="Keep my text").press("Enter")
                expect(ideas.first).to_be_focused()
                ideas.first.press("Enter")
                page.get_by_role("button", name="Use this idea").press("Enter")
                expect(typed).to_have_value(idea)
                expect(typed).to_be_focused()
                expect(page.locator("#jarIdeasStatus")).to_contain_text("Idea placed")
                expect(page.locator("#heartList li")).to_have_count(0)
                typed.fill(idea + " (my words)")
                expect(typed).to_have_value(idea + " (my words)")
                page.get_by_role("button", name="Add to Jar").click()
                expect(page.locator("#heartList li")).to_have_text([re.compile(r"\(my words\)")])
                page.get_by_role("button", name="Remove heart 1").click()
                fits(page)
            add(page, "You make ordinary days feel like a celebration. 💝")
            add(page, "I never forget our afternoons in the rain.")
            add(page, "Keep this for the days you need a little reminder. You bring so much warmth into the lives of the people who know you.")
            add(page, "I never forget our afternoons in the rain.")
            expect(page.locator("#heartError")).to_contain_text("already")
            page.get_by_label("Heart message").fill("")
            expect(page.locator("#studioJar .jar-pieces svg")).to_have_count(3)
            page.get_by_role("button", name="Edit heart 2", exact=True).click()
            if width == 390:
                page.get_by_role("button", name="Give me some ideas").click()
                page.locator("#jarIdeasList button").first.click()
                page.get_by_role("button", name="Use this idea").click()
                expect(page.get_by_role("button", name="Save heart")).to_be_visible()
                expect(page.locator("#heartList li").nth(1)).to_contain_text("I never forget")
            page.get_by_label("Heart message").fill("I still think about our afternoons in the rain.")
            page.get_by_role("button", name="Save heart").click()
            page.get_by_role("button", name="Move down heart 1").click()
            expect(page.locator("#heartList li").first).to_contain_text("afternoons")
            page.get_by_role("button", name="Remove heart 2").click()
            page.get_by_role("button", name="Undo removal").click()
            expect(page.locator("#heartList li")).to_have_count(3)
            fits(page)
            if width in [390,1440]:
                page.evaluate("window.scrollTo(0, 0)")
                page.screenshot(path=ART / f"creator-{width}.png", full_page=True)
            page.get_by_role("button", name="Preview Jar").click()
            dialog = page.get_by_role("dialog", name="Recipient preview")
            expect(dialog.get_by_role("heading", name="A jar for you")).to_be_visible()
            dialog.get_by_role("button", name="Open Your Jar").press("Enter")
            expect(dialog.get_by_role("button", name="Heart 1, unopened")).to_be_focused()
            dialog.get_by_role("button", name="Heart 1, unopened").click()
            expect(dialog.locator('[data-jar="note-text"]')).to_contain_text("afternoons")
            page.keyboard.press("Escape")
            expect(page.get_by_role("button", name="Preview Jar")).to_be_focused()
            expect(page.get_by_label("Jar title")).to_have_value("A jar for you")
            page.get_by_role("button", name="Copy link").click()
            expect(page.locator("#shareStatus")).to_contain_text("Link copied")
            link = page.evaluate("navigator.clipboard.readText()")
            assert link.startswith(base + "jar-view.html#j=")
            viewer = context.new_page()
            viewer.goto(link)
            expect(viewer.get_by_role("button", name="Open Your Jar")).to_be_visible()
            invite = viewer.get_by_role("link", name="Send a little joy of your own")
            expect(invite).to_have_attribute("href", "./")
            assert viewer.locator("#gift + #giftError + #jarReturn").count() == 1
            expect(viewer.locator('[data-jar="recipient"]')).to_have_text("To Jamie")
            viewer.get_by_role("button", name="Open Your Jar").click()
            motion = viewer.locator(".jar-lid").evaluate("e => getComputedStyle(e).animationName")
            assert motion == ("jar-lift" if width == 1440 else "none")
            viewer.get_by_role("button", name="Heart 1, unopened").click()
            expect(viewer.locator('[data-jar="note-title"]')).to_be_focused()
            viewer.get_by_role("button", name="Pick Another Heart").click()
            viewer.get_by_role("button", name="Pick Another Heart").click()
            expect(viewer.locator('[data-jar="progress"]')).to_have_text("3 of 3 hearts opened")
            expect(viewer.locator('[data-jar="complete"]')).to_be_visible()
            expect(viewer.locator('[data-jar="note-text"]')).to_contain_text("You bring so much warmth")
            assert viewer.locator('[data-jar="note-text"] img').count() == 0
            expect(invite).to_be_visible()
            if width == 1440:
                viewer.get_by_role("button", name="Replay opening").click()
                expect(viewer.locator('[data-jar="progress"]')).to_have_text("3 of 3 hearts opened")
            fits(viewer)
            if width in [390,1440]:
                viewer.screenshot(path=ART / f"recipient-{width}.png", full_page=True, animations="disabled")
            viewer.reload()
            expect(viewer.locator('[data-jar="progress"]')).to_have_text("3 of 3 hearts opened")
            viewer.get_by_role("button", name="Heart 1, opened", exact=True).click()
            expect(viewer.locator('[data-jar="note-text"]')).to_contain_text("afternoons")
            invite.press("Enter")
            expect(viewer).to_have_url(base)
            assert not errors, errors
            context.close()
            print(f"PASS {width} × {height}: theme selection, edit, reorder, undo, preview, share, reveal and restore", flush=True)

        context = browser.new_context(permissions=["clipboard-read", "clipboard-write"], reduced_motion="reduce")
        page = context.new_page()
        page.on("dialog", lambda dialog: dialog.accept())
        page.goto(base + "jars.html")
        links = page.locator(".jar-tile a").evaluate_all("links => links.map(link => link.href)")
        shown = set()
        for url in links:
            page.goto(url)
            expect(page.locator("#themeName")).not_to_be_empty()
            page.get_by_role("button", name="Give me some ideas").click()
            ideas = page.locator("#jarIdeasList button")
            batch = set(ideas.all_text_contents())
            assert len(batch) == 4 and shown.isdisjoint(batch)
            shown.update(batch)
            first = ideas.first.text_content()
            ideas.first.click()
            expect(page.get_by_label("Heart message")).to_have_value(first)
            page.get_by_label("Heart message").fill("")
            page.get_by_role("button", name="Give me some ideas").press("Enter")
            page.keyboard.press("Escape")
            expect(page.get_by_role("button", name="Give me some ideas")).to_be_focused()
            for index in range(3):
                add(page, f"Heart {index + 1}")
            page.get_by_role("button", name="Copy link").click()
            expect(page.locator("#shareStatus")).to_contain_text("Link copied")
            link = page.evaluate("navigator.clipboard.readText()")
            viewer = context.new_page()
            viewer.goto(link)
            viewer.get_by_role("button", name="Open Your Jar").click()
            expect(viewer.locator('[data-jar="progress"]')).to_have_text("0 of 3 hearts opened")
            viewer.get_by_role("button", name="Heart 1, unopened").click()
            expect(viewer.locator('[data-jar="note-text"]')).to_have_text("Heart 1")
            viewer.close()
        page.get_by_label("Heart message").fill("x" * 141)
        expect(page.locator("#heartError")).to_contain_text("140")
        for index in range(3, 20):
            add(page, f"Heart {index + 1}")
        page.get_by_role("button", name="Edit heart 1", exact=True).click()
        page.get_by_label("Heart message").fill("Heart 1 <img src=x>")
        page.get_by_role("button", name="Save heart").click()
        add(page, "One too many")
        expect(page.locator("#heartError")).to_contain_text("20 hearts")
        page.get_by_label("Heart message").fill("")
        page.evaluate("""() => {
          Object.defineProperty(navigator, 'share', { configurable: true, value: async data => window.jarShare = data.url });
          window.open = () => ({ location: { set href(url) { window.jarWhatsApp = url; } } });
        }""")
        page.get_by_role("button", name="Share jar").click()
        expect(page.locator("#shareStatus")).to_have_text("Heart Jar shared.")
        latest = page.evaluate("window.jarShare")
        page.get_by_role("button", name="WhatsApp").click()
        expect(page.locator("#shareStatus")).to_contain_text("WhatsApp opened")
        assert page.evaluate("decodeURIComponent(window.jarWhatsApp)").endswith(latest)
        page.evaluate("""() => {
          Object.defineProperty(navigator, 'share', { value: undefined });
          navigator.clipboard.writeText = async () => { throw Error('blocked'); };
        }""")
        page.get_by_role("button", name="Share jar").click()
        expect(page.locator("#jarLink")).to_have_value(latest)
        context.close()
        context = browser.new_context()
        context.add_init_script("Object.defineProperty(window, 'localStorage', { get() { throw Error('blocked'); } });")
        page = context.new_page()
        page.goto(latest)
        page.get_by_role("button", name="Open Your Jar").click()
        page.get_by_role("button", name="Heart 1, unopened").click()
        expect(page.locator('[data-jar="storage"]')).to_contain_text("couldn’t save")
        expect(page.locator('[data-jar="note-text"]')).to_have_text("Heart 1 <img src=x>")
        assert page.locator('[data-jar="note-text"] img').count() == 0
        page.goto(base + "jar-view.html#j=invalid")
        expect(page.get_by_role("alert")).to_contain_text(re.compile("invalid"))
        expect(page.locator("#jarReturn")).to_be_hidden()
        print("PASS all six themes, limits, share transports and fallback, blocked storage and invalid links", flush=True)
        browser.close()
    server.shutdown()
