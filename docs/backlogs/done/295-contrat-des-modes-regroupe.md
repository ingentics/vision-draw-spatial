# Contrat des modes regroupé par thème

> Architecture du moteur — étanchéité des plugins ; suite de 292 (garanties). Décidé le 2026-10-07 : le contrat n'est
> pas public (ni `src/index.ts` ni `COMPOSANT.md`), les deux modes du dépôt sont migrés dans le même commit.

- `PageModeDefinition` passe de 32 membres à plat à des groupes. Correspondance :

  | Avant | Après |
  |---|---|
  | `pageProperties`, `viewModes`, `allowsEffect`, `selectionStyle` | `page.properties`, `page.viewModes`, `page.allowsEffect`, `page.selectionStyle` |
  | `shapes`, `paletteCategories` | `page.palette.shapes`, `page.palette.categories` |
  | `check`, `opened`, `repair` | `lifecycle.check`, `lifecycle.opened`, `lifecycle.removed` |
  | `edgeProperties`, `connects`, `managesEdge`, `edgeCreated`, `edgeReconnected` | `edges.properties`, `edges.connects`, `edges.manages`, `edges.created`, `edges.reconnected` |
  | `shapeProperties`, `carries`, `obstacles`, `placed`, `relabeled` | `gestures.properties`, `gestures.carries`, `gestures.obstacles`, `gestures.placed`, `gestures.relabeled` |
  | `handles`, `handleClicked` | `gestures.handles.list`, `gestures.handles.clicked` |
  | `id`, `name`, `shortName`, `description`, `icon`, `settings`, `dressing`, `parts`, `current`, `keys`, `pasteKeys` | inchangés |

- Le groupe des formes et gestes s'appelle `gestures` : `shapes` désigne déjà les formes (dossiers `shapes/` d'un
  mode), et la liste blanche de la palette passe dans `page.palette.shapes`.
- `repair` devient `lifecycle.removed` : le nom dit quand il est appelé (après une suppression).
- Comportement inchangé. Migrés : le contrat (`core/modes/types.ts`), le registre, l'hôte des modes
  (`core/domains/modes/`, la mise en valeur et les modes d'affichage), les modes RDD et Séquences, le mode de test,
  l'appli (Paramètres), les tests, `AJOUTER_UN_MODE.md` (définition et table des garanties) et le test de la table, qui
  lit désormais les membres de chaque groupe.
- **Fini quand :** plus aucun ancien nom dans `src/`, `tests/` et le guide ; la table des garanties couvre chaque membre
  de chaque groupe (test) ; `make check` vert ; dans l'appli, une page RDD et une page Séquences se comportent comme
  avant (palette, panneau, poignée « + », déplacement d'une région, flux courant).
- Fait :
  - Contrat (`core/modes/types.ts`) : `PageModeDefinition` regroupé selon la table ci-dessus. Nouvelles interfaces
    `ModePage`, `ModeLifecycle`, `ModeEdges`, `ModeGestures` et `ModeHandleSet` (poignées : `list` et `clicked`). La
    doc de chaque membre suit son membre.
  - Registre, hôte des modes (`pageModes`, `modeHandles`), mise en valeur, modes d'affichage, appli (Paramètres) migrés.
    `followUp` reçoit désormais le point d'entrée par un accesseur. Les messages d'erreur des Diagnostics donnent le
    nouveau chemin (« Mode <id> : erreur dans gestures.placed »).
  - Modes RDD et Séquences réécrits par groupe, commentaires conservés. Le mode de test et les définitions des tests
    sont migrés ; les 71 accès des tests ont été réécrits par script, à la position exacte de chaque erreur de type.
  - Écart volontaire : les méthodes du moteur gardent leurs noms d'action (`pageModes.managesEdge`, `edgeCreated`,
    `engine.managesEdge`…) ; seuls les membres du contrat changent.
  - Doc : `AJOUTER_UN_MODE.md` (définition par groupe, chemins dans les sections 3 à 6, table des garanties avec un
    chemin par ligne, toujours 32 lignes), SPEC (modes, palette), commentaires du code.
  - Le test de la table (`contractDoc.test.ts`) déplie les groupes du contrat (`page.palette.shapes`,
    `gestures.handles.list`…). Vérifié qu'il échoue sans la ligne `gestures.obstacles`, puis ligne remise.
  - Défaut évité : la réécriture par script avait mis un `!` là où le membre est facultatif
    (`mode.page!.palette!.categories`), ce qui plantait pour Séquences ; repéré par `make check`, chaînage facultatif
    remis.
  - Comportement inchangé.
  - Validation :
    - `make check` vert (110 fichiers, 2049 tests, autant qu'avant) ;
    - dans l'appli : page Séquences (barre du flux courant, 2D seulement) ; page RDD (palette RDD, section du mode,
      boutons Iso et 3D désactivés, contour imposé, poignée « + » qui ajoute un champ, région « Comptes » déplacée avec
      ses tables, 2 diagnostics), toutes les modifications annulées.
