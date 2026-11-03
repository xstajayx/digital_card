import { readOccasions, occurrence } from "../engine/occasions.js";
import {
  readAssistant,
  writeAssistant,
  validateSettings,
  reconcile,
  zonedDate,
  dateNumber,
  profileFor,
  prepareContact,
  updatePrepared,
  deletePrepared,
} from "../engine/card-assistant.js";
import { loadThemes, validateCard, cardContent } from "../engine/card-data.js";
import { buildShareUrl } from "../engine/share-codec.js";
import { createCardController } from "../engine/preview.js";
import {
  runLocalPreparation,
  validatePrepared,
  checkGeneratedFit,
} from "./assistant-runtime.js";
const $ = (id) => document.getElementById(id),
  make = (tag, text) => {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    return e;
  };
let themes = [],
  previewPromise,
  active = false;
function status(text) {
  $("preparedStatus").textContent = text;
  $("preparedError").textContent = "";
}
function error(e) {
  $("preparedError").textContent = e.message || String(e);
}
async function work(fn) {
  if (active) return;
  active = true;
  try {
    await fn();
  } catch (e) {
    error(e);
  } finally {
    active = false;
  }
}
function action(parent, text, handler, disabled = false) {
  const b = make("button", text);
  b.type = "button";
  b.className = "button";
  b.disabled = disabled;
  b.onclick = () => work(handler);
  parent.append(b);
  return b;
}
const dateText = (d) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(d.year, d.month - 1, d.day)));
function confirm(title, message, fn) {
  $("confirmTitle").textContent = title;
  $("confirmMessage").textContent = message;
  $("confirmAction").onclick = () => {
    $("preparedConfirm").close();
    work(fn);
  };
  $("preparedConfirm").showModal();
}
$("confirmCancel").onclick = () => $("preparedConfirm").close();
$("closePreparedPreview").onclick = () => $("preparedPreview").close();
async function prepare(contact, force = false) {
  const entry = prepareContact(contact, themes, { force });
  if (entry.status === "sent") {
    status(
      "This occasion already has a card marked sent. Its history is kept.",
    );
    return;
  }
  const checked = !entry.stale ? await validatePrepared(entry, themes) : entry;
  render();
  if (checked.status === "failed") {
    error(new Error(checked.error));
    return;
  }
  status(
    checked.status === "ready"
      ? "Local card ready for review. Approve it before sharing."
      : "Local draft kept for review. Check its status and fitting or preference warnings.",
  );
}
function render() {
  const contacts = readOccasions(),
    doc = reconcile(readAssistant(), contacts);
  writeAssistant(doc);
  const today = zonedDate(new Date(), doc.settings.timezone);
  $("assistantSender").value = doc.settings.senderName;
  $("assistantTimezone").value = doc.settings.timezone;
  $("assistantRetention").value = doc.settings.retentionDays;
  $("assistantDemo").checked = doc.settings.demo;
  const upcoming = contacts
    .map((c) => ({ contact: c, date: occurrence(c, today) }))
    .filter((r) => r.date)
    .sort((a, b) => dateNumber(a.date) - dateNumber(b.date));
  $("assistantUpcoming").replaceChildren(
    ...upcoming.map(({ contact, date }) => {
      const a = make("article");
      a.className = "prepared-card";
      a.append(
        make("h3", `${contact.nickname} · ${contact.kind}`),
        make("p", dateText(date)),
        make(
          "p",
          profileFor(contact).automation
            ? "Local preparation enabled for this person"
            : "Manual preparation only",
        ),
      );
      const links = make("div");
      links.className = "prepared-actions";
      action(links, "Prepare now", () => prepare(contact, false));
      const edit = make("a", "Edit recipient preferences");
      edit.href = "./occasions.html#edit=" + encodeURIComponent(contact.id);
      edit.className = "button";
      links.append(edit);
      a.append(links);
      return a;
    }),
  );
  const cards = doc.cards
    .filter((r) => !r.hidden)
    .sort(
      (a, b) =>
        dateNumber(a.date) - dateNumber(b.date) || b.updatedAt - a.updatedAt,
    );
  $("preparedEmpty").hidden = !!cards.length;
  $("preparedList").replaceChildren(
    ...cards.map((r) => {
      const c = contacts.find((c) => c.id === r.contactId),
        article = make("article");
      article.className = "prepared-card";
      article.dataset.cardId = r.id;
      article.append(make("h3", `${c.nickname} · ${dateText(r.date)}`));
      const state = make(
        "p",
        r.status === "sent" ? "Marked sent by you" : r.status,
      );
      state.className = "prepared-state";
      article.append(state);
      if (r.years)
        article.append(
          make(
            "p",
            `${r.years} ${c.kind === "birthday" ? "years old" : "anniversary years"}${r.milestone ? " · milestone" : ""}`,
          ),
        );
      if (r.error) article.append(make("p", r.error));
      const actions = make("div");
      actions.className = "prepared-actions";
      action(
        actions,
        "Preview",
        async () => {
          $("preparedPreview").showModal();
          previewPromise ??= createCardController($("preparedFrame"));
          const preview = await previewPromise;
          preview.update(cardContent(validateCard(r.card, themes)));
          const valid =
            (await preview.checkFit()) &&
            (await checkGeneratedFit(r.card, themes));
          $("preparedFitStatus").textContent = valid
            ? "Text fits narrow mobile and desktop checks."
            : "This card needs more room. Edit it or use Read comfortably in the preview.";
          if (
            !["approved", "sent", "cancelled"].includes(r.status) &&
            !r.stale
          ) {
            updatePrepared(r.id, r.version, {
              status: valid ? "ready" : "draft",
              error: valid
                ? ""
                : "Shorten the greeting or message before approval; all words are kept.",
            });
            render();
          }
        },
        !r.card,
      );
      const edit = make("a", "Edit message / change design");
      edit.className = "button";
      edit.href = "./studio.html?prepared=" + encodeURIComponent(r.id);
      if (r.status === "sent" || !r.card) {
        edit.removeAttribute("href");
        edit.setAttribute("aria-disabled", "true");
      }
      actions.append(edit);
      action(
        actions,
        "Regenerate using templates",
        () =>
          confirm(
            "Regenerate this card?",
            "This replaces any edited text and clears approval. Your saved contact preferences will be used.",
            () => prepare(c, true),
          ),
        r.status === "sent",
      );
      action(
        actions,
        "Approve",
        async () => {
          if (!(await checkGeneratedFit(r.card, themes)))
            throw new Error(
              "Text no longer fits. Edit and preview this card first.",
            );
          updatePrepared(r.id, r.version, { status: "approved" });
          render();
          status("Approved locally. Nothing has been sent.");
        },
        r.status !== "ready" || r.stale,
      );
      action(
        actions,
        "Share",
        async () => {
          const fresh = readAssistant().cards.find((x) => x.id === r.id);
          if (
            !fresh ||
            fresh.status !== "approved" ||
            fresh.version !== r.version
          )
            throw new Error(
              "Review and approve the current card before sharing.",
            );
          if (!(await checkGeneratedFit(fresh.card, themes)))
            throw new Error(
              "Edit the message so every word fits before sharing.",
            );
          const url = await buildShareUrl(validateCard(fresh.card, themes));
          updatePrepared(r.id, r.version, {});
          render();
          try {
            await navigator.clipboard.writeText(url);
            status(
              "Approved card link copied. Choose where to send it; delivery is not confirmed.",
            );
          } catch {
            const input = make("input");
            input.readOnly = true;
            input.value = url;
            input.setAttribute("aria-label", "Approved card link to copy");
            [...$("preparedList").children]
              .find((a) => a.dataset.cardId === r.id)
              ?.append(input);
            input.focus();
            input.select();
            status(
              "Copy the approved link below. Nothing has been sent automatically.",
            );
          }
        },
        r.status !== "approved" || r.stale,
      );
      action(
        actions,
        "Mark as sent",
        () =>
          confirm(
            "Mark this card as sent?",
            "This only records that you sent it yourself. Silent Hello has not sent or confirmed delivery.",
            () => {
              updatePrepared(r.id, r.version, { status: "sent" });
              render();
              status(
                "Marked sent by you. No message was sent by Silent Hello.",
              );
            },
          ),
        r.status !== "approved",
      );
      action(actions, "Delete", () =>
        confirm(
          "Delete this prepared card?",
          "The draft text will be removed. A small cancellation marker prevents it being prepared again automatically for this occasion/year.",
          () => {
            deletePrepared(r.id);
            render();
            status(
              "Prepared card deleted and local automatic recreation cancelled for this occurrence.",
            );
          },
        ),
      );
      article.append(actions);
      return article;
    }),
  );
}
$("assistantSettings").onsubmit = (event) => {
  event.preventDefault();
  work(async () => {
    const doc = readAssistant();
    doc.settings = validateSettings({
      senderName: $("assistantSender").value,
      timezone: $("assistantTimezone").value,
      retentionDays: Number($("assistantRetention").value),
      demo: $("assistantDemo").checked,
    });
    writeAssistant(doc);
    await runLocalPreparation();
    render();
    status(
      "Local assistant settings saved. Preparation runs on visits only; no emails or unattended jobs are active.",
    );
  });
};
$("prepareUpcoming").onclick = () =>
  work(async () => {
    const entries = await runLocalPreparation();
    render();
    status(
      entries.length
        ? `Processed ${entries.length} local preparation attempts. Review their statuses before sharing.`
        : "No new due cards. Enable local preparation here and for each contact, or use Prepare now.",
    );
  });
window.addEventListener("storage", () => {
  try {
    render();
  } catch (e) {
    error(e);
  }
});
try {
  themes = await loadThemes();
  await runLocalPreparation();
  render();
} catch (e) {
  error(e);
}
