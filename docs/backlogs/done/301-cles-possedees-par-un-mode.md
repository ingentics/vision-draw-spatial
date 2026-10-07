# Modes : clés dans l'espace de noms du mode, validées et sans verrou contourné

> Architecture du moteur — étanchéité des plugins. Audit du 2026-10-07. Décidé le 2026-10-07 : préfixe imposé par un
> espace de noms déclaré par le mode (`rdd`, `seq`), distinct de son id ; le format du fichier change.

- Aujourd'hui, `ModeEdit` ne contrôle que le préfixe `spatial.` (`core/modes/modeEdits.ts:59,69,89`) :
  - un mode écrit les clés du tronc : `spatial.mode` (il change le mode de sa propre page), `spatial.effects`,
    `spatial.view`, `spatial.anchoring`, `spatial.jumps`, `spatial.kind`, `spatial.height`… ;
  - il écrit celles d'un autre mode : les clés n'ont pas de préfixe par mode (`spatial.flow`, `spatial.step`,
    `spatial.fields`) ;
  - la clé n'est pas validée et `setCellStyleValue` ne la nettoie pas : `setElementAttribute(id,
    'spatial.x=1;locked', '0')` écrit `locked=0` ; `setPageAttribute('spatial.a b', …)` écrit un attribut XML
    invalide (fichier corrompu) ;
  - `setShapeBounds` ne vérifie que `canMoveCell`, pas `isLocked` ; `setElementStyle` peut écrire `locked`,
    `movable`, `editable`, `deletable` ;
  - `pasteKeys` : on fait l'union de ces clés pour tous les modes, et elle s'applique à tout collage, sans limite à
    `spatial.*` (`modes/registry.ts:160`, `format/clipboardCells.ts:177`).
- Espace de noms :
  - `PageModeDefinition.namespace` (obligatoire, `^[a-z][a-z0-9]*$`), distinct de l'id : `rdd` pour RDD, `seq` pour
    Séquences ;
  - deux modes ne peuvent pas déclarer le même espace de noms (erreur à l'enregistrement) ;
  - un mode n'écrit, par `setPageAttribute` et `setElementAttribute`, que des clés `spatial.<namespace>.<nom>` ; une
    clé invalide lève une exception (opération annulée et signalée, sujet 288) ;
  - le mode désigne ses clés par leur **nom court** et le moteur ajoute le préfixe (décidé le 2026-10-07) : le mode
    ne peut pas sortir de son espace de noms, même par erreur, et ne voit jamais le préfixe :
    - écriture : `edit.setElementAttribute(id, 'flow', '3')` écrit `spatial.seq.flow=3` ; même chose pour
      `setPageAttribute` ;
    - lecture : accès fournis au mode qui ajoutent le préfixe (ex. `edit.value(element, 'flow')`, et une lecture
      équivalente pour les points d'entrée qui ne reçoivent pas `ModeEdit` : `dressing`, `parts`, `current`…, forme
      exacte décidée au ticket) ; ils remplacent les lectures directes `spatialValue(element, FLOW)` des deux modes ;
    - réglages déclarés : `ModeProperty.key` est un nom court, préfixé par le moteur pour la lecture et l'écriture
      par défaut ;
    - un nom court est validé par `^[A-Za-z][\w.-]*$` ; un nom qui commence par `spatial.` est refusé.
- Clés renommées (liste à compléter en relevant les clés lues et écrites par les deux modes) :
  | Avant | Après |
  |---|---|
  | `spatial.flows`, `spatial.flow`, `spatial.step`, `spatial.participant` | `spatial.seq.flows`, `spatial.seq.flow`, `spatial.seq.step`, `spatial.seq.participant` |
  | `spatial.fields`, `spatial.secondary`, `spatial.reverseName`, `spatial.cardinalities` | `spatial.rdd.fields`, `spatial.rdd.secondary`, `spatial.rdd.reverseName`, `spatial.rdd.cardinalities` |
  - `spatial.mode` (ex. `rdd`, `sequences`) et les valeurs de `spatial.kind` des formes de mode ne changent pas : ce
    sont des clés du tronc.
- Migration des fichiers existants :
  - lecture : l'ancienne clé est lue si la nouvelle est absente ;
  - écriture : à l'ouverture d'une page du mode (`lifecycle.opened`, déjà une étape d'annulation pour tout le
    document, rien en lecture seule), les anciennes clés sont réécrites sous leur nouveau nom et retirées, à la même
    place (style ou objet) ;
  - la lecture des anciennes clés reste tant que des fichiers anciens peuvent exister (noté dans le code, à retirer
    plus tard par un sujet à part).
- Dans tous les cas :
  - les clés de `SPATIAL` (tronc) sont refusées aux modes ;
  - clés de style validées par expression régulière (`^[A-Za-z][\w.:-]*$`) ; une clé invalide lève une exception ;
  - `setElementStyle` refuse `locked`, `movable`, `resizable`, `editable`, `deletable` ;
  - `setShapeBounds`, `sendToBack`, `setElementStyle` et `setEdgeEndText` ignorent un élément verrouillé
    (`isLocked`), comme les gestes du tronc ;
  - `pasteKeys` disparaît du contrat : au collage, on retire les clés `spatial.<namespace>.*` de tous les modes
    enregistrés (et les anciennes clés, le temps de la migration).
- RDD, Séquences, le mode de test, les fixtures (`tests/fixtures/*.drawio` et leurs copies `drawio-saved/`),
  `AJOUTER_UN_MODE.md` (définition, table des garanties, clés) et la SPEC §14.3 mis à jour.
- **Fini quand :**
  - tests : écrire `mode` arrive en `spatial.<namespace>.mode`, pas en `spatial.mode` ; une opération qui écrit un
    nom complet (`spatial.mode`, `spatial.rdd.fields`), un nom injecté (`;`, `=`, espace) ou la clé de style `locked`
    n'écrit rien et est signalée ; les bornes d'une forme verrouillée ne changent pas ;
    deux modes au même espace de noms : erreur à l'enregistrement ;
  - migration : une fixture aux anciennes clés (RDD et Séquences) s'ouvre identique à l'œil ; après ouverture,
    plus aucune ancienne clé dans le fichier enregistré, une annulation les remet ;
  - dans l'appli, une page RDD et une page Séquences se comportent comme avant (champs, relations, cardinalités,
    flux, rangs, collage) ;
  - fixtures + `make drawio-check` : les nouvelles clés survivent à un réenregistrement dans draw.io ;
  - `make check` vert.
- Fait :
  - Tronc :
    - `core/modes/modeKeys.ts` (nouveau) : `modeKey(namespace, nom)` (nom court validé, `spatial.` refusé),
      `modeKeys(owner)` (lecteur du mode : `value`, `flag`, `pageValue`, `key`, ancienne clé lue pour un nom de
      `legacyKeys`), `migrateLegacyKeys(page, pageTree, owner)` ; `modeKeys` et `ModeKeys` exportés par l'API des
      plugins ;
    - contrat : `namespace` (obligatoire) et `legacyKeys` ; `ModeEdit.setPageAttribute` / `setElementAttribute` et
      `ModeProperty.key` prennent des noms courts ;
    - `applyModeEdit(page, pageTree, owner, edit, context)` : préfixe l'espace de noms ; `setElementStyle` refuse une
      clé invalide (`^[A-Za-z][\w.:-]*$`), `spatial.*` et les clés de verrou (exception : l'opération n'écrit rien) ;
      un élément verrouillé (`isLocked`) ne change ni de style, ni de bornes, ni d'ordre, ni de textes de bout ;
    - registre : espace de noms invalide ou déjà pris par un autre mode refusé à l'enregistrement ;
    - hôte des modes : espace de noms passé à chaque opération, lecture par défaut d'un réglage déclaré par le lecteur
      du mode, migration des anciennes clés à l'ouverture (avant `lifecycle.opened`, page relue ensuite, même étape
      d'annulation « Ajustement du mode », rien en lecture seule).
  - Modes : Séquences (`seq` ; `SEQUENCES_KEYS` et `keys` dans `flows.ts`) et RDD (`rdd` ; `rdd/keys.ts`) en noms
    courts ; lectures par `keys.value` / `flag` / `pageValue`, styles écrits soi-même (modèle de palette d'une table,
    aperçus) par `keys.key`. Clés renommées : celles de la table, plus `spatial.seq.participant` et
    `spatial.rdd.reverseName`, `spatial.rdd.cardinalities`. Les identifiants de réglages calculés de RDD
    (`rdd.primaryKey`, `rdd.relation.edge.label`…) ne changent pas : ils ne désignent pas un attribut.
  - **Écart avec le ticket** : `pasteKeys` est gardé. Retirer au collage toutes les clés des modes aurait fait perdre
    ses champs (`spatial.rdd.fields`) à une table RDD copiée ; seul le flux et le rang d'une flèche Séquences doivent
    partir, comme avant. Il prend maintenant des noms courts : le registre en fait les clés complètes (et les anciennes
    clés), un mode ne peut plus faire retirer une clé hors de son espace de noms (`fillColor`, `id`…).
  - Fixtures : `sequences.drawio`, `flows.drawio`, `rdd.drawio`, `rdd-regions-imbriquees.drawio` aux nouvelles clés ;
    `sequences-anciennes-cles.drawio` et `rdd-anciennes-cles.drawio` (copies d'avant, pour la migration) ; copies
    `drawio-saved/` régénérées par `make drawio-check` : draw.io garde les nouvelles clés.
  - Doc : `AJOUTER_UN_MODE.md` (définition, section « Les clés du mode », opérations, table des garanties avec
    `namespace` et `legacyKeys`), SPEC §14.3 (attributs des modes, anciennes clés).
  - Tests :
    - `tests/engine/core/modes/modeEdits.test.ts` (nouveau) : `mode` écrit en `spatial.test.mode` ; nom complet, nom
      injecté (`;`, `=`, espace), clés de style `locked`, `movable`, `spatial.kind` : exception, rien d'écrit ; formes
      verrouillées (`locked=1`, `movable=0`) : bornes, style et ordre inchangés ;
    - `tests/engine/core/modes/modeKeys.test.ts` (nouveau) : préfixe, noms refusés, lecture avec ancienne clé, migration
      (style, objet, nouvelle clé prioritaire, autres clés intactes) ;
    - registre : espace de noms invalide ou pris refusé, clés de collage complètes ;
    - Séquences et RDD : le fichier aux anciennes clés se lit comme le même aux nouvelles ;
    - tests des modes adaptés aux noms courts et aux clés complètes.
  - Validation dans l'appli (navigateur intégré, serveur 5173) :
    - `rdd-anciennes-cles.drawio` : affichée comme avant ; à l'ouverture, plus que des clés `spatial.rdd.*` ; une
      annulation remet les anciennes clés, l'affichage ne bouge pas ; « Table secondaire », « + » (nouveau champ) et
      « Afficher les cardinalités » écrivent sous `spatial.rdd.*` ; modifications annulées ;
    - `sequences-anciennes-cles.drawio` : flux, barre et pastilles comme avant, clés `spatial.seq.*` sur les deux
      pages ; « + » change le rang ; une flèche dupliquée (⌘D) n'a ni flux ni rang ; modifications annulées.
    - Relations RDD (champ de relation, nom inverse, cardinalités sur une flèche) vérifiées par les tests seulement.
