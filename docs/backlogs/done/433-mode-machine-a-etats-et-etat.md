# Mode « Machine à états », état, point d'entrée et point de sortie

> Milestone — mode Machine à états ; modèle : modes RDD (179) et Séquences (70)

- **Périmètre** : code moteur dans `src/engine/plugins/modes/states/` et appli dans `src/app/plugins/modes/states/`
  seulement, plus `tests/`, `fixtures/states.drawio` et la doc (SPEC, SUMMARY, `AJOUTER_UN_MODE.md` si besoin).
  Aucun changement dans `src/engine/core/` : un besoin du tronc découvert en route devient un ticket moteur à part.
- **Mode** de page « Machine à états » (`spatial.mode=states`, nom court « États ») : `src/engine/plugins/modes/states/`
  (définition, formes dans `shapes/`), partie appli `src/app/plugins/modes/states/` si besoin. `viewModes: ['top']`
  (2D seulement : Iso et 3D désactivés) ;
  palette réduite aux formes du mode (État, Point d'entrée, Point de sortie ; Ensemble au sujet 435) plus Texte,
  Titre et Post-it ; catégorie de palette « États » ; icône de mode dédiée (rectangle arrondi précédé d'un point noir).
- **État** (`sm-state`, palette « État », mots-clés `state`, `état`) : rectangle arrondi (rayon 10 px), bordure fine,
  fond blanc, en deux zones :
  - **titre** en haut, gras, centré (le label de la forme ; plusieurs lignes possibles), séparé par un trait
    horizontal de la zone de **contenu** ;
  - **contenu** : texte libre multiligne aligné à gauche (`spatial.body`), édité par double-clic dans la zone de
    contenu et par un champ texte multiligne « Contenu » du panneau ; sans contenu, pas de trait ni de zone ;
  - hauteur ajustée au titre et au contenu (largeur libre, redimensionnable).
  - Taille par défaut 140 × 60.
- **Point d'entrée** (`sm-initial`, palette « Point d'entrée », mots-clés `initial`, `entrée`, `start`) : disque noir
  plein Ø 20 px, taille fixe (pas de redimensionnement), sans texte. Départ des transitions (sujet 434).
- **Point de sortie** (`sm-final`, palette « Point de sortie », mots-clés `final`, `sortie`, `end`) : disque noir
  Ø 14 px dans un cercle Ø 24 px (cible UML), taille fixe, sans texte. Arrivée des transitions. On peut en poser
  autant qu'on veut pour faciliter la lecture (une sortie près de chaque état qui y mène) ; tous deviennent le seul
  `[*]` de leur niveau à l'export (sujet 436). De même, plusieurs points d'entrée sont permis.
  - **Sortie attendue ou en erreur** : choix « Attendue » / « En erreur » dans le panneau du point de sortie
    (booléen `spatial.sm.error=1`, absent = attendue) ; en erreur, le point est dessiné en rouge (`#d32f2f`, aussi
    écrit en `fillColor` / `strokeColor` pour draw.io). Le panneau d'un point de sortie ne doit pas proposer de style :
    le masquer demande le tronc (sujet 440).
- **Commentaires** : comme sur toute page (touche « C », bouton du panneau, encart au survol), sur les états, les
  points d'entrée et de sortie, ainsi que sur Texte, Titre et Post-it ; le panneau d'un état garde le
  « Commentaire ». Pas repris dans l'export PlantUML.
- Fichier draw.io (export seulement, sujet 408) : rectangle arrondi au titre lisible
  (`rounded=1;whiteSpace=wrap;html=1;spatial.kind=sm-state;…`) ; contenu en attribut `spatial.body`, non dessiné
  par draw.io ; points d'entrée et de sortie en ellipses (`ellipse;fillColor=#000000;…` et
  `ellipse;shape=doubleEllipse;…`).
- Fixture `fixtures/states.drawio` (quelques états avec et sans contenu, un point d'entrée, deux points de sortie).
- **Fini quand :** une page passée en mode Machine à états est en 2D (Iso et 3D désactivés), la palette propose
  État, Point d'entrée, Point de sortie, Texte, Titre et Post-it ; un état posé montre son titre, un contenu saisi
  au panneau ou par double-clic apparaît sous le trait et la forme grandit ; les points d'entrée et de sortie se
  posent à leur taille fixe et ne se redimensionnent pas ; un commentaire se pose sur un état et sur un point
  (« C ») et s'affiche au survol ; ⌘Z défait chaque étape ; `make check` vert.
- Fait : mode `states` dans `src/engine/plugins/modes/states/` (`index.ts`, `kinds.ts`, `keys.ts` espace de noms
  `sm`, `settings.ts`) ; état dans `state/` (`stateLayout.ts` zones calculées depuis le bas, titre coupé entre les
  mots, hauteur ajustée ; `bodyText.ts`, `stateBody.ts`, `stateParts.ts` contenu éditable par double-clic) ; formes
  dans `shapes/state`, `shapes/initial`, `shapes/final` ; sortie attendue / en erreur dans `exits/exitKind.ts`.
  Écarts : ids des formes `states-state`, `states-initial`, `states-final` (le registre exige le préfixe de l'id du
  mode) ; contenu dans `spatial.sm.body` (un mode n'écrit que dans son espace de noms) ; contenu sans retour
  automatique (tronqué par « … », comme le corps d'un document RDD), le titre revient à la ligne ; la couleur du point
  de sortie suit le choix Attendue / En erreur, pas le style. Masquer la section Style des points demande le tronc :
  sujet 440. Ancrage auto et tracé droit à l'arrivée dans le mode : sujet 442. SPEC, SUMMARY et `AJOUTER_UN_MODE.md`
  pas mis à jour (périmètre limité au dossier du mode à la demande). Fixture `tests/fixtures/states.drawio` ; tests
  dans `tests/engine/plugins/modes/states/` ; liste de la palette dans `tests/engine/core/edit/palette.test.ts`.
  Vérifié dans l'appli : 2D seule, palette, contenu au panneau et sur place (l'état grandit), points sans poignées de
  taille, commentaire « C » au survol, sortie en erreur en rouge, ⌘Z.
