import { readOccasions } from "../engine/occasions.js";
import {
  readAssistant,
  reconcile,
  updatePrepared,
  toRaw,
} from "../engine/card-assistant.js";
import { validateCard, cardContent } from "../engine/card-data.js";
const bindings = new WeakMap();
export function assertPreparedShareable(state) {
  const id = bindings.get(state);
  if (!id) return;
  const entry = reconcile(readAssistant(), readOccasions()).cards.find(
    (c) => c.id === id,
  );
  if (!entry || entry.hidden || entry.stale || entry.status !== "approved")
    throw new Error(
      "Save prepared changes, then review and approve this card in My Prepared Cards before sharing.",
    );
  const s = state.get(),
    raw = toRaw(
      validateCard(
        {
          ...cardContent(s),
          v: s.physicalConfig ? 5 : s.openingConfig ? 4 : 3,
        },
        s.themes,
      ),
    );
  if (
    JSON.stringify(raw) !==
    JSON.stringify(toRaw(validateCard(entry.card, s.themes)))
  )
    throw new Error(
      "This edited card differs from the approved draft. Save, review and approve your changes first.",
    );
}
export function bindPreparedEditor(state, preview, photos) {
  const id = new URLSearchParams(location.search).get("prepared");
  if (!id) return;
  const bar = document.createElement("section");
  bar.className = "prepared-editor-bar";
  bar.setAttribute("aria-label", "Prepared card editing");
  const note = document.createElement("p");
  note.setAttribute("role", "status");
  bar.append(note);
  const hero = document.querySelector(".studio-hero");
  if (hero) hero.after(bar);
  else document.querySelector("main").prepend(bar);
  try {
    const entry = reconcile(readAssistant(), readOccasions()).cards.find(
      (c) => c.id === id,
    );
    if (!entry || entry.hidden || ["sent", "cancelled"].includes(entry.status))
      throw new Error(
        "This prepared card is unavailable or already marked sent. Your regular editor is still available.",
      );
    bindings.set(state, id);
    const card = validateCard(entry.card, state.get().themes);
    photos?.illustrated();
    state.set({
      ...card,
      birthdayNumberEnabled: !!card.birthdayNumber,
      giftEnabled: !!card.giftUrl,
      fontChosen: true,
    });
    let version = entry.version;
    const save = document.createElement("button");
    save.type = "button";
    save.className = "button primary";
    save.textContent = "Save prepared changes";
    save.onclick = async () => {
      save.disabled = true;
      try {
        if (photos?.active)
          throw new Error(
            "Prepared assistant cards use illustrations. Save this photo separately with Save photo draft; photo sharing remains local-only.",
          );
        const raw = toRaw(
          validateCard(
            {
              ...cardContent(state.get()),
              v: state.get().physicalConfig
                ? 5
                : state.get().openingConfig
                  ? 4
                  : 3,
            },
            state.get().themes,
          ),
        );
        let next = updatePrepared(id, version, { card: raw });
        version = next.version;
        const valid = await preview.checkFit();
        next = updatePrepared(id, version, {
          status: valid ? "ready" : "draft",
          error: valid
            ? ""
            : "Text needs more room. All words were saved; shorten the message before approval.",
        });
        version = next.version;
        note.textContent = valid
          ? "Prepared changes saved. Return to My Prepared Cards to review and approve."
          : next.error;
      } catch (e) {
        note.textContent = e.message;
      } finally {
        save.disabled = false;
      }
    };
    const back = document.createElement("a");
    back.href = "./prepared.html";
    back.className = "button";
    back.textContent = "Back to My Prepared Cards";
    bar.prepend(save, back);
    note.textContent =
      "You are editing a prepared local card. Save prepared changes here; the usual local and photo drafts remain separate.";
    document.querySelector('.steps [data-step="5"]').click();
  } catch (e) {
    note.textContent = e.message;
  }
}
