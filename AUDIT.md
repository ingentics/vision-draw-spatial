# Audit qualité du moteur — troisième passe

> Lancé le 2026-10-08. Suite des passes du 2026-10-07 (sujets 291, 300, 301, 303, 307, 312, 314, 324, 325).
> Ce fichier décrit la tâche et en suit l'avancement ; les constats deviennent des sujets `docs/backlogs/todo/`.

## Objectif

Un moteur **extensible** : ajouter une forme, un mode ou un effet doit se faire en déposant un dossier dans
`src/engine/plugins/`, sans toucher au tronc, en ne s'appuyant que sur l'API des plugins (`core/plugins/index.ts`),
et en lisant un code dont chaque fichier porte une seule responsabilité métier.

## Périmètre

- **Prioritaire : `src/engine/`** (311 fichiers ; ≈ 26 900 lignes de tronc `core/`, ≈ 7 300 de plugins).
  - le **découplage tronc / plugins** : contrats (`core/shapes/`, `core/modes/`, `core/effects/`), registres, racine
    de composition (`plugins/index.ts`), API exposée (`core/plugins/index.ts`) ;
  - la façade (`Engine.ts`, 850 lignes) et les domaines (`core/domains/`) ;
  - les gros fichiers (> ~400 lignes : `cameraMath.ts`, `labelEditor.ts`, `modes/types.ts`, `pageModes.ts`…).
- **Secondaire** : `src/app/`, `src/react/` (seulement là où ils compensent un manque du moteur).
- **Docs** : `docs/SUMMARY.md`, `docs/AJOUTER_UNE_FORME.md`, `docs/AJOUTER_UN_MODE.md`, `.claude/rules/coding.md`,
  SPEC §4 : écarts entre ce qui est écrit et ce que fait le code, guides périmés, règles manquantes.
- **Hors périmètre** : le code porté de mxGraph (`render/edges/route/`, éditeurs de tracés) garde sa forme
  (`coding.md` §4) ; aucun changement de comportement ou de rendu visé.

## Axes d'analyse

1. **Découplage et extensibilité**
   - Le tronc connaît-il encore un plugin (nom de forme, de mode, `kind` en dur, cas particulier) ?
   - Un nouveau plugin doit-il toucher autre chose que son dossier (liste à compléter, `switch`, enregistrement manuel) ?
   - L'API des plugins est-elle complète, minimale et cohérente (un plugin qui contourne, réimplémente, ou reçoit un
     objet vivant du moteur) ? Les trois familles (formes, modes, effets) suivent-elles le même patron (registre,
     appels protégés, lecture seule, diagnostics) ?
2. **Mutualisation** : calculs refaits à la main (géométrie, styles, couleurs, index de page), variantes proches non
   paramétrées, tables redéclarées, entre plugins et entre domaines du tronc.
3. **Responsabilité métier par fichier** : fichiers qui mêlent plusieurs sujets, domaines qui écrivent l'état d'un
   autre, façade qui calcule, logique pure enfermée dans un domaine avec état, fichiers mal placés (`coding.md` §2).
4. **Bons patterns pour bons usages** : registre vs `switch`, événements vs appels directs, état module mutable,
   héritage vs composition, garde partagée vs cas particulier recopié, types discriminés vs tests de forme
   (`'kind' in`).
5. **Lisibilité** : nommage, commentaires (le pourquoi, en français), code mort, fonctions trop longues.
6. **Docs** : guides et SUMMARY alignés sur le code ; ce qui manque à un agent pour ajouter un plugin sans lire le tronc.

## Méthode

1. **Constat (lecture seule)** : exploration en parallèle par axe ; chaque constat est situé (`fichier:ligne`),
   vérifié dans le code (pas de supposition), et rapproché des sujets déjà faits pour ne pas refaire une passe.
2. **Tri** : par gain (extensibilité d'abord), risque et taille ; ce qui relève de la dette mineure va dans
   `docs/backlogs/debt/`.
3. **Sujets** : un fichier `todo/` par chantier cohérent (numéros à partir de 376), au format des sujets 324 / 325 :
   constat, ce qu'on veut, écart de comportement attendu (aucun, sauf mention), tests, docs, **Fini quand**.
4. **Validation par l'utilisateur** de la liste des sujets avant d'écrire du code.
5. **Réalisation** sujet par sujet : refactor sans changement de comportement (tests intacts sauf imports,
   `coding.md` §7), `make check` vert (`COMPOSE_PROJECT_NAME=drawio-claude`), vérification à l'œil sur le serveur
   5173 (formes, RDD, Séquences, forêt ; trois vues et mini-carte), puis commit après validation.

## Livrables

- Ce fichier, complété des constats et de la liste des sujets créés.
- Les sujets `docs/backlogs/todo/NNN-*.md`, et les lignes de dette `docs/backlogs/debt/`.
- Les docs corrigées dans le même commit que le code qu'elles décrivent.

## Constats (2026-10-08)

Quatre analyses en lecture seule (découplage, façade et domaines, mutualisation et lisibilité, docs), chaque
constat relu au `fichier:ligne`, recoupé avec les passes précédentes. Détail dans les sujets.

**Ce qui est sain** : le tronc ne connaît aucun mode ni effet par son nom ; la composition se fait par
`import.meta.glob` (seule liste à compléter : les catégories de palette, voulu par 306) ; aucun plugin n'importe un
autre plugin ; l'appli n'a aucun cas particulier de plugin ; les frontières sont vérifiées par la lint et
`boundaries.test.ts` ; `Engine.ts` délègue presque partout ; gardes communes (`canInteract`, `editablePage`) bien
utilisées ; aucun commentaire en anglais ni TODO dans le moteur.

**Ce qui freine l'extensibilité** :

1. Une **erreur réelle** : deux réglages en direct écrivent dans la page gelée du document (exception en dev,
   modèle modifié en place en prod) → 376.
2. Les **formes ne déclarent pas leurs réglages** (modes et effets oui) : un réglage de forme vit dans le tronc et
   l'appli, et le guide en fait une procédure en six fichiers → 380.
3. **Trois patrons d'appel protégé** (trois politiques d'erreur), **effets sans hôte** (logique répartie entre
   modes, scène, façade et registre), diagnostics « plugin inconnu » à trois endroits → 378.
