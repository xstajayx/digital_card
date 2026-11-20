import { jarTheme, readHearts, saveHearts } from "../engine/heart-jar.js";
import { createJarArt, heartArt } from "./jar-art.js";

export function presentJar(root, gift, { preview = false } = {}) {
  const theme = jarTheme(gift.theme);
  const fragment = document.getElementById("jarPresentation").content.cloneNode(true);
  root.replaceChildren(fragment);
  const get = (name) => root.querySelector(`[data-jar="${name}"]`);
  const art = createJarArt(get("art"), theme);
  const opened = preview ? new Set() : readHearts(gift);
  const open = get("open");
  const choices = get("choices");
  const picker = get("picker");
  const note = get("note");
  const next = get("next");
  art.fill(gift.notes.length);
  art.title(gift.title);
  get("title").textContent = gift.title || theme.title;
  for (const field of ["recipient", "greeting", "signature"]) {
    const node = get(field);
    node.textContent = gift[field];
    node.hidden = !gift[field];
  }
  root.style.setProperty("--jar-ink", theme.ink);
  root.style.setProperty("--jar-tint", theme.tint);

  function updateProgress() {
    get("progress").textContent = `${opened.size} of ${gift.notes.length} hearts opened`;
    get("complete").hidden = opened.size !== gift.notes.length;
    for (const [index, button] of [...choices.children].entries()) {
      button.dataset.seen = String(opened.has(index));
      button.setAttribute("aria-label", `Heart ${index + 1}${opened.has(index) ? ", opened" : ", unopened"}`);
    }
    next.textContent = opened.size === gift.notes.length ? "Back to all hearts" : "Pick Another Heart";
    get("all").hidden = opened.size === gift.notes.length;
  }

  function reveal(index) {
    opened.add(index);
    if (!preview && !saveHearts(gift, opened))
      get("storage").textContent = "Progress is available during this visit. This browser couldn’t save it.";
    updateProgress();
    get("note-title").textContent = `Heart ${index + 1}`;
    get("note-text").textContent = gift.notes[index];
    const selected = get("chosen-heart");
    selected.replaceChildren(heartArt(theme.colors[index % theme.colors.length]));
    note.hidden = false;
    get("note-title").focus({ preventScroll: true });
    note.scrollIntoView({ block: "nearest" });
  }

  gift.notes.forEach((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "jar-choice";
    const number = document.createElement("span");
    number.textContent = String(index + 1);
    button.append(heartArt(theme.colors[index % theme.colors.length]), number);
    button.addEventListener("click", () => reveal(index));
    choices.append(button);
  });
  function openJar(animate) {
    get("art").classList.add("jar-open");
    if (animate) get("art").classList.add("jar-opening");
    open.hidden = true;
    picker.hidden = false;
    if (animate) (choices.children[[...gift.notes.keys()].find((index) => !opened.has(index)) ?? 0]).focus({ preventScroll: true });
  }
  open.addEventListener("click", () => openJar(true), { once: true });
  next.addEventListener("click", () => {
    const unread = gift.notes.findIndex((_, index) => !opened.has(index));
    if (unread !== -1) reveal(unread);
    else {
      note.hidden = true;
      choices.firstElementChild.focus();
    }
  });
  get("all").addEventListener("click", () => {
    note.hidden = true;
    choices.firstElementChild.focus();
  });
  get("replay").addEventListener("click", () => {
    const illustration = get("art");
    illustration.classList.remove("jar-opening");
    void illustration.offsetWidth;
    illustration.classList.add("jar-opening");
  });
  get("storage").textContent = preview ? "" : "Opened hearts are remembered in this browser. Progress doesn’t sync across devices.";
  updateProgress();
  if (opened.size) openJar(false);
}
