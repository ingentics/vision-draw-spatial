# RDD : libellé et préfixe d'une relation embedded écrits en direct

> Itération — panneau d'une relation embedded RDD ; reprise de 268

- « Champ » et « Préfixe » d'une relation embedded, sur la flèche comme sur le champ sélectionné, s'écrivent à chaque
  frappe : la ligne de la table d'arrivée suit la saisie (nom, préfixe en gris, largeur de la table). Échap revient
  au texte d'avant la saisie ; le champ garde le curseur.
- Une saisie (entrée dans le champ jusqu'à Entrée ou la sortie) fait une seule étape d'annulation.
- Un libellé vidé pendant la saisie est refusé : la ligne garde son dernier nom non vide.
- Générique : un réglage texte déclaré par un mode peut être « en direct » (`ModeProperty.live`).
- **Fini quand :** sur une page RDD, taper dans « Champ » ou « Préfixe » (flèche ou champ) met à jour la table à
  chaque lettre, une seule annulation défait toute la saisie ; les autres réglages de mode restent validés à Entrée ;
  `make check` vert.
- Fait : `ModeProperty.live` (`modes/types.ts`) : réglage texte écrit à chaque frappe ; posé sur les textes de champ des
  relations (`fieldTextProperty`, `rdd/relations/index.ts`), donc Champ et Préfixe de l'embedded, sur la flèche et
  sur le champ. Annulation : `EditHistory.recordSnapshot(label, before, merge)` fusionne les instantanés d'une même
  saisie (comme `recordMergeableEdit`, garde commun `merges`) ; `PageModes.editPageMode` et `setModeProperty`,
  `Engine.setModeProperty` et `onModeProperty` (`ContextPanel.tsx`, `Viewer.tsx`) passent la clé `merge`. Appli :
  `ModeFields.tsx`, champ en direct sans la valeur dans sa clé (le curseur reste), recréé après la validation (un
  libellé vidé, refusé, réaffiche le nom retenu). Écart : un instantané de mode (`recordSnapshot`) compte désormais
  comme une étape pour la fusion des réglages en direct (un réglage de style en direct repris après une opération de
  mode ouvre une nouvelle étape, ce qui manquait). Tests `tests/engine/core/document/undo.test.ts`,
  `relations.test.ts`. Vérifié dans l'appli : Address → Role, « PLO » tapé sans valider dans le Préfixe de la flèche,
  Role montre aussitôt `Address  PLO` ; « PLOP_ » validé, une annulation retire tout le préfixe. Saisie depuis le
  champ et libellé vidé : vérifiés par les tests et par lecture seulement.
