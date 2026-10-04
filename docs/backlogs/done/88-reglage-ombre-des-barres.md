# Réglage de l'ombre des barres sur la zone de dessin

> Itération — paramètres (barres latérales) ; reprise de 86 et 87

- Paramètre `panels.shadow` : intensité de l'ombre que la palette, les panneaux et les barres du haut et du bas
  projettent sur la zone de dessin, en % d'opacité (0 à 30, pas de 1, défaut 6 ; 0 = pas d'ombre).
- Curseur « Ombre sur la zone de dessin » dans la section « Barres latérales » des paramètres.
- **Fini quand :** le curseur fait varier l'ombre des quatre bords à chaud, 0 la supprime, la valeur est gardée au
  rechargement ; `make check` vert.
- Fait :
  - `settings.ts` : `panels.shadow` (défaut 0,06, bornes 0–0,3 au pas de 0,01), fusionné et borné par
    `mergeSettings` ; test dans `settings.test.ts` ; SPEC §13 à jour.
  - `Viewer.tsx` pose `--bar-shadow-opacity` sur `.app` ; `main.css` en tire `--bar-shadow`, utilisé par les ombres
    de la barre d'outils, de la barre des pages, de la palette, du panneau latéral et des Diagnostics.
  - `SettingsPanel.tsx` : curseur « Ombre sur la zone de dessin » (« Aucune » à 0) dans « Barres latérales ».
  - Vérifié dans l'appli : curseur présent à 6 %, ombre des quatre bords suivant la variable à chaud.