4. **Hôte des modes** : lecture seule et protection posées à la main ≈ 40 fois ; contrat (`modes/types.ts`) et hôte
   (`pageModes.ts`) mêlent trois ou quatre sujets → 379.
5. **État de module** : la mesure du texte est partagée entre moteurs → 377.

**Mutualisation et responsabilités** : côtés et ancrages déclarés deux ou trois fois (381) ; ≈ 78 recherches par id,
grille, projection, cadrage, coins, `distance`, `clamp` écrits à la main dans le tronc (382) ; couleurs et fond des
labels en double (383) ; `gesture.ts`, `labelEditor.ts`, `picking.ts` mêlent logique pure et état (384) ;
`documentChange` émis de cinq endroits, rechargement piloté par l'annulation (385) ; 25 méthodes publiques sans
appelant et ≈ 40 `export` sans lecteur (386) ; gros fichiers du tronc (387) ; doublons entre formes et conventions
`userData` brutes (388).

**Docs** : le guide des formes promet « déposer le dossier suffit » (faux dans trois cas) et cite des briques
absentes de l'API ; aucun guide des effets ; SUMMARY et SPEC §4 périmés ; la carte des dossiers existe en cinq
versions, la règle des frontières en cinq copies ; `CLAUDE.md` cite un `devSession.ts` disparu (389, 390).
Remarque : deux sujets portent le numéro 374 dans `done/` (fichiers `done/` jamais modifiés : on le laisse).

## Sujets

| #   | Sujet                                                    | Gain         | Taille | Décision                                                |
| --- | -------------------------------------------------------- | ------------ | ------ | ------------------------------------------------------- |
| 376 | Réglages en direct sans modifier le modèle (erreur)      | fort         | S      | —                                                       |
| 378 | Appel protégé commun, hôte des effets                    | fort         | M      | —                                                       |
| 380 | Réglages déclarés par les formes                         | fort         | M      | porté par la catégorie Architecture                     |
| 379 | Hôte et contrat des modes                                | moyen        | M      | —                                                       |
| 377 | Mesure du texte par moteur                               | moyen        | M      | —                                                       |
| 381 | Côtés et ancrages en un seul endroit                     | moyen        | M      | —                                                       |
| 382 | Briques géométriques du tronc                            | moyen        | M      | —                                                       |
| 383 | Couleurs et labels communs                               | moyen        | M      | —                                                       |
| 384 | Geste, éditeur de texte, pick découpés                   | moyen        | M      | —                                                       |
| 385 | Document seul émetteur de ses changements                | moyen        | M      | —                                                       |
| 386 | Surface de l'API et code mort                            | moyen        | S      | proposition retenue (garder les méthodes d'intégrateur) |
| 388 | Briques communes des formes                              | faible-moyen | M      | —                                                       |
| 387 | Gros fichiers du tronc                                   | faible       | M      | —                                                       |
| 389 | Docs alignées sur le code                                | moyen        | S      | —                                                       |
| 390 | Guide commun des plugins, guide des effets, docs testées | moyen        | S      | après 378 et 380                                        |

Ajouté à la demande de l'utilisateur : 391 (schéma de champs commun formes / modes / paramètres, taille L), passé
en `todo/`. Dette : 392, 393.

Ordre suivi : 376 (erreur) → 389 (docs) → 378 → 380 → 379 → 377 → 381 à 385 → 386 → 388 → 387 → 391 → 390. Un
commit par sujet, dès que `make check` est vert.

## Avancement

- [x] Tâche décrite (ce fichier)
- [x] Constats
- [x] Sujets rédigés (376 à 390, idée 391, dette 392-393)
- [x] Sujets validés par l'utilisateur (2026-10-08)
- [x] Réalisation (2026-10-09) : 376 à 391 faits, un commit par sujet ; dette 393 à 405 dans `docs/backlogs/debt/`
