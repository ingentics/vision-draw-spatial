# Focus sur la zone de dessin au chargement d'un fichier

> Itération — appli, zone de dessin (focus clavier)

- Quand un fichier est chargé (rechargement de la page qui rouvre le fichier, ou fichier ouvert depuis le menu), la
  zone de dessin prend le focus clavier : les touches (Tab, flèches, raccourcis) marchent sans cliquer d'abord dessus.
- **Fini quand :** après un rechargement de la page sur un fichier, Tab sur une page RDD bascule la couche sans clic
  préalable ; idem après l'ouverture d'un fichier depuis le menu.
- Fait : `instance.focusCanvas()` à l'événement `load` du moteur (`src/app/viewer/useEngineEvents.ts`). Vérifié
  dans l'appli : après un rechargement (Séquences) et après une ouverture depuis le menu (RDD), le canvas a le focus
  et Tab marche sans clic.
