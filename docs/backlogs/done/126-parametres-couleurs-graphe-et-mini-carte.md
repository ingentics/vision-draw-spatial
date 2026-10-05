# Couleurs de la vue graphe et de la mini-carte dans les paramètres

> Itération — paramètres (vue graphe, mini-carte) ; reprise de 124

- Vue graphe : la carte de la page de départ prend la couleur d'accent (`selection.accentColor`) ; les autres couleurs
  deviennent réglables (section Liens entre pages, sous-section Vue graphe) : `graph.cardColor` (#9aa0a6),
  `graph.orphanColor` (#d93025), `graph.unreachableColor` (#e37400), `graph.arcColor` (#5f6368),
  `graph.titleColor` (#202124).
- Mini-carte : `minimap.edgeColor` (trait des flèches, #80868b) et `minimap.outlineColor` (contour des formes,
  #9aa0a6).
- Correction : la mini-carte peint les formes non supportées avec `shapes.placeholderFill` (et non plus une couleur
  fixe).
- **Fini quand :** changer ces couleurs met à jour la vue graphe et la mini-carte aussitôt ; une forme non supportée a
  la même couleur dans la vue et dans la mini-carte ; `make check` vert.
- Fait : `GraphSettings` (`cardColor`, `orphanColor`, `unreachableColor`, `arcColor`, `titleColor`) et
  `MinimapSettings` (`edgeColor`, `outlineColor`), défauts et relecture dans `settings.ts` (SPEC §13).
  `buildGraphPage(…, colors)` reçoit ses couleurs (`GraphColors`, `graph/graphPage.ts`) ; le moteur y met la couleur
  d'accent pour la page de départ et reconstruit la vue graphe quand l'accent change. La mini-carte lit ses couleurs
  par `MinimapSource.getColors()` ; `MinimapMapping.colors` les passe aux dessins des formes (contour,
  `placeholder.ts` qui prend maintenant `shapes.placeholderFill`). Panneau : couleurs sous Liens entre pages ›
  Vue graphe et dans la section Mini-carte. Tests : défauts, couleur invalide refusée, couleurs fournies à
  `buildGraphPage`. Vérifié dans l'appli : arcs rouges et cadre vert dans la vue graphe (départ en bleu d'accent),
  flèche rouge et contours bleus dans la mini-carte, puis valeurs par défaut remises.
