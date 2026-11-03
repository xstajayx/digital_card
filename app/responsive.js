// Reserve the actual bottom-bar height, including enlarged text and safe areas.
// Android resizes-content handles its keyboard; visualViewport covers overlay keyboards.
const footer = document.querySelector(".step-footer");
if (footer) {
  const root = document.documentElement;
  new ResizeObserver(() =>
    root.style.setProperty(
      "--studio-footer-height",
      `${footer.getBoundingClientRect().height}px`,
    ),
  ).observe(footer);
  function keyboardInset() {
    const viewport = window.visualViewport;
    const editable = document.activeElement?.matches("input,textarea,select");
    const inset =
      viewport && viewport.scale === 1 && editable
        ? Math.max(0, innerHeight - viewport.height - viewport.offsetTop)
        : 0;
    root.style.setProperty(
      "--keyboard-inset",
      inset > 80 ? `${inset}px` : "0px",
    );
  }
  window.visualViewport?.addEventListener("resize", keyboardInset);
  window.visualViewport?.addEventListener("scroll", keyboardInset);
  document.addEventListener("focusin", keyboardInset);
  document.addEventListener("focusout", () =>
    requestAnimationFrame(keyboardInset),
  );
}
