import { defaultOpening, EFFECTS, TONES } from "../engine/openings/config.js";
export function bindOpeningPicker(state) {
  const box = document.createElement("fieldset");
  box.className = "picker-section";
  const legend = document.createElement("legend");
  legend.textContent = "Their opening moment";
  box.append(legend);
  const controls = {},
    fields = {};
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
    fields[key] = field;
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
  const description = document.createElement("small");
  description.className = "helper";
  description.id = "opening-description";
  controls.type.setAttribute("aria-describedby", description.id);
  fields.type.append(description);
  const hint = document.createElement("p");
  hint.className = "helper";
  hint.textContent =
    "Replay shows the complete opening. Your choice stays with your card when you share or save a draft.";
  box.append(hint);
  document.querySelector('[data-panel="4"] .extras').before(box);
  state.subscribe((s) => {
    const config = s.openingConfig;
    description.textContent = s.physicalConfig
      ? "Traditional paper card: envelope, illustrated cover and folded inside pages."
      : {
          theme:
            "Use this design’s opening. Choose an envelope or gift box to personalise it.",
          none: "Show the card straight away, with your chosen celebration.",
          envelope: "A personal envelope with optional seal and paper colours.",
          "gift-box": "A wrapped surprise with ribbon and a lift-off lid.",
        }[config?.type || "theme"];
    controls.type.value = config?.type || "theme";
    controls.type.disabled = !!s.physicalConfig;
    for (const key of ["tone", "wrap", "effect"]) {
      controls[key].value = config?.[key] || defaultOpening()[key];
      controls[key].disabled =
        !config || (key === "wrap" && !!s.physicalConfig);
    }
    checkbox.checked = config?.seal ?? true;
    checkbox.disabled = !config;
    fields.tone.hidden = !config || config.type === "none";
    fields.wrap.hidden =
      !config || config.type !== "gift-box" || !!s.physicalConfig;
    fields.effect.hidden = !config;
    seal.hidden = !config || config.type !== "envelope";
  });
}
