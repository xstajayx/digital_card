import {
  prepareDue,
  updatePrepared,
  readAssistant,
} from "../engine/card-assistant.js";
import { loadThemes, validateCard, cardContent } from "../engine/card-data.js";
import { createCardController } from "../engine/preview.js";
export async function checkGeneratedFit(raw, themes) {
  const card = validateCard(raw, themes),
    host = document.createElement("div"),
    frame = document.createElement("iframe");
  host.style.cssText =
    "position:absolute;left:-10000px;top:0;width:700px;pointer-events:none";
  host.setAttribute("aria-hidden", "true");
  frame.title = "Local draft text-fit check";
  frame.tabIndex = -1;
  host.append(frame);
  document.body.append(host);
  try {
    const controller = await createCardController(frame);
    controller.update(cardContent(card));
    for (const [width, height] of [
      [288, 480],
      [680, 714],
    ]) {
      frame.style.width = width + "px";
      frame.style.height = height + "px";
      await new Promise(requestAnimationFrame);
      if (!(await controller.checkFit())) return false;
    }
    return true;
  } finally {
    host.remove();
  }
}
export async function validatePrepared(entry, themes) {
  if (!entry.card || ["approved", "sent"].includes(entry.status)) return entry;
  try {
    const valid = await checkGeneratedFit(entry.card, themes);
    return updatePrepared(entry.id, entry.version, {
      status: valid ? "ready" : "draft",
      error: valid
        ? ""
        : "The message or greeting needs more room. Edit it; every word has been kept.",
    });
  } catch (e) {
    try {
      return updatePrepared(entry.id, entry.version, {
        status: "failed",
        error: e.message,
      });
    } catch {
      return entry;
    }
  }
}
export async function runLocalPreparation() {
  if (!readAssistant().settings.demo) return [];
  const themes = await loadThemes(),
    entries = prepareDue(themes),
    ready = [];
  for (const entry of entries) {
    if (entry.stale || entry.status === "sent" || entry.status === "approved")
      continue;
    ready.push(await validatePrepared(entry, themes));
  }
  return ready;
}
