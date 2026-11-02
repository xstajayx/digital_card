import { defaultOpening, EFFECTS, TONES } from "../engine/openings/config.js";
export function bindOpeningPicker(state) {
  const box = document.createElement("fieldset");
  box.className = "picker-section";
  const legend = document.createElement("legend");
  legend.textContent = "Their opening moment";
  box.append(legend);
  const controls = {};
  for (const [key, label, options] of [
    [
      "type",
      "Opening",
      [
        ["theme", "Design default"],
        ["none", "Straight to the card"],
        ["envelope", "Luxury envelope"],
        ["gift-box", "Wrapped gift"],
      ],
    ],
    [
      "tone",
      "Wrapping colours",
      Object.keys(TONES).map((v) => [v, v === "theme" ? "Match the card" : v]),
    ],
    [
      "wrap",
      "Gift wrapping",
      [
        ["plain", "Plain"],
        ["striped", "Stripes"],
        ["dots", "Polka dots"],
      ],
    ],
    [
      "effect",
      "Celebration",
      EFFECTS.map((v) => [v, v === "theme" ? "Design default" : v]),
    ],
  ]) {
    const field = document.createElement("label");
    field.className = "field";
    const title = document.createElement("span");
    title.textContent = label;
    const select = document.createElement("select");
    select.id = "opening-" + key;
    for (const [value, text] of options) {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = text;
      select.append(o);
    }
    field.append(title, select);
    box.append(field);
    controls[key] = select;
    select.onchange = () => {
      if (key === "type" && select.value === "theme") {
        state.set({ openingConfig: null });
        return;
      }
      const config = state.get().openingConfig || defaultOpening();
      state.set({ openingConfig: { ...config, [key]: select.value } });
    };
  }
  const seal = document.createElement("label");
  seal.className = "toggle";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = "opening-seal";
  seal.append(checkbox, document.createTextNode("Wax seal on envelope"));
  box.append(seal);
  checkbox.onchange = () =>
    state.set({
      openingConfig: {
        ...(state.get().openingConfig || defaultOpening()),
        seal: checkbox.checked,
      },
    });
  const hint = document.createElement("p");
  hint.className = "helper";
  hint.textContent =
    "Replay shows the complete opening. Your choice stays with your card when you share or save a draft.";
  box.append(hint);
  document.querySelector('[data-panel="4"] .extras').before(box);
  state.subscribe((s) => {
    const config = s.openingConfig;
    controls.type.value = config?.type || "theme";
    for (const key of ["tone", "wrap", "effect"]) {
      controls[key].value = config?.[key] || defaultOpening()[key];
      controls[key].disabled = !config;
    }
    checkbox.checked = config?.seal ?? true;
    checkbox.disabled = !config;
  });
}
