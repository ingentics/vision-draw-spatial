# RDD : corps d'un document en texte libre, sans contrôle YAML

> Itération — mode RDD (document) ; reprise de 269

Le corps d'un document n'est pas forcément du YAML : c'est une saisie libre, qui peut contenir n'importe quoi.

- Plus de contrôle YAML : aucun message « YAML invalide » dans Diagnostics, quel que soit le texte.
- Panneau, section « Document body » : le champ s'appelle « Texte » (plus « YAML ») et son infobulle parle d'un texte
  libre.
- Le contrôle YAML du cœur (`yamlProblem`, `core/diagnostics/yamlCheck.ts`) n'a plus d'usage : retiré, avec le paquet
  `yaml` des dépendances.
- Inchangé : stockage (`spatial.rdd.body`), rendu monospace tronqué, saisie sur place, tabulations remplacées par deux
  espaces (alignement en police à chasse fixe), conversion des documents à clés en lignes `clé:`.
- **Fini quand :** un document dont le corps n'est pas du YAML valide (ex. `a: 1` puis `a: 2`, ou du texte quelconque)
  n'apparaît pas dans Diagnostics ; le panneau montre « Texte » sous « Document body » ; SPEC à jour ; `make check`
  vert.
- Fait : contrôle « YAML invalide » retiré des Diagnostics du mode (`rdd/index.ts`) ; `yamlProblem`
  (`core/diagnostics/yamlCheck.ts`), son test et son export dans l'API des plugins supprimés, paquet `yaml` retiré
  (`package.json`, `package-lock.json` par `make lock`). Panneau : champ « Texte » (ex-« YAML »), infobulle « texte
  libre » (`tableProperties.ts`). Commentaires sans YAML (`documentBody.ts`, `tableKinds.ts`, `tableLayout.ts`,
  `table.ts`, `fieldParts.ts`) ; SPEC §14.5 et table des attributs. Tests : `documentBody.test.ts` (trois textes non
  YAML, aucun diagnostic), `index.test.ts` (libellé « Texte »), `kinds/document/index.test.ts` (`broken` de
  `rdd-document.drawio` plus signalé). Fichier `.drawio` non touché. Validé par les tests seulement.
