# 737 NUDGE — content schema (write valid JSON, UTF-8)

Sources (manuels compagnie, non versionnés car propriété Boeing / Air Algérie — convertis avec `pdftotext -layout`):
- a39d2488-QRH_B737_MAX.txt            QRH 737 MAX (D6-27370-MAX-ALG, Jan 2026)
- 7d894c68-12-QRH-B737NG_REV55.txt     QRH 737 NG rev 55
- 93b0a388-FCTM_B737_MAX.txt           FCTM MAX
- 8e0df5e5-FCTM_B737-NG_REV_25.txt     FCTM NG rev 25
- 2d6612b2-FCOM_B737_MAX.txt           FCOM MAX
- c491a1cd-_737-8D6-ALG_OM_ALG_C-55_260330_V1V2_B2P-C.txt   FCOM NG Air Algérie (D6-27370-8D6-ALG rev 55)
- 7ac671ce-AFM_B737_MAX_REV_01.txt     AFM MAX
- 683babb6-SOP_B737_MAX-NG_ED03_REV_03_JUNE_26.txt   SOP company B737 MAX/NG Ed03 Rev03 (June 2026) — CURRENT
- 9de38ba9-SOP_B737.txt                older company SOP B737 (use the June 26 one when they differ)


## RULES (safety-critical content for line pilots)
- Every procedure item, number and limit MUST come from the docs. Copy checklist item wording VERBATIM in English (as printed, e.g. "Autopilot (if engaged) ... Disengage").
- If NG and MAX differ, say so precisely (field "fleet" on step, or "diff" text). Check BOTH QRH.
- Never invent. If unsure, leave it out. Each capsule has "sources" with doc + section/page + short verbatim quote proving key items.
- Learner-facing text in FRENCH (concise, punchy, pilot jargon OK: PF/PM, N1, A/T…). Procedure items stay in English.
- QCM: 4 options, exactly one correct, plausible distractors (typical confusions: 10/80 vs 4/75, order of items, wrong switch). "w" = 1-2 sentence explanation. Vary the correct index (a: 0..3).
- Keep it short: a capsule is played in under 3 minutes.

## Capsule (array in file, one object per capsule)
{
 "id": "ias",                       // short kebab id, unique
 "kind": "capsule",
 "cat": "memory" | "maneuver" | "sop",
 "code": "IAS",                     // 2-5 chars badge
 "title": "Airspeed Unreliable",    // as in QRH
 "titleFr": "Vitesse non fiable",
 "fleet": "both" | "NG" | "MAX",
 "ref": "QRH NNC 10.1 (NG & MAX) · FCTM ch.8",
 "flash": { "title": "Montée FL120, nuit, IMC.", "text": "2-3 phrases réalistes de mise en situation", "cues": ["IAS DISAGREE","Stick shaker", "..."] },  // cues = indications/alertes réelles (3-5)
 "steps": [ { "item": "Autopilot (if engaged)", "action": "Disengage", "fleet": "both" } ],   // memory / immediate action items ONLY, verbatim, in order. Conditional ones: item starts with "If ..." 
 "nums": [ { "v": "10°", "l": "Pitch", "s": "Flaps extended" }, { "v":"80%","l":"N1","s":"Flaps extended"} ],   // 2-4 big numbers to remember (from docs)
 "trap": "Le piège classique, en français, 1-2 phrases",
 "then": ["Ensuite : 3-5 puces courtes en français résumant les reference items / la suite (PROBE HEAT check ON, tables PI…)"],
 "diff": "Différence NG/MAX en 1-2 phrases, ou null",
 "qcm": [ { "q": "…", "o": ["…","…","…","…"], "a": 1, "w": "…" } ],   // exactly 5
 "sources": [ { "doc": "QRH MAX", "loc": "NNC 10.1", "quote": "Flaps up . . . 4° and 75% N1" } ]
}

## Masterclass (array in file)
{
 "id": "mc-ias", "kind": "masterclass", "code": "IAS", "title": "Unreliable Airspeed", "titleFr": "Masterclass · Vitesse non fiable",
 "fleet": "both", "minutes": 8, "ref": "FCTM ch.8 · QRH 10.1 · PI",
 "intro": "1-2 phrases d'accroche",
 "chapters": [   // 5-8 chapters, each one screen
   { "kicker": "Reconnaître", "title": "…", "body": ["paragraphe court", "…"], "bullets": ["…"], "nums": [ {"v":"4°","l":"Pitch","s":"Flaps up"} ], "quote": { "text": "verbatim FCTM sentence", "src": "FCTM MAX 8.x" } }
 ],   // body/bullets/nums/quote all optional except title
 "qcm": [ … 8 questions same format … ],
 "sources": [ … ]
}
