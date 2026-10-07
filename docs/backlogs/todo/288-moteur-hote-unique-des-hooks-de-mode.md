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
