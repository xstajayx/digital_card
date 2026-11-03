# Mobile layout correction

Branch: `fix/mobile-responsive-layout`. Base: `d66832f` on main (the merged physical-card release). This is a layout/accessibility correction, not a new card format or a redesign. No Railway, DNS, payment or AI integration changes are included.

## Confirmed root causes

1. **Floated fieldset legends** were 100% wide. Flex labels following them attempted to fit beside that float. At 360px, the opening dropdown collapsed to 26px instead of the available 290px; the paper-card checkbox's label collapsed to zero width and grew to 140px tall. Its checkbox spilled beyond the label, and the editor's rounded-container clipping concealed the controls. Document scroll width still equalled the viewport, so document-width-only tests missed the defect. Removing the float fixes the actual layout; the checkbox label is now 290px wide with a 44px target.
2. **Rigid intrinsic text sizing** made the reset helper squeeze into a narrow column at enlarged text sizes. Its row grew to 413px in the reproduction. The row now wraps naturally, button text can wrap within its track, and branding/headings cannot force a wider page.
3. **Fixed footer clearance** assumed approximately 105px, although the navigation can grow to 152px at 200% text size. The existing bottom bar now uses explicit grid slots, while a ResizeObserver reserves its actual height. Safe-area padding remains. Focused fields can scroll above the bar. Android receives `interactive-widget=resizes-content`; visualViewport supplies a fallback inset for overlay keyboards.
4. **The tilted shop hero** expands its visual bounding box as its text grows. At 320px/200% text, it reached x=-23 through x=343. Its rotation is disabled on narrow/tablet layouts; the existing illustration, colours and type remain.
5. **The physical-card canvas reserved a fixed 82px for controls**, but enlarged text required a 153px action row. This overlapped the paper by 81px. The stage and action row now use normal grid flow. Stage-size changes trigger fitting without replaying the opening.

No `overflow-x:hidden` was added to body/html. Existing decorative clipping remains; regression checks verify controls fit inside those containers rather than relying on clipping to hide them.

## Step 4 and navigation

Fieldsets, labels, selects and toggles retain the existing structure and values. Every control now uses the available column width. Opening choices remain native selects, with short accessible descriptions. Wrapping/seal controls appear only for applicable openings; disabled design-default settings are not presented as a wall of unusable inputs. This introduces no new opening functionality and does not clear stored choices.

The paper-card control remains an explicit checkbox with its complete label alongside it. Its advanced controls appear when selected. Back, centred-between-actions progress, Next/Preview and Share remain in the bottom bar. The wider right-hand grid track accommodates the primary action at narrow sizes. Its height is measured rather than guessed, including safe-area padding and larger text. All five steps remain usable with vertical scrolling.

## Executed results

All existing commands ran successfully against this branch:

| Command | Actual outcome |
| --- | --- |
| `node tests/data.mjs` | 17 passed, 0 failed/skipped |
| `python3 -u tests/browser.py` | All 24 existing groups passed |
| `python3 -u tests/shop.py` | All four viewport groups passed |
| `python3 -u tests/interactive.py` | All four viewport groups passed |
| `python3 -u tests/physical.py` | All four viewport groups passed |
| `python3 -u tests/responsive.py` | All ten viewport groups passed |

Responsive sizes: 320×800, 360×800, 390×844, 412×915, 430×932, 768×1024, 1024×768, 1440×900, 800×360 and 844×390. Every group checks all five steps at normal and 200% text size, expanded personalisation/extras, horizontal control/container rectangles, button-text ranges, noncollapsed selects, touch target heights, keyboard focus, footer clearance and a reduced-height keyboard-sized viewport. It also checks homepage/gallery, AI, information pages, recipient controls, envelope/gift controls and physical-card controls; enlarged iframe action rows must not overlap the paper.

The regression test can reproduce the original defect from historical source. `RESPONSIVE_BASELINE_REF=d66832f python3 -u tests/responsive.py` captures before images and asserts that both original problem controls fail container/collapse checks. The ordinary CI command has no historical-Git dependency. Its assertions use actual element rectangles and text ranges, not only document scrollWidth. Existing tests continue to cover draft/link persistence, v1–v5 compatibility, fonts, fitting, sharing, keyboard/reduced motion and opening behavior.

JavaScript syntax, Python compilation, pinned Prettier 3.6.2 formatting and `git diff --check` are checked before commit. No application build is required.

## Before / after evidence

Actual Chromium screenshots, visually inspected:

- [Before Step 4, 360px](screenshots/responsive/before-step4-360.png) → [After, same paper-card settings](screenshots/responsive/after-step4-paper-360.png)
- [Before Step 4, 390px](screenshots/responsive/before-step4-390.png) → [After, same paper-card settings](screenshots/responsive/after-step4-paper-390.png)
- [Expanded Step 4, 360px](screenshots/responsive/after-step4-expanded-360.png)
- [Desktop Step 4](screenshots/responsive/after-step4-paper-1440.png)

Viewport screenshots of **all five steps at both 360px and 390px** are committed in [screenshots/responsive/](screenshots/responsive/), named `after-stepN-WIDTH-viewport.png`. Full-page captures for all five steps and desktop comparison are also generated under `/workspace/onboarding/responsive/`. Full-page snapshots retain the real fixed bar at the capture scroll position; viewport captures show its actual on-screen placement. Fields below it are scrollable above it, as verified by focus/rectangle assertions.

Before captures use the original page/editor styles and entry modules from the named baseline. The checked screenshot state has paper mode enabled and extras closed; the matching after capture uses the same state. Expanded extras have separate after images.

## Files and compatibility

[RESPONSIVE_CHANGED_FILES.txt](RESPONSIVE_CHANGED_FILES.txt) lists exact paths. Main changes: `assets/app.css`, `assets/shop.css`, `app/opening-picker.js`, the small `app/responsive.js` layout helper imported by main, the studio viewport meta tag, physical-card stage flow and fitting notification, and `tests/responsive.py`/CI.

Schemas, codecs, template manifests, art, fonts, messages and sharing implementations are unchanged. Native opening IDs and option values are unchanged. Existing selected settings remain in preview, local drafts and shared cards. No new application dependencies are added; the formatter is an ephemeral development tool.

## Limits / review

Testing uses Chromium on Linux, including touch/viewport emulation, enlarged text and reduced viewport heights. An actual Android/iOS software keyboard, browser chrome, display cutout and OS-native select popup cannot be fully reproduced by these checks. Verify the original Android device before release; Safari/Firefox and real-device safe-area behavior remain manual checks. Native select values can use ordinary in-control ellipsis for long labels; the control itself is fully inside its container and full choices remain in the native picker.

Review the branch and screenshots, run all six commands, and merge only after review. Keep current GitHub Pages settings; no backend or environment configuration is needed. Rollback is a revert of this focused change. No production merge or deployment is performed here.
