import { flowerProduct } from "../engine/flowers/catalogue.js";
import { renderFlowers } from "../engine/flowers/render.js";
import { encodeFlowerGift, newGiftId, GIFT_LIMITS } from "../engine/flowers/gift.js";
import { flowerPresentation, noteContent } from "./flower-presentation.js";
import { draftNavigation } from "./draft-navigation.js";
import { bindShareActions } from "./share-actions.js";

const $ = (id) => document.getElementById(id);
const form = $("flowerForm");
const dialog = $("flowerPreview");
const id = new URLSearchParams(location.search).get("flower");
const product = flowerProduct(id || "blush-rose");
let issued;
let disposePreview;

if (!product) {
  $("studioError").hidden = false;
  $("studio").hidden = true;
} else {
  $("productName").textContent = product.name;
  $("productDescription").textContent = product.description;
  renderFlowers($("studioArt"), product);
  const read = () => Object.fromEntries(new FormData(form));
  const warnForDraft = draftNavigation();
  function update() {
    const gift = read();
    warnForDraft(Object.values(gift).some(Boolean));
    for (const [part, limit] of Object.entries(GIFT_LIMITS)) {
      const invalid = gift[part].length > limit;
      form.elements[part].setCustomValidity(invalid ? `Use ${limit} characters or fewer.` : "");
      form.elements[part].setAttribute("aria-invalid", String(invalid));
      $(`${part}Error`).textContent = invalid ? `Use ${limit} characters or fewer.` : "";
    }
    $("messageCount").textContent = `${gift.message.length} / ${GIFT_LIMITS.message}`;
    noteContent($("studioNote"), gift);
    $("studioNote").hidden = !Object.values(gift).some(Boolean);
  }
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("input", () => {
    update();
    $("sendStatus").textContent = "";
    $("manualLink").hidden = true;
  });
  $("openPreview").addEventListener("click", () => {
    disposePreview?.();
    $("previewPresentation").querySelector("[data-status]").textContent = "";
    disposePreview = flowerPresentation($("previewPresentation"), product, read());
    dialog.showModal();
  });
  $("closePreview").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    disposePreview?.();
    $("openPreview").focus({ preventScroll: true });
  });
  bindShareActions({
    buttons: { native: $("shareFlower"), copy: $("copyFlower"), whatsapp: $("whatsAppFlower") },
    item: {
      name: "flower gift",
      title: "Flowers for you",
      text: "Someone sent you flowers from Silent Hello.",
      success: "Your flower gift was shared.",
    },
    status: $("sendStatus"),
    fallback: $("manualLink"),
    linkInput: $("flowerLink"),
    getUrl() {
      if (!form.reportValidity()) throw new Error("Check the highlighted fields before sharing.");
      const gift = read();
      const key = JSON.stringify(gift);
      if (issued?.key !== key) {
        const url = new URL("./rose-view.html", location.href);
        url.hash = `f=${encodeFlowerGift({ ...gift, productId: product.id, id: newGiftId() })}`;
        issued = { key, url: url.href };
      }
      return issued.url;
    },
  });
  update();
}
