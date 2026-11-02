import { createState } from "./state.js";
import { createUI } from "./ui.js";
import { loadThemes } from "../engine/card-data.js";
import { createCardController } from "../engine/preview.js";

async function init() {
  try {
    const [themes, preview] = await Promise.all([
      loadThemes(),
      createCardController(document.getElementById("cardPreview")),
    ]);
    const theme = themes[0];
    const state = createState({
      themes,
      theme,
      ...theme.defaults,
      stickerId: "pink-cake",
    });
    createUI({ state, preview });
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
