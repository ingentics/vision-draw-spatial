# Tracé « Droite » pour les flèches

> Itération — panneau de droite (tracé des flèches) et paramètres

- Nouveau choix de tracé « Droite », en tête des boutons « Coudes » (avant angles droits, arrondi, courbe) : la
  flèche va en ligne droite d'une forme à l'autre (ou par ses points posés), comme « Straight » de draw.io : la clé
  `edgeStyle` est retirée (ainsi que `curved` et `noEdgeStyle`), `rounded=0`.
- Revenir à angles droits / arrondi / courbe depuis une flèche droite remet `edgeStyle=orthogonalEdgeStyle` ; une
  flèche ayant déjà un routeur (ex. `elbowEdgeStyle`) le garde.
- Paramètres, « Tracé des flèches » des flèches créées : option « Droite » (connecteur créé sans `edgeStyle`).
- **Fini quand :** une flèche passée en « Droite » est tracée en ligne droite et le bouton est actif ; revenir en
  « Arrondi » la refait orthogonale ; une flèche tirée avec le paramètre « Droite » est droite ; `make check` vert.
- Fait : `src/app/ContextPanel.tsx` (bouton « Droite » en tête des « Coudes » ; patch de tracé calculé par flèche :
  les coudes remettent `edgeStyle=orthogonalEdgeStyle` aux seules flèches droites), `src/engine/Engine.ts`
  (`setElementsStyle` accepte un patch fonction du style ; connecteurs créés : `edgeStyle` porté par le tracé),
  `src/engine/settings.ts` et `src/app/SettingsPanel.tsx` (option `straight` / « Droite »), `docs/SPEC.md`. Vérifié
  dans l'appli : sur `simple.drawio`, la flèche « appelle » passe en ligne droite avec le bouton actif, puis
  redevient orthogonale avec « Arrondi » ; `make check` vert.
