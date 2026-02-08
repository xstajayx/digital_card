# JWorldCreations Digital Card Studio

A static, GitHub Pages-ready website for building animated digital cards and exporting them as GIFs. Everything runs in the browser—no backend required.

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

## GIF export (brief)

The preview is rendered in an iframe using `/engine/card-template.html`. When you click **Download GIF**, the app spins up an offscreen copy of the same card, restarts the animation from time 0, captures frames with `html2canvas`, and encodes them into an animated GIF using a lightweight `gif.js`-style encoder stored in `/vendor`.
