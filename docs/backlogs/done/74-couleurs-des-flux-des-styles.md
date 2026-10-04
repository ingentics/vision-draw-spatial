# Couleurs des flux prises dans les styles de forme

> Itération — mode Séquences (couleurs) ; reprise de 70

- La suite des couleurs des flux devient les couleurs de fond des styles de forme (panneau « Forme » : styles de
  draw.io puis palette pastel), à partir de « Bleu » (`#dae8fc`) jusqu'à la fin : ni le blanc ni le gris du début.
- Palette partagée : la suite est dérivée des styles (`DRAWIO_STYLES`, `PASTEL_STYLES`), pas recopiée.
- Les flux déjà enregistrés gardent leur couleur ; seuls les nouveaux flux prennent la nouvelle suite.
- **Fini quand :** un nouveau flux prend `#dae8fc`, le suivant `#d5e8d4`… ; `make check` vert.
- Fait : `engine/modes/sequences/flows.ts` — `FLOW_COLORS` dérivé de `DRAWIO_STYLES` puis `PASTEL_STYLES`
  (`edit/styles.ts`) à partir du 3ᵉ style (18 couleurs) ; tests mis à jour (`sequences.test.ts`). Vérifié dans
  l'appli : un nouveau flux prend `#dae8fc`. Constat : sur ces fonds pastel, le chiffre blanc de la pastille est
  illisible et le trait (fond assombri de 25 %) reste pâle — à reprendre dans un sujet suivant.
