# Point-virgule retiré des attributs de mode

> Dette vue au sujet 269 — `core/modes/modeEdits.ts` (`setElementAttribute`, `setElementStyle`)

- Un `;` dans la valeur d'un attribut de mode est retiré (séparateur du style draw.io) : un commentaire de champ RDD
  (`spatial.rdd.fields`, clé `comment`) qui en contient le perd en silence. Le corps d'un document (269) contourne en
  échappant `;` en `;` ; un échappement commun (ou l'écriture dans l'objet) éviterait la perte partout.
