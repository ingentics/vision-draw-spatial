# RDD : réordonner les champs au glisser

> Milestone — mode RDD (comportements des modèles) ; dépend de 249

- Glisser un champ **déjà sélectionné** verticalement dans sa table le déplace ; pendant le glisser, la table est
  redessinée avec le champ à sa nouvelle place (les autres se décalent), mis en valeur (retour de l'utilisateur : un
  simple trait d'insertion ne suffisait pas à comprendre où il va). Un glisser depuis un champ non sélectionné déplace la table, comme avant (choix de l'utilisateur).
- La clé primaire reste toujours en tête : elle ne se glisse pas, et rien ne se dépose au-dessus d'elle.
- Les séparateurs (253) se glissent comme les champs.
- Une étape d'annulation ; glisser hors de la table annule le geste (pas de déplacement entre tables à ce stade).
- **Fini quand :** un champ glissé de la 4ᵉ à la 2ᵉ ligne y reste, `id` ne bouge jamais ; ⌘Z remet l'ordre ;
  `make check` vert.
- Fait : `ModeParts.dropAt` (place visée sous le pointeur), `preview` (forme telle qu'elle serait, et la partie à sa
  nouvelle place) et `move` (`modes/types.ts`) ; glisser de partie `PartDrag` (`core/edit/drag/types.ts`) et `PartDrags`
  (`core/edit/drag/part.ts` : saisie de la partie sélectionnée sous l'appui, forme redessinée en direct par
  `LiveEdits.rebuildShapeObject` à chaque nouvelle place, curseur « grabbing », lâcher en une étape d'annulation
  « Ordre » puis sélection de la partie à sa nouvelle place ; hors de toute place, la forme reprend son dessin),
  branchés dans `DragGesture` avant le déplacement de forme ; la mise en valeur suit l'aperçu
  (`ShapeParts.selectedBounds`). RDD : `fieldParts.dropAt` (la ligne survolée : le champ y prend la place ; entre la
  clé primaire et la fin ; aucune hors de la table, sur lui-même ou pour la clé primaire), `preview` et `move`,
  `movedFields` / `moveField` (`operations.ts`). Les séparateurs suivront au 253. Tests `rdd.test.ts` (places, aperçu
  sans écriture, rangs après le lâcher, refus). SPEC §14.5, `AJOUTER_UN_MODE.md`. Vérifié dans l'appli : `Field1`
  d'Orphan glissé entre `id` et `name` → 2ᵉ ligne, sélectionné, table immobile ; ⌘Z remet l'ordre ; glissé depuis
  `name` non sélectionné → la table se déplace ; `is_active` glissé sur la 2ᵉ ligne, bouton tenu → table redessinée
  avec `is_active` en 2ᵉ, mis en valeur ; pointeur sorti de la table → ordre d'origine, lâcher sans effet.
