import { validateCard, loadThemes, greetingFor } from "../engine/card-data.js";
import { createCardController } from "../engine/preview.js";
const status = document.getElementById("status");
async function init() {
  try {
    const d = new URLSearchParams(location.search).get("d");
    if (!d || d.length > 40000 || !/^[A-Za-z0-9_-]+$/.test(d))
      throw new Error("Invalid or missing card data.");
    const b64 = d.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(
      atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)),
      (c) => c.charCodeAt(0),
    );
    const card = validateCard(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
      await loadThemes(),
    );
    const preview = await createCardController(
      document.getElementById("viewerFrame"),
    );
    preview.setTheme(card.theme);
    preview.setContent({
      ...card,
      recipient: card.to || "Friend",
      headline: greetingFor(
        card.theme,
        card.to,
        !!card.birthdayNumber,
        card.birthdayNumber,
      ),
    });
    preview.setWatermark(card.watermark);
    document.getElementById("replayButton").onclick = () => preview.play();
    document.getElementById("copyButton").onclick = async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        status.textContent = "Link copied!";
      } catch {
        status.textContent = "Copy this page address from your browser.";
      }
    };
    document.getElementById("shareButton").onclick = () =>
      window.open(
        `https://wa.me/?text=${encodeURIComponent("You’ve got a card 🎉 " + location.href)}`,
        "_blank",
        "noopener,noreferrer",
      );
  } catch (err) {
    status.textContent = err.message;
  }
}
init();
