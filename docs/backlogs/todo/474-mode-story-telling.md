# Mode « Story telling » : histoires tracées par des flèches

> Milestone — mode Story telling ; modèle : mode Séquences (70) pour les pastilles, couleurs, courant et touches
> « + » / « - »

On trace ses histoires au fur et à mesure : une flèche numérotée ouvre une histoire, les flèches sans numéro qui
partent des formes atteintes la continuent. Le simulateur qui jouera les histoires viendra plus tard, dans un autre
sujet.

- **Périmètre** : code moteur dans `src/engine/plugins/modes/storytelling/` et appli dans
  `src/app/plugins/modes/storytelling/`, plus `tests/`, `tests/fixtures/storytelling.drawio` et la doc (SPEC,
  SUMMARY). Aucun changement dans `src/engine/core/` : un besoin du tronc découvert en route devient un ticket moteur
  à part.
- **Mode** de page « Story telling » (`spatial.mode=storytelling`, espace de noms `story`, nom court « Histoires ») ;
  icône dédiée (un acteur, puis une flèche avec une pastille). Tous les modes d'affichage permis (2D, iso, 3D).
  **Palette** réduite à Acteur (`actor`) et Rectangle (`rectangle`) pour commencer.
- **Début d'histoire** : une flèche qui porte un numéro (`spatial.story.number`, à partir de 1) ouvre une histoire.
  - Son **texte est le titre** de l'histoire ; sans texte, « Histoire N ».
  - Les numéros restent **consécutifs** (1…n), chaque opération étant une étape d'annulation : changer un numéro
    l'échange avec l'histoire qui l'avait ; retirer un numéro ou supprimer la flèche resserre les suivants.
  - La couleur de l'histoire est prise à sa création dans les couleurs de l'appli (`edit.palette`, la première pas
    encore prise, comme un flux de Séquences) et enregistrée sur la flèche (`spatial.story.color`) : réordonner ne
    change pas les couleurs.
- **Suite de l'histoire** (calculée, rien n'est écrit) : depuis la forme d'arrivée de la flèche numérotée, on suit
  la flèche **sans numéro** qui en part, puis depuis sa forme d'arrivée, et ainsi de suite. On s'arrête sur une forme
  sans flèche sortante sans numéro, sur un bout libre, ou en revenant sur une flèche déjà dans l'histoire (boucle).
  Une nouvelle flèche tirée depuis une forme de l'histoire en fait donc partie toute seule.
  - **Croisement** : une flèche sans numéro qui part d'une forme atteinte par plusieurs histoires appartient à
    **toutes** ces histoires.
  - **Branche** : si, dans une même histoire, une forme a plusieurs flèches sortantes sans numéro, la première
    (ordre de dessin) est suivie et le cas est **signalé** dans Diagnostics (« Histoire « X » : plusieurs flèches
    partent de « forme », seule la première est suivie »). Une histoire reste une chaîne.
- **Touches** (flèche sélectionnée seule) :
  - « + » sur une flèche sans numéro : elle ouvre une nouvelle histoire, à la fin (numéro n + 1) ;
  - « + » / « - » sur une flèche numérotée : numéro suivant / précédent (échange avec la voisine, borné à 1…n).
- **Panneau d'une flèche** (section « Story telling ») : bascule « Début d'histoire » (pose ou retire le numéro) et
  champ « Numéro » (masqué sans numéro) ; une flèche dans une histoire montre aussi, en lecture seule, les histoires
  auxquelles elle appartient.
- **Panneau de la page** (section « Histoires ») : la liste ordonnée des histoires (pastille de couleur avec le
  numéro, titre, nombre de flèches), ↑ ↓ pour changer l'ordre, × pour retirer le numéro (la flèche n'ouvre plus
  d'histoire). Sans histoire : aide « Posez un numéro sur une flèche (« + ») pour commencer une histoire ».
- **Habillage** (comme Séquences, mode actif seulement) :
  - toutes les flèches d'une histoire dans sa couleur assombrie ; une flèche partagée prend la couleur de l'histoire
    courante si elle en fait partie, sinon celle de la plus petite ;
  - pastille avec le numéro sur la flèche qui ouvre l'histoire (au-dessus du texte, plus petite sans texte, face à
    la caméra en iso / 3D) ; pas de pastille sur les flèches qui suivent ;
  - **histoire courante** : la première par défaut, celle d'une flèche cliquée ; le reste est estompé (flèches de
    l'histoire et formes qu'elles relient restent nettes).
  - Réglages globaux (Paramètres › Modes › Histoires) : opacité hors de l'histoire courante, assombrissement du
    trait, apparence des pastilles (mêmes réglages que Séquences).
- **Copier-coller** : la copie perd `spatial.story.number` et `spatial.story.color`.
- **Incohérences** (fichier modifié à la main) : numéros à trous, doublons ou illisibles remis en ordre à la lecture
  (tri par numéro, puis ordre de dessin), signalés dans Diagnostics, enregistrés à la prochaine modification.
- **Export draw.io** : rien ne change, les attributs `spatial.story.*` restent sur les flèches ; le fichier s'ouvre
  dans draw.io.
- Fixture `tests/fixtures/storytelling.drawio` : deux acteurs et des rectangles, trois histoires dont deux qui se
  croisent sur une forme, une branche signalée, une boucle.
- **Fini quand :** une page passée en mode Story telling propose Acteur et Rectangle dans la palette ; « + » sur une
  flèche lui met la pastille 1 et la couleur de l'histoire, une flèche tirée depuis sa forme d'arrivée prend la même
  couleur ; une deuxième histoire passe en 1 par « - » ou par ↑ dans le panneau, couleurs inchangées ; le titre de la
  liste suit le texte de la flèche ; une flèche partagée prend la couleur de l'histoire courante ; une branche est
  signalée dans Diagnostics ; supprimer la flèche numérotée resserre les numéros ; ⌘Z défait chaque étape ; tests
  du parcours (suite, croisement, branche, boucle), des numéros et de l'habillage ; `make check` vert.
