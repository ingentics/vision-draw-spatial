# Étape 20 — Panneau de forme et styles

> Milestone 4 — Éditeur de forme

- **Panneau « Forme » à droite**, comme le panneau Format de draw.io : il s'ouvre quand une forme est sélectionnée,
  se met à jour quand la sélection change, se ferme quand on désélectionne (ou par ×). Il partage l'emplacement des
  panneaux Paramètres / Diagnostics (un seul ouvert à la fois). La barre de sélection du bas garde les actions
  rapides ; les réglages de la forme migrent progressivement dans le panneau.
- **Première section : Style**, une grille de vignettes cliquables (aperçu de la forme avec ce style, au survol le nom
  du style) ; le style courant de la forme est mis en évidence.
  - **Styles de base de draw.io** (les mêmes que la palette Style de draw.io, valeurs exactes) :

    | Style | `fillColor` | `strokeColor` | Autres |
    |---|---|---|---|
    | Par défaut | `#ffffff` | `#000000` | |
    | Gris | `#f5f5f5` | `#666666` | `fontColor=#333333` |
    | Bleu | `#dae8fc` | `#6c8ebf` | |
    | Vert | `#d5e8d4` | `#82b366` | |
    | Orange | `#ffe6cc` | `#d79b00` | |
    | Jaune | `#fff2cc` | `#d6b656` | |
    | Rouge | `#f8cecc` | `#b85450` | |
    | Violet | `#e1d5e7` | `#9673a6` | |

  - **Palette étendue** : 12 teintes pastel (menthe, jaune pâle, lavande, rose saumon, bleu, pêche, vert tendre,
    rose, gris, mauve, vert pâle, crème), en plus des styles de base. Fond pastel et **contour dérivé** (même teinte,
    plus soutenue), pour garder le principe fond + contour de draw.io. Valeurs de départ, à affiner à l'œil :
    `#dcefea`, `#ffffe5`, `#e8e5f0`, `#fdd8d6`, `#d8e4f0`, `#ffe4d3`, `#e4f1d3`, `#fdebf2`, `#f2f2f2`, `#e8d7e8`,
    `#edf5e8`, `#fef7d7`.
- **Appliquer un style** écrit seulement les clés concernées dans le style draw.io de la cellule
  (`fillColor`, `strokeColor`, `fontColor` si le style en a une ; le reste du style intact, SPEC §14.2), avec
  annuler / rétablir. En **sélection multiple**, le style s'applique à toutes les formes sélectionnées.
- Les palettes sont des **paramètres** (`Settings`, source de vérité) : listes de styles modifiables plus tard,
  valeurs par défaut ci-dessus.
- Rendu immédiat dans les trois modes (2D, iso, 3D : fond, côtés ombrés, arêtes) ; réouverture identique dans draw.io.
- **Fini quand :** sélectionner une forme ouvre le panneau, un clic sur une vignette change ses couleurs (une ou
  plusieurs formes), Ctrl+Z annule, et draw.io affiche le même style.
- Fait : styles de base et palette pastel (`edit/styles.ts`, paramètres `styles`), appliqués à une ou plusieurs formes
  avec annuler / rétablir. Le panneau a ensuite évolué en **panneau contextuel toujours ouvert** (page, forme ou
  flèche ; la barre de sélection du bas a été retirée), avec les sections Texte, Bordure, Volume, Lien.
