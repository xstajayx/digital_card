import { bindCreator } from "./creator.js";
import { defaultPhysical } from "../engine/physical-schema.js";
import { defaultOpening } from "../engine/openings/config.js";
import "./responsive.js";
import { bindPreparedEditor } from "./prepared-editor.js";
import { bindPhotoEditor } from "./photo-card.js";
import { bindPhysicalPicker } from "./physical-picker.js";
import { bindOpeningPicker } from "./opening-picker.js";
import { createState } from "./state.js";
import { createUI } from "./ui.js";
import { loadThemes } from "../engine/card-data.js";
import { createCardController } from "../engine/preview.js";

import { bindDrafts } from "./drafts.js";

async function init() {
  try {
    const [themes, preview] = await Promise.all([
      loadThemes(),
      createCardController(document.getElementById("cardPreview")),
    ]);
    const selected = new URLSearchParams(location.search).get("design");
    const theme = themes.find((t) => t.id === selected) || themes[0];
    const state = createState({
      themes,
      theme,
      ...theme.defaults,
      to: "",
      from: "",
      physicalConfig: { ...defaultPhysical(), coverName: "" },
      openingConfig: { ...defaultOpening(), tone: "theme" },
      stickerId: theme.id === "birthday-balloons" ? "pink-cake" : "",
      fontId: theme.defaultFontId || "fredoka",
    });
    const photos = bindPhotoEditor(state, preview);
    createUI({ state, preview });
    bindDrafts(state, photos);
    bindOpeningPicker(state);
    bindPhysicalPicker(state, preview);
    bindPreparedEditor(state, preview, photos);
    bindCreator(state, preview);
  } catch (error) {
    document.getElementById("exportStatus").textContent = error.message;
    const notice = document.createElement("p");
    notice.className = "warning";
    notice.setAttribute("role", "alert");
    notice.textContent = error.message;
    document.querySelector(".step-content").prepend(notice);
  }
}
init();
