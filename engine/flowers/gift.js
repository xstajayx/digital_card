import { flowerProduct } from "./catalogue.js";
import { decodeRoseGift, newRoseId, ROSE_LIMITS } from "../rose-gift.js";

export { newRoseId as newGiftId, ROSE_LIMITS as GIFT_LIMITS };
const MAX_PAYLOAD = 10_000;

function validate([version, productId, id, greeting, message, signature]) {
  if (version !== 2) throw new Error("This flower gift uses an unsupported version.");
  if (!flowerProduct(productId)) throw new Error("This flower is unavailable.");
  if (typeof id !== "string" || !/^[0-9a-f]{32}$/.test(id))
    throw new Error("This flower gift link is invalid.");
  const fields = { greeting, message, signature };
  for (const [field, limit] of Object.entries(ROSE_LIMITS)) {
    if (typeof fields[field] !== "string" || fields[field].length > limit)
      throw new Error(`The ${field} must be ${limit} characters or fewer.`);
  }
  return { productId, id, ...fields };
}

export function encodeFlowerGift({ productId, id, greeting, message, signature }) {
  const record = [2, productId, id, greeting, message, signature];
  validate(record);
  const bytes = new TextEncoder().encode(JSON.stringify(record));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeFlowerGift(fragment) {
  if (fragment.length > MAX_PAYLOAD + 3) throw new Error("This flower gift link is too long.");
  const params = new URLSearchParams(fragment);
  if (!params.has("f") && params.has("r")) {
    const { mode, ...gift } = decodeRoseGift(params.get("r"));
    return { ...gift, productId: "blush-rose", legacy: true };
  }
  const payload = params.get("f");
  if (!payload) throw new Error("Ask the sender for the complete flower gift link.");
  if (payload.length > MAX_PAYLOAD || !/^[A-Za-z0-9_-]+$/.test(payload))
    throw new Error("This flower gift link is invalid.");
  let record;
  try {
    const bytes = Uint8Array.from(atob(payload.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));
    record = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("This flower gift link is invalid.");
  }
  if (!Array.isArray(record) || record.length !== 6)
    throw new Error("This flower gift link is invalid.");
  return validate(record);
}

const storageKey = (gift) => `silent-hello.flower.v2.${gift.productId}.${gift.id}`;

export function giftOpened(gift) {
  try {
    if (localStorage.getItem(storageKey(gift)) === "1") return true;
    if (gift.legacy) {
      const previous = JSON.parse(localStorage.getItem(`silent-hello.rose.v1.${gift.id}`));
      return previous?.kept === true;
    }
  } catch {}
  return false;
}

export function rememberGift(gift) {
  try {
    localStorage.setItem(storageKey(gift), "1");
  } catch {}
}
