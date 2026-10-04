# Barres latérales repliables et redimensionnables

> Milestone 2 — Editor (interface de l'appli de démo) ; s'appuie sur la palette par catégories (46) et sur les
> paramètres persistés (12)

Aujourd'hui le plan est encadré de deux barres latérales à largeur fixe : à gauche la **palette** (« Formes », 208 px),
à droite un panneau qui change selon le contexte — **panneau contextuel** (Page, Forme, Flèche, N formes, Texte ; 260
px), **Paramètres** (360 px) ou **Diagnostics** (380 px). On veut pouvoir replier chaque barre pour donner toute la
place au plan, et choisir leur largeur à la souris ; la disposition est retenue d'une session à l'autre.

- **Replier une barre** :
  - en haut de chaque barre, un bouton de repli : `«` sur la barre de gauche, `»` sur celle de droite (infobulle
    « Replier le panneau », `aria-label` équivalent, `aria-expanded="true"`) ;
  - un clic masque la barre ; à sa place apparaît une **bande verticale fine** (environ 24 px), sur toute la hauteur
    de la zone de travail, qui porte le **nom de la barre écrit à la verticale** (texte tourné, lisible de bas en haut
    à gauche et de haut en bas à droite, ou dans le même sens des deux côtés — à trancher à l'œil), avec un rappel `»`
    / `«` en haut ;
  - un clic n'importe où sur la bande (ou Entrée / Espace quand elle a le focus) **rouvre** la barre à sa largeur
    d'avant ; la bande est un bouton (`aria-expanded="false"`, infobulle « Afficher le panneau <nom> ») ;
  - le plan s'élargit ou se rétrécit aussitôt (la caméra garde son centre, pas de saut de la vue).
- **Bande de gauche** : texte fixe **« Formes »**. Repliée, la palette n'est pas utilisable (on la rouvre pour
  glisser une forme) ; grisée ou non, la bande reste cliquable.
- **Bande de droite** : le texte **suit le contexte**, exactement le titre que montrerait la barre ouverte :
  « Page », « Forme », « Flèche », « 3 formes », « 2 flèches », « Texte »…, « Paramètres », « Diagnostics ». Il change
  en direct quand la sélection change, sans rouvrir la barre.
  - Ouvrir **Paramètres** ou **Diagnostics** depuis la barre d'outils alors que la barre de droite est repliée la
    **rouvre** (on a demandé explicitement ce panneau) ; un simple changement de sélection ne la rouvre pas.
  - Aucun panneau à droite (pas de fichier ouvert) : pas de bande non plus.
- **Largeur unique à droite** : les panneaux de droite (contextuel, Paramètres, Diagnostics) ont **tous la même
  largeur**, celle de la barre de droite ; par défaut, la largeur du plus large aujourd'hui (Diagnostics, **380 px**).
  Passer d'un panneau à l'autre ne fait donc plus bouger le plan. Le contenu du panneau contextuel s'étire sur cette
  largeur (champs à 100 %).
- **Redimensionner** :
  - une **poignée** de quelques pixels sur le bord intérieur de chaque barre ouverte (droit pour la gauche, gauche pour
    la droite), curseur `col-resize`, surlignée au survol ; on la tire pour choisir la largeur, le plan suit en direct ;
  - bornes : gauche **160 à 400 px**, droite **240 à 600 px**, et le plan garde toujours au moins **320 px** (la barre
    tirée s'arrête là) ;
  - **double-clic** sur la poignée = largeur par défaut (208 px à gauche, 380 px à droite) ;
  - clavier : la poignée prend le focus (`role="separator"`, `aria-orientation="vertical"`, `aria-valuenow` /
    `aria-valuemin` / `aria-valuemax`), flèches gauche / droite = ± 16 px, Origine = largeur par défaut ;
  - pas de largeur sur une barre repliée : la poignée n'existe que barre ouverte.
- **Persistance** dans les paramètres de l'appli (`engine/settings.ts`, enregistrés sous `drawio-spatial:settings`
  par `app/settingsStore.ts`, rechargés au lancement) — nouvelle section :

  ```ts
  panels: {
    left:  { collapsed: boolean; width: number }; // false, 208 (borné 160–400)
    right: { collapsed: boolean; width: number }; // false, 380 (borné 240–600)
  };
  ```

  - fusion partielle validée et bornée comme les autres sections (`mergeSettings`) ; une valeur absente ou invalide
    reprend le défaut ; anciens paramètres sans `panels` = valeurs par défaut (pas de migration de version) ;
  - enregistré à chaque repli / dépli et **à la fin** d'un redimensionnement (pas à chaque mouvement de souris) ;
  - stockage indisponible : la disposition vaut pour la session ;
  - au lancement, la disposition est appliquée avant le premier rendu (pas d'animation d'ouverture ni de saut du plan) ;
  - « Réinitialiser » dans le panneau Paramètres remet aussi la disposition par défaut ; la section n'a pas de
    réglage dédié dans le panneau (on règle à la souris).
- **Inchangé** : contenu et comportement des panneaux, palette (recherche, catégories retenues, glisser-déposer,
  clic), fermeture de Paramètres / Diagnostics par leur bouton ×, composant React `DrawioSpatial` (la disposition est
  celle de l'appli de démo, pas du composant).
- SPEC §13 (section `panels` dans `Settings`) et §14.1 (ligne Palette : barre repliable et redimensionnable ; une
  ligne pour la barre de droite) mis à jour.
- **Fini quand :** chaque barre se replie par son bouton en une bande verticale portant son nom et se rouvre d'un
  clic sur la bande ; repliée à droite, la bande affiche « Forme », « Flèche », « Page »… selon la sélection et
  « Paramètres » quand on l'ouvre depuis la barre d'outils (qui rouvre la barre) ; les trois panneaux de droite ont la
  même largeur ; les deux barres se redimensionnent à la souris et au clavier dans leurs bornes, double-clic = défaut ;
  après rechargement de la page (et relance de l'appli native), replis et largeurs sont retrouvés ; tests de la
  fusion / des bornes de `panels` dans les tests des paramètres, et `make check` vert.
- Fait : `engine/settings.ts` : section `panels` (`PanelsSettings`, `SidePanelSettings`), bornes `panels.left.width`
  / `panels.right.width` dans `SETTINGS_LIMITS`, fusion barre par barre (patch partiel par barre). `app/Sidebar.tsx` :
  `Sidebar` (bande repliée en bouton, `writing-mode: vertical-rl`, même sens des deux côtés ; poignée
  `role="separator"` avec glisser à capture de pointeur, largeur suivie en direct et enregistrée au lâcher, clavier,
  double-clic ; plan d'au moins 320 px) et `CollapseButton`, placé par chaque panneau en tête (palette : à droite de la
  recherche ; panneaux de droite : avant le titre) via un contexte React. `ContextPanel` exporte `contextTitle`, repris
  par la bande de droite ; `Viewer` emballe palette et panneaux de droite dans les deux barres, et le bouton
  Paramètres / Diagnostics rouvre la barre repliée. Largeurs fixes retirées du CSS des panneaux (ils remplissent la
  barre). Tests de `panels` (défauts, fusion, bornes, valeurs invalides) dans `tests/engine/settings.test.ts` ; SPEC §13
  et §14.1 mis à jour. Vérifié dans l'appli : repli / dépli des deux barres, bande « Forme » / « Page » / « Paramètres »
  selon le contexte, glisser et clavier dans les bornes, plan arrêté à 320 px, disposition retrouvée après
  rechargement.
