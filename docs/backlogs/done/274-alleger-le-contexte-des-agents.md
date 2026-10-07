# Alléger le contexte chargé au début de chaque conversation d'agent

> Itération — instructions des agents (`CLAUDE.md`, `docs/ROADMAP.md`, `docs/BONNES_PRATIQUES.md`, mémoires)

- Les fichiers d'instructions chargés d'office passent en anglais (moins de tokens que le français) ; la règle
  « commentaires, tickets, docs et commits en français » reste.
- Les règles de code de `BONNES_PRATIQUES.md` (où mettre le code, état, réutilisation, frontières, écriture)
  passent dans `.claude/rules/coding.md`, chargé seulement quand l'agent touche `src/` ou `tests/` (en-tête
  `paths:`) ; ce qui vaut pour tout ticket (validation, commit, dette) reste chargé d'office, dans `CLAUDE.md`.
- `ROADMAP.md` resserré : plus de doublon avec `CLAUDE.md` (serveur partagé, `make check`, commit après
  validation).
- Mémoires de l'agent : suppression de celles qui répètent `CLAUDE.md` (isolation compose, tickets d'itération,
  commit après validation).
- **Fini quand :** une nouvelle conversation charge nettement moins de texte projet, sans règle perdue (chaque
  règle de l'ancien texte se retrouve dans le nouveau) ; `make check` vert.
- Fait : `CLAUDE.md` et `docs/ROADMAP.md` traduits en anglais et dédoublonnés ; `docs/BONNES_PRATIQUES.md` déplacé
  (`git mv`) en `.claude/rules/coding.md`, traduit, chargé seulement sur `src/**` et `tests/**` ; ses parties
  validation, commit et dette passent dans `CLAUDE.md`. Texte chargé d'office : 15,7 Ko → 5,9 Ko. Retiré : l'exemple
  complet d'itération de `ROADMAP.md` (le format reste décrit). `.claude` ajouté à `.prettierignore` (comme `docs`).
  Trois mémoires de l'agent qui répétaient `CLAUDE.md` supprimées (hors dépôt). `make check` vert.
