# Icônes et pastilles pour les réglages des modes

> Itération — contrat des modes (`engine/core/modes/types.ts`) et `ModeFields.tsx`. Dépend de 317.

- `ModeOption` prend une icône facultative (même format de tracés que l'`icon` d'un mode) ; une propriété `select`
  dont toutes les options ont une icône ou une couleur s'affiche en groupe de boutons au lieu d'une liste, sinon
  la liste reste (choix dynamiques et nombreux).
- **Couleur d'une région RDD** (`rdd.regionColor`, `REGION_COLORS`) : pastilles de couleur cliquables.
- **Type de participant (Séquences)** (`spatial.seq.participant`) : — / Bus / Queue, avec une icône pour bus et
  queue.
- Restent des listes : flux d'une flèche (nombre variable, nommés), type de champ RDD (nombreux, textuels), lien
  « Vers » et flux exporté (`ExportViewer.tsx`).
- `docs/AJOUTER_UN_MODE.md` dit quand une propriété `select` s'affiche en boutons.
- **Fini quand :** dans l'appli, la couleur d'une région se choisit par pastilles et le type d'un participant par
  icônes ; le flux d'une flèche est toujours une liste.
- Fait : `ModeOption` prend `icon` (tracés d'une `ModeIcon`) et `title` (aide au survol du bouton) ; `ModeFields.tsx`
  affiche un `select` dont toutes les options ont une icône ou une couleur en `ChoiceGroup` (pastille
  `.choice-swatch` ou icône du mode), sinon la liste. Couleur d'une région RDD : six pastilles, aide « Fond de la
  région (fillColor=…) ». Type de participant : trois icônes — l'option « — » a aussi la sienne (boîte et ligne de vie,
  « participant ordinaire »), sans quoi la règle « toutes les options » la laisserait en liste. Le flux d'une flèche
  reste une liste (« Aucun » sans couleur). `ModeOption` exporté par `engine/index.ts` ; règle décrite dans
  `docs/AJOUTER_UN_MODE.md`. Vérifié dans l'appli : pastilles d'une région (choix puis annulation), icônes d'un
  participant, flux toujours en liste.
