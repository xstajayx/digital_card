import { validateCard } from "../engine/card-data.js";
const KEY = "silent-hello-draft-v1";
export function bindDrafts(state) {
  const bar = document.createElement("div");
  bar.className = "draft-tools";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  const make = (label, handler) => {
    const b = document.createElement("button");
    b.className = "button small";
    b.type = "button";
    b.textContent = label;
    b.onclick = handler;
    bar.append(b);
    return b;
  };
  make("Save draft", () => {
    try {
      const s = state.get();
      const { themes, theme, ...content } = s;
      localStorage.setItem(
        KEY,
        JSON.stringify({
          ...content,
          v: s.physicalConfig ? 5 : s.openingConfig ? 4 : 3,
          themeId: theme.id,
        }),
      );
      status.textContent =
        "Draft saved on this browser. Anyone using this browser may access it.";
    } catch {
      status.textContent =
        "Browser storage unavailable or full. Your current card is still editable.";
    }
  });
  make("Restore draft", () => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      const card = validateCard(raw, state.get().themes);
      state.set({
        ...card,
        openingConfig: card.openingConfig || null,
        physicalConfig: card.physicalConfig || null,
        birthdayNumberEnabled: !!card.birthdayNumber,
        giftEnabled: raw.giftEnabled === true && !!card.giftUrl,
        fontChosen: true,
      });
      status.textContent = "Local draft restored.";
    } catch {
      status.textContent =
        "No usable local draft found. Your current card was kept.";
    }
  });
  make("Delete draft", () => {
    try {
      localStorage.removeItem(KEY);
      status.textContent = "Saved draft deleted. Your current card is kept.";
    } catch {
      status.textContent = "Browser storage is unavailable.";
    }
  });
  bar.append(status);
  document.querySelector(".steps").after(bar);
}
