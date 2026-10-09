# Aide au survol des réglages de plugin dans les Paramètres

> Itération — Paramètres de l'appli (`SettingsPanel.tsx`, réglages déclarés) ; dette vue au sujet 391

- `PluginSetting.title` (aide au survol, déclarée par la forêt sur ses cinq réglages) n'est jamais montré dans la
  sous-page des paramètres d'un plugin. L'afficher en infobulle `useTooltip` au survol du réglage (pas de `title`
  natif), comme les autres aides au survol de l'appli. Les infobulles `useTooltip` doivent pour cela s'afficher
  au-dessus de la fenêtre des Paramètres (`<dialog>` modal).
- **Fini quand :** Paramètres › Effets › Forêt : survoler « Taille des arbres » montre « Hauteur des plus grands
  arbres » ; un réglage sans `title` n'a pas d'infobulle ; `make check` vert.
- Fait : `PluginSettingFields` (`src/app/SettingsPanel.tsx`) entoure un réglage qui a un `title` d'un bloc à infobulle
  `useTooltip`. `useTooltip` (`src/app/Tooltip.tsx`) rend désormais l'infobulle dans le `<dialog>` modal ouvert qui
  contient l'élément survolé, sinon dans `document.body` : la fenêtre des Paramètres, au-dessus de tout le document, la
  cachait. Changement : les infobulles déjà présentes dans les Paramètres (choix par icônes) s'affichent aussi
  désormais. Vérifié à l'œil (Paramètres › Effets › Forêt, survol de « Taille des arbres » ; palette toujours bonne).
