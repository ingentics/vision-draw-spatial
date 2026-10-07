# Bonnes pratiques de code

> Pour un agent qui écrit du code dans ce dépôt. Chaque règle vient d'une dette réellement trouvée et corrigée
> (sujets 204 à 213) : la suivre dès le départ évite d'avoir à la rembourser. Architecture : `SUMMARY.md` §3,
> SPEC §4. Organisation des tickets et des commits : `ROADMAP.md`.

## 1. Avant d'écrire

- **Chercher avant de créer.** Avant d'écrire une petite fonction (distance, centre, inclusion, lecture de style,
  normale d'un côté…), chercher si elle existe (`grep -rn "function nom" src/engine`). Ce qui a été trouvé recopié :
  `distance` ×3, `center` ×4, `insidePolygon` ×2 (arguments inversés !), `simplifyPath` ×2, `NORMALS` ×2.
- **Lire le guide du type de sujet** : `AJOUTER_UNE_FORME.md`, `AJOUTER_UN_MODE.md`, `COMPOSANT.md`, et le tableau
  « Où regarder » de `SUMMARY.md` §5.
- **Imiter le voisin.** Un nouveau fichier ressemble à ceux du même dossier : découpage, nommage, commentaires.

## 2. Où mettre le code

| Nature du code | Dossier | Contraintes |
|---|---|---|
| Calcul pur sur points et rectangles | `engine/model/geometry.ts` | aucun import de Three.js |
| Lecture / écriture du fichier draw.io | `engine/format/` | ni Three.js ni React ; écriture in situ (SPEC §14.2) |
| Règle d'édition pure (calcul, sans état) | `engine/edit/` | reçoit ses données en paramètres |
| Géométrie de caméra, transitions | `engine/interaction/` | pur |
| État du moteur et orchestration | `engine/core/<domaine>/` | un domaine possède son état |
| Dessin Three.js | `engine/render/`, `engine/shapes/` | consomme le modèle neutre, jamais le XML |
| Tout ce qui est propre à un mode | `engine/modes/<id>/` | rien ne fuit hors du dossier (`AJOUTER_UN_MODE.md`) |
| Interface | `src/app/`, `src/react/` | aucune règle métier |

- **La logique pure à part de l'état.** Une règle (tracé, alignement, bornes) est une fonction pure dans `edit/`,
  `interaction/` ou `model/`, testée seule ; le domaine de `core/` ne fait que l'appeler avec son état.
  Ex. : `tracingOf(shapes, anchoring)` (`edit/anchoring/tracing.ts`) appelé par `core/edit/edges/arrangement.ts`.
- **Un socle commun, pas une dépendance entre voisins.** Si deux variantes partagent des briques, celles-ci vont
  dans un module commun du dossier parent ; une variante n'importe jamais l'autre. Ex. : le Typon (`pcb/`)
  importait l'ancrage automatique (`auto/avoid.ts`) ; les briques sont maintenant dans `edit/anchoring/routing.ts`.
- **Pas de nom de fichier déjà pris.** Avant de créer `camera.ts`, `history.ts`, `selection.ts`, `handles.ts`…,
  vérifier qu'un fichier du même nom n'existe pas ailleurs dans le moteur ; sinon, un nom qui dit le rôle
  (`cameraMath.ts`, `selectionRules.ts`). Il y a déjà dix paires d'homonymes (idée 208), n'en ajoutez pas.
- **Un dossier et un fichier du même nom, non** : `route.ts` à côté de `route/` devient `route/index.ts`.
- **Placer un utilitaire selon ce qu'il est, pas selon son premier appelant.** `pageGeometry` est né dans
  `edit/anchoring/auto/distribute.ts` alors que le document et le glisser s'en servent : c'est du modèle.

## 3. État et couplage

