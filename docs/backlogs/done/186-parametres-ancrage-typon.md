# Paramètres de l'ancrage Typon

> Itération — paramètres (formes et flèches) ; reprise de 175

- Le Typon a ses propres réglages globaux, distincts de l'automatique : contourner les formes et les flèches,
  écart aux formes (10 px), écart entre flèches = pas de la grille (10 px), premier et dernier segments (20 px),
  détour pour éviter un croisement (500), coût d'un coude à 45° (15) et à 90° (30).
- Paramètres : l'arbre gagne un troisième niveau. La page « Formes et flèches › Ancrage » n'a que l'ancrage par
  défaut et son aide ; deux pages en dessous, « Automatique » et « Typon », portent chacune ses réglages (la
  recherche les montre toutes) ; l'ancienne sous-section « Ancrage automatique » disparaît.
- **Fini quand :** l'arbre montre « Formes et flèches › Ancrage › Automatique / Typon » ; changer un réglage Typon
  change le tracé d'une page Typon sans toucher aux pages en automatique ; `make check` vert.
- Fait : réglages `shapes.edgePcbAutoRoute`, `edgePcbShapeClearance`, `edgePcbSpacing`, `edgePcbPortStub`,
  `edgePcbCrossingDetour`, `edgePcbBend45`, `edgePcbBend90` (`settings/types.ts`, `defaults.ts`, `limits.ts`,
  `merge/shapes.ts`) ; `arrangement.ts` les passe au tracé d'une page Typon, `octilinear.ts` prend le coût des
  coudes (`BendCosts`, défaut 15 / 30 comme avant). Arbre des paramètres : composant `Subsubsection`
  (`PanelSection.tsx`), nœud `group` dans `SettingsPanel.tsx` (arbre, fil d'Ariane, page seule, recherche) ; choisir
  un nœud déplie ses enfants. Vérifié dans l'appli : pages Ancrage, Automatique et Typon, recherche « coude ». SPEC
  §14.1 à jour.
