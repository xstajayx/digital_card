// Raster-only local processing. No file names, source bytes or metadata persist.
export const LIMITS = {
  bytes: 10 * 1024 * 1024,
  pixels: 24_000_000,
  edge: 10000,
  output: 1600,
};
const fail = () => {
  throw new Error(
    "Choose a valid, still JPEG, PNG or WebP image. SVG, GIF and animated images are not supported.",
  );
};
export function inspectRaster(buffer, mime) {
  const b = new Uint8Array(buffer),
    d = new DataView(buffer);
  if (!b.length || b.length > LIMITS.bytes)
    throw new Error("Choose a photo no larger than 10 MB.");
  let width, height, type;
  const dimensions = (w, h) => {
    if (width !== undefined && (width !== w || height !== h)) fail();
    width = w;
    height = h;
  };
  const ascii = (at, n) => String.fromCharCode(...b.slice(at, at + n));
  if (
    b.length >= 33 &&
    ascii(1, 3) === "PNG" &&
    b[0] === 137 &&
    b[4] === 13 &&
    b[5] === 10 &&
    b[6] === 26 &&
    b[7] === 10 &&
    ascii(12, 4) === "IHDR" &&
    d.getUint32(8) === 13
  ) {
    type = "image/png";
    width = d.getUint32(16);
    height = d.getUint32(20);
    for (let p = 8; p + 12 <= b.length; ) {
      const length = d.getUint32(p);
      if (p + length + 12 > b.length) fail();
      if (ascii(p + 4, 4) === "acTL" || (p !== 8 && ascii(p + 4, 4) === "IHDR"))
        fail();
      p += length + 12;
    }
  } else if (
    b.length >= 30 &&
    ascii(0, 4) === "RIFF" &&
    ascii(8, 4) === "WEBP" &&
    d.getUint32(4, true) + 8 === b.length
  ) {
    type = "image/webp";
    for (let p = 12; p + 8 <= b.length; ) {
      const tag = ascii(p, 4),
        length = d.getUint32(p + 4, true),
        at = p + 8;
      if (at + length > b.length) fail();
      if (tag === "ANIM" || tag === "ANMF") fail();
      if (tag === "VP8X" && length >= 10) {
        if (b[at] & 2) fail();
        dimensions(
          1 + b[at + 4] + (b[at + 5] << 8) + (b[at + 6] << 16),
          1 + b[at + 7] + (b[at + 8] << 8) + (b[at + 9] << 16),
        );
      } else if (
        tag === "VP8 " &&
        length >= 10 &&
        b[at + 3] === 157 &&
        b[at + 4] === 1 &&
        b[at + 5] === 42
      ) {
        dimensions(
          d.getUint16(at + 6, true) & 0x3fff,
          d.getUint16(at + 8, true) & 0x3fff,
        );
      } else if (tag === "VP8L" && length >= 5 && b[at] === 47) {
        const bits = d.getUint32(at + 1, true);
        dimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
      }
      p = at + length + (length % 2);
    }
  } else if (b.length >= 4 && b[0] === 255 && b[1] === 216) {
    type = "image/jpeg";
    let frames = 0;
    for (let p = 2; p + 3 < b.length; ) {
      if (b[p++] !== 255) fail();
      while (b[p] === 255) p++;
      if (p >= b.length) fail();
      const marker = b[p++];
      if (marker === 217 || marker === 218) break;
      if (p + 2 > b.length) fail();
      const length = d.getUint16(p);
      if (length < 2 || p + length > b.length) fail();
      if (marker === 226 && ascii(p + 2, 4) === "MPF\0") fail();
      if ([192, 193, 194].includes(marker) && length >= 8) {
        if (++frames > 1) fail();
        height = d.getUint16(p + 3);
        width = d.getUint16(p + 5);
      }
      p += length;
    }
  } else fail();
  if (mime !== type) fail();
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 64 ||
    height < 64 ||
    width > LIMITS.edge ||
    height > LIMITS.edge ||
    width * height > LIMITS.pixels
  )
    throw new Error(
      "Use an image at least 64 × 64 pixels, at most 24 megapixels and no more than 10,000 pixels on either edge.",
    );
  if (Math.max(width, height) / Math.min(width, height) > LIMITS.output / 64)
    throw new Error(
      "Choose a less panoramic photo so the processed image keeps at least 64 pixels on both sides.",
    );
  return { type, width, height };
}
export function validateEdit(raw = {}) {
  const edit = {
    zoom: 1,
    x: 0,
    y: 0,
    rotation: 0,
    aspect: "portrait",
    border: "paper",
    layout: "framed",
    alt: "Your personal photograph",
    ...raw,
  };
  for (const [key, min, max] of [
    ["zoom", 1, 3],
    ["x", -1, 1],
    ["y", -1, 1],
  ])
    if (!Number.isFinite(edit[key]) || edit[key] < min || edit[key] > max)
      throw new Error("The photo crop is invalid. Reset it and try again.");
  if (
    ![0, 90, 180, 270].includes(edit.rotation) ||
    !["square", "portrait"].includes(edit.aspect) ||
    !["rectangle", "rounded", "paper", "gold"].includes(edit.border) ||
    !["full", "framed", "inside"].includes(edit.layout) ||
    typeof edit.alt !== "string" ||
    edit.alt.length > 160
  )
    throw new Error("The photo layout is invalid. Reset it and try again.");
  return Object.fromEntries(
    ["zoom", "x", "y", "rotation", "aspect", "border", "layout", "alt"].map(
      (key) => [key, edit[key]],
    ),
  );
}
export function cropGeometry(width, height, edit, targetWidth, targetHeight) {
  const rotated = edit.rotation % 180 !== 0,
    rw = rotated ? height : width,
    rh = rotated ? width : height;
  const scale = Math.max(targetWidth / rw, targetHeight / rh) * edit.zoom;
  const dx = edit.x * Math.max(0, (rw * scale - targetWidth) / 2),
    dy = edit.y * Math.max(0, (rh * scale - targetHeight) / 2);
  return { scale, dx, dy };
}
function canvasBlob(canvas, type = "image/jpeg") {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new Error(
                "The photo could not be processed. Try a smaller image.",
              ),
            ),
      type,
      0.9,
    ),
  );
}
export async function normalizePhoto(file) {
  if (!(file instanceof Blob) || file.size > LIMITS.bytes || !file.size)
    throw new Error("Choose a photo no larger than 10 MB.");
  const header = inspectRaster(await file.arrayBuffer(), file.type);
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "This photo could not be decoded. Try exporting it as a new JPEG or PNG.",
    );
  }
  try {
    if (bitmap.width * bitmap.height !== header.width * header.height)
      throw new Error(
        "This image has inconsistent dimensions. Choose another photo.",
      );
    const ratio = Math.min(
      1,
      LIMITS.output / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Photo editing is not available in this browser.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await canvasBlob(canvas, "image/png");
  } finally {
    bitmap.close();
  }
}
export async function loadPhoto(blob) {
  // Drafts are still validated and decoded; IndexedDB is not a trust boundary.
  inspectRaster(await blob.arrayBuffer(), blob.type);
  const url = URL.createObjectURL(blob),
    image = new Image();
  image.src = url;
  try {
    await image.decode();
    return { image, url };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(
      "The saved photo is missing or damaged. Replace it to continue.",
    );
  }
}
export function drawCrop(canvas, image, raw) {
  const edit = validateEdit(raw),
    ctx = canvas.getContext("2d");
  const { scale, dx, dy } = cropGeometry(
    image.naturalWidth,
    image.naturalHeight,
    edit,
    canvas.width,
    canvas.height,
  );
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2 + dx, canvas.height / 2 + dy);
  ctx.rotate((edit.rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  ctx.restore();
}
export async function editedPhoto(image, edit) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = edit.aspect === "square" ? 900 : 1200;
  drawCrop(canvas, image, edit);
  return canvasBlob(canvas);
}
