import { emailDraft, smsDraft } from "./message-links.js";
// Sharing is always user-initiated. No analytics, shortener or message storage.
export function bindShareActions({
  buttons,
  getUrl,
  status,
  fallback,
  linkInput,
  mirrors = [],
  getContext = () => ({}),
  item = {
    name: "card",
    title: "A little card for you",
    text: "You’ve got a card 💌",
    success: "Card shared. A little joy is on its way!",
  },
}) {
  let busy = false;
  const say = (message) => {
    status.textContent = message;
  };
  const manual = (url) => {
    fallback.hidden = false;
    linkInput.value = url;
    linkInput.focus();
    linkInput.select();
  };
  async function copy(url) {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      say("Link copied! Send it to someone lovely.");
    } catch {
      manual(url);
      say("Your link is ready. Select and copy it below.");
    }
  }
  for (const [kind, button] of Object.entries(buttons)) {
    button.addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      fallback.hidden = true;
      const previousLaunch = fallback.nextElementSibling;
      if (previousLaunch?.classList.contains("transport-link"))
        previousLaunch.hidden = true;
      const controls = [...Object.values(buttons), ...mirrors];
      controls.forEach((b) => {
        b.disabled = true;
        b.setAttribute("aria-busy", "true");
      });
      say(`Preparing your ${item.name}…`);
      // Reserve a window during the click so mobile browsers do not block an async popup.
      let popup = null;
      try {
        if (kind === "whatsapp") {
          try {
            popup = window.open("about:blank", "_blank");
            if (popup) popup.opener = null;
          } catch {
            popup = null;
          }
        }
        const url = await getUrl();
        if (["email", "sms"].includes(kind)) {
          manual(url);
          let launch = fallback.nextElementSibling;
          if (!launch?.classList.contains("transport-link")) {
            launch = document.createElement("a");
            launch.className = "button transport-link";
            fallback.after(launch);
          }
          launch.href =
            kind === "email" ? emailDraft(url, getContext()) : smsDraft(url);
          launch.textContent =
            kind === "email" ? "Open email draft" : "Open SMS draft";
          launch.hidden = false;
          say(
            "Draft ready. Open your messaging app below, or copy the complete link. Nothing has been sent.",
          );
        } else if (kind === "whatsapp") {
          const destination = `https://wa.me/?text=${encodeURIComponent(`${item.text} ${url}`)}`;
          if (popup) {
            popup.location.href = destination;
            say(`WhatsApp opened. Choose who to send your ${item.name} to.`);
          } else {
            manual(url);
            say(
              "Your browser blocked the WhatsApp window. Copy the link below instead.",
            );
          }
        } else if (kind === "native" && navigator.share) {
          try {
            const payload = {
              title: item.title,
              text: item.text,
              url,
            };
            if (navigator.canShare && !navigator.canShare(payload)) {
              await copy(url);
              return;
            }
            await navigator.share(payload);
            say(item.success);
          } catch (error) {
            if (error.name === "AbortError")
              say(`Sharing cancelled. Your ${item.name} is ready whenever you are.`);
            else {
              await copy(url);
            }
          }
        } else await copy(url);
      } catch (error) {
        popup?.close();
        say(error.message || `We couldn’t share that ${item.name}. Please try again.`);
      } finally {
        busy = false;
        controls.forEach((b) => {
          b.disabled = false;
          b.removeAttribute("aria-busy");
        });
      }
    });
  }
}
