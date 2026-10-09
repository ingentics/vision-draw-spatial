# Touche « x » : basculer le sens d'une flèche de flux

> Itération — mode Séquences, reprise de 426

- En mode Séquences, une flèche d'un flux sélectionnée seule : la touche `x` bascule son sens aller / retour (style
  `dashed`, comme le choix « Sens » du panneau). Une seule opération, annulable.
- Uniquement dans le plugin du mode (`keys`), sans toucher au cœur. Sans effet sur une flèche hors flux ; Ctrl+X / ⌘X
  restent « couper ».
- **Fini quand :** dans l'appli, `x` sur une flèche d'un flux la passe en pointillés, `x` à nouveau la remet pleine, et
  Ctrl+Z annule.
- Fait : touche `x` dans les `keys` du mode (`plugins/modes/sequences/index.ts`), sur une flèche d'un flux seulement ;
  `isReturn` / `setReturn` partagés avec le choix « Sens » ; test dans `tests/engine/plugins/modes/sequences.test.ts` ;
  SPEC §14. Vérifié dans l'appli (`fixtures/sequences.drawio`, flèche « login ») : `x` bascule pointillés / plein et
  le panneau suit, ⌘Z annule (la flèche est alors désélectionnée).
