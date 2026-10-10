# Event storming : panneau d'un post-it allégé (ni contacts, ni Style, ni Bordure)

> Itération — mode Event storming, panneau d'un post-it (reprise de 475)

- Le champ « Contacts » (lecture seule) du panneau d'un post-it est retiré, et avec lui la section « Event storming »,
  qui n'avait que lui. La lecture des contacts (`contacts(page)`) reste, pour les sujets qui les interpréteront.
- Ni « Style » ni « Bordure » dans le panneau d'un post-it : sa couleur est celle de son type, sans contour (forme
  `styleable: false`, sujet 440) ; un style de la palette appliqué à une sélection laisse les post-it tels quels.
- **Fini quand :** un post-it sélectionné sur `eventstorming.drawio` n'a plus de section « Event storming », « Style »
  ni « Bordure » dans son panneau ; `make check` vert.
- Fait : `CONTACTS_PROPERTY` retiré des réglages du mode (`index.ts`) et `contacts/contactsText.ts` supprimé (il ne
  servait qu'au panneau ; ses deux tests avec) ; post-it en `styleable: false` (`shapes/common/stickyShape.ts`). Écart
  : la couleur d'un post-it ne se change plus dans le panneau (475 le permettait), et un style de la palette appliqué
  à une sélection laisse les post-it tels quels. Test dans `tests/engine/plugins/modes/eventstorming/index.test.ts` ;
  SPEC §14.5. Vérifié à l'œil sur `eventstorming-commande.drawio` : le panneau de la Command « Payer » n'a plus que
  Texte, Lien, Disposition et Supprimer.
