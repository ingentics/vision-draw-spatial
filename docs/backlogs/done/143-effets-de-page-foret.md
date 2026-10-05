# Effets de page, premier effet : Forêt

> Thème — comportements de page (cadre), à côté des modes (69) ; premier effet : Forêt

- **Effets de page.** Une page peut activer des **effets** : `spatial.effects="forest,…"` sur `<diagram>` (liste
  séparée par des virgules ; absent = aucun). Contrairement au mode (un seul par page), les effets se cumulent. Le
  mode reste maître : il peut refuser un effet (`PageModeDefinition.allowsEffect`), qui reste alors écrit mais
  inactif.
- **Un dossier par effet** : `src/engine/effects/<id>/index.ts` exporte `definition` ; le registre
  `effects/registry.ts` les liste explicitement. Retirer un effet = supprimer son dossier et sa ligne du registre.
  Un effet inconnu (fichier d'une version plus récente) reste écrit et est signalé dans les Diagnostics.
- **Contrat `PageEffectDefinition`** : `id`, `name`, `description`, et un décor de la scène en volume (vue iso / 3D,
  pas en 2D), construit à partir de la page et des emprises de ses éléments (formes, tracés et textes des flèches).
- **Panneau** : section « Effets » de la page, une case par effet ; activer / désactiver = une étape d'annulation.
- **Forêt** : en iso / 3D, des arbres poussent autour du schéma (tronc marron, feuillage vert foncé), simples (sapin
  ou feuillu), de tailles variées ; chaque arbre a sa graine, tirée de sa case d'une grille fixe : le même schéma
  donne la même forêt. Pas d'arbre près d'une forme, d'un tracé ou d'un texte : un arbre gêné se déplace dans sa case,
  sinon il ne pousse pas ; quand le schéma change, la forêt suit (des arbres disparaissent, d'autres poussent). La
  forêt s'étend autour de l'emprise du schéma et s'éclaircit vers ses bords. Elle pousse avec les volumes à la
  bascule 2D → iso / 3D.
- **Fini quand :** sur une page avec l'effet Forêt, des arbres apparaissent en iso / 3D et pas en 2D, jamais sur une
  forme, une flèche ou un texte ; déplacer une forme fait se réarranger la forêt ; décocher l'effet les retire ;
  supprimer `effects/forest/` et sa ligne du registre compile ; `make check` vert.
- Fait : cadre des effets dans `src/engine/effects/` — `types.ts` (`PageEffectDefinition`, `EffectRoom`),
  `registry.ts` (liste explicite `PAGE_EFFECT_DEFINITIONS`, effets actifs filtrés par le mode, avertissements des
  effets inconnus, `decorate` qui pose les décors dans la scène iso), `room.ts` (place prise par le schéma : emprises
  des formes et de leur texte hors forme, tracés et textes des flèches). `SPATIAL.effects`,
  `PageModeDefinition.allowsEffect`, `Engine.setPageEffect` (annulable) ; une page à décor passe en scène iso en iso /
  3D même sans forme en volume (`effectiveLevel`). Panneau : section « Effets » (`ContextPanel.tsx`). Forêt dans
  `effects/forest/` : grille de 64 px, graine par case (mulberry32), sapins (3 cônes) ou feuillus (boule à facettes),
  40 à 120 px, 6 places essayées par case, éclaircie de 260 à 560 px de l'emprise ; toute la forêt en un maillage à
  couleurs par sommet. Tests : `tests/engine/effects/forest.test.ts`. Vérifié à l'œil sur `fixtures/simple.drawio` :
  arbres en iso et 3D autour du schéma, aucun en 2D, retirés en décochant.
