# 737 Nudge

Capsules de sécurité de 3 minutes et masterclass pour pilotes **B737 NG / MAX**.
Format court, ludique, rejouable : on révise un réflexe par jour sur iPhone ou iPad.

## Ce que contient l'app

- **Capsules (3 min)** : situation flash → items à réciter (tap pour vérifier, dans l'ordre) → chiffres clés → la suite / le piège / la différence NG-MAX → QCM 5 questions.
  - *Memory items* (immediate action items du QRH)
  - *Manœuvres* (Non-Normal Maneuvers du QRH)
  - *SOP compagnie* (SOP B737 MAX-NG Ed 03 Rev 03, juin 2026)
- **Masterclass (~8 min)** : cours en chapitres (FCTM / QRH / FCOM) avec les gros chiffres, citations sourcées, puis QCM 8 questions.
- **Révision espacée** : chaque erreur revient le lendemain ; chaque capsule revient à J+1, J+3, J+7, J+14, J+30 selon le score.
- **Motivation** : XP, combos, série de jours, grades (Cadet → Captain · TRE), badges.
- **Sélecteur de flotte NG / MAX** : les items et capsules propres à une flotte s'adaptent.

## Installer sur iPhone / iPad

L'app est une PWA : pas d'App Store, elle marche hors ligne après la première ouverture.

1. Héberger le dossier (GitHub Pages : Settings → Pages → branche, dossier `/`).
2. Ouvrir l'URL dans Safari → Partager → **Sur l'écran d'accueil**.

Pour tester en local : `python3 -m http.server` puis ouvrir http://localhost:8000.

## Modifier le contenu

Tout le contenu pédagogique est dans `content/*.json` (format décrit dans `content/SCHEMA.md`).
Chaque élément garde ses `sources` (document, section, citation mot pour mot) pour la relecture.

Après modification :

```
python3 tools/build.py
```

Le script vérifie le contenu (4 options, une bonne réponse, 5 questions par capsule, 8 par masterclass, ids uniques)
puis régénère `src/content.js` et `dist/artifact.html` (aperçu en un seul fichier).
Pensez à incrémenter `VERSION` dans `sw.js` pour que les appareils récupèrent la mise à jour.

## Avertissement

Outil de révision. Il ne remplace pas le QRH, le FCOM, le FCTM ni les SOP en vigueur.
Le contenu doit être relu et validé par l'encadrement technique avant diffusion.
