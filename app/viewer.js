import { validateCard, loadThemes, cardContent } from "../engine/card-data.js";
import { decodeCard } from "../engine/share-codec.js";
import { createCardController } from "../engine/preview.js";
import { bindShareActions } from "./share-actions.js";
const $ = (id) => document.getElementById(id);
async function init() {
  try {
    const payload =
      new URLSearchParams(location.hash.slice(1)).get("c") ||
      new URLSearchParams(location.search).get("d");
    if (!payload) throw new Error("The card link is missing its message.");
    const [raw, themes] = await Promise.all([
      decodeCard(payload),
      loadThemes(),
    ]);
    const card = validateCard(raw, themes),
      content = cardContent(card);
    $("cardPresentation").hidden = false;
    const preview = await createCardController($("viewerFrame"));
    preview.update(content);
    $("fullMessageText").textContent =
      `${content.headline}\n\n${card.message}\n\n${card.from}`;
    await preview.checkFit();
    $("recipientSubtitle").textContent = card.to
      ? `A little something for ${card.to}.`
      : "Sent with love. Opened with a smile.";
    $("replayButton").onclick = () => preview.play();
    bindShareActions({
      buttons: {
        copy: $("copyButton"),
        native: $("shareButton"),
        whatsapp: $("whatsappButton"),
      },
      getUrl: async () => location.href,
      status: $("status"),
      fallback: $("shareFallback"),
      linkInput: $("shareUrl"),
    });
  } catch (error) {
    $("cardPresentation").hidden = true;
    $("cardError").hidden = false;
    $("recipientIntro").hidden = true;
    const known =
      /^(Invalid |This card |The card |Unsupported |Please open|Card data|The design)/.test(
        error.message,
      );
    $("errorReason").textContent = known
      ? error.message
      : "The link may be incomplete or contain damaged card data.";
  }
}
init();
