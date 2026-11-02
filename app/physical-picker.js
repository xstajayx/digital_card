import { defaultPhysical, PAPERS } from "../engine/physical-schema.js";
import { defaultOpening } from "../engine/openings/config.js";
import { ILLUSTRATIONS } from "../engine/illustrations.js";
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
  field("coverArt", "Front-cover artwork", []);
  field("insideArt", "Inside-left illustration", []);
  field(
    "paper",
    "Inside paper",
    Object.keys(PAPERS).map((x) => [
      x,
      { pastel: "Soft pastel", textured: "Premium textured" }[x] || x,
    ]),
  );
  field("handwriting", "Inside lettering", [
    ["quicksand", "Quicksand · light and personal"],
    ["nunito", "Nunito · clear and friendly"],
    ["pacifico", "Pacifico · handwritten"],
  ]);
  field("signature", "Signature style", [
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
  controls.append(hint);
  const stages = document.createElement("div");
  stages.className = "recipient-actions";
  for (const [value, title] of [
    ["envelope", "Envelope"],
    ["cover", "Front cover"],
    ["inside", "Inside pages"],
    ["journey", "Full journey"],
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
      physicalConfig: toggle.checked ? defaultPhysical() : null,
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
  let themeId = "";
  state.subscribe((s) => {
    toggle.checked = !!s.physicalConfig;
    controls.hidden = !s.physicalConfig;
    if (themeId !== s.theme.id) {
      themeId = s.theme.id;
      for (const key of ["coverArt", "insideArt"]) {
        fields[key].replaceChildren();
        const choices =
          key === "coverArt"
            ? [
                ["", "Selected illustration / design artwork"],
                ["none", "No artwork"],
              ]
            : [
                ["default", "Coordinated illustration"],
                ["", "Blank inside-left page"],
              ];
        for (const item of ILLUSTRATIONS[s.theme.id] || [])
          choices.push([item.id, item.label]);
        for (const [value, label] of choices) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          fields[key].append(option);
        }
      }
    }
    if (s.physicalConfig) {
      for (const [key, field] of Object.entries(fields))
        if (field.value !== s.physicalConfig[key])
          field.value = s.physicalConfig[key];
      effects.checked = s.physicalConfig.effects;
    }
  });
}
