import { loadThemes } from "../engine/card-data.js";
import { validateProfile } from "../engine/contact-profile.js";
const make = (tag, text) => {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  return e;
};
export function bindContactFields(form) {
  const details = make("details"),
    summary = make("summary", "Family & Friends · card preferences");
  details.className = "contact-preferences";
  details.append(summary);
  const note = make(
    "p",
    "Optional details stay in this browser. Email is saved for a future verified delivery service; nothing is sent. Preparation on visits also needs the local demo setting.",
  );
  note.className = "occasion-note";
  details.append(note);
  const inputs = {};
  function field(key, title, type = "text", options) {
    const label = make("label"),
      span = make("span", title),
      input = make(
        type === "select"
          ? "select"
          : type === "textarea"
            ? "textarea"
            : "input",
      );
    input.name = "assistant-" + key;
    input.id = "contact-" + key;
    if (!["select", "textarea"].includes(type)) input.type = type;
    if (options)
      for (const [value, text] of options) {
        const o = make("option", text);
        o.value = value;
        input.append(o);
      }
    label.append(span, input);
    details.append(label);
    inputs[key] = input;
    return input;
  }
  field(
    "recipientName",
    "Recipient name (nickname is used if blank)",
  ).maxLength = 120;
  field("relationship", "Relationship (optional)", "select", [
    ["", "Not specified"],
    ["brother", "Brother"],
    ["sister", "Sister"],
    ["parent", "Parent"],
    ["partner", "Partner"],
    ["friend", "Friend"],
    ["family", "Family"],
    ["other", "Other"],
  ]);
  const year = field(
    "originYear",
    "Birth / anniversary start year (optional)",
    "number",
  );
  year.min = 1900;
  year.max = new Date().getFullYear();
  field(
    "recipientEmail",
    "Recipient email (optional · future delivery only)",
    "email",
  ).maxLength = 254;
  const design = field("themeId", "Preferred existing design", "select", [
    ["", "Choose automatically"],
  ]);
  field("style", "Card style", "select", [
    ["folded", "Folded paper card"],
    ["standard", "Standard illustrated card"],
  ]);
  field("opening", "Opening experience", "select", [
    ["envelope", "Envelope"],
    ["gift-box", "Gift box (standard style)"],
    ["none", "Direct view (standard style)"],
  ]);
  field(
    "greeting",
    "Default greeting (optional; {name}, {age}, {ordinalAge}, {years}, {ordinalYears})",
    "textarea",
  ).maxLength = 1000;
  field(
    "automation",
    "Enable local automatic preparation for this person",
    "checkbox",
  );
  field(
    "reviewBeforeSending",
    "Review before sending (default; delivery is not live)",
    "checkbox",
  ).checked = true;
  let themes = [],
    desiredTheme = "";
  function designs() {
    const selected = desiredTheme || design.value;
    design.replaceChildren();
    for (const [value, text] of [
      ["", "Choose automatically"],
      ...themes
        .filter((t) =>
          form.elements.kind.value === "birthday"
            ? t.birthday
            : t.occasionId === "anniversary",
        )
        .map((t) => [t.id, t.name]),
    ]) {
      const o = make("option", text);
      o.value = value;
      design.append(o);
    }
    const available = [...design.options].some((o) => o.value === selected);
    design.value = available ? selected : "";
    if (themes.length && !available) desiredTheme = "";
  }
  design.onchange = () => {
    desiredTheme = design.value;
  };
  loadThemes()
    .then((value) => {
      themes = value;
      designs();
    })
    .catch(() => {
      note.textContent =
        "Design preferences are unavailable until the catalogue loads. Existing saved preferences are kept.";
    });
  form.elements.kind.addEventListener("change", designs);
  function compatible() {
    if (inputs.style.value === "folded") inputs.opening.value = "envelope";
    for (const o of inputs.opening.options)
      o.disabled = inputs.style.value === "folded" && o.value !== "envelope";
  }
  inputs.style.onchange = compatible;
  form.querySelector("[data-error]").before(details);
  return {
    open(item) {
      desiredTheme = item?.profile?.themeId || "";
      details.open = !!item?.profile;
      const p = item?.profile || {};
      for (const [key, input] of Object.entries(inputs)) {
        if (input.type === "checkbox")
          input.checked = p[key] ?? key === "reviewBeforeSending";
        else
          input.value =
            p[key] ?? ({ style: "folded", opening: "envelope" }[key] || "");
      }
      designs();
      if (p.themeId && [...design.options].some((o) => o.value === p.themeId))
        design.value = p.themeId;
      compatible();
    },
    value() {
      const name =
        inputs.recipientName.value.trim() ||
        form.elements.nickname.value.trim();
      const active =
        inputs.recipientName.value.trim() ||
        inputs.relationship.value ||
        inputs.originYear.value ||
        inputs.recipientEmail.value ||
        design.value ||
        inputs.style.value !== "folded" ||
        inputs.opening.value !== "envelope" ||
        inputs.greeting.value ||
        inputs.automation.checked ||
        !inputs.reviewBeforeSending.checked;
      const profile = active
        ? validateProfile(
            {
              recipientName: name,
              relationship: inputs.relationship.value,
              originYear: inputs.originYear.value
                ? Number(inputs.originYear.value)
                : null,
              recipientEmail: inputs.recipientEmail.value,
              themeId: design.value || desiredTheme,
              style: inputs.style.value,
              opening: inputs.opening.value,
              greeting: inputs.greeting.value,
              automation: inputs.automation.checked,
              reviewBeforeSending: inputs.reviewBeforeSending.checked,
            },
            name,
          )
        : null;
      return { name, profile };
    },
  };
}
