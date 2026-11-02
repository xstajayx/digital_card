// Sharing is always user-initiated. No analytics, shortener or message storage.
export function bindShareActions({
  buttons,
  getUrl,
  status,
  fallback,
  linkInput,
  mirrors = [],
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
      const controls = [...Object.values(buttons), ...mirrors];
      controls.forEach((b) => {
        b.disabled = true;
        b.setAttribute("aria-busy", "true");
      });
      say("Preparing your card…");
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
        if (kind === "whatsapp") {
          const destination = `https://wa.me/?text=${encodeURIComponent(`You’ve got a card 💌 ${url}`)}`;
          if (popup) {
            popup.location.href = destination;
            say("WhatsApp opened. Choose who to send your card to.");
          } else {
            manual(url);
            say(
              "Your browser blocked the WhatsApp window. Copy the link below instead.",
            );
          }
        } else if (kind === "native" && navigator.share) {
          try {
            await navigator.share({
              title: "A little card for you",
              text: "You’ve got a card 💌",
              url,
            });
            say("Card shared. A little joy is on its way!");
          } catch (error) {
            if (error.name === "AbortError")
              say("Sharing cancelled. Your card is ready whenever you are.");
            else {
              await copy(url);
            }
          }
        } else await copy(url);
      } catch (error) {
        popup?.close();
        say(error.message || "We couldn’t share that card. Please try again.");
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
