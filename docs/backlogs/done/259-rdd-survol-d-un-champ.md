# RDD : survol d'un champ, pré-sélection

> Itération — mode RDD (sélection d'un champ) ; reprise de 249

- Sur une page modifiable, la souris au-dessus d'une ligne d'une table (champ ou séparateur) la met en valeur
  légèrement : fond de la couleur d'accent à 7 % et petite bordure (trait de 1 px à 50 %, demande de l'utilisateur ;
  la sélection : fond à 15 % et trait plein de 1,5 px) ; rien sur la
  ligne déjà sélectionnée, ni pendant un glisser, ni sur l'entête.
- Cadre : générique pour les parties de forme d'un mode (`ModeParts`).
- **Fini quand :** en survolant les lignes d'Orphan, chacune s'éclaire légèrement tour à tour ; la ligne sélectionnée
  garde sa mise en valeur ; hors des lignes, plus rien ; `make check` vert.
- Fait : `ShapeParts.hover` / `hoveredBounds` (partie survolée d'une forme d'une page modifiable, état remis à zéro
  avec le document, la partie sélectionnée exclue au dessin), appelé par `PointerInput.handleHover` ;
  `SelectionHighlight.updateHover` (objet à part, refait avec la mise en valeur) ; `partSelection(…, hover)`
  (`render/decorations.ts` : fond à 7 %, trait de 1 px à 50 %). Pas de survol pendant un glisser (les contrôles n'appellent pas
  le survol). Tests `tests/engine/render/decorations.test.ts` (sélection : 15 % et trait ; survol : 7 % et trait à 50 %).
  SPEC §14.5, `AJOUTER_UN_MODE.md`. Vérifié dans l'appli : `name` d'Orphan survolé → fond léger ; `Field1`
  sélectionné et `is_active` survolé → sélection marquée avec trait, survol léger avec sa petite bordure.
