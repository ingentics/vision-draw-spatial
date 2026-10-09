# Types exportés sans lecteur : règle tranchée

> Itération — conventions du code (`coding.md` §6) ; dette vue au sujet 386

- Les `export interface` / `export type` lus seulement dans leur fichier (41 aujourd'hui, hors ceux nommés par la
  documentation) sont, sauf un, le type d'un paramètre, d'un retour ou d'un champ d'un symbole exporté (ex.
  `StrokeOptions` de `strokeMesh`, `LabelInsets`, `NewShape` d'`addShapeCell`, `TableLook` de `TableKind.look`).
- Règle retenue : un tel type reste exporté (l'appelant doit pouvoir le nommer) ; un type qui ne sert qu'à
  l'intérieur du fichier n'est pas exporté. Écrite dans `coding.md` §6.
- Seul cas hors règle : `EasingName` (`interaction/transitionMath.ts`, transtypage interne) perd son `export`.
- **Fini quand :** chaque type exporté sans lecteur extérieur sert une signature ou un champ exporté ; règle écrite ;
  `make check` vert.
- Fait : liste établie par script (types exportés sans autre lecteur dans `src/`, `tests/`, `docs/`), puis classée
  selon leur usage dans les déclarations exportées ; `EasingName` n'est plus exporté ; règle ajoutée à
  `.claude/rules/coding.md` §6. Retirer l'`export` des 41 compile aussi avec émission des déclarations (TypeScript
  les recopie localement) : la règle est donc de lisibilité pour l'appelant, pas une contrainte du compilateur.
  Aucun changement de comportement ; vérifié par `make check`.
