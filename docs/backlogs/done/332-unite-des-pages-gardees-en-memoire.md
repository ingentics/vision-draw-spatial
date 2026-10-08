# Unité du réglage « Pages gardées en mémoire »

Paramètres › Liens entre pages › Préchargement : « Pages gardées en mémoire » (`preload.maxCachedPages`) affiche sa
valeur en « px » (`SettingsPanel.tsx`, `format={(v) => \`${v} px\`}`) au lieu d'un nombre de pages.
- Fait : la valeur s'affiche « 1 page », « 8 pages » (`SettingsPanel.tsx`). Vu dans Paramètres › Liens entre pages : « 8 pages ».
