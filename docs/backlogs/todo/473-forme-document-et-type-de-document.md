# Forme « Document » et son type de document

> Milestone 5 — Formes ; catégorie « Général » de la palette

Une feuille de papier au coin haut droit corné, dans laquelle on dessine en gris l'icône du type de document choisi
dans le panneau contextuel.

- **Forme** : `plugins/shapes/general/document/`, reconnue par `spatial.kind=document`, nommée « Document » (palette,
  infobulle, panneau). Taille posée : 120 × 160.
  - Contour noir (`#000000`, 2), fond blanc ; rectangle dont le coin haut droit est coupé en biais, avec le rabat
    (petit triangle corné, légèrement arrondi côté pli, comme sur la capture) dessiné par-dessus.
  - **Le coin ne s'étire pas** : rabat de 20 × 20 quelle que soit la taille de la forme (ramené à la moitié du plus
    petit côté si la forme est plus petite que 40).
  - À plat en iso et en 3D (pas de volume), comme le post-it.
  - Texte de la forme : sous la feuille (comme une icône), pas dedans, pour laisser la place à l'icône.
- **Icône du type** : dessinée en gris (`#9e9e9e`, traits de 2, sans fond) au centre de la feuille, sous le rabat,
  proportionnelle à la forme (environ 50 % de la largeur, rapport conservé). Pas de type = feuille vide. Types :

  | Valeur (`spatial.docType`) | Nom affiché | Dessin |
  | --- | --- | --- |
  | `pdf` | PDF | le mot « PDF » en capitales grasses |
  | `image` | Image | cadre avec montagne et soleil |
  | `invoice` | Facture | « FACTURE » en titre, lignes de texte, ligne de total soulignée |
  | `euro` | Euro | signe € |
  | `contract` | Contrat | lignes de texte (dernière plus courte), trait de signature en bas |
  | `checklist` | Liste à cocher | 3 cases (la 1ʳᵉ cochée), chacune suivie d'une ligne |
  | `catalog` | Catalogue | tableau : ligne d'en-tête pleine, 3 lignes × 2 colonnes |

- **Panneau contextuel** (forme Document sélectionnée) : section « Type de document » avec un champ de saisie.
  - Le champ montre le nom du type courant ; au focus ou à la frappe, une liste déroulante sous le champ propose les
    types (mini icône grise + nom), **filtrée en direct** à chaque frappe (sans casse ni accents, sur le nom et la
    valeur : « fac », « pdf », « cont »…).
  - En tête de liste, les **récents** (3 au plus, du plus récent au plus ancien) quand ils passent le filtre, séparés
    des autres par un trait ; un type n'apparaît qu'une fois. Récents propres à l'utilisateur (navigateur), pas au
    fichier, conservés d'une session à l'autre.
  - Choix à la souris ou au clavier (flèches, Entrée ; Échap ferme sans changer) ; « Aucun » en bas de liste retire le
    type. Choisir écrit `spatial.docType` (une étape d'annulation) et met le type en tête des récents.
  - Plusieurs Documents sélectionnés : le choix s'applique à tous ; types différents = champ vide.
- **Export draw.io** : la forme s'exporte en `shape=note;size=20` (feuille cornée de draw.io) sans l'icône ; le
  fichier doit s'ouvrir dans draw.io. `spatial.kind` et `spatial.docType` restent dans le style pour la relecture.
- Fixture `tests/fixtures/documents.drawio` : un Document de chaque type, un sans type, un très étiré (le coin garde sa taille).
- SPEC (§8.3 liste des formes, panneau contextuel) et `AJOUTER_UNE_FORME.md` si un point du parcours change.
- **Fini quand :** dans l'appli, poser un Document depuis « Général » ; l'étirer, le rabat garde 20 × 20 ; dans le
  panneau, taper « fac » ne laisse que Facture, la choisir dessine l'icône grise ; après avoir choisi Euro puis PDF,
  la liste ouverte commence par PDF, Euro ; Échap ne change rien ; annuler retire le type ; recharger la page garde
  les récents ; la fixture montre les 7 icônes en 2D, iso et 3D ; l'export s'ouvre dans draw.io ; tests du filtre,
  des récents et de la reconnaissance du type ; `make check` vert.
