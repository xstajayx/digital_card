const menu = document.querySelector(".brand-menu");
if (menu) {
  const toggle = menu.querySelector("summary");
  const sync = () => toggle.setAttribute("aria-expanded", String(menu.open));
  menu.addEventListener("toggle", sync);
  sync();
  document.addEventListener("keydown", (event) => {
    if (menu.open && event.key === "Escape" && !event.defaultPrevented &&
        !document.querySelector("dialog:modal")) {
      event.preventDefault();
      menu.open = false;
      toggle.focus();
    }
  });
  menu.querySelector("nav").addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      menu.open = false;
      toggle.focus({ preventScroll: true });
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) menu.open = false;
  });
}
