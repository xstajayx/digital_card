import { decodeFlowerGift, giftOpened, rememberGift } from "../engine/flowers/gift.js";
import { flowerProduct } from "../engine/flowers/catalogue.js";
import { flowerPresentation } from "./flower-presentation.js";

const gift = document.querySelector("#flowerGift");
const error = document.querySelector("#giftError");
let dispose;

function load() {
  dispose?.();
  gift.hidden = true;
  error.textContent = "";
  gift.querySelector("[data-art]").hidden = false;
  gift.querySelector("button[data-bloom]").hidden = false;
  gift.querySelector("[data-status]").textContent = "";
  try {
    const data = decodeFlowerGift(location.hash.slice(1));
    dispose = flowerPresentation(gift, flowerProduct(data.productId), data, {
      opened: giftOpened(data),
      onOpen: () => rememberGift(data),
    });
    gift.hidden = false;
  } catch (failure) {
    error.textContent = failure.message;
  }
}
document.querySelector(".flower-skip").addEventListener("click", (event) => {
  event.preventDefault();
  document.querySelector("main").focus();
});
addEventListener("hashchange", load);
load();
