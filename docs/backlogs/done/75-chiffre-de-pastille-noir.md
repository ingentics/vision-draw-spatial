# Chiffre de la pastille de flux en noir

> Itération — mode Séquences (habillage) ; reprise de 71

- Le chiffre de la pastille repasse en noir : sur les fonds pastel des styles de forme (74), le blanc est illisible.
- **Fini quand :** sur `sequences.drawio`, chiffres noirs sur toutes les pastilles ; `make check` vert.
- Fait : `render/decorations.ts` (chiffre de la couleur de la bordure, noir), commentaire de `EdgeBadge`
  (`modes/types.ts`), test du rendu (`sequences.test.ts`). Vérifié dans l'appli sur `sequences.drawio`.
