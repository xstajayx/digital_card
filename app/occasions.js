import {
  STORAGE_KEY,
  readOccasions,
  occurrence,
  title,
  deleteOccasion,
  downloadCalendar,
} from "../engine/occasions.js";
import { createOccasionDialog } from "./occasion-dialog.js";
const $ = (id) => document.getElementById(id);
const status = (message) => {
  $("occasionStatus").textContent = message;
};
const error = (message) => {
  $("occasionError").textContent = message;
};
const editor = createOccasionDialog((item) => {
  render();
  status(`${title(item)} saved on this device.`);
  $("addOccasion").focus({ preventScroll: true });
});
$("addOccasion").onclick = () => editor.open();
let pendingDelete = null;
$("cancelDeleteOccasion").onclick = () => $("deleteOccasionDialog").close();
$("confirmDeleteOccasion").onclick = () => {
  try {
    deleteOccasion(pendingDelete.id);
    $("deleteOccasionDialog").close();
    render();
    status("Occasion deleted from this browser.");
    $("addOccasion").focus();
  } catch (e) {
    $("deleteOccasionDialog").close();
    error(e.message);
  }
};
const format = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(date.year, date.month - 1, date.day)));
function row(item, next) {
  const article = document.createElement("article");
  article.className = "occasion-item";
  const info = document.createElement("div"),
    name = document.createElement("h3"),
    when = document.createElement("p"),
    note = document.createElement("p");
  name.textContent = title(item);
  when.textContent = format(next || item);
  note.className = "occasion-note";
  note.textContent = `${item.annual ? "Every year" : "One time"} · Calendar alert ${item.reminderDays} ${item.reminderDays === 1 ? "day" : "days"} before${item.month === 2 && item.day === 29 ? " · Leap days only" : ""}`;
  info.append(name, when, note);
  const actions = document.createElement("div");
  actions.className = "occasion-item-actions";
  function button(label, handler) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "button";
    b.textContent = label;
    b.setAttribute("aria-label", `${label}: ${title(item)}`);
    b.onclick = handler;
    actions.append(b);
    return b;
  }
  if (next)
    button("Download calendar event", () => {
      error("");
      try {
        downloadCalendar(item, { alarm: $("calendarAlarm").checked });
        status(
          "Calendar file prepared. Check your browser’s downloads, then import it into your calendar. If no file appears, allow downloads or try another browser. Check imported alerts in your calendar app.",
        );
      } catch (e) {
        error(e.message);
      }
    });
  button("Edit", () => editor.open({ item }));
  button("Delete", () => {
    pendingDelete = item;
    $("deleteOccasionName").textContent = title(item);
    $("deleteOccasionDialog").showModal();
  });
  article.append(info, actions);
  return article;
}
function render() {
  error("");
  try {
    const items = readOccasions(),
      upcoming = [],
      past = [];
    for (const item of items) {
      const next = occurrence(item);
      (next ? upcoming : past).push({ item, next });
    }
    const key = (date) => date.year * 10000 + date.month * 100 + date.day;
    upcoming.sort(
      (a, b) =>
        key(a.next) - key(b.next) ||
        a.item.nickname.localeCompare(b.item.nickname),
    );
    past.sort((a, b) => key(b.item) - key(a.item));
    $("occasionList").replaceChildren(
      ...upcoming.map(({ item, next }) => row(item, next)),
    );
    $("pastOccasionList").replaceChildren(
      ...past.map(({ item }) => row(item, null)),
    );
    $("pastOccasions").hidden = !past.length;
    $("emptyOccasions").hidden = !!upcoming.length;
    status(
      `${upcoming.length} upcoming ${upcoming.length === 1 ? "occasion" : "occasions"}.`,
    );
  } catch (e) {
    error(e.message);
  }
}
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === null) render();
});
window.addEventListener("pageshow", render);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});
render();
