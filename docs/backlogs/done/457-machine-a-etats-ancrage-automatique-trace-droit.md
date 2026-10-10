# Machine à états : ancrage automatique et tracé droit par défaut

> Itération — mode Machine à états ; reprise de 442 ; dépend de 456 (tracé au choix en ancrage automatique)

- Une page qui passe en mode Machine à états prend l'ancrage automatique et le tracé droit
  (`page.defaults: { anchoring: 'auto', edgeLine: 'straight' }`, au lieu de l'ancrage manuel) : les transitions sont
  réparties sur les côtés des états et tracées en segments directs, sans contournement.
- Les pages déjà en mode ne changent pas (les réglages ne sont posés qu'à l'arrivée dans le mode, sujet 442).
- **Fini quand :** une page passée en mode Machine à états affiche « Automatique » et « Droite » dans son panneau ;
  ses transitions sont réparties sur les côtés et droites ; une transition tirée entre deux états l'est aussi ;
  `make check` vert.
- Fait : `page.defaults` du mode (`plugins/modes/states/index.ts`) : `{ anchoring: 'auto', edgeLine: 'straight' }` ;
  commentaire de `ModePage.defaults` et SPEC (mode Machine à états) à jour. Vérifié dans l'appli : une nouvelle page
  passée en mode Machine à états affiche Automatique et Droite. Transition tirée entre deux états non vérifiée à l'œil.
