"""Local real FastAPI + SQL database + filesystem adapter; NOT live Railway/R2.
Run with the backend dependency directory on PYTHONPATH, alongside Playwright.
"""

import os
import shutil
import socket
import sys
import tempfile
import threading
import time
from dataclasses import replace
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import uvicorn
from playwright.sync_api import expect, sync_playwright
from sqlalchemy import func, select

from backend.silent_hello.app import create_app
from backend.silent_hello.cleanup import cleanup
from backend.silent_hello.config import Settings
from backend.silent_hello.database import database
from backend.silent_hello.models import Base, Card, Media, Owner
from backend.silent_hello.service import digest, opaque, uid
from backend.silent_hello.storage import LocalStorage

ROOT = Path(__file__).resolve().parents[1]
ART = (
    Path(os.environ.get("CARD_ARTIFACT_DIR", "/workspace/hosted-validation")) / "hosted"
)
ART.mkdir(parents=True, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    api = ""

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/app/hosted-config.js":
            content = (
                (ROOT / "app/hosted-config.js")
                .read_text()
                .replace(
                    'export const HOSTED_API = "";',
                    f'export const HOSTED_API = "{self.api}";',
                )
                .encode()
            )
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        else:
            super().do_GET()

    def copyfile(self, source, out):
        try:
            super().copyfile(source, out)
        except (BrokenPipeError, ConnectionResetError):
            pass


def run():
    with tempfile.TemporaryDirectory(prefix="silent-hello-hosted-") as temp:
        static = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=static.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{static.server_port}/"
        url = os.environ.get(
            "SH_BROWSER_DATABASE_URL", "sqlite+pysqlite:///" + temp + "/browser.sqlite"
        )
        engine, sessions = database(url)
        if not url.startswith("sqlite") and not url.rsplit("/", 1)[-1].endswith(
            "_browser_test"
        ):
            raise RuntimeError("Browser database must be disposable *_browser_test")
        Base.metadata.drop_all(engine)
        cfg = replace(
            Settings(),
            database_url=url,
            uploads_enabled=True,
            frontend_url=base,
            cors_origins=(base.rstrip("/"),),
            write_rate=1000,
            upload_rate=1000,
            ip_rate=10000,
        )
        now = [int(time.time())]
        store = LocalStorage(temp + "/private-media")
        app = create_app(cfg, store, engine, clock=lambda: now[0])
        key = opaque()
        with app.state.sessions.begin() as db:
            db.add(Owner(id=uid(), token_hash=digest(key), created_at=now[0]))
        sock = socket.socket()
        sock.bind(("127.0.0.1", 0))
        api = f"http://127.0.0.1:{sock.getsockname()[1]}"
        Handler.api = api
        server = uvicorn.Server(
            uvicorn.Config(
                app, log_level="critical", access_log=False, proxy_headers=False
            )
        )
        thread = threading.Thread(
            target=lambda: server.run(sockets=[sock]), daemon=True
        )
        thread.start()
        for _ in range(100):
            if server.started:
                break
            time.sleep(0.05)
        assert server.started
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    executable_path=os.environ.get("CARD_CHROMIUM_PATH")
                    or shutil.which("chromium"),
                    args=["--no-sandbox"],
                )
                ctx = browser.new_context(
                    viewport={"width": 390, "height": 844},
                    permissions=["clipboard-read", "clipboard-write"],
                    reduced_motion="reduce",
                )
                sender = ctx.new_page()
                errors = []
                sender.on("pageerror", lambda e: errors.append(str(e)))
                sender.goto(base + "studio.html?design=birthday-balloons")
                expect(sender.locator("#publishHostedCard")).to_be_attached()

                def step(n):
                    sender.locator(f'.steps [data-step="{n}"]').click()

                step(3)
                sender.locator("#toInput").fill("Maya")
                sender.locator("#messageInput").fill(
                    "A birthday full of little wonders.\n\nA favourite memory, just for you."
                )
                sender.locator("#fromInput").fill("With love, Alex")
                step(4)
                sender.locator("#photo-type").select_option("memory")
                sender.locator("#photo-layout").select_option("inside")
                sender.locator("#localPhotoUpload").set_input_files(
                    str(ROOT / "tests/fixtures/photo-portrait.jpg")
                )
                expect(sender.locator("#photoStatus")).to_contain_text(
                    "preview ready", timeout=20000
                )
                step(5)
                sender.locator("#hostedOwnerKey").fill(key)
                sender.locator("#publishHostedCard").click()
                expect(sender.locator("#hostedStatus")).to_contain_text("Confirm")
                sender.locator("#hostedConsent").check()
                sender.locator("#publishHostedCard").click()
                expect(sender.locator("#hostedStatus")).to_contain_text(
                    "Hosted link ready", timeout=45000
                )
                sender.locator("#shareLinkButton").click()
                expect(sender.locator("#exportStatus")).to_contain_text("Link copied")
                link = sender.evaluate("navigator.clipboard.readText()")
                assert "?s=" in link and len(link) < 150 and "#c=" not in link
                sender.locator("#publishHostedCard").click()
                expect(sender.locator("#hostedStatus")).to_contain_text(
                    "Hosted link ready", timeout=45000
                )
                with app.state.sessions() as db:
                    assert db.scalar(select(func.count()).select_from(Card)) == 1
                    assert db.scalar(select(func.count()).select_from(Media)) == 1
                sender.screenshot(
                    path=str(ART / "published-editor-390.png"), full_page=True
                )
                # Separate browser contexts have no owner key, IndexedDB or local source blob.
                for width, height in [(320, 800), (390, 844), (768, 1024), (1440, 900)]:
                    recipient = browser.new_context(
                        viewport={"width": width, "height": height},
                        reduced_motion="reduce",
                        has_touch=width < 500,
                    )
                    page = recipient.new_page()
                    page.on("pageerror", lambda e: errors.append(str(e)))
                    requests = []
                    page.on("request", lambda r, requests=requests: requests.append(r))
                    page.goto(link)
                    f = page.frame_locator("#viewerFrame")
                    root = f.locator("#cardRoot")
                    expect(root).to_have_class(
                        __import__("re").compile("local-photo-card")
                    )
                    expect(page.locator("#cardError")).to_be_hidden()
                    expect(f.locator(".paper-envelope-tag")).to_have_text("For Maya")
                    f.locator(".paper-book").evaluate("e=>window.sameHostedBook=e")
                    page.screenshot(path=str(ART / f"envelope-{width}.png"))
                    page.locator("#openingAction button").click()
                    expect(root).to_have_attribute("data-physical-state", "cover")
                    page.screenshot(path=str(ART / f"cover-{width}.png"))
                    page.locator("#openingAction button").click()
                    expect(root).to_have_attribute("data-physical-state", "inside")
                    expect(f.locator("#message")).to_contain_text("favourite memory")
                    if page.locator("#viewerFrame").evaluate("e=>e.clientWidth<=500"):
                        page.get_by_role("button", name="Photo", exact=True).click()
                        expect(f.locator(".local-card-photo")).to_be_visible()
                        page.screenshot(path=str(ART / f"inside-photo-{width}.png"))
                        page.get_by_role("button", name="Message", exact=True).click()
                    else:
                        expect(f.locator(".local-card-photo")).to_be_visible()
                        a = f.locator(".local-photo-zone").bounding_box()
                        b = f.locator("#message").bounding_box()
                        assert a["x"] + a["width"] <= b["x"] + 1
                    assert f.locator(".local-card-photo").evaluate(
                        "e=>e.complete&&e.naturalWidth>0"
                    )
                    assert f.locator(".paper-book").evaluate(
                        "e=>e===window.sameHostedBook"
                    )
                    page.screenshot(path=str(ART / f"inside-message-{width}.png"))
                    photo_source = f.locator(".local-card-photo").get_attribute("src")
                    page.locator("#openingAction button").click()
                    expect(root).to_have_attribute("data-physical-state", "cover")
                    page.locator("#openingAction button").click()
                    expect(root).to_have_attribute("data-physical-state", "inside")
                    assert (
                        f.locator(".local-card-photo").get_attribute("src")
                        == photo_source
                    )
                    assert page.locator("#viewerFrame").evaluate(
                        "async e=>e.contentWindow.checkFit()"
                    )
                    page.locator("#replayButton").click()
                    expect(root).to_have_attribute("data-physical-state", "envelope")
                    assert (
                        page.locator(
                            ".steps,#hostedPublishPanel,input[type=file]"
                        ).count()
                        == 0
                    )
                    assert not any(
                        "authorization" in r.headers
                        for r in requests
                        if r.url.startswith(api)
                    )
                    assert page.evaluate(
                        "localStorage.length===0&&sessionStorage.length===0"
                    )
                    print(
                        f"PASS fresh hosted recipient {width}px: private photo, unchanged opening/close/reopen/replay, fitted message, no owner credentials",
                        flush=True,
                    )
                    recipient.close()
                # Editing never silently shares the previously published photograph/message.
                step(3)
                sender.locator("#messageInput").fill("A changed personal message.")
                step(5)
                sender.locator("#shareLinkButton").click()
                expect(sender.locator("#exportStatus")).to_contain_text(
                    "Create a hosted link"
                )
                # A new message creates a new immutable card but reuses the same owned photo.
                sender.locator("#publishHostedCard").click()
                expect(sender.locator("#hostedStatus")).to_contain_text(
                    "Hosted link ready", timeout=45000
                )
                sender.locator("#shareLinkButton").click()
                expect(sender.locator("#exportStatus")).to_contain_text("Link copied")
                assert sender.evaluate("navigator.clipboard.readText()") != link
                with app.state.sessions() as db:
                    assert db.scalar(select(func.count()).select_from(Card)) == 2
                    assert db.scalar(select(func.count()).select_from(Media)) == 1
                # The static legacy path does not call the unavailable hosted API.
                legacy = sender.evaluate(
                    """async()=>{const {encodeCard}=await import('./engine/share-codec.js');return encodeCard({v:3,themeId:'birthday-balloons',to:'Maya',message:'Legacy works offline',from:'Alex',fontId:'nunito',textSize:18,watermark:true})}"""
                )
                fallback = browser.new_page()
                api_calls = []
                fallback.on(
                    "request",
                    lambda r: (
                        api_calls.append(r.url) if r.url.startswith(api) else None
                    ),
                )
                fallback.route(api + "/**", lambda r: r.abort())
                fallback.goto(base + "view.html#c=" + legacy)
                expect(
                    fallback.frame_locator("#viewerFrame").locator("#message")
                ).to_have_text("Legacy works offline")
                assert not api_calls
                fallback.goto(link)
                expect(fallback.locator("#errorReason")).to_contain_text(
                    "could not be loaded"
                )
                fallback.close()
                # Broken private objects are reported, never replaced with a misleading empty card.
                with app.state.sessions() as db:
                    media = db.scalar(select(Media))
                    object_key = media.object_key
                data = store.get(object_key)
                store.delete(object_key)
                missing = browser.new_page()
                missing.goto(link)
                expect(missing.locator("#errorReason")).to_contain_text(
                    "could not be loaded"
                )
                missing.close()
                store.put(object_key, data)
                sender.on("dialog", lambda d: d.accept())
                sender.locator("#listHostedCards").click()
                expect(sender.locator("#ownedHostedCards button")).to_have_count(2)
                for remaining in [1, 0]:
                    sender.locator("#ownedHostedCards button:enabled").first.click()
                    expect(
                        sender.locator("#ownedHostedCards button:enabled")
                    ).to_have_count(remaining)
                expect(sender.locator("#hostedStatus")).to_contain_text("removed")
                revoked = browser.new_page()
                revoked.goto(link)
                expect(revoked.locator("#errorReason")).to_contain_text(
                    "expired or been removed"
                )
                revoked.close()
                cleanup(app.state.sessions, store, cfg, now[0])
                assert not list(Path(temp + "/private-media").rglob("*.webp"))
                assert not errors, errors
                print(
                    "PASS local FastAPI + SQL + filesystem: explicit upload/consent, immutable idempotent short link, fresh mobile/desktop recipients, actual photo/book/open/close/replay, no owner credentials at recipient, stale edit gate and shared-photo reuse, backend-outage legacy fallback, missing asset, ownership deletion and object cleanup",
                    flush=True,
                )
                browser.close()
        finally:
            server.should_exit = True
            thread.join(timeout=10)
            static.shutdown()
            static.server_close()


if __name__ == "__main__":
    run()
