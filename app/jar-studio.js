import { jarTheme, encodeJar, newJarId, noteError, HEART_MAX, HEART_MIN, NOTE_LIMIT, FIELD_LIMITS, MAX_LINK_LENGTH } from "../engine/heart-jar.js";
import { createJarArt } from "./jar-art.js";
import { presentJar } from "./jar-presentation.js";
import { bindShareActions } from "./share-actions.js";
import { draftNavigation } from "./draft-navigation.js";

const $ = (id) => document.getElementById(id);
const selected = new URLSearchParams(location.search).get("theme");
const theme = jarTheme(selected ?? "love");
if (!theme) {
  $("jarStudio").hidden = true;
  $("themeError").hidden = false;
} else {
  init(theme);
}
function init(theme) {
  const notes = [];
  let editing = -1;
  let removed;
  let issued;
  const fields = $("jarFields");
  const input = $("heartMessage");
  const list = $("heartList");
  const dialog = $("jarPreview");
  const art = createJarArt($("studioJar"), theme);
  const warn = draftNavigation();
  $("themeName").textContent = theme.title;
  fields.elements.title.value = theme.title;
  fields.elements.greeting.value = theme.greeting;
  const snapshot = () => Object.fromEntries(new FormData(fields));
  const initial = JSON.stringify(snapshot());
  const dirty = () => warn(notes.length > 0 || !!input.value || JSON.stringify(snapshot()) !== initial);
  function options() {
    for (const [key, limit] of Object.entries(FIELD_LIMITS)) {
      const field = fields.elements[key];
      field.setCustomValidity(field.value.length > limit ? `Use ${limit} characters or fewer.` : "");
    }
    art.title(fields.elements.title.value);
    dirty();
  }
  fields.addEventListener("submit", (event) => event.preventDefault());
  fields.addEventListener("input", options);
  input.addEventListener("input", () => {
    $("heartCount").textContent = `${input.value.length} / ${NOTE_LIMIT}`;
    $("heartError").textContent = input.value.length > NOTE_LIMIT ? `Use ${NOTE_LIMIT} characters or fewer.` : "";
    dirty();
  });
  function resetEditor() {
    editing = -1;
    input.value = "";
    $("heartCount").textContent = `0 / ${NOTE_LIMIT}`;
    $("heartError").textContent = "";
    $("cancelHeart").hidden = true;
    $("addHeart").textContent = "Add to Jar";
  }
  function button(label, index, handler, disabled = false) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = "jar-small";
    node.textContent = label;
    node.setAttribute("aria-label", `${label} heart ${index + 1}`);
    node.disabled = disabled;
    node.addEventListener("click", handler);
    return node;
  }
  function render(drop = false) {
    art.fill(notes.length, drop);
    $("jarCount").textContent = `${notes.length} of ${HEART_MAX} hearts added`;
    $("undoHeart").hidden = !removed;
    $("shareStatus").textContent = "";
    $("manualJarLink").hidden = true;
    list.replaceChildren();
    notes.forEach((text, index) => {
      const row = document.createElement("li");
      const message = document.createElement("p");
      message.textContent = text;
      const actions = document.createElement("div");
      actions.className = "jar-row-actions";
      function move(direction) {
        const next = index + direction;
        [notes[next], notes[index]] = [notes[index], notes[next]];
        if (editing === index) editing = next;
        else if (editing === next) editing = index;
        render();
        list.children[next].querySelector(`[aria-label="${direction < 0 ? "Move up" : "Move down"} heart ${next + 1}"]:not(:disabled)`)?.focus();
        if (!list.contains(document.activeElement)) list.children[next].querySelector("button").focus();
      }
      actions.append(
        button("Edit", index, () => {
          editing = index;
          input.value = text;
          $("heartCount").textContent = `${text.length} / ${NOTE_LIMIT}`;
          $("heartError").textContent = "";
          $("addHeart").textContent = "Save heart";
          $("cancelHeart").hidden = false;
          input.focus();
        }),
        button("Move up", index, () => move(-1), index === 0),
        button("Move down", index, () => move(1), index === notes.length - 1),
        button("Remove", index, () => {
          removed = { index, text };
          notes.splice(index, 1);
          if (editing === index) resetEditor();
          else if (editing > index) editing--;
          render();
          $("undoHeart").focus();
        }),
      );
      row.append(message, actions);
      list.append(row);
    });
    dirty();
  }
  $("heartEditor").addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value;
    const error = editing === -1 && notes.length >= HEART_MAX ? "Your jar already has 20 hearts." : noteError(value, notes, editing);
    $("heartError").textContent = error;
    if (error) return input.focus();
    const adding = editing === -1;
    if (adding) notes.push(value);
    else notes[editing] = value;
    resetEditor();
    render(adding);
    input.focus();
  });
  $("cancelHeart").addEventListener("click", () => { resetEditor(); dirty(); input.focus(); });
  $("undoHeart").addEventListener("click", () => {
    if (notes.length >= HEART_MAX || noteError(removed.text, notes)) {
      $("heartError").textContent = "This heart can’t be restored while the jar is full or already contains it.";
      return;
    }
    const index = Math.min(removed.index, notes.length);
    notes.splice(index, 0, removed.text);
    if (editing >= index) editing++;
    removed = null;
    render();
    list.children[index].querySelector("button").focus();
  });

  function gift() {
    if (!fields.reportValidity()) throw new Error("Check the highlighted fields before continuing.");
    if (input.value || editing !== -1) throw new Error("Add or save the heart you’re editing first.");
    if (notes.length < HEART_MIN) throw new Error(`Add at least ${HEART_MIN} hearts to continue.`);
    return { theme: theme.id, ...snapshot(), notes: [...notes] };
  }
  $("previewJar").addEventListener("click", () => {
    try {
      presentJar($("previewGift"), gift(), { preview: true });
      $("shareStatus").textContent = "";
      dialog.showModal();
    } catch (error) {
      $("shareStatus").textContent = error.message;
    }
  });
  $("closeJarPreview").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => $("previewJar").focus());
  bindShareActions({
    buttons: { native: $("shareJar"), copy: $("copyJar"), whatsapp: $("whatsappJar") },
    item: { name: "Heart Jar", title: "A Heart Jar for you", text: "Someone sent you a Heart Jar from Silent Hello.", success: "Heart Jar shared." },
    status: $("shareStatus"), fallback: $("manualJarLink"), linkInput: $("jarLink"),
    getUrl() {
      const data = gift();
      const key = JSON.stringify(data);
      if (issued?.key !== key) {
        const url = new URL("./jar-view.html", location.href);
        url.hash = `j=${encodeJar({ ...data, id: newJarId() })}`;
        if (url.href.length > MAX_LINK_LENGTH) throw new Error("This link is too long. Shorten a few messages and try again.");
        issued = { url: url.href, key };
      }
      return issued.url;
    },
  });
  options();
  render();
}
