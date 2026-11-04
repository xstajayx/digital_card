# Hosted API contract

Public base URL is a deployment setting, never a user-supplied query parameter. The static frontend's legacy codecs remain unchanged. No cookies are used.

Owner endpoints require `Authorization: Bearer <private owner key>`. Media/card POSTs also require `Idempotency-Key: <fresh UUID for the intentional operation>`. Retries reuse that UUID. Do not log either header or share capability paths.

`POST /v1/me/media` accepts a raw `image/jpeg`, `image/png` or `image/webp` body. It returns `{ "id": "owned media UUID", "width": 900, "height": 1200, "bytes": 85000, "status": "ready" }` only after independent decode, optimisation, private storage and transactional quota finalisation. Do not treat client MIME/metadata as trust. Original filenames, object keys, source URLs and owner IDs are not accepted.

`POST /v1/me/cards` validates a versioned hosted envelope. Example (replace mediaId with the returned owned ready UUID):

```json
{
  "version": 1,
  "card": {
    "v": 5,
    "themeId": "birthday-balloons",
    "to": "Maya",
    "message": "A birthday full of little wonders.\n\nA favourite memory, just for you.",
    "from": "With love, Alex",
    "fontId": "quicksand",
    "textSize": 18,
    "watermark": true,
    "giftUrl": "",
    "birthdayNumber": "",
    "paperOverride": "",
    "inkOverride": "",
    "stickerId": "pink-cake",
    "openingConfig": { "type": "envelope", "tone": "theme", "wrap": "plain", "seal": true, "effect": "theme" },
    "physicalConfig": { "paper": "ivory", "coverGreeting": "Happy Birthday!", "coverName": "", "coverArt": "", "insideArt": "default", "handwriting": "pacifico", "signature": "pacifico", "effects": false }
  },
  "photo": {
    "mediaId": "123e4567-e89b-42d3-a456-426614174000",
    "kind": "memory",
    "layout": "inside",
    "aspect": "portrait",
    "border": "paper",
    "alt": "A favourite memory"
  }
}
```

Only existing themes/art/fonts/opening fields are allowed. Unknown fields (including owner, plan, arbitrary URL and client expiry) fail validation. A photo cover cannot claim an inside placement. Text limits use the same UTF-16 units as JavaScript. Only folded v5 photo records can be hosted in this release; traditional v1–v5 static sharing remains independent.

Publication returns `{ "id": "card UUID", "expiresAt": 1800000000, "shareUrl": "https://approved-static-site/view.html?s=<opaque token>", "revoked": false }`. The expiry is server-computed; the timestamp shown here is illustrative. A message/style change publishes a new immutable card/link. Reusing the same owned ready media ID avoids duplicating image storage.

Recipients call `GET /v1/shared/{token}` for the envelope/exact expiry and `GET /v1/shared/{token}/photo` for its one authorised private WebP. They send no owner key. There is no media-ID/object-key browse endpoint, listing, public bucket URL or unbounded public upload route.

Errors are bounded JSON `{ "detail": "human-readable reason" }`: 401 missing/revoked management access; 404 unknown/cross-owner/unavailable shares; 408 slow body; 409 conflicting idempotency/content or referenced media; 410 retry of removed/expired publication; 413 size/quota; 415 unsupported MIME; 422 invalid image/card; 429 throttled (Retry-After); 503 paused upload/storage/database/missing derivative. Unknown/expired/revoked share reads deliberately have the same response. No input/body/secret is echoed in schema errors.

R2 is proxied through the API so every retrieval checks current capability/expiry/revocation. Responses are no-store/nosniff/no-referrer. This trades some API bandwidth for immediate authorization checks. Already delivered bytes/in-flight responses cannot be recalled.
