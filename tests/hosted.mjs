import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ILLUSTRATIONS } from "../engine/illustrations.js";
import { HOSTED_API, validatedHostedBase } from "../app/hosted-config.js";
import { hostedRequest, hostedToken } from "../app/hosted-client.js";
test("server catalogue exactly matches all shipped designs and illustration ownership", async () => {
  const ids = JSON.parse(
    await readFile(new URL("../themes/themes.json", import.meta.url)),
  );
  const backend = JSON.parse(
    await readFile(
      new URL("../backend/silent_hello/catalogue.json", import.meta.url),
    ),
  );
  assert.deepEqual(Object.keys(backend).sort(), ids.sort());
  for (const id of ids) {
    const theme = JSON.parse(
      await readFile(new URL(`../themes/${id}/theme.json`, import.meta.url)),
    );
    assert.equal(backend[id].birthday, !!theme.birthday);
    assert.deepEqual(
      backend[id].illustrations,
      (ILLUSTRATIONS[id] || []).map((i) => i.id),
    );
  }
});
test("unconfigured hosted transport fails closed without fetching; tokens are bounded capabilities", async () => {
  assert.equal(HOSTED_API, "");
  let calls = 0;
  const before = globalThis.fetch;
  try {
    globalThis.fetch = () => {
      calls++;
      throw new Error("No request expected");
    };
    await assert.rejects(() => hostedRequest("/v1/config"), /not configured/);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = before;
  }
  assert.equal(hostedToken("a".repeat(43)), true);
  for (const token of [
    "",
    null,
    "../secret",
    "a".repeat(44),
    "a".repeat(42) + ".",
  ])
    assert.equal(hostedToken(token), false);
});

test("invalid hosting configuration cannot break static editing or redirect owner credentials", () => {
  for (const value of [
    "garbage",
    "http://evil.invalid",
    "https://user:pass@example.com",
    "https://example.com/?key=secret",
    "https://example.com/#token",
  ])
    assert.equal(validatedHostedBase(value), "");
  assert.equal(
    validatedHostedBase("https://cards-api.example.com/"),
    "https://cards-api.example.com",
  );
  assert.equal(
    validatedHostedBase("http://127.0.0.1:8000"),
    "http://127.0.0.1:8000",
  );
});
