# Process étiqueté générique

> Itération — formes (Architecture) ; reprise de 151

- Nouvelle forme de la palette Architecture, sur la base partagée `generic/tagged-process` : process à tranche
  étiquetée dont le mot par défaut est « PROCESS ». Nom « Process étiqueté » (id `labeled-process`), mots-clés
  process, étiquette, tranche, label, tag, composant, générique.
- Dans le panneau de la forme, le champ « Étiquette » (`spatial.tag`) saisit le mot de la tranche ; vide =
  « PROCESS ».
- **Fini quand :** la forme se crée depuis la palette avec « PROCESS » dans la tranche ; saisir un mot dans le champ
  « Étiquette » le remplace dans la tranche (2D et iso) ; `make check` vert.
- Fait : `shapes/impl/architecture/labeled-process/index.ts` sur `taggedProcess` (mot « PROCESS »). Nouveau patron
  pour les **paramètres d'instance** : section de panneau `shape` (`PropertySection`), affichée sous « Texte » et
  titrée du nom de la forme (`ShapeOwnSection` dans `app/ContextPanel.tsx`) ; le champ « Étiquette » des process
  étiquetés y passe (il était dans « Bordure »). SPEC (§8.3, attributs) et `AJOUTER_UNE_FORME.md` (sections des
  réglages) à jour ; tests de palette et du registre. Vérifié dans l'appli : ajout depuis la palette, « PROCESS » dans
  la tranche, section « Process étiqueté » sous « Texte », « API » saisi dans le champ remplace le mot.
