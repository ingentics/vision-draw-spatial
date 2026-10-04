# Flux courant du mode Séquences

> Itération — mode Séquences (édition) ; reprise de 70

- **Flux courant** d'une page en mode Séquences : par défaut le premier flux de la liste. Cliquer une flèche d'un
  flux en fait le flux courant ; c'est la seule façon d'en changer (il y en a toujours un dès qu'un flux existe ; un
  flux courant supprimé laisse la place au premier). Le panneau « Flux » le montre surligné. État de session, propre
  à chaque page, non écrit dans le fichier.
- **Indicateur** : tant qu'il y a un flux courant, une barre de 3 px de la couleur du flux en bas de la zone de
  dessin.
- **Nouvelle flèche** (tirée depuis une forme) : ajoutée au flux courant, au rang n + 1, dans la même étape
  d'annulation que sa création.
- **Touches « + » et « - »** sur une flèche d'un flux sélectionnée seule : rang + 1 / rang − 1 (échange avec la
  voisine, comme le champ « Rang ») ; sans effet aux bouts du flux.
- Cadre générique (sujet 69) : le mode déclare son « courant » (valeur par défaut, valeur prise d'un élément cliqué,
  couleur de l'indicateur), ce qu'il fait d'une flèche créée et ses touches sur l'élément sélectionné ; le moteur
  garde le courant par page et le signale à l'appli.
- **Fini quand :** sur `sequences.drawio`, la barre a la couleur du premier flux à l'ouverture, prend celle du flux
  d'une flèche cliquée, une flèche tirée entre deux formes arrive au rang n + 1 de ce flux (une annulation la
  retire), « + » / « - » échangent le rang de la flèche sélectionnée ; `make check` vert.
- Fait :
  - Cadre (`engine/modes/types.ts`) : `ModeCurrent` (`initial`, `valid`, `pick`, `color`), `edgeCreated`, `ModeKey`
    (`keys`). Moteur : courant par page (`getModeCurrent`, `getModeIndicator`, événement `modeCurrentChange`,
    remis à zéro au chargement), choisi à la sélection d'un seul élément ; `edgeCreated` appliqué à la flèche tirée
    (modèle relu, même étape d'annulation que « Connecteur ») ; `modeKey` appelé par les contrôles clavier
    (`interaction/controls.ts`, hôte `modeKey`) avant les raccourcis de vue.
  - Séquences (`engine/modes/sequences/index.ts`) : courant = premier flux, puis flux de la flèche cliquée ;
    flèche créée ajoutée au flux courant ; « + » / « - » = `setEdgeStep` ± 1.
  - Appli : barre `.mode-indicator` dans la zone de dessin (`Viewer.tsx`), flux courant encadré dans la section
    « Flux » (`current` des props des sections de mode), aide mise à jour.
  - Tests (`sequences.test.ts`) : courant, flèche créée, touches. Docs : SPEC §14.5, `AJOUTER_UN_MODE.md`.
  - Vérifié dans l'appli sur `sequences.drawio` : barre bleue (premier flux) à l'ouverture, orange après clic sur
    une flèche de « Paiement », flèche tirée API → Base arrivée au rang 2 de « Paiement » (une annulation la
    retire), « - » passe la flèche du rang 2 au rang 1 ; essais annulés.
