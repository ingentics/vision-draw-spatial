# Retirer la pastille de lien

> Itération — interaction (sélection et liens) ; reprise de 09

- La pastille bleue (→ page, ↗ URL) au coin haut-droit des formes liées disparaît. Le repérage reste au survol
  (curseur main et infobulle).
- Le style `spatial.noLinkBadge`, qui servait seulement à masquer la pastille (cartes de la vue graphe), est retiré.
- **Fini quand :** une forme liée s'affiche sans pastille (à plat, iso, 3D) ; le survol montre toujours main et
  infobulle ; `make check` vert.
- Fait : `linkBadge` retiré de `render/decorations.ts` et de `createShapeObject` (`render/pageScene.ts`) ; style
  `spatial.noLinkBadge` supprimé (`spatial.ts`, `graph/graphPage.ts`, SPEC §14.3) ; SPEC (repérage des liens, iso,
  accent) et commentaires mis à jour. Test `pageScene` : plus de pastille sur les formes liées. `make check` vert.
