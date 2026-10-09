# Compatibilité draw.io limitée à l'export

> Itération — docs et règles de travail (contrat du projet)

- On s'éloigne de draw.io : la seule contrainte restante est de pouvoir **exporter vers draw.io** (le fichier s'ouvre
  dans draw.io). Le reste n'a plus à être identique à draw.io ni à imiter ses comportements, valeurs, styles ou rendus.
- Mettre à jour le contrat dans `CLAUDE.md`, `docs/ROADMAP.md`, `docs/SUMMARY.md`, `docs/SPEC.md` (§1, §2, §15) et
  `.claude/rules/coding.md` : un ticket ne demande plus de valeurs exactes de draw.io ni de validation dans draw.io,
  et `make drawio-check` n'est plus exigé à chaque modification du fichier.
- Pas de changement de code dans ce ticket ; les sections de la SPEC qui décrivent l'existant restent vraies.
- **Fini quand :** aucun fichier d'instructions ou de doc d'entrée n'impose plus l'iso-draw.io ; seule l'ouverture du
  fichier exporté dans draw.io reste demandée.
- Fait : contrat réécrit dans `CLAUDE.md` (en tête et règle de validation), `docs/ROADMAP.md` (modèle de sujet,
  principe), `docs/SUMMARY.md` (contrat, `make drawio-check` facultatif), `docs/SPEC.md` (§1, §2, §15) et
  `.claude/rules/coding.md` (commentaires). Aucun code touché ; `make check` passe.
