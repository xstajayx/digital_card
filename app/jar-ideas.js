import { jarIdeaBatch } from "../engine/jar-ideas.js";

export function bindJarIdeas(theme, input, notes) {
  const get = (id) => document.getElementById(id);
  const toggle = get("jarIdeasToggle");
  const panel = get("jarIdeas");
  const list = get("jarIdeasList");
  const heading = get("jarIdeasTitle");
  const more = get("jarIdeasMore");
  const confirmation = get("jarIdeasConfirm");
  const status = get("jarIdeasStatus");
  const seen = new Set();
  let previous = [];
  let pending;

  function clearConfirmation() {
    pending = undefined;
    confirmation.hidden = true;
  }

  function close(focus = true) {
    clearConfirmation();
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    if (focus) toggle.focus();
  }

  function use(idea) {
    if (notes.some((note) => note.trim() === idea)) {
      showBatch();
      status.textContent = "That message is already in your jar. Choose another idea.";
      return;
    }
    input.value = idea;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    close(false);
    input.focus();
    input.setSelectionRange(idea.length, idea.length);
    status.textContent = "Idea placed in the message editor. You can edit it before adding it.";
  }

  function showBatch() {
    clearConfirmation();
    const excluded = new Set(notes.map((note) => note.trim()));
    const batch = jarIdeaBatch(theme, excluded, seen, previous);
    if (batch.some((idea) => seen.has(idea))) {
      seen.clear();
      for (const idea of previous) seen.add(idea);
    }
    previous = batch;
    list.replaceChildren();
    for (const idea of batch) {
      seen.add(idea);
      const row = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "jar-idea-option";
      button.textContent = idea;
      button.addEventListener("click", () => {
        if (!input.value || input.value === idea) return use(idea);
        pending = { idea, button };
        confirmation.hidden = false;
        get("jarIdeasKeep").focus();
      });
      row.append(button);
      list.append(row);
    }
    more.hidden = !batch.length;
    status.textContent = batch.length ? "" : "You’ve used all the ideas for this theme. You can still write your own.";
    (list.querySelector("button") || heading).focus();
  }

  toggle.addEventListener("click", () => {
    if (!panel.hidden) return close();
    panel.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    showBatch();
  });
  get("jarIdeasClose").addEventListener("click", () => close());
  more.addEventListener("click", showBatch);
  get("jarIdeasKeep").addEventListener("click", () => {
    const button = pending?.button;
    clearConfirmation();
    button?.focus();
  });
  get("jarIdeasReplace").addEventListener("click", () => {
    if (pending) use(pending.idea);
  });
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });
  return () => close(false);
}
