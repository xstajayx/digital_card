import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validatePhysical,
  defaultPhysical,
} from "../engine/physical-schema.js";
import { validateCard, cardContent, FONTS } from "../engine/card-data.js";
import { defaultOpening } from "../engine/openings/config.js";
import { encodeCard, decodeCard } from "../engine/share-codec.js";
const ids = JSON.parse(
  await readFile(new URL("../themes/themes.json", import.meta.url)),
);
const themes = await Promise.all(
  ids.map(async (id) => ({
    ...JSON.parse(
      await readFile(new URL(`../themes/${id}/theme.json`, import.meta.url)),
    ),
    id,
  })),
);
test("historical v5 physical documents keep absence of coverName and original font settings", () => {
  const old = defaultPhysical();
  assert.deepEqual(validatePhysical(old, themes[0].id), old);
  assert.equal(
    Object.hasOwn(validatePhysical(old, themes[0].id), "coverName"),
    false,
  );
});
test("optional cover name is explicit, bounded text; all real fonts round-trip in v5", async () => {
  for (const font of FONTS)
    for (const coverName of [
      "",
      "Jamie, the birthday star",
      "<script>plain text</script>",
    ]) {
      const physicalConfig = {
        ...defaultPhysical(),
        handwriting: font,
        signature: font,
        coverName,
      };
      const raw = {
        v: 5,
        themeId: themes[0].id,
        to: "Jamie",
        message: "A personal message.\n\nWith paragraphs.",
        from: "Stacey",
        fontId: font,
        openingConfig: { ...defaultOpening(), tone: "theme" },
        physicalConfig,
      };
      const card = validateCard(raw, themes),
        payload = await encodeCard(card);
      const result = await decodeCard(payload);
      assert.deepEqual(result.physicalConfig, physicalConfig);
      assert.equal(result.to, "Jamie");
      assert.equal(result.message, raw.message);
    }
  for (const value of [null, 42, "x".repeat(121)])
    assert.throws(
      () =>
        validatePhysical(
          { ...defaultPhysical(), coverName: value },
          themes[0].id,
        ),
      /cover name/,
    );
});
test("default cover greeting has no recipient name; custom greeting and age are independent", () => {
  const theme = themes.find((t) => t.birthday);
  const content = cardContent({
    theme,
    to: "Jamie",
    message: "Keep this",
    from: "Stacey",
    birthdayNumberEnabled: true,
    birthdayNumber: "21",
    physicalConfig: {
      ...defaultPhysical(),
      coverName: "",
      coverGreeting: "Our own greeting",
    },
  });
  assert.equal(content.coverDefault, "Happy 21st Birthday!");
  assert.equal(content.physicalConfig.coverGreeting, "Our own greeting");
  assert.equal(content.physicalConfig.coverName, "");
  assert.equal(content.recipient, "Jamie");
  assert.equal(content.message, "Keep this");
});
