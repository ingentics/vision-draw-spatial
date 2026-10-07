# RDD : mise en valeur de la sélection imposée en contour

> Itération — mode RDD (sélection) ; reprise de 179

- Sur une page en mode RDD, la sélection est toujours mise en valeur par le **contour** (`selection.style=outline`),
  quel que soit le paramètre « Mise en valeur de la sélection » ; les autres pages suivent le paramètre.
- Cadre : un mode peut imposer le style de sélection (`PageModeDefinition.selectionStyle`) ; le paramètre de
  l'utilisateur n'est pas modifié (il revient sur les autres pages).
- Paramètres : sous le choix du style, une mention dit qu'il est imposé en contour sur les pages RDD.
- **Fini quand :** paramètre sur « Voile », une table sélectionnée sur une page RDD a le contour animé et pas de
  voile ; sur une page normale, le voile revient ; `make check` vert.

- De manière générale : Un mode peut forcer un mode de selection.- Fait : `PageModeDefinition.selectionStyle` (`modes/types.ts`) ; `SelectionHighlight.style()` prend celui du mode de
  la page courante, sinon le paramètre (voile, contour, animation du contour) ; le mode RDD impose `outline`. Le
  paramètre de l'utilisateur n'est pas touché. Paramètres : « Pages « RDD — Relational Database Designer » : contour
  imposé. » sous le choix du style (tout mode qui impose un style y figure). Test `rdd.test.ts` (seul le mode RDD
  impose un style). SPEC §14.5, `AJOUTER_UN_MODE.md`. Vérifié dans l'appli, paramètre sur « Voile » : table User
  sélectionnée en contour sans voile sur la page RDD ; voile sur une forme de `shapes.drawio` ; mention visible dans
  les paramètres.