- **Aucun état mutable au niveau du module** (`let` ou objet modifié en dehors d'une classe). Tous les `Engine`
  d'une page le partageraient, et les tests s'influenceraient. L'état vit dans un domaine de `core/` et se passe en
  paramètre aux fonctions pures. Ex. : les bornes de caméra étaient un objet de module ; elles sont maintenant
  `ViewCamera.limits`, passées en dernier paramètre à `zoomAt`, `orbit`, `fitBounds`…
- **Un domaine n'écrit pas dans l'état d'un autre.** Pas de `this.core.pages.currentPageId = …` ni
  `this.core.camera.animation = undefined` : appeler une méthode du domaine propriétaire, à créer si elle manque
  (ex. `pages.setCurrent()`, `camera.cancelAnimation()`, qui n'existent pas encore).
- **N'utiliser du cœur que ce dont on a besoin.** Chaque domaine reçoit `core` en entier ; ne pas en profiter pour
  toucher dix domaines de plus (`gesture.ts` en touche déjà 24). Si un nouveau code a besoin de beaucoup de domaines,
  c'est souvent qu'une partie est une fonction pure à sortir.
- **Ne pas allonger les listes centrales tenues à la main.** `DocumentFile.load` remet à zéro les domaines un par
  un, `Config.updateSettings` liste à la main les clés qui reconstruisent les scènes. Un domaine nouveau qui a un
  état à remettre à zéro, ou un paramètre de vue qui change le rendu, doit y être ajouté : le vérifier, et le
  signaler dans le ticket (idée 209 : chaque domaine réagira lui-même).
- **La façade `Engine.ts` délègue, elle ne calcule pas.** Une méthode publique de plus seulement si l'app ou le
  composant en a besoin.

## 4. Réutiliser l'existant

- **Géométrie** : `model/geometry.ts` (`distance`, `center`, `rectContains`, `rectContainsRect`, `boundsOfPoints`,
  `unionOf`, `segmentsCross`, `segmentIntersection`, `segmentDistance`, `insidePolygon`, `simplifyPath`,
  `prunePath`). Pas de `Math.hypot(a.x - b.x, a.y - b.y)` à la main. Une fonction qui manque s'y ajoute, avec son
  test dans `tests/engine/model/geometry.test.ts`.
- **Valeurs de style** : `styleNumber`, `styleFlag`, `styleColor`, `styleOpacity` (`render/styleValues.ts`). Pas
  de `parseFloat(style.x ?? '')` ni de `style.x === '1'` (idée 206 : il en reste une soixantaine à remplacer).
- **Normales des côtés** : `SIDE_NORMALS` (`edit/edgeEnds.ts`). **Ancrages** : `ANCHORINGS` (`edit/anchoring/mode.ts`).
  Une liste ou une table qui existe déjà ne se redéclare pas ailleurs.
- **Deux variantes proches** : une fonction commune paramétrée, et deux noms qui disent la différence, avec un
  commentaire qui explique pourquoi elles diffèrent. Ex. : `prunePath(path, epsilon, keepBacktracks)` sous
  `simplify` (rendu, garde les demi-tours comme draw.io) et `simplifyPath` (tracés calculés, les retire).
- **Réglages en famille** : si un réglage a des variantes (`edge…` / `edgePcb…`), on lit par préfixe dans une seule
  fonction, pas par un `if` et un copier-coller. Ne jamais renommer une clé de réglage existante : les réglages
  enregistrés des utilisateurs seraient perdus.
- **Exception : le code porté de mxGraph** (`render/edges/route/`, éditeurs de tracés) garde sa forme et ses
  signatures, pour rester comparable à l'original ; on l'adapte par une fine couche, on ne le « simplifie » pas.

## 5. Frontières

- **Le moteur ne connaît ni React ni l'app** ; `format/` et `model/` ne connaissent ni Three.js ni le rendu
  (vérifié par `.eslintrc.cjs`).
- **L'app passe par l'API publique** (`src/index.ts`, `Engine`). N'ajoutez pas d'import d'un chemin interne
  (`engine/render/…`, `engine/interaction/…`) dans `src/app/` : il y en a déjà une quarantaine (idée 207). S'il
  manque quelque chose, l'exporter depuis le point d'entrée public.
- **Un cas particulier ne se recopie pas.** Tester `GRAPH_PAGE_ID` ou `transitions.active` une douzième fois
  appelle plutôt un garde commun (`canInteract()` ou équivalent) ; à défaut, le signaler dans le ticket.

## 6. Écrire le code

- Identifiants en anglais ; commentaires, docs, tickets et messages de commit en français.
- Un commentaire dit **pourquoi** (écart avec draw.io, cas limite, valeur choisie), pas ce que dit déjà le code. En
  tête d'un fichier non évident : une ligne sur son rôle. Une valeur reprise de draw.io le dit
  (`/** Pas de la grille en pixels de page (draw.io : 10). */`).
- TypeScript strict, pas de `any` ; imports de types en `import type` (lint).
- Fichiers courts et d'un seul sujet : au-delà de ~400 lignes, se demander ce qui peut sortir (`avoid.ts` est passé
  de 478 à ~170 lignes en séparant briques, routeur et orchestration).
- Pas de code mort ni d'accesseur qui doublonne une méthode existante ; un commentaire déplacé suit son code.

## 7. Valider

- **Un test par règle**, dans `tests/` au chemin miroir de `src/` (`src/engine/model/geometry.ts` →
  `tests/engine/model/geometry.test.ts`). Un refactor sans changement de comportement garde les tests intacts hors
  imports ; un test qui dit vérifier un cas doit le contenir vraiment.
- **Un refactor annonce ses écarts.** Tout changement de comportement, même minime, est écrit dans la ligne
  « Fait : » du ticket. Pour remplacer deux implémentations par une seule, comparer les deux sur des entrées
  nombreuses (test jetable) avant de supprimer l'ancienne.
- **À l'œil dans l'appli**, sur le serveur partagé (`make dev`, port 5173), avec une fixture qui montre le cas.
  Dire ce qui n'a été vérifié que par les tests. Après le déplacement d'un fichier, Vite peut garder l'ancien
  chemin en cache (page blanche) : toucher les fichiers qui l'importent.
- **Contre draw.io** dès que le fichier est touché : fixture + `make drawio-check`.
- **`make check`** (avec `COMPOSE_PROJECT_NAME=drawio-claude`) doit sortir à 0 avant tout commit.
- **Commit** : seulement après validation du ticket par l'utilisateur ; fichiers ajoutés un par un (`git add
  chemin`), jamais `git add .` ou `git add tests` : les fichiers de l'utilisateur restent hors du commit.

## 8. La dette qu'on voit en passant

On ne la corrige pas dans le ticket en cours s'il n'en a pas besoin : on la note en `docs/backlogs/debt/` (une
ligne, numéro suivant) et on informe l'utilisateur.
