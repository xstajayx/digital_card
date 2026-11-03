import { bindContactFields } from "./contact-fields.js";
import { nextDate, saveOccasion } from "../engine/occasions.js";
// This sender-only module is never imported by the recipient page.
export function createOccasionDialog(onSaved = () => {}) {
  const dialog = document.createElement("dialog");
  dialog.className = "occasion-dialog";
  dialog.setAttribute("aria-labelledby", "occasionDialogTitle");
  dialog.setAttribute("aria-describedby", "occasionPrivacy");
  dialog.innerHTML = `<form class="occasion-form">
    <div class="occasion-dialog-heading"><h2 id="occasionDialogTitle">Remember a little moment</h2><button class="button" type="button" data-close aria-label="Close reminder dialog">Close</button></div>
    <p class="occasion-note" id="occasionPrivacy">Saved in this browser on this device. No unattended preparation or automatic emails. Optional contact details and default greetings stay local.</p>
    <label>Nickname<input name="nickname" maxlength="80" autocomplete="off" /></label>
    <label>Occasion<select name="kind"><option value="birthday">Birthday</option><option value="anniversary">Anniversary</option></select></label>
    <fieldset><legend>Choose or confirm the occasion date</legend><div class="occasion-date"><label>Day<input name="day" type="number" min="1" max="31" inputmode="numeric" required /></label><label>Month<select name="month" required><option value="">Choose month</option></select></label></div></fieldset>
    <p class="occasion-note">Choose their actual date. 29 February repeats on leap days only.</p>
    <label class="occasion-check"><input name="annual" type="checkbox" checked /> Repeat every year</label>
    <label>Remind me in my calendar<select name="reminderDays"><option value="1">1 day before</option><option value="7" selected>7 days before</option><option value="14">14 days before</option></select></label>
    <p class="occasion-note">After saving, download the calendar event in My Occasions. Imported alerts depend on your calendar app.</p>
    <p class="occasion-error" role="alert" data-error></p>
    <div class="occasion-form-actions"><button class="button primary" type="submit">Save occasion</button><button class="text-button" type="button" data-close>Not now</button></div>
  </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector("form"),
    fields = form.elements,
    error = dialog.querySelector("[data-error]");
  const assistant = bindContactFields(form);
  for (let month = 1; month <= 12; month++) {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = new Intl.DateTimeFormat("en-GB", {
      month: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2000, month - 1, 1)));
    fields.month.append(option);
  }
  let editing = null;
  dialog
    .querySelectorAll("[data-close]")
    .forEach((b) => (b.onclick = () => dialog.close()));
  form.onsubmit = (event) => {
    event.preventDefault();
    error.textContent = "";
    try {
      const month = Number(fields.month.value),
        day = Number(fields.day.value),
        annual = fields.annual.checked;
      const next = nextDate(month, day);
      const unchangedOnce =
        editing &&
        !editing.annual &&
        !annual &&
        editing.month === month &&
        editing.day === day;
      const enhanced = assistant.value();
      const item = saveOccasion({
        id: editing?.id || crypto.randomUUID(),
        revision: editing?.revision || 0,
        nickname: fields.nickname.value.trim() || enhanced.name.slice(0, 80),
        ...(enhanced.profile ? { profile: enhanced.profile } : {}),
        kind: fields.kind.value,
        month,
        day,
        annual,
        year: annual ? null : unchangedOnce ? editing.year : next.year,
        reminderDays: Number(fields.reminderDays.value),
      });
      dialog.close();
      onSaved(item);
    } catch (e) {
      error.textContent =
        e.message || "This occasion could not be saved. Please try again.";
    }
  };
  return {
    open({ item = null, nickname = "", kind = "birthday" } = {}) {
      editing = item;
      form.reset();
      error.textContent = "";
      dialog.querySelector("h2").textContent = item
        ? "Edit your occasion"
        : "Remember a little moment";
      fields.nickname.value = item?.nickname || nickname.slice(0, 80);
      fields.kind.value = item?.kind || kind;
      fields.day.value = item?.day || "";
      fields.month.value = item?.month || "";
      fields.annual.checked = item ? item.annual : true;
      fields.reminderDays.value = item?.reminderDays || 7;
      assistant.open(item);
      dialog.showModal();
      fields.nickname.focus();
    },
  };
}
let reminderDialog, prepared;
export function offerOccasion(card) {
  const prompt = document.getElementById("rememberOccasionPrompt");
  if (!prompt) return;
  // Keep only the two fields needed by the optional reminder, never card text.
  prepared = {
    nickname: card.to || "",
    kind: card.theme?.occasionId === "anniversary" ? "anniversary" : "birthday",
  };
  prompt.hidden = false;
  document.getElementById("rememberOccasionButton").onclick = () => {
    reminderDialog ??= createOccasionDialog(() => {
      prompt.hidden = true;
      const status = document.getElementById("occasionSavedStatus");
      status.textContent = "Occasion saved on this device. ";
      const link = document.createElement("a");
      link.href = "./occasions.html";
      link.textContent = "Download its calendar event in My Occasions →";
      status.append(link);
      link.focus({ preventScroll: true });
    });
    reminderDialog.open(prepared);
  };
  document.getElementById("dismissOccasionButton").onclick = () => {
    prompt.hidden = true;
  };
}
