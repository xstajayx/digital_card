import { catalogueDesign } from "../engine/catalogue.js";
import { sanitizeGiftUrl } from "../engine/sanitize.js";
import { birthdayNumber } from "../engine/card-data.js";
import { hostedBase } from "./hosted-config.js";
import { hostedRequest, hostedToken } from "./hosted-client.js";
import { photoSignature, exportHostedPhoto } from "./photo-card.js";
import { cardContent, validateCard } from "../engine/card-data.js";
const records = new WeakMap();
const rawCard = (state) => {
  const s = state.get(),
    { theme, themes, ...raw } = validateCard(
      { ...cardContent(s), v: 5 },
      s.themes,
    );
  return { ...raw, themeId: theme.id };
};
const fingerprint = (state) =>
  JSON.stringify([rawCard(state), photoSignature(state)]);
export function hostedShareURL(state) {
  if (!photoSignature(state) || !hostedBase()) return "";
  const record = records.get(state);
  if (!record?.url || record.fingerprint !== fingerprint(state))
    throw new Error(
      "Create a hosted link for the current photo card first. Your local edits are kept.",
    );
  return record.url;
}
export function bindHostedCards(state, preview) {
  if (!hostedBase()) return;
  const make = (tag, text) => {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    return e;
  };
  const box = make("section");
  box.id = "hostedPublishPanel";
  box.className = "soft-box";
  box.append(make("h3", "Host this photo card"));
  box.append(
    make(
      "p",
      "Upload only when you choose. Anyone with the link can open the card until it expires or you remove it.",
    ),
  );
  const label = make("label"),
    input = make("input");
  label.className = "field";
  label.append(make("span", "Private owner key"), input);
  input.id = "hostedOwnerKey";
  input.type = "password";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.maxLength = 43;
  box.append(label);
  const rememberLabel = make("label"),
    remember = make("input");
  remember.type = "checkbox";
  rememberLabel.className = "toggle";
  rememberLabel.append(
    remember,
    document.createTextNode("Remember my key in this tab until it closes"),
  );
  box.append(rememberLabel);
  try {
    input.value = sessionStorage.getItem("silent-hello.hosted-owner") || "";
    remember.checked = !!input.value;
  } catch {}
  input.oninput = () => {
    try {
      sessionStorage.removeItem("silent-hello.hosted-owner");
    } catch {}
    remember.checked = false;
  };
  const permission = make("label"),
    consent = make("input");
  consent.type = "checkbox";
  consent.id = "hostedConsent";
  permission.className = "toggle";
  permission.append(
    consent,
    document.createTextNode(
      "I can share this photograph and understand that anyone with the link can read this card.",
    ),
  );
  box.append(permission);
  const publish = make("button", "Create hosted link");
  publish.type = "button";
  publish.className = "button primary";
  publish.id = "publishHostedCard";
  box.append(publish);
  const status = make("p");
  status.id = "hostedStatus";
  status.setAttribute("role", "status");
  box.append(status);
  const manage = make("button", "My hosted cards");
  manage.type = "button";
  manage.className = "button";
  manage.id = "listHostedCards";
  box.append(manage);
  const list = make("div");
  list.id = "ownedHostedCards";
  box.append(list);
  document.querySelector(".share-panel").prepend(box);
  let busy = false,
    attempt = null;
  const owner = () => {
    const value = input.value.trim();
    if (!hostedToken(value))
      throw new Error(
        "Enter your private owner key. Access must be provisioned before uploading.",
      );
    try {
      if (remember.checked)
        sessionStorage.setItem("silent-hello.hosted-owner", value);
      else sessionStorage.removeItem("silent-hello.hosted-owner");
    } catch {}
    return value;
  };
  publish.onclick = async () => {
    if (busy) return;
    busy = true;
    publish.disabled = true;
    status.textContent = "Checking your photo card…";
    try {
      if (new URLSearchParams(location.search).has("prepared"))
        throw new Error(
          "Publish photo cards from a separate manual card. Automatic assistant photo publication is not enabled.",
        );
      if (catalogueDesign(state.get().theme.id))
        throw new Error(
          "This new illustrated design shares as a static link. For hosted photos, choose an original photo-supported design; your local photo is kept.",
        );
      const key = owner();
      if (!consent.checked)
        throw new Error(
          "Confirm that you can share this photo and understand link access.",
        );
      if (!photoSignature(state))
        throw new Error("Choose a photo card and add a photograph first.");
      const current = state.get();
      if (
        current.giftEnabled &&
        current.giftUrl &&
        !sanitizeGiftUrl(current.giftUrl)
      )
        throw new Error("Use a valid HTTPS gift link before hosting.");
      if (
        current.birthdayNumberEnabled &&
        !birthdayNumber(current.birthdayNumber)
      )
        throw new Error("Enter an age from 1 to 120, or leave it blank.");
      if (!(await preview.checkFit()))
        throw new Error(
          "The card text needs more room before hosting. Your complete message is kept.",
        );
      const sig = fingerprint(state);
      if (attempt?.fingerprint !== sig || attempt.owner !== key) {
        const photoKey = photoSignature(state);
        const reusable =
          attempt?.owner === key && attempt.photoSignature === photoKey;
        attempt = {
          fingerprint: sig,
          photoSignature: photoKey,
          owner: key,
          uploadKey: crypto.randomUUID(),
          cardKey: crypto.randomUUID(),
          exported: reusable
            ? attempt.exported
            : await exportHostedPhoto(state),
          media: reusable ? attempt.media : null,
        };
      }
      if (sig !== fingerprint(state))
        throw new Error("Your card changed. Review it before hosting.");
      const cfg = await hostedRequest("/v1/config");
      if (!cfg.uploadsEnabled)
        throw new Error(
          "New photo uploads are paused. Existing hosted cards still open.",
        );
      status.textContent = attempt.media
        ? "Preparing your hosted card…"
        : "Uploading the edited photo…";
      if (!attempt.media)
        attempt.media = await hostedRequest("/v1/me/media", {
          method: "POST",
          owner: key,
          key: attempt.uploadKey,
          body: attempt.exported.blob,
          type: attempt.exported.blob.type,
        });
      if (sig !== fingerprint(state))
        throw new Error(
          "Your card changed while uploading. Review it before creating a link.",
        );
      const document = {
        version: 1,
        card: rawCard(state),
        photo: { ...attempt.exported.photo, mediaId: attempt.media.id },
      };
      const result = await hostedRequest("/v1/me/cards", {
        method: "POST",
        owner: key,
        key: attempt.cardKey,
        body: JSON.stringify(document),
      });
      if (sig !== fingerprint(state))
        throw new Error(
          "Your card changed during publication. Use My hosted cards to remove the earlier version, then publish your current card.",
        );
      const url = new URL(result.shareUrl),
        expected = new URL("./view.html", location.href);
      if (
        url.origin !== expected.origin ||
        url.pathname !== expected.pathname ||
        !hostedToken(url.searchParams.get("s"))
      )
        throw new Error(
          "The hosted link configuration does not match this storefront.",
        );
      records.set(state, { fingerprint: sig, url: url.href, id: result.id });
      status.textContent = `Hosted link ready. Expires ${new Date(result.expiresAt * 1000).toLocaleDateString()}. Use the share actions below.`;
    } catch (e) {
      status.textContent = e.message;
    } finally {
      busy = false;
      publish.disabled = false;
    }
  };
  manage.onclick = async () => {
    try {
      const key = owner(),
        data = await hostedRequest("/v1/me/cards", { owner: key });
      list.replaceChildren();
      for (const card of data.cards) {
        const row = make("div"),
          text = make(
            "p",
            `Card ${card.id.slice(0, 8)} · ${card.revoked ? "Removed" : `expires ${new Date(card.expiresAt * 1000).toLocaleDateString()}`}`,
          ),
          button = make("button", "Remove hosted card");
        button.type = "button";
        button.className = "button";
        button.disabled = card.revoked;
        button.onclick = async () => {
          if (
            !confirm(
              "Remove this hosted card? Existing links will stop working. Your local draft is kept.",
            )
          )
            return;
          try {
            await hostedRequest("/v1/me/cards/" + card.id, {
              owner: key,
              method: "DELETE",
            });
            records.delete(state);
            attempt = null;
            status.textContent =
              "Hosted card removed. Its photo will be cleaned up when no cards reference it.";
            manage.click();
          } catch (e) {
            status.textContent = e.message;
          }
        };
        const link = make("a", "Open hosted card");
        const target = new URL(card.shareUrl),
          expected = new URL("./view.html", location.href);
        if (
          target.origin === expected.origin &&
          target.pathname === expected.pathname &&
          hostedToken(target.searchParams.get("s"))
        ) {
          link.href = target.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          row.append(link);
        }
        row.append(text, button);
        list.append(row);
      }
      if (!data.cards.length)
        list.append(make("p", "No hosted cards for this owner key."));
    } catch (e) {
      status.textContent = e.message;
    }
  };
}
