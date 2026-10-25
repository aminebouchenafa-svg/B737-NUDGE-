# 737 Nudge

3-minute safety capsules and masterclasses for **B737 NG / MAX** pilots.
Short, playful and replayable: one reflex a day, on iPhone or iPad.

## What's inside

- **Capsules (3 min)**: flash scenario → recall items (tap to check, in order) → key numbers → what's next / the trap / NG-MAX difference → 5-question quiz.
  - *Memory items* (QRH immediate action items)
  - *Maneuvers* (QRH Non-Normal Maneuvers)
  - *Company SOP* (SOP B737 MAX-NG Ed 03 Rev 03, June 2026)
- **Masterclasses (~8 min)**: chaptered course (FCTM / QRH / FCOM) with the big numbers and sourced quotes, then an 8-question quiz.
- **Spaced review**: every wrong answer comes back the next day; each capsule comes back at D+1, D+3, D+7, D+14, D+30 depending on the score.
- **Motivation**: XP, combos, day streak, ranks (Cadet → Captain · TRE), badges.
- **NG / MAX fleet switch**: fleet-specific items and capsules adapt.

## Install on iPhone / iPad

The app is a PWA: no App Store needed, and it works offline after the first launch.

1. Host the folder (GitHub Pages: Settings → Pages → branch, folder `/`).
2. Open the URL in Safari → Share → **Add to Home Screen**.

Local test: `python3 -m http.server`, then open http://localhost:8000.

## Editing content

All training content lives in `content/*.json` (format in `content/SCHEMA.md`).
Each item keeps its `sources` (document, section, verbatim quote) for review.

After editing:

```
python3 tools/build.py
```

The script checks the content (4 options, one right answer, 5 questions per capsule, 8 per masterclass, unique ids)
and regenerates `src/content.js` and `dist/artifact.html` (single-file preview).
Bump `VERSION` in `sw.js` so devices pick up the update.

## Disclaimer

Training aid only. It does not replace the current QRH, FCOM, FCTM or SOP.
Content must be reviewed and approved by the technical/training department before release.
