# Vocabulaire RDD : « Fragment » et « Non structuré »

> Itération — mode RDD, libellés affichés

- « Embedded » devient **« Fragment »** dans tout ce que l'utilisateur lit : nom de la forme dans la palette
  (`shapes/embedded/index.ts`), nom par défaut d'une table neuve (`value`), mots-clés de recherche (on garde
  `embedded`), titres et libellés des panneaux (préfixe des champs, formulaire de la flèche), diagnostics.
- Le type de champ « Dynamique » devient **« Non structuré »** (`FIELD_TYPES.dynamic` dans `tables/fieldModel.ts`),
  ainsi que ses mentions (relation document → champ non structuré, titres, diagnostics).
- Les **identifiants ne changent pas** (`rdd-embedded`, `dynamic`, `embedded`) : les fichiers existants restent valides.
  Pas de changement de format.
- La spec (`docs/SPEC.md`, §RDD) reprend les nouveaux mots.
- **Fini quand :** dans l'appli, la palette propose « Fragment », le type d'un champ propose « Non structuré », plus
  aucun « Embedded » ni « Dynamique » à l'écran ; un fichier existant se rouvre comme avant ; `make check` vert.
- Fait : libellés « Fragment » (palette, nom par défaut, mots-clés, panneaux, flèche) et « Non structuré »
  (`FIELD_TYPES.dynamic`) ; identifiants inchangés, aucun changement de format ; `docs/SPEC.md` mis à jour ; tests
  adaptés. `make check` vert.
