import { decodeRoseGift, readRoseState, roseStage } from "../engine/rose-gift.js";
import { roseImage, writeRoseNote } from "./rose-art.js";

const $ = (id) => document.getElementById(id);

function presentGift(gift, clock = Date.now) {
  const storageKey = `silent-hello.rose.v1.${gift.id}`;
  const controller = new AbortController();
  const listeners = { signal: controller.signal };
  let state = null;
  let lastNow = 0;
  let timer;
  let requestedStage;
  const now = () => (lastNow = Math.max(lastNow, clock()));

  function restore() {
    try {
      return readRoseState(JSON.parse(localStorage.getItem(storageKey)), now());
    } catch {
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  async function showArt(stage) {
    if (stage.id === requestedStage) return;
    requestedStage = stage.id;
    const art = $("giftArt");
    const image = roseImage(stage);
    try {
      await image.decode();
    } catch {
      if (controller.signal.aborted || requestedStage !== stage.id) return;
      requestedStage = undefined;
      $("giftError").textContent = "The rose image couldn’t load. Your note is still here.";
      return;
    }
    if (controller.signal.aborted || requestedStage !== stage.id) return;
    $("giftError").textContent = "";
    art.replaceChildren(image);
    art.dataset.stage = stage.id;
  }

  function update() {
    if (!state) return;
    clearTimeout(timer);
    const stored = restore();
    if (stored) {
      state = {
        openedAt: Math.min(state.openedAt, stored.openedAt),
        kept: state.kept || stored.kept,
      };
    }
    const current = now();
    const { stage, nextAt } = roseStage(gift.mode, state, current);
    showArt(stage);
    $("giftStage").textContent = stage.label;
    const preserved = stage.id === "keepsake";
    $("keepRose").hidden = preserved;
    $("keepHint").hidden = preserved;
    if (nextAt) timer = setTimeout(update, Math.max(1, nextAt - current));
  }

  function open(focus) {
    state = restore() || state || { openedAt: now(), kept: false };
    const saved = persist();
    $("unopened").hidden = true;
    $("opened").hidden = false;
    writeRoseNote($("giftNote"), gift);
    if (gift.mode === "evolving" && !saved)
      $("keepStatus").textContent = "Your browser couldn’t remember this opening. The rose can still be enjoyed on this page.";
    update();
    if (focus) $("giftTitle").focus();
  }

  $("revealRose").addEventListener("click", () => open(true), listeners);
  $("keepRose").addEventListener("click", () => {
    update();
    state = { ...state, kept: true };
    $("keepStatus").textContent = persist()
      ? "Your keepsake is saved in this browser."
      : "Your keepsake is here for this visit. The browser couldn’t save it.";
    update();
    $("keepStatus").tabIndex = -1;
    $("keepStatus").focus({ preventScroll: true });
  }, listeners);
  addEventListener("pageshow", update, listeners);
  addEventListener("focus", update, listeners);
  addEventListener("storage", (event) => {
    if (event.key === storageKey) update();
  }, listeners);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) update();
  }, listeners);
  if (restore()) open(false);
  else $("unopened").hidden = false;
  return () => {
    controller.abort();
    clearTimeout(timer);
  };
}

let disposeGift;
function loadGift() {
  disposeGift?.();
  disposeGift = undefined;
  $("unopened").hidden = true;
  $("opened").hidden = true;
  $("giftArt").replaceChildren();
  delete $("giftArt").dataset.stage;
  $("giftError").textContent = "";
  $("keepStatus").textContent = "";
  try {
    const payload = new URLSearchParams(location.hash.slice(1)).get("r");
    disposeGift = presentGift(decodeRoseGift(payload));
  } catch (error) {
    $("giftError").textContent = error.message;
  }
}
document.querySelector(".rose-skip").addEventListener("click", (event) => {
  event.preventDefault();
  $("main").focus();
});
addEventListener("hashchange", loadGift);
loadGift();
