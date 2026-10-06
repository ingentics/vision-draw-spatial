# Le mode Séquences s'affiche en 2D seulement

> Itération — modes de page (Séquences) ; reprise de 70, s'appuie sur 178

- Une page en mode Séquences n'a que la vue 2D : `viewModes: ['top']` dans la définition du mode.
- **Fini quand :** sur une page Séquences, Iso et 3D sont désactivés, `I` / `P` sans effet, la page s'ouvre en 2D ;
  une page normale garde ses vues ; `make check` vert.
- Fait : `viewModes: ['top']` dans `src/engine/modes/sequences/index.ts`, test dans `tests/engine/modes/sequences.test.ts`.
  Vérifié dans l'appli sur `fixtures/flows.drawio` : Iso et 3D désactivés, `I` / `P` sans effet, page passée dans le
  mode ramenée en 2D, autre page revenue en iso.
