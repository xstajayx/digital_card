import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  inspectRaster,
  validateEdit,
  cropGeometry,
  LIMITS,
} from "../app/photo-image.js";
const bytes = readFileSync(
  new URL("./fixtures/photo-portrait.jpg", import.meta.url),
);
const buffer = bytes.buffer.slice(
  bytes.byteOffset,
  bytes.byteOffset + bytes.byteLength,
);
test("actual JPEG header is inspected; MIME, SVG, GIF and corrupt data rejected", () => {
  assert.equal(inspectRaster(buffer, "image/jpeg").type, "image/jpeg");
  for (const [data, mime] of [
    [buffer, "image/png"],
    [
      new TextEncoder().encode('<svg onload="alert(1)"></svg>').buffer,
      "image/jpeg",
    ],
    [new TextEncoder().encode("GIF89a").buffer, "image/gif"],
    [new Uint8Array([255, 216, 255, 192, 0, 0]).buffer, "image/jpeg"],
  ])
    assert.throws(() => inspectRaster(data, mime));
});
test("truncated JPEG marker runs produce a clear format error, never a buffer exception", () => {
  const bad = new Uint8Array([255, 216, ...new Array(40).fill(255)]);
  assert.throws(() => inspectRaster(bad.buffer, "image/jpeg"), /valid, still/);
});
test("image budgets reject empty files, huge dimensions and invalid PNG headers", () => {
  assert.throws(() => inspectRaster(new ArrayBuffer(0), "image/jpeg"));
  assert.throws(() =>
    inspectRaster(new ArrayBuffer(LIMITS.bytes + 1), "image/jpeg"),
  );
  const png = new Uint8Array(45),
    d = new DataView(png.buffer);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  d.setUint32(8, 13);
  png.set(new TextEncoder().encode("IHDR"), 12);
  d.setUint32(16, 10001);
  d.setUint32(20, 1000);
  d.setUint32(33, 0);
  png.set(new TextEncoder().encode("IEND"), 37);
  assert.throws(() => inspectRaster(png.buffer, "image/png"), /pixels/);
  d.setUint32(16, 6000);
  d.setUint32(20, 6000);
  assert.throws(() => inspectRaster(png.buffer, "image/png"), /megapixels/);
  d.setUint32(16, 100);
  d.setUint32(20, 100);
  png.set(new TextEncoder().encode("acTL"), 37);
  assert.throws(() => inspectRaster(png.buffer, "image/png"), /still/);
});
test("crop geometry covers frame at every rotation and permits only bounded zoom/positions", () => {
  for (const rotation of [0, 90, 180, 270])
    for (const aspect of ["square", "portrait"])
      for (const zoom of [1, 2, 3]) {
        const edit = validateEdit({ rotation, aspect, zoom, x: 1, y: -1 });
        const w = 900,
          h = aspect === "square" ? 900 : 1200;
        const g = cropGeometry(1000, 1400, edit, w, h);
        const rw = rotation % 180 ? 1400 : 1000,
          rh = rotation % 180 ? 1000 : 1400;
        assert.ok(rw * g.scale >= w - 1e-9);
        assert.ok(rh * g.scale >= h - 1e-9);
        assert.ok(g.dx >= 0);
        assert.ok(g.dy <= 0);
      }
  for (const patch of [
    { zoom: 4 },
    { zoom: NaN },
    { x: 2 },
    { y: -2 },
    { rotation: 45 },
    { aspect: "landscape" },
    { border: "url(x)" },
    { layout: "script" },
    { alt: "x".repeat(161) },
  ])
    assert.throws(() => validateEdit(patch));
});
test("photo editing settings whitelist only local presentation fields", () => {
  const e = validateEdit({
    message: "private",
    url: "https://remote.example",
    zoom: 2,
  });
  assert.equal(e.message, undefined);
  assert.equal(e.url, undefined);
  assert.equal(e.zoom, 2);
});
