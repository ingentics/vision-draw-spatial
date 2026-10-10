# Machine à états : ensemble d'états (état composite)

> Milestone — mode Machine à états ; dépend de 433 et 434 ; comportements repris de la région RDD (182, 183, 184,
> 227, 230, 231, 239, 241)

- **Périmètre** : code moteur dans `src/engine/plugins/modes/states/` et appli dans `src/app/plugins/modes/states/`
  seulement, plus `tests/`, `fixtures/states.drawio` et la doc (SPEC, SUMMARY, `AJOUTER_UN_MODE.md` si besoin).
  Aucun changement dans `src/engine/core/` : un besoin du tronc découvert en route devient un ticket moteur à part.
- **Ensemble** (`sm-composite`, palette « Ensemble », mots-clés `composite`, `ensemble`, `group`) : même aspect et
  mêmes comportements que la région RDD — fond léger de la couleur choisie (palette de l'appli), bordure fine, nom
  sur un **onglet** au-dessus du coin haut-gauche ; contenu = formes du mode dont le coin haut-gauche est dedans
  (calculé, rien d'écrit) ; déplacer l'ensemble emporte son contenu et les transitions entre ses états ; il
  s'agrandit quand on y dépose une forme qui dépasse ; ajustement au contenu ; contenu dessiné devant lui ;
  ensembles imbriqués à toute profondeur.
- **Différence avec la région RDD : un ensemble est un état.** Il accepte les transitions entrantes et sortantes
  (sujet 434). Les points d'entrée et de sortie posés dans un ensemble (coin haut-gauche dedans) sont ceux de cet
  ensemble, pas de la page, et sont emportés avec lui.
- Un ensemble porte un commentaire comme un état (touche « C », panneau, survol).
- Le code de la région RDD est **dupliqué ou appelé tel quel** dans ce sujet ; sa mise en commun est l'idée 437.
- draw.io (export seulement) : rectangle comme la région RDD (`spatial.kind=sm-composite`).
- **Fini quand :** sur la fixture, un ensemble posé sous deux états et leur transition les emporte quand on le
  déplace ; une transition tirée d'un état extérieur vers l'ensemble s'y accroche ; un ensemble dans un ensemble
  marche comme une région dans une région ; un point
  d'entrée posé dans l'ensemble le suit quand on le déplace ;
  `make check` vert.
