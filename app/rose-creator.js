import { bindShareActions } from "./share-actions.js";
import { roseImage, writeRoseNote } from "./rose-art.js";
import { encodeRoseGift, newRoseId, roseStage, ROSE_LIMITS } from "../engine/rose-gift.js";

const $ = (id) => document.getElementById(id);
const form = $("roseForm");
const dialog = $("rosePreview");
const controls = ["greeting", "message", "signature"];
let issued = null;

function readForm() {
  const fields = new FormData(form);
  return {
    greeting: fields.get("greeting"),
    message: fields.get("message"),
    signature: fields.get("signature"),
    mode: fields.get("mode"),
  };
}

function validate() {
  for (const field of controls) {
    const input = form.elements[field];
    const limit = ROSE_LIMITS[field];
    const error = input.value.length > limit ? `Use ${limit} characters or fewer.` : "";
    input.setCustomValidity(error);
    input.setAttribute("aria-invalid", String(!!error));
    $(`${field}Error`).textContent = error;
  }
  $("messageCount").textContent = `${form.elements.message.value.length} / ${ROSE_LIMITS.message}`;
}

function updatePreview() {
  const gift = readForm();
  const stage = roseStage(gift.mode, null, 0).stage;
  const art = $("draftArt");
  if (art.dataset.stage !== stage.id) {
    art.dataset.stage = stage.id;
    art.replaceChildren(roseImage(stage));
  }
  $("draftStage").textContent = stage.label;
  writeRoseNote($("draftNote"), gift);
}

form.addEventListener("input", () => {
  validate();
  updatePreview();
  $("sendStatus").textContent = "";
  $("manualLink").hidden = true;
});
form.addEventListener("submit", (event) => event.preventDefault());
$("openPreview").addEventListener("click", () => {
  const gift = readForm();
  const stage = roseStage(gift.mode, null, 0).stage;
  $("previewArt").replaceChildren(roseImage(stage));
  writeRoseNote($("previewNote"), gift);
  dialog.showModal();
});
$("closePreview").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => $("openPreview").focus({ preventScroll: true }));

bindShareActions({
  buttons: { native: $("shareRose"), copy: $("copyRose"), whatsapp: $("whatsAppRose") },
  item: {
    name: "rose",
    title: "A rose for you",
    text: "Someone sent you a rose from Silent Hello.",
    success: "Rose shared. A little joy is on its way!",
  },
  status: $("sendStatus"),
  fallback: $("manualLink"),
  linkInput: $("roseLink"),
  getUrl() {
    validate();
    if (!form.reportValidity()) throw new Error("Check the highlighted fields before sharing.");
    const gift = readForm();
    const key = JSON.stringify(gift);
    if (issued?.key !== key) {
      const url = new URL("./rose-view.html", location.href);
      url.hash = `r=${encodeRoseGift({ ...gift, id: newRoseId() })}`;
      issued = { key, url: url.href };
    }
    return issued.url;
  },
});
validate();
updatePreview();
