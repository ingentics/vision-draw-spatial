# Survol d'une flèche coupée : trait épaissi et ligne directe

> Itération — flèches coupées ; reprise de 219

- Au survol d'une flèche coupée (`split=1`), ses tronçons s'épaississent de 1 px, et le bord de ses cadres de renvoi
  aussi s'il y en a.
- Une fine ligne droite relie les deux bouts de la flèche (point de départ côté source, point d'arrivée côté cible) :
  1 px, noir à 80 % d'opacité, trait plein, dessinée par-dessus le reste du schéma ; elle disparaît quand le curseur
  quitte la flèche.
- **Fini quand :** en passant le curseur sur un tronçon d'une flèche coupée, le trait (et le bord des cadres)
  s'épaissit et la ligne directe apparaît au-dessus des formes ; elle disparaît en sortant ; `make check` vert.
- Fait : le rendu de la flèche coupée (`render/edges/edge.ts`) laisse dans `userData.splitHover` les tronçons tels
  que dessinés, les coins des cadres, les bouts de la flèche et son trait ; `splitHoverOverlay`
  (`render/edges/split.ts`) en fait un calque au-dessus de tout (tronçons et bords de cadre à `strokeWidth + 1`,
  ligne directe noire à 80 %, 1 px à l'écran). `SplitHoverView` (`core/selection/splitHover.ts`) le pose dans l'objet
  de la flèche survolée (il suit élévation et déplacements) et le retire à la sortie, appelé par le survol du
  pointeur (`core/input/pointer.ts`). Test dans `tests/engine/render/edges/split.test.ts`. Vérifié dans l'appli sur
  la flèche « lit » de `simple.drawio` coupée, avec un renvoi « depuis A » : survol épaissi et ligne directe,
  disparus en sortant. La ligne directe passe aussi sur le texte des cadres (au-dessus de tout, comme demandé).
