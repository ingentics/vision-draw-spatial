# RDD : sélectionner un champ dans une table

> Milestone — mode RDD (comportements des modèles) ; dépend de 246 ; socle de 250 à 254

- Un clic sur une ligne de champ **sélectionne ce champ** (ligne surlignée), que la table soit déjà sélectionnée ou non
  ; un clic sur l'entête sélectionne la table entière. Échap désélectionne le champ (retour à la table).
- Le panneau montre, pour le champ sélectionné : label, kind (choix parmi les quatre), nullable (case), type (lecture
  seule, voir 250) ; la clé primaire n'a ni kind ni nullable modifiables.
- Double-clic sur un champ : édition du label sur place (comme le nom d'une forme) ; Entrée valide, Échap annule ;
  un label vide est refusé (label précédent conservé).
- Chaque modification est une étape d'annulation et recalcule la largeur (247).
- **Fini quand :** on sélectionne un champ au clic, on change son label sur place, son kind et nullable au panneau
  (l'icône suit) ; ⌘Z annule chaque changement ; `make check` vert.
- Fait : cadre des **parties de forme** : `PageModeDefinition.parts` (`ModeParts` : `at`, `bounds`, `text`, `setText`,
  `modes/types.ts`), `Selection.part` (gardée au rechargement du document si le mode la connaît encore), domaine
  `core/modes/shapeParts.ts` (partie sous le pointeur, emprise de la partie sélectionnée, texte). Clic sur une partie,
  la forme sélectionnée ou non : la partie (`PointerInput.handleClick`) ; Échap : `Selections.escape` (partie → forme →
  rien) ; double-clic sur une partie à texte : `LabelEditor.editPartLabel` (éditeur sur une ligne, fond blanc, tout le
  texte sélectionné, suit la vue), validé par `Engine.setPartText`. Mise en valeur : `partSelection`
  (`render/decorations.ts`, fond à 15 % et trait de l'accent), quel que soit le style de sélection. Réglages de partie :
  `ModeProperty.part`, `value` / `write` / `hidden` reçoivent la partie, filtrés par `PageModeRegistry.properties(page,
  scope, part)` ; le panneau ne montre que la section du mode quand une partie est sélectionnée (`ContextPanel`,
  `ModeFields`). Éditeur : `LabelEditRequest.part` et `singleLine` (Entrée seule valide, `richEditor.ts`). RDD :
  `rdd/fieldParts.ts` (partie = rang du champ), `fieldRow` (`tables.ts`), `setField` (`operations.ts` : label non vide,
  kind et nullable, jamais sur la clé primaire ni vers elle), réglages « Champ », « Type », « Rôle », « Nullable ». Le
  titre du panneau reste « Forme ». Tests `rdd.test.ts` (partie sous un point, emprise, texte et échelle, label vide
  refusé, kind et nullable, réglages montrés par partie et écrits). La sélection, Échap et l'éditeur ne sont vérifiés
  que dans l'appli (pas de tests du cœur sans canvas). Vérifié dans l'appli : un clic sur `email`, User non sélectionnée
  → ligne surlignée, panneau du champ ; Rôle « Clé étrangère (autre domaine) » et Nullable → icône verte trouée ; Échap
  → la table ; double-clic sur `role` → éditeur, Entrée valide, la table s'élargit.
