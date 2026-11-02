export async function createCardController(iframe) {
  if (!iframe) throw new Error("Card preview not found.");
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Card preview could not load. Please refresh.")),
      12000,
    );
    iframe.addEventListener(
      "load",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
    iframe.src = new URL("./card-template.html", import.meta.url).href;
  });
  if (typeof iframe.contentWindow?.setCardData !== "function")
    throw new Error("Card engine is unavailable.");
  let queued = null,
    scheduled = 0,
    last = "";
  function flush() {
    cancelAnimationFrame(scheduled);
    scheduled = 0;
    if (!queued) return;
    const data = queued;
    queued = null;
    const signature = JSON.stringify(data);
    if (signature !== last) {
      last = signature;
      iframe.contentWindow.setCardData(data);
    }
  }
  return {
    update(card) {
      queued = {
        headline: card.headline,
        openingConfig: card.openingConfig || null,
        recipient: card.recipient,
        message: card.message,
        from: card.from,
        themeId: card.theme.id,
        palette: card.theme.palette,
        features: card.theme.features,
        fontId: card.fontId,
        textSize: card.textSize,
        watermark: card.watermark,
        giftUrl: card.giftUrl,
        birthdayNumber: card.birthdayNumber,
        paperOverride: card.paperOverride,
        inkOverride: card.inkOverride,
        stickerId: card.stickerId,
        milestone: !!card.theme.milestone,
      };
      if (!scheduled) scheduled = requestAnimationFrame(flush);
    },
    async checkFit() {
      flush();
      return iframe.contentWindow.checkFit();
    },
    play() {
      flush();
      iframe.contentWindow.play();
    },
  };
}
