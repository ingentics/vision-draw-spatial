# RDD : « Entité » devient « Table », « Entité énumérative » devient « Table énumérative »

> Itération — mode RDD, noms des formes (palette, panneau)

- Nom affiché de la forme `rdd-entity` : « Table » (au lieu de « Entité ») ; de `rdd-enum` : « Table énumérative »
  (au lieu de « Entité énumérative »). Partout où le nom de la forme apparaît : palette, infobulles, panneau.
- Les ids de forme (`rdd-entity`, `rdd-enum`), le texte d'une forme neuve (`Entity`, `Enum`) et les fichiers ne
  changent pas. Mot-clé de recherche « entité » gardé, pour retrouver la forme sous son ancien nom.
- SPEC à jour (sujet 180 et suivants : « Entité » → « Table »).
- **Fini quand :** dans la palette d'une page RDD, les deux formes s'appellent « Table » et « Table énumérative » ; une
  recherche « entité » les trouve encore.
- Fait : nom des formes `rdd-entity` → « Table » et `rdd-enum` → « Table énumérative » (`shapes/entity/index.ts`,
  `shapes/enum/index.ts`), mot-clé « entité » ajouté à la table énumérative ; test des noms de la palette
  (`rdd/index.test.ts`) ; SPEC. Vérifié dans l'appli : noms dans la palette, la recherche « entité » trouve les deux.
