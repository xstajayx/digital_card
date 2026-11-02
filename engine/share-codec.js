// v1/v2: base64url JSON in ?d=. v3: compact array, optionally deflated, in #c=.
// The fragment keeps personal text out of HTTP requests and server access logs.
const MAX_BYTES = 65536;
const MAX_URL = 12000;
const encode64 = (bytes) =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
function decode64(value) {
  if (!value || value.length > 40000 || !/^[\w-]+$/.test(value))
    throw new Error("Invalid or missing card data.");
  return Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
}
async function boundedBytes(stream) {
  const reader = stream.getReader(),
    chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_BYTES) throw new Error("Card data is too large.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
function compact(card) {
  return [
    3,
    card.themeId,
    card.to,
    card.message,
    card.from,
    card.fontId === "fredoka" ? "" : card.fontId,
    card.textSize === 18 ? 0 : card.textSize,
    card.watermark ? 1 : 0,
    card.giftUrl || "",
    card.birthdayNumber || "",
    card.paperOverride || "",
    card.inkOverride || "",
    card.stickerId || "",
  ];
}
function expand(data) {
  if (!Array.isArray(data) || data.length !== 13 || data[0] !== 3)
    throw new Error("Unsupported compact card data.");
  if (![0, 1].includes(data[7])) throw new Error("Invalid watermark.");
  return {
    v: 3,
    themeId: data[1],
    to: data[2],
    message: data[3],
    from: data[4],
    fontId: data[5] || "fredoka",
    textSize: data[6] || 18,
    watermark: data[7] === 1,
    giftUrl: data[8],
    birthdayNumber: data[9],
    paperOverride: data[10],
    inkOverride: data[11],
    stickerId: data[12],
  };
}
export async function encodeCard(card, { compress = true } = {}) {
  const bytes = new TextEncoder().encode(JSON.stringify(compact(card)));
  if (bytes.length > MAX_BYTES) throw new Error("Card data is too large.");
  let payload = `3u.${encode64(bytes)}`;
  if (compress && typeof CompressionStream !== "undefined") {
    try {
      const packed = await boundedBytes(
        new Blob([bytes])
          .stream()
          .pipeThrough(new CompressionStream("deflate")),
      );
      const candidate = `3z.${encode64(packed)}`;
      if (candidate.length < payload.length) payload = candidate;
    } catch {
      /* Raw compact links also work without compression support. */
    }
  }
  return payload;
}
export async function decodeCard(payload) {
  let bytes,
    modern = false;
  if (/^3[uz]\./.test(payload)) {
    modern = true;
    bytes = decode64(payload.slice(3));
    if (payload.startsWith("3z.")) {
      if (typeof DecompressionStream === "undefined")
        throw new Error("Please open this card in a current browser.");
      bytes = await boundedBytes(
        new Blob([bytes])
          .stream()
          .pipeThrough(new DecompressionStream("deflate")),
      );
    }
  } else bytes = decode64(payload);
  if (bytes.length > MAX_BYTES) throw new Error("Card data is too large.");
  const value = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  );
  return modern ? expand(value) : value;
}
export async function buildShareUrl(card) {
  const url = new URL("view.html", location.href);
  url.search = "";
  url.hash = `c=${await encodeCard(card)}`;
  if (url.href.length > MAX_URL)
    throw new Error(
      "This link is too long. Shorten the message or gift URL and try again.",
    );
  return url.href;
}
