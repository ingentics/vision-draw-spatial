# Catégorie « Utilisées » dans la palette

> Milestone 2 — Editor ; reprise de 46 (palette par catégories)

Une catégorie en tête de la palette rassemble les formes déjà présentes sur la page, pour les réutiliser sans les
chercher.

- **Place** : première catégorie, au-dessus de « Général », même présentation que les autres (en-tête repliable,
  grille d'icônes, infobulle, glisser ou cliquer pour ajouter) ; son état replié est retenu comme les autres.
- **Contenu** : une icône par **type de forme** (modèle de la palette : Rectangle, Ellipse, Base de données…) présent
  sur la **page courante**, quel que soit le nombre de formes de ce type ; rangées dans l'ordre de la palette. Les
  flèches n'y figurent pas.
- **Mise à jour en direct** :
  - page vide (ou sans forme reconnue) = la catégorie est **masquée** ;
  - poser une forme d'un type absent l'ajoute ; supprimer la dernière forme d'un type l'en retire ;
  - suit aussi annuler / rétablir, le changement de page et l'ouverture d'un fichier.
- **Reconnaissance du type** : déduite du style de la forme (les clés qui distinguent les modèles, ex. `rounded=1`,
  `ellipse` + `aspect=fixed`), pour que les formes d'un fichier ouvert soient reconnues ; rien n'est écrit dans le
  fichier. Une forme qui ne correspond à aucun modèle n'apparaît pas.
- **Recherche** : la catégorie suit les règles de 46 (masquée si aucun résultat, ouverte pendant une recherche).
- SPEC §14.1 (Palette) mise à jour.
- **Fini quand :** sur une page vide, pas de catégorie « Utilisées » ; poser un rectangle puis une base de données les
  fait apparaître ; supprimer l'unique base de données la retire, annuler la fait revenir ; changer de page met la
  catégorie à jour ; tests de la reconnaissance du type depuis le style ; `make check` vert.
- Fait : `engine/edit/palette.ts` : `templateOfShape` (nom de forme + clés distinctives `rounded`, `aspect`,
  `direction` ramenées à une valeur comparable, seulement celles que portent les modèles de même forme) et
  `usedTemplates` (types de la page, une fois chacun, dans l'ordre de la palette). `app/Palette.tsx` : catégorie
  « Utilisées » en tête (prop `used`), masquée si vide, filtrée par la recherche, repli retenu comme les autres.
  `app/Viewer.tsx` : modèles calculés depuis le document et la page courante (vides sur la vue graphe). Tests dans
  `tests/engine/edit/palette.test.ts` ; SPEC §14.1 mise à jour. Vérifié dans l'appli (`links.drawio`) : « Accueil »
  montre Rectangle et Ellipse, « Détail » Rectangle ; ajouter une base de données l'ajoute, annuler la retire ;
  « ell » ne laisse qu'Ellipse dans « Utilisées » et « Général ».
