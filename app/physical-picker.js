import { defaultPhysical, PAPERS } from "../engine/physical-schema.js";
import { stationeryFor } from "../engine/stationery.js";
import { defaultOpening } from "../engine/openings/config.js";
export function bindPhysicalPicker(state, preview) {
  const box = document.createElement("fieldset");
  box.className = "picker-section";
  const legend = document.createElement("legend");
  legend.textContent = "A real paper-card moment";
  box.append(legend);
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.id = "physicalToggle";
  const label = document.createElement("label");
  label.className = "toggle";
  label.append(
    toggle,
    document.createTextNode(
      "Envelope, illustrated cover and folded inside pages",
    ),
  );
  // All newly created cards use the folded envelope journey; no opt-out control.
  toggle.checked = true;
  toggle.hidden = true;
  label.hidden = true;
  box.append(label);
  const controls = document.createElement("div");
  controls.id = "physicalControls";
  box.append(controls);
  const fields = {};
  function field(key, title, options) {
    const label = document.createElement("label");
    label.className = "field";
    const span = document.createElement("span");
    span.textContent = title;
    const input = document.createElement(options ? "select" : "input");
    input.id = "physical-" + key;
    if (options)
      for (const [value, text] of options) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        input.append(option);
      }
    else input.maxLength = 160;
    input.addEventListener(options ? "change" : "input", () =>
      state.set({
        physicalConfig: { ...state.get().physicalConfig, [key]: input.value },
      }),
    );
    label.append(span, input);
    controls.append(label);
    fields[key] = input;
  }
  field(
    "coverGreeting",
    "Front-cover greeting (blank uses the design greeting)",
  );
  const decoration = document.createElement("input");
  decoration.type = "checkbox";
  decoration.id = "insideDecoration";
  const decorationLabel = document.createElement("label");
  decorationLabel.className = "toggle";
  decorationLabel.append(decoration, document.createTextNode("Inside decoration"));
  document.getElementById("fromInput").closest("label").after(decorationLabel);
  decoration.onchange = () => {
    const { insideDecoration, ...config } = state.get().physicalConfig;
    if (decoration.checked) {
      if (!config.insideArt) config.insideArt = "default";
    } else config.insideDecoration = false;
    state.set({ physicalConfig: config });
  };
  field(
    "paper",
    "Inside paper",
    Object.keys(PAPERS).map((x) => [
      x,
      { lined: "Lined", pastel: "Soft pastel", textured: "Premium textured" }[x] || x,
    ]),
  );
  field("handwriting", "Inside lettering", [
    ["fredoka", "Fredoka"],
    ["poppins", "Poppins"],
    ["playfair", "Playfair Display"],
    ["quicksand", "Quicksand · light and personal"],
    ["nunito", "Nunito · clear and friendly"],
    ["pacifico", "Pacifico · handwritten"],
  ]);
  field("signature", "Signature style", [
    ["fredoka", "Fredoka"],
    ["poppins", "Poppins"],
    ["quicksand", "Quicksand"],
    ["pacifico", "Pacifico · natural handwriting"],
    ["playfair", "Playfair Display"],
    ["nunito", "Nunito"],
  ]);
  const effects = document.createElement("input");
  effects.type = "checkbox";
  effects.id = "physical-effects";
  const effectLabel = document.createElement("label");
  effectLabel.className = "toggle";
  effectLabel.append(
    effects,
    document.createTextNode("Add the selected celebration after unfolding"),
  );
  // Celebration is configured once in the main Effects section.
  effectLabel.hidden = true;
  controls.append(effectLabel);
  effects.onchange = () =>
    state.set({
      physicalConfig: {
        ...state.get().physicalConfig,
        effects: effects.checked,
      },
    });
  const hint = document.createElement("p");
  hint.className = "helper";
  hint.textContent =
    "Write the inside message and signature in step 3. Paper sets readable inside colours; custom colours decorate the cover. Physical cards use an envelope. Existing gift-box openings remain available with this mode off.";
  hint.hidden = true;
  controls.append(hint);
  const stages = document.createElement("div");
  stages.className = "recipient-actions";
  for (const [value, title] of [
    ["cover", "Front cover"],
    ["inside", "Inside pages"],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button small";
    button.textContent = title;
    button.onclick = () => preview.physicalStage(value);
    stages.append(button);
  }
  controls.append(stages);
  toggle.onchange = () => {
    const s = state.get();
    state.set({
      physicalConfig: toggle.checked
        ? { ...defaultPhysical(), coverName: "" }
        : null,
      ...(toggle.checked
        ? {
            openingConfig: {
              ...(s.openingConfig || defaultOpening()),
              type: "envelope",
            },
          }
        : {}),
    });
  };
  document.querySelector('[data-panel="4"] .extras').before(box);
  state.subscribe((s) => {
    toggle.checked = true;
    controls.hidden = !s.physicalConfig;
    const insideArt = s.physicalConfig?.insideArt;
    const canDecorate = !!(insideArt && insideArt !== "default") ||
      !!stationeryFor(s.theme.id, s.theme.catalogue).motif;
    decorationLabel.hidden = !s.physicalConfig || !canDecorate;
    if (s.physicalConfig) {
      for (const [key, field] of Object.entries(fields))
        if (field.value !== s.physicalConfig[key])
          field.value = s.physicalConfig[key];
      effects.checked = s.physicalConfig.effects;
      decoration.checked = s.physicalConfig.insideDecoration !== false && !!s.physicalConfig.insideArt;
    }
  });
}
