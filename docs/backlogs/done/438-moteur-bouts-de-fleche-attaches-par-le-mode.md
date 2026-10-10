# Moteur : un mode peut exiger que les deux bouts d'une flèche tiennent à une forme

> Architecture du moteur — contrat des modes (`ModeEdges`, sujets 265, 295, 379) ; préalable à 434 (transitions de
> la machine à états)

- **Contrat** : nouveau membre facultatif de `ModeEdges` (`src/engine/core/modes/types.ts`), par exemple
  `attachedEnds?(page: PageModel): boolean`, documenté à côté de `connects` : vrai = sur cette page, une flèche n'a
  jamais de bout libre. Absent ou faux = comportement actuel. Appelé par l'hôte (`PageModes`, adaptateur unique
  `call`, appel protégé : une erreur du mode vaut « absent » et est signalée dans Diagnostics comme les autres).
- **Gestes concernés** :
  - **rebranchement** d'un bout (`core/domains/edit/drag/edgeEnd.ts`) : lâché dans le vide ou sur une forme refusée,
    le bout revient à sa place, aucune entrée d'historique ; pendant le glisser, l'aperçu reste celui d'aujourd'hui ;
  - **création** depuis une poignée de connexion : rien à changer, une flèche tirée d'une forme n'est déjà créée que
    lâchée sur une forme permise (`ConnectDrags.commit` sans cible ne crée rien) ; écrit dans la doc du membre.
- **Hors gestes** (collage d'une flèche sans ses formes, fichier modifié ailleurs, forme supprimée si une flèche y
  survit) : pas de règle dans le moteur ; le mode les signale au besoin par `lifecycle.check` (Diagnostics). Écrit
  dans la documentation du membre.
- Aucun nom de mode dans `core/` (sujet 306) ; l'API des plugins (`core/plugins`) n'a rien à réexporter de plus que
  le type du contrat.
- **Tests** : rebranchement dans le vide : bout et historique inchangés ; sur une autre forme : rebranché ; sans le
  membre : bout libre écrit comme avant ; hôte : réponse du mode, faux sans membre, faux et erreur signalée si le mode
  lève une exception. Table des garanties des modes (test de contrat) mise à jour.
- **Docs** : SPEC (bouts d'une flèche et contrat des modes), `docs/AJOUTER_UN_MODE.md` §5 et §8 (garanties).
- **Fini quand :** les tests ci-dessus passent ; dans l'appli, aucun mode existant ne change (une flèche lâchée dans
  le vide sur une page RDD ou Séquences garde son bout libre comme avant) ; `make check` vert. Le cas visible
  « flèche refusée dans le vide » se vérifie à l'œil au sujet 434.
- Fait : contrat `ModeEdges.attachedEnds?(page)` (`core/modes/types.ts`) ; hôte `PageModes.attachedEnds(page)`
  (appel protégé, repli faux) ; `EdgeEndDrags.commit` (`core/domains/edit/drag/edgeEnd.ts`) traite un bout libre
  refusé comme un bout revenu à sa place (attaches et points d'origine restaurés, rien d'écrit, pas d'étape). La
  création n'a pas changé : elle ne laissait déjà jamais de bout libre. Tests
  `tests/engine/core/domains/edit/drag/edgeEnd.test.ts` (nouveau, cœur réduit) et
  `tests/engine/core/domains/modes/pageModes.test.ts`. Docs : `AJOUTER_UN_MODE.md` (contrat, §5, table des
  garanties), SPEC (bouts d'une flèche). Aucun mode ne déclare encore le membre : rien de visible dans l'appli,
  vérifié par les tests seulement (le cas visible sera au sujet 434).
