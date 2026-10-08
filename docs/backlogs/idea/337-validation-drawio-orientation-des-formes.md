# Validation dans draw.io de l'orientation des formes

> Idée — suite de 335 (retournement et rotation à 90°) ; le sens appli → draw.io est volontairement a minima en 335

- Fixture avec une forme retournée (`flipH`, `flipV`) et pivotée (`direction`) par l'appli, puis `make drawio-check`
  (réenregistrement et export SVG par draw.io) : le style doit revenir sans changement et le tracé coïncider.
- Contrôler que le label d'une forme retournée ou pivotée reste placé comme dans l'appli (le texte ne suit pas la forme).
- Lire la clé `rotation=<degrés>` (rotation libre de draw.io), aujourd'hui « non reprise » (SPEC §15), pour qu'une
  forme collée tournée de 45° s'affiche correctement.
