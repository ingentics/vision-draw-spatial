# Autre agencement en ancrage automatique (touche F, graine)

> Itération — interaction (flèches, ancrage automatique) ; reprise de 116 et 117, pendant de 119

- Sur une page en ancrage automatique, **F** propose un autre agencement des flèches de la page : une **graine**
  propre à la page (`spatial.anchorSeed` sur `<diagram>`, absente = 0, l'agencement actuel) est augmentée, et la
  page est entièrement répartie et retracée avec elle. Une étape d'annulation par appui (« Autre agencement ») :
  Ctrl+Z retire tout le groupe de modifications et revient à l'agencement d'avant.
- La graine départage ce qui est aujourd'hui à égalité ou arbitraire, sans changer les côtés choisis : ordre de
  tracé des flèches, choix entre détours de même coût (par le haut ou par le bas…), ordre des flèches d'un faisceau
  quand plusieurs sont équivalents. Un agencement proposé n'a pas plus de croisements ni de superpositions que
  celui de la graine 0 ; s'il est identique au précédent, on passe à la graine suivante (quelques essais au plus).
- La graine reste écrite sur la page : les éditions suivantes (création, déplacement…) gardent l'agencement choisi.
- Même touche que 119 (réglable) ; F avec une flèche sélectionnée en automatique = même chose (toute la page).
- **Fini quand :** sur une page en Automatique, appuis successifs sur F = agencements différents quand il en existe,
  sans croisement ajouté ; Ctrl+Z revient au précédent ; la graine est conservée par draw.io ; `make check` vert.
