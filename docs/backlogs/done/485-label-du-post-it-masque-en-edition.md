# Event storming : le label du type reste affiché pendant l'édition du texte

> Itération — mode Event storming, reprise de 475

- En éditant le texte d'un post-it (double-clic, F2), le label du type (« Command »…) disparaissait alors que le
  réglage « Labels » de la page est coché : il était dessiné comme le label de la cellule, que l'éditeur en place
  masque pendant la saisie. Le label du type, imposé, n'est pas le texte de la cellule : il reste affiché.
- **Fini quand :** sur `eventstorming-commande.drawio`, éditer le texte d'un post-it laisse le label du type visible
  au-dessus de la zone d'édition ; le texte du ticket, lui, est toujours masqué sous l'éditeur ; `make check` vert.
- Fait : option `fixed` de `createLabel` (`core/render/flat/box.ts`) : texte imposé par la forme, posé sans cellule
  porteuse (`labelObject` sans `cellId`), donc ni masqué par l'éditeur en place ni cliqué comme un label ; le label du
  type du post-it l'utilise (`shapes/common/stickyShape.ts`). Test `tests/engine/core/render/flat/box.test.ts` ; SPEC
  §14.5. Vérifié à l'œil sur `eventstorming-commande.drawio` : en éditant « Notifier le client », « COMMAND » reste
  affiché au-dessus de l'éditeur.
