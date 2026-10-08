# Nom de champ édité sur place, sans éditeur sur fond blanc

> Itération — mode RDD, édition d'un champ (reprise de 249 et 253)

- Double-clic sur un champ d'une table : le nom s'édite directement dans la ligne, sans éditeur sur fond blanc qui
  couvre la ligne et le type. La table est redessinée à chaque frappe (le type suit le nom, la table s'élargit),
  comme pour un séparateur.
- **Fini quand :** double-clic sur un champ RDD, la saisie apparaît à la place du nom, le type reste visible et se
  décale en direct ; Entrée enregistre, Échap rend le nom d'origine.
- Fait : `transparent: true` sur le texte d'un champ (`rdd/editing/fieldParts.ts`), comme pour un séparateur ; l'aperçu
  en direct (`textPreview`) et le masquage du label dessiné existaient déjà. Test de `editing/fieldParts.test.ts` mis à
  jour. Vérifié à l'œil dans l'appli sur `fixtures/rdd.drawio` (saisie dans la ligne, type décalé en direct, Échap
  rend le nom) ; `make check` passe.
