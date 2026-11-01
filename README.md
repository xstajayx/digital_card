# JWorldCreations Digital Card Studio

A static, GitHub Pages-ready website for building animated digital cards and sharing them by link. Everything runs in the browser—no backend required.

## Run locally

Because the app loads theme files dynamically, it needs to be served from a local web server.

```bash
cd /workspace/digital_card
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In **Settings → Pages**, select the `main` branch (or your default branch) and the `/root` folder.
3. Save. GitHub Pages will publish the site and provide a URL.

## Theme system

Themes live in `/themes/<themeId>/` and must include both a `theme.json` and a `theme.css` file. The app loads theme IDs from `/themes/themes.json`.

### Theme JSON schema

```json
{
  "id": "birthday-balloons",
  "name": "Birthday Balloons",
  "occasion": "Birthday",
  "defaults": {
    "to": "Toe",
    "message": "Your default message...",
    "from": "With love 💛"
  },
  "palette": {
    "paper": "#f7e8d4",
    "ink": "#2b2622",
    "accent": "#e85aa3",
    "accent2": "#65a9ff",
    "gold": "#f2c14e"
  },
  "timing": {
    "balloonsMs": 3000,
    "insideDelayMs": 2000,
    "headlineDelayMs": 2200,
    "subDelayMs": 2550,
    "fromDelayMs": 2750,
    "fxStartMs": 2400,
    "fxStopMs": 8200
  },
  "features": {
    "balloonCurtain": true,
    "confetti": true,
    "sparkles": true
  }
}
```

### Add a new theme

1. Create a new folder inside `/themes/` using your theme ID.
2. Add a `theme.json` file following the schema above.
3. Add a `theme.css` file to customize decorative styling.
4. Add the new theme ID to `/themes/themes.json`.
5. Reload the app to see the new theme in the gallery.

## Validation

Run `python3 -m http.server 8001 --directory /workspace` and `python3 tests/browser.py` with Python Playwright and Chromium installed. Tests exercise the GitHub Pages `/digital_card/` prefix. Card text is never truncated; measured fitting stops at 14px and sharing is blocked when content still overflows. Reset Design resets appearance and optional extras while preserving your theme and written content.

The six fonts are served locally from `assets/fonts/`, sourced from the official `google/fonts` repository with their accompanying OFL licenses. Illustration IDs live in `engine/illustrations.js`; old PNG-named IDs map to local SVG assets so existing links continue working. Unknown illustration IDs are ignored. The viewer validates payloads and only accepts HTTPS gift links without embedded credentials.

The browser checks use Chromium and test 360px, 390px, and 1280px widths, all six fonts, all 15 occasions and illustration options, overflow validation, preserved Unicode/newlines, theme/colour/font parity in shared cards, birthday suffixes, legacy links, invalid data, receiver sharing controls, and browser console errors. WhatsApp URLs are intercepted rather than sending messages. Screenshots are written outside the checkout in `/workspace/onboarding/`.
