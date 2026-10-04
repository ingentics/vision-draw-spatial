# Palette par catégories, avec recherche

> Milestone 2 — Editor (reprise de l'étape 15, palette de formes) ; à faire avant les formes 32 à 41, qui viendront
> s'y ranger

Aujourd'hui la palette est une colonne de 88 px qui empile toutes les formes avec leur nom. On la réorganise comme la
barre latérale de draw.io : une recherche en haut, puis les formes rangées par catégorie, chaque catégorie se repliant.

- **Disposition** (barre latérale gauche, comme draw.io) :
  - largeur d'environ 200 px (draw.io : 208 px), défilement vertical si le contenu dépasse ;
  - en haut, fixe au défilement, un **champ de recherche** (« Rechercher une forme », icône loupe, croix pour vider) ;
  - en dessous, les **catégories**, dans l'ordre : **Général**, puis **Architecture**.
- **Catégorie** :
  - un en-tête cliquable sur toute la largeur : chevron (▸ fermée, ▾ ouverte) et nom ; clic, Entrée ou Espace = ouvre /
    ferme ; `aria-expanded` sur l'en-tête ;
  - ouverte, elle montre ses formes en **grille d'icônes** (cases d'environ 40 × 40, autant par ligne que la largeur le
    permet), sans nom sous l'icône, comme draw.io : le nom apparaît en **infobulle** au survol (avec le rappel
    « glisser sur le plan, ou cliquer pour l'ajouter au centre ») ;
  - au premier lancement les deux catégories sont ouvertes ; l'état ouvert / fermé de chaque catégorie est **retenu**
    d'une session à l'autre (stockage du navigateur, comme les paramètres ; stockage indisponible = tout ouvert).
- **Contenu des catégories** :
  - **Général** : Rectangle, Rectangle arrondi, Ellipse, Cercle, Losange, Texte ; les formes géométriques à venir
    (32 à 41 : polygones, triangles, étoiles, Actor…) s'y ajoutent ;
  - **Architecture** : Base de données, File (queue), Cache distribué.
  - Chaque modèle de forme (`ShapeTemplate`, `engine/edit/palette.ts`) porte sa catégorie et des **mots-clés** de
    recherche ; les catégories sont une liste ordonnée (id, nom) au même endroit, pour en ajouter facilement. Styles,
    tailles et rendu des formes inchangés.
- **Recherche** :
  - filtre **en direct** à chaque frappe, sur le nom de la forme, ses mots-clés et le nom de sa catégorie ; sans
    distinction de casse ni d'accents (« ellipse » trouve Ellipse, « bdd » ou « database » trouve Base de données,
    « cylindre » trouve Base de données et File) ; plusieurs mots = toutes les formes qui contiennent chacun ;
  - pendant une recherche, les catégories sans résultat disparaissent et celles qui en ont s'affichent **ouvertes**
    (sans toucher à l'état retenu) ; aucun résultat = message « Aucune forme trouvée » ;
  - Échap dans le champ, ou la croix, vide la recherche et rend la vue par catégories telle qu'elle était ;
  - les formes trouvées se glissent et se cliquent comme les autres.
- **Inchangé** : glisser-déposer au point visé (projeté au sol, aimanté), clic = ajout au centre de la vue, palette
  grisée quand aucun fichier n'est ouvert (`disabled`, champ de recherche compris), type de données
  `PALETTE_MIME`.
- SPEC §14.1 (Palette) et §9 (tableau des actions, ligne « Ajouter une forme ») mis à jour : recherche et catégories.
- **Fini quand :** la palette montre une recherche puis « Général » et « Architecture », qui se replient et se rouvrent
  d'un clic et restent dans cet état après rechargement ; taper « cyl » ne laisse que Base de données et File, Échap
  rend les deux catégories ; toutes les formes se créent toujours par glisser et par clic, dans les trois modes ;
  tests du filtre de recherche (casse, accents, mots-clés, plusieurs mots, aucun résultat) et `make check` vert.
- Fait : `engine/edit/palette.ts` : `PALETTE_CATEGORIES` (Général, Architecture), `category` et `keywords` sur chaque
  `ShapeTemplate`, `searchTemplates` (casse et accents ignorés, tous les mots requis, nom + mots-clés + catégorie).
  `app/Palette.tsx` : barre de 208 px, recherche (loupe, ×, Échap), en-têtes repliables (`aria-expanded`), grille
  d'icônes avec nom en infobulle ; catégories repliées retenues sous `drawio-spatial:palette-collapsed`. Tests du
  filtre dans `tests/engine/edit/palette.test.ts` ; SPEC §9 et §14.1 mis à jour. Vérifié dans l'appli : « cyl » ne
  laisse que Base de données et File, Échap rend les catégories, l'état replié survit au rechargement.
