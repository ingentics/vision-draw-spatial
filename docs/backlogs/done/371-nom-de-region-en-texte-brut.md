# Nom de région édité en texte brut

> Itération — mode RDD, région (reprise de 258)

- Éditer le nom d'une région n'ouvre plus le panneau de format « Texte » (rien n'y est réglable) : le panneau reste
  sur la forme, comme pour le nom d'une entité. Le nom s'édite en texte brut (`plainText` de la définition).
- **Fini quand :** double-clic sur le nom d'une région RDD, le panneau de droite reste « Forme » ; le nom modifié est
  bien enregistré.
- Fait : `plainText: true` sur la définition de la région (`rdd/shapes/region/index.ts`) ; test de
  `common/table.test.ts` mis à jour (la région est en texte brut). Effet : le nom d'une région s'édite sans mise en
  forme (raccourcis gras, italique, souligné inactifs ; un nom HTML existant est réécrit en texte brut). Vérifié à
  l'œil dans l'appli par l'utilisateur ; `make check` passe.
