# Moteur : un seul hôte pour les appels aux modes

> Architecture du moteur — étanchéité des plugins. Indépendant de 285 à 287 (chemins à suivre s'ils passent avant).

- Aujourd'hui, les hooks des modes sont appelés depuis une dizaine de fichiers de `core/`. On les fait passer par le
  domaine des modes (`core/modes/pageModes.ts`, ou `core/domains/modes/` après 285).
- Remise en ordre dans l'étape d'annulation en cours : relire la page depuis l'arbre, puis `applyModeEdit` avec
  `editContext()`. Ce code est copié 5 fois (`pageModes.shapesPlaced`, `elementRelabeled`, `edgeReconnected`,
  `drag/connect.ts`, `commands/elements.ts`) ; il devient une seule méthode, appelée par tous ces endroits.
- Partie renvoyée par une opération du mode : la sélectionner et passer son texte en édition. Copié 3 fois
  (`setModeProperty`, `modeKey`, `ModeHandles.click`) ; devient une seule méthode.
- Formes emportées (`carries`) : un seul parcours de proche en proche, utilisé par le geste (`gesture.carried`) et par
  la mise en valeur de la sélection (`highlight.ts`, qui ne descend aujourd'hui que d'un niveau). Si le résultat
  change (régions RDD imbriquées), l'écart est écrit dans le « Fait : ».
- Garde des appels : une exception levée par un hook n'arrête ni la lecture, ni le rendu, ni le geste.
  - Le hook est traité comme absent : pas d'habillage, pas de remise en ordre, opération annulée sans écriture.
  - Une ligne s'ajoute aux Diagnostics : `Mode <id> : erreur dans <hook>`.
  - Même garde pour le décor d'un effet (`volume`).
- **Fini quand :**
  - plus aucun appel `modeOf(page)?.<hook>` hors du domaine des modes et du registre ;
  - tests : un mode de test dont `check`, `dressing` et `placed` lèvent une exception s'ouvre, s'affiche et se modifie,
    et les Diagnostics le signalent ;
  - une région RDD contenant une région contenant une table met en valeur la table à la sélection, et l'emporte au
    déplacement (à l'œil) ;
  - `make check` vert.
- Fait :
  - Hôte unique (`core/domains/modes/`) :
    - `PageModes` porte tous les appels au mode de la page : `managesEdge`, `dressing` (protégé jusque dans
      `edgeColor` / `edgeBadge`), `obstacles`, `carried` / `hasCarries`, opérations, touches, `endAccepts`,
      `opened`, `check` ;
    - un seul `followUp` (relecture de la page + `applyModeEdit` dans l'étape en cours) sert `shapesPlaced`,
      `elementRelabeled`, `edgeReconnected` et les nouveaux `edgeCreated` (glisser de connexion) et `elementsRemoved`
      (suppression) ;
    - un seul `selectPart` sert `setModeProperty`, `modeKey` et `ModeHandles.click` ;
    - `ShapeParts` porte tous les appels aux parties : `canDrag`, `dropAt`, `dragPreview` et `move` y sont ajoutés
      pour le glisser d'une partie ;
    - le « courant » du mode (choix, barre, estompage) sort dans un nouveau domaine `ModeCurrents`, parce que
      `pageModes.ts` dépassait 400 lignes.
  - Plus aucun appel `modeOf(page)?.<point d'entrée>` hors de `core/domains/modes/` et du registre. Restent hors de
    l'hôte deux lectures de propriétés, qui ne sont pas des appels : `selectionStyle` dans `highlight.ts` et
    `viewModes` dans `viewModes.ts`.
  - Formes emportées : un seul parcours de proche en proche, `carriedShapes` (`core/edit/moveSet.ts`, pur, testé),
    utilisé par le geste (seulement les formes déplaçables) et par la mise en valeur. Écart : la mise en valeur
    descend maintenant de proche en proche ; elle ne prenait que le premier niveau.
  - Protection (`PluginGuard`, nouveau domaine) :
    - chaque appel est protégé ; une exception fait traiter le point d'entrée comme absent ;
    - l'erreur est signalée une fois par point d'entrée pour la session (« Mode boom : erreur dans placed (panne) »),
      ajoutée aux avertissements du document et republiée après l'appel en cours (`DocumentFile.publishWarnings`,
      événement `documentChange`) ;
    - le décor d'un effet en panne est écarté de la page (`decorate({ onError })`), signalé « Effet <id> : erreur
      dans volume ».
  - `applyModeEdit` est transactionnel : les écritures sont rassemblées puis appliquées une fois l'opération
    terminée, donc une opération qui lève une exception n'écrit rien. Les écritures dans l'arbre sont les mêmes
    qu'avant (même ordre).
  - Défaut trouvé et corrigé : la première version de `carriedShapes` appelait `stack.pop()` dans le `find` et sautait
    des formes. Le nouveau test l'a relevé alors que toute la suite passait : aucun test ne couvrait l'imbrication.
  - Tests :
    - `tests/engine/core/domains/modes/pageModes.test.ts` : opération en panne sans écriture ; mode de test dont
      `check`, `dressing.edgeColor`, `placed`, `carries`, `obstacles` et `connects` lèvent une exception (repli, arbre
      inchangé, six erreurs signalées une fois chacune, une republication des Diagnostics) ;
    - `carriedShapes` dans `tests/engine/core/edit/moveSet.test.ts` (régions imbriquées, forme écartée).
  - Fixture `tests/fixtures/rdd-regions-imbriquees.drawio` : une région qui contient une région qui contient une
    table.
  - Dette notée : 294 (les appels faits par l'appli aux réglages déclarés d'un mode ne sont pas protégés).
  - Validation :
    - `make check` vert (106 fichiers, 2034 tests) ;
    - dans l'appli : sur la nouvelle fixture, glisser la région extérieure emporte la région intérieure et la table
      (une annulation remet tout) ;
    - sur une page RDD, le contour imposé remplace le voile, donc la mise en valeur du contenu ne se voit pas : elle
      n'est vérifiée que par les tests ;
    - la page Séquences garde sa barre de flux courant, ses pastilles et son estompage, et le passage au flux suivant
      fonctionne.
