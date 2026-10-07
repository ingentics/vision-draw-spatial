# RDD : commentaire du champ au survol, et touche C sur un champ

> Itération — mode RDD (commentaires) ; reprise de 260 (commentaire du champ) et 259 (survol)

- **Survol** d'un champ qui a un commentaire : l'encart des commentaires montre celui de la table (s'il y en a un),
  **un trait**, puis celui du champ, sous le nom du champ en gras, **sans effet d'apparition** (retours de
  l'utilisateur) ; si la table n'a pas de commentaire, celui du champ seul. Survol
  de la table hors d'un champ commenté : comme avant (le commentaire de la table, ou rien). Mêmes règles qu'avant
  avec une sélection (ticket 202).
- **Touche C** : champ sélectionné, ou survolé sans sélection, → l'éditeur de commentaire s'ouvre sur le commentaire
  **du champ** (texte brut, sans panneau de format, comme dans le panneau) ; validé, il est écrit dans le champ
  (`comment`), en une étape d'annulation. Table sélectionnée sans champ : le commentaire de la table, comme avant.
- Cadre : commentaire d'une partie de forme déclaré par le mode (`ModeParts.comment` / `setComment`).
- **Fini quand :** survol d'un champ commenté → encart table + champ (ou champ seul) ; C sur un champ → édite son
  commentaire, relu dans le panneau ; C sur la table → celui de la table ; `make check` vert.
- Fait : `ModeParts.comment` / `setComment` (`modes/types.ts`) ; `ElementComment.part` (titre et texte de la partie,
  au survol seulement) et `withPartComment`, `sameComment` qui compte la partie (`edit/comment.ts`) ;
  `ShapeParts.hoveredPart`, `comment`, `editComment` (événement `commentEdit` avec `part`, texte brut) et
  `setComment` ; `PointerInput.syncHoverComment` ajoute le commentaire de la partie survolée, `editHoveredComment`
  (touche C) passe par la partie sélectionnée ou survolée ; `Engine.setPartComment`. Appli : `CommentCard` dessine la
  partie sous un trait (`.comment-divider`, seulement s'il y a un commentaire de l'élément) sans effet d'apparition
  (`.comment-part`) ; `CommentEditor` en texte brut (`plain`) et sans panneau de format pour une partie, validé par
  `setPartComment`. RDD : `fieldParts.comment` (vide sans commentaire, rien pour un séparateur) et `setComment`.
  Tests `tests/engine/edit/comment.test.ts` (composition, comparaison) et `rdd.test.ts` (commentaire d'un champ,
  séparateur sans commentaire). SPEC §14.5, `AJOUTER_UN_MODE.md`. Vérifié dans l'appli : commentaire de `name` écrit
  au panneau, survol → « name » en gras et son texte ; C sur la table → commentaire de la table, survol de `name` →
  table, trait, champ ; `is_active` sélectionné + C → éditeur sans panneau de format, « Compte actif » relu dans le
  panneau ; plus d'animation sur la partie du champ (styles calculés).
