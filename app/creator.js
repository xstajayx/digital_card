import { defaultPhysical } from "../engine/physical-schema.js";
import { defaultOpening } from "../engine/openings/config.js";
// Sender-only layout adapter. The live iframe stays mounted through preview changes.
export function bindCreator(state, preview) {
  const $ = (id) => document.getElementById(id);
  const make = (tag, text, cls) => {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  };
  const style = document.querySelector('[data-panel="4"]');
  const more = style.querySelector(".extras-content");
  const cover = $("coverFields");
  for (const id of ["physical-coverGreeting", "physical-coverArt"])
    cover.append($(id).closest("label"));
  $("physical-coverGreeting")
    .closest("label")
    .querySelector("span").textContent = "Front-cover greeting";
  $("physical-coverGreeting").placeholder = state.get().theme.greeting;
  const nameLabel = make("label", null, "toggle"),
    nameToggle = make("input");
  nameToggle.type = "checkbox";
  nameToggle.id = "coverNameToggle";
  nameLabel.append(
    nameToggle,
    document.createTextNode("Add a name to the cover"),
  );
  cover.append(nameLabel);
  const nameField = make("label", null, "field"),
    nameInput = make("input");
  nameInput.id = "coverNameInput";
  nameInput.maxLength = 120;
  nameField.append(make("span", "Cover name"), nameInput);
  cover.append(nameField);
  const setPhysical = (patch) => {
    const s = state.get();
    if (s.physicalConfig)
      state.set({ physicalConfig: { ...s.physicalConfig, ...patch } });
  };
  let editingName = null;
  nameToggle.onchange = () => {
    editingName = nameToggle.checked;
    setPhysical({
      coverName: nameToggle.checked ? nameInput.value || state.get().to : "",
    });
  };
  nameInput.oninput = () => setPhysical({ coverName: nameInput.value });
  const legacyNotice = make("div", null, "legacy-cover-notice");
  legacyNotice.append(
    make("p", "This saved card uses its original presentation."),
  );
  const convert = make("button", "Use a folded card", "button");
  convert.type = "button";
  convert.onclick = () =>
    state.set({
      physicalConfig: { ...defaultPhysical(), coverName: "" },
      openingConfig: { ...defaultOpening(), tone: "theme" },
    });
  legacyNotice.append(convert);
  cover.prepend(legacyNotice);
  // Preserve legacy controls, but keep presentation choices out of the normal journey.
  const physicalBox = $("physicalToggle").closest("fieldset"),
    openingBox = $("opening-type").closest("fieldset");
  physicalBox.querySelector("legend").textContent = "Paper and presentation";
  physicalBox.querySelector("p.helper")?.remove();
  more.append(
    $("textSize").closest("label"),
    style.querySelector(".colour-fields"),
    $("resetColorsButton"),
    physicalBox,
    openingBox,
  );
  more.append($("fontSelect").closest("label"));
  $("fontSelect").closest("label").hidden = true;
  more.append(style.querySelector(".reset-row"));
  // Preview stages belong beside the preview, rather than amongst form settings.
  const stageButtons = physicalBox.querySelector(".recipient-actions");
  stageButtons.classList.add("preview-stages");
  stageButtons.setAttribute("aria-label", "Preview stage");
  document.querySelector(".preview-heading").after(stageButtons);
  const effectsBox = make("fieldset", null, "picker-section");
  effectsBox.append(make("legend", "Effects"));
  const effects = $("opening-effect").closest("label");
  effectsBox.append(effects);
  style.querySelector(".extras").before(effectsBox);
  effects.querySelector("span").textContent = "Celebration";
  const none = make("option", "None");
  none.value = "fade";
  $("opening-effect").querySelector('[value="fade"]').replaceWith(none);
  $("opening-effect").addEventListener("change", () =>
    setPhysical({ effects: $("opening-effect").value !== "fade" }),
  );
  const photoBox = document.querySelector(".photo-picker");
  photoBox.querySelector("legend").textContent = "Photographs";
  photoBox.querySelector(":scope > .helper").textContent =
    "Photos stay on this device. Local preview only.";
  const photoDrafts = make("fieldset", null, "picker-section");
  photoDrafts.append(
    make("legend", "Photo drafts"),
    $("savePhotoDraft").parentElement,
    photoBox.querySelector(":scope > .helper:last-child"),
  );
  more.append(photoDrafts);
  // Six real bundled fonts. Native buttons provide keyboard activation and pressed state.
  const fonts = make("fieldset", null, "picker-section");
  fonts.append(make("legend", "Text style"));
  const fontGrid = make("div", null, "font-grid");
  fontGrid.setAttribute("role", "group");
  fontGrid.setAttribute("aria-label", "Text style");
  fonts.append(fontGrid);
  for (const option of $("fontSelect").options) {
    const b = make("button", null, "font-choice");
    b.type = "button";
    b.dataset.font = option.value;
    b.style.fontFamily = `"${{ playfair: "Playfair Display" }[option.value] || option.text.split(" ·")[0]}"`;
    b.append(
      make("span", "With love"),
      make("small", option.text.split(" ·")[0]),
    );
    b.onclick = () => {
      $("fontSelect").value = option.value;
      $("fontSelect").dispatchEvent(new Event("change"));
    };
    fontGrid.append(b);
  }
  style.prepend(fonts);
  style.prepend($("personaliseTitle"));
  // Compact local draft controls retain their existing save/restore/delete behavior.
  const draftTools = document.querySelector(".draft-tools"),
    draftDetails = make("details", null, "draft-menu");
  draftDetails.append(make("summary", "Drafts"), draftTools);
  document.querySelector(".steps").after(draftDetails);
  state.subscribe((s) => {
    const cfg = s.physicalConfig;
    legacyNotice.hidden = !!cfg;
    for (const id of ["physical-coverGreeting", "physical-coverArt"])
      $(id).disabled = !cfg;
    const enabled =
      cfg &&
      (editingName ??
        (Object.hasOwn(cfg, "coverName") ? !!cfg.coverName : !!s.to));
    nameToggle.checked = !!enabled;
    nameField.hidden = !enabled;
    nameToggle.disabled = !cfg;
    nameInput.disabled = !cfg;
    const value = cfg && Object.hasOwn(cfg, "coverName") ? cfg.coverName : s.to;
    if (nameInput.value !== value) nameInput.value = value || "";
    $("physical-coverGreeting").placeholder = s.theme.greeting;
    fontGrid
      .querySelectorAll("button")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.font === (cfg?.handwriting || s.fontId)),
        ),
      );
    stageButtons.hidden = !cfg;
  });
  const dialog = $("creatorPreviewDialog");
  const close = make("button", "Back to editing", "button");
  close.type = "button";
  close.id = "closeCreatorPreview";
  dialog.prepend(close);
  let opener = null,
    scroll = 0;
  $("previewJump").onclick = () => {
    opener = document.activeElement;
    scroll = window.scrollY;
    dialog.close();
    dialog.removeAttribute("role");
    dialog.setAttribute("aria-label", "Preview your card");
    dialog.showModal();
    document.body.classList.add("preview-is-open");
    preview.play();
    requestAnimationFrame(() => preview.checkFit().catch(() => {}));
  };
  close.onclick = () => dialog.close();
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    dialog.setAttribute("open", "");
    dialog.setAttribute("role", "presentation");
    dialog.removeAttribute("aria-label");
    document.body.classList.remove("preview-is-open");
    window.scrollTo({ top: scroll, behavior: "instant" });
    opener?.focus({ preventScroll: true });
    requestAnimationFrame(() => preview.checkFit().catch(() => {}));
  });
  const editPreview = make(
    "button",
    "Preview card",
    "text-button editor-preview-action",
  );
  editPreview.type = "button";
  editPreview.id = "editingPreview";
  editPreview.onclick = () => $("previewJump").click();
  document.querySelector(".step-footer").append(editPreview);
  const finalPreview = make("button", "Preview entire card", "button");
  finalPreview.type = "button";
  finalPreview.onclick = () => $("previewJump").click();
  $("cardSummary").before(finalPreview);
}
