# Mesure du texte portée par le moteur, pas par le module

> Architecture du moteur — pas d'état mutable de module (`coding.md` §3). Audit du 2026-10-08 (`AUDIT.md`).

- Constat : `core/render/textMeasure.ts:9` garde `let current`, posé par chaque `EngineCore` (`EngineCore.ts:187-188`,
  `setTextMeasure`). Deux moteurs d'une même page partagent la dernière mesure posée ; les tests s'influencent. Les
  plugins la lisent par `measureText` (API des plugins, ex. onglet de région RDD, sujet 228).
- Ce qu'on veut : la mesure appartient à l'instance : portée par le contexte remis aux formes (`RenderContext` /
  `ctx.text`) et par ce que reçoivent les modes qui mesurent, avec l'approximation (`approximateMeasure`) par défaut.
  `setTextMeasure` et l'état de module disparaissent ; `hasExactTextMeasure` devient une question au moteur.
- Préciser au passage dans `coding.md` §3 l'exception admise : un cache pur indexé par un objet immuable (`WeakMap`,
  ex. `sequences/steps.ts:22`, `model/freeze.ts:24`) n'est pas un état de module.
- Écart : aucun avec un seul moteur.
- **Fini quand :** `grep -rn "^let " src/engine` ne montre plus d'état de mesure ; deux moteurs avec des mesures
  différentes ne se gênent pas (test) ; onglets de région RDD identiques à l'œil avant et après chargement des
  polices ; `make check` vert.
