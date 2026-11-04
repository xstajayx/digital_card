import { hostedRequest, hostedToken } from "./hosted-client.js";
import { attachHostedPhoto } from "./hosted-photo-view.js";
import { validateCard, loadThemes, cardContent } from "../engine/card-data.js";
import { decodeCard } from "../engine/share-codec.js";
import { createCardController } from "../engine/preview.js";
const $ = (id) => document.getElementById(id);
async function init() {
  try {
    const payload =
      new URLSearchParams(location.hash.slice(1)).get("c") ||
      new URLSearchParams(location.search).get("d");
    const hosted = new URLSearchParams(location.search).get("s");
    if (!payload && !hosted) throw new Error("The card link is missing its message.");
    if (!payload && hosted && !hostedToken(hosted)) throw new Error("This card link is invalid.");
    const [raw, themes] = await Promise.all([
      payload ? decodeCard(payload) : hostedRequest("/v1/shared/" + hosted),
      loadThemes(),
    ]);
    const hostedDocument = payload ? null : raw;
    if (hostedDocument && (hostedDocument.version !== 1 || !hostedDocument.card || !hostedDocument.photo)) throw new Error("This card document is invalid.");
    const card = validateCard(hostedDocument ? hostedDocument.card : raw, themes),
      content = cardContent(card);
    $("cardPresentation").hidden = false;
    const preview = await createCardController($("viewerFrame"));
    preview.update(content);
    $("fullMessageText").textContent =
      `${content.headline}\n\n${card.message}\n\n${card.from}`;
    $("fullMessage").hidden = false;
    await preview.checkFit();
    if (hostedDocument) {
      const photo = await hostedRequest("/v1/shared/" + hosted + "/photo", {image:true});
      await attachHostedPhoto($("viewerFrame"), hostedDocument.photo, photo);
      await preview.checkFit();
    }
    const doc = $("viewerFrame").contentDocument;
    const root = doc.getElementById("cardRoot");
    // Move the actual engine button, preserving its controller and focus handoff.
    const action = doc.querySelector(content.physicalConfig
      ? ".paper-action" : ".interactive-opening button:not(.opening-skip)");
    if (action && (content.physicalConfig || root.dataset.openingState === "ready")) {
      action.className = "button primary";
      $("openingAction").append(action);
    }
    const wrapping = doc.querySelector(".opening-object");
    if (!content.physicalConfig && wrapping && action) {
      wrapping.setAttribute("role", "button");
      wrapping.setAttribute("aria-label", "Open your card");
      wrapping.tabIndex = 0;
      wrapping.onclick = () => action.click();
      wrapping.onkeydown = (event) => {
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          action.click();
        }
      };
    }
    const style = doc.createElement("style");
    style.textContent = `.paper-read { display:none !important; }
      .interactive-opening > p { display:none; }
      .paper-skip:not(:focus-visible), .opening-skip:not(:focus-visible) { opacity:0; }
      .paper-skip:hover, .opening-skip:hover,
      [data-physical-state="unsealing"] .paper-skip,
      [data-physical-state="extracting"] .paper-skip,
      [data-physical-state="unfolding"] .paper-skip,
      [data-opening-state="opening"] .opening-skip { opacity:1; }`;
    doc.head.append(style);
    let opened = false;
    function sync() {
      const state = root.dataset.physicalState;
      const legacy = root.dataset.openingState;
      if (state === "inside" || (!content.physicalConfig && ["idle", "complete"].includes(legacy))) opened = true;
      $("replayButton").hidden = !opened;
      if (action && action.ownerDocument === document) {
        action.hidden = !content.physicalConfig && ["idle", "complete", "revealed"].includes(legacy);
        const label = content.physicalConfig
          ? state === "inside" || state === "closing" ? "Close card"
            : ["cover", "unfolding"].includes(state) ? "Open your card" : "Open your envelope"
          : content.openingConfig?.type === "envelope" || root.querySelector('[data-type="envelope"]') ? "Open your envelope" : "Open your card";
        if (action.textContent !== label) action.textContent = label;
      }
    }
    new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-physical-state", "data-opening-state"] });
    if (action) new MutationObserver(sync).observe(action, { childList: true });
    sync();
    $("replayButton").onclick = () => { preview.play(); sync(); };

  } catch (error) {
    const hostedError = new URLSearchParams(location.search).has("s");
    $("cardPresentation").hidden = true;
    $("cardError").hidden = false;
    const known =
      /^(Invalid |This card |The card |Unsupported |Please open|Card data|The design)/.test(
        error.message,
      );
    $("errorReason").textContent = hostedError
      ? (/unavailable, expired or removed/.test(error.message) ? "This hosted card has expired or been removed." : "This hosted card or its photo could not be loaded. Please try again later, or ask the sender for help.")
      : known ? error.message
      : "The link may be incomplete or contain damaged card data.";
  }
}
init();

window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.source !== $("viewerFrame").contentWindow || event.data?.type !== "card-fit") return;
  $("fitStatus").textContent = event.data.valid === true ? "" : "Every word is preserved in Read comfortably below.";
});
