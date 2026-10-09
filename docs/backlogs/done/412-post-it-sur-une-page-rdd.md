# Post-it sur une page RDD

> Itération — palette du mode RDB Designer ; reprise de 411

- Sur une page en mode RDD, la palette propose aussi le **Post-it**, après Texte et Titre (liste `page.palette.shapes`
  du mode, `plugins/modes/rdd/index.ts`).
- **Fini quand :** sur une page RDD, le Post-it est dans la palette et un clic en pose un ; `make check` vert.
- Fait : `'post-it'` ajouté à `page.palette.shapes` du mode (`plugins/modes/rdd/index.ts`) ; test de la palette RDD
  (`tests/engine/plugins/modes/rdd/index.test.ts`) mis à jour. Vérifié à l'œil sur le serveur partagé
  (`fixtures/rdd.drawio`) : le Post-it est dans « Général », un clic en pose un ; `make check` vert.
