// Explicit, optional assistant preferences. No delivery is activated here.
export const CONTACTS_KEY = "silent-hello.occasions.v2";
export function validEmail(value) {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(
      value,
    )
  );
}
export function validateProfile(raw, fallback = "") {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("The assistant preferences are invalid.");
  const text = (key, max, defaultValue = "") => {
    const value = raw[key] ?? defaultValue;
    if (
      typeof value !== "string" ||
      value.length > max ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
    )
      throw new Error(
        `Check ${key}; it contains unsupported text or is too long.`,
      );
    return value.trim();
  };
  const recipientName = text("recipientName", 120, fallback),
    relationship = text("relationship", 40),
    recipientEmail = text("recipientEmail", 254),
    themeId = text("themeId", 80),
    greeting = text("greeting", 1000);
  if (!recipientName || /[\r\n]/.test(recipientName))
    throw new Error("Enter a recipient name or nickname.");
  if (
    ![
      "",
      "brother",
      "sister",
      "parent",
      "partner",
      "friend",
      "family",
      "other",
    ].includes(relationship)
  )
    throw new Error("Choose a relationship from the list.");
  if (recipientEmail && !validEmail(recipientEmail))
    throw new Error(
      "Enter a valid recipient email address, or leave it blank. No email will be sent.",
    );
  const originYear = raw.originYear ?? null;
  if (
    originYear !== null &&
    (!Number.isInteger(originYear) ||
      originYear < 1900 ||
      originYear > new Date().getFullYear())
  )
    throw new Error(
      "Enter a past or current birth/anniversary year from 1900 onward, or leave it blank.",
    );
  if (themeId && !/^[a-z0-9-]+$/.test(themeId))
    throw new Error("Choose an existing card design.");
  const style = raw.style ?? "folded",
    opening = raw.opening ?? "envelope";
  if (
    !["folded", "standard"].includes(style) ||
    !["envelope", "gift-box", "none"].includes(opening)
  )
    throw new Error("Choose a supported card style and opening.");
  if (style === "folded" && opening !== "envelope")
    throw new Error(
      "Folded cards use an envelope. Choose standard style for another opening.",
    );
  for (const key of ["automation", "reviewBeforeSending"])
    if (raw[key] !== undefined && typeof raw[key] !== "boolean")
      throw new Error("Choose valid preparation and review preferences.");
  if (
    [...greeting.matchAll(/\{([^{}]+)\}/g)].some(
      (m) =>
        !["name", "age", "ordinalAge", "years", "ordinalYears"].includes(m[1]),
    )
  )
    throw new Error(
      "Greeting placeholders may be {name}, {age}, {ordinalAge}, {years} or {ordinalYears}.",
    );
  return {
    recipientName,
    relationship,
    originYear,
    recipientEmail,
    themeId,
    style,
    opening,
    greeting,
    automation: raw.automation ?? false,
    reviewBeforeSending: raw.reviewBeforeSending ?? true,
  };
}
