# Chargement à la demande des bibliothèques de formes

> Milestone 2 — Éditeur. Dépend de 529 et 530.

- **Événement** `shapesMissing(missing: { library: string; kind: string }[])` (`engine.on`) : formes de bibliothèque
  présentes dans le document et non chargées.
  - Émis après l'ouverture d'un fichier (toutes les pages du document), puis après tout changement du document qui
    fait apparaître une paire encore jamais signalée (collage, annuler / rétablir, rechargement).
  - **Chaque paire n'est signalée qu'une fois** par moteur, regroupée en une liste par émission ; une paire
    redevenue non chargée après un `unregisterShapes` n'est pas resignalée (sauf à l'ouverture d'un autre fichier, qui
    remet la mémoire à zéro).
  - Les formes restent dessinées « non chargées » (530) en attendant ; l'hôte répond par `registerShapes`.
- **Introuvable** : `engine.markShapesUnavailable(missing: { library: string; kind?: string }[])` : sans `kind`, toute
  la bibliothèque est introuvable. Les formes concernées passent à l'état introuvable (530) ; un `registerShapes` de la
  bibliothèque lève cet état.
- **Appli de démo** : une bibliothèque d'exemple fixée côté React (`src/app/`) : un JSON d'une catégorie « Dynamic
  shapes » et de deux formes dynamiques (une pour les pages sans mode, une avec `modes: ["states"]`), au contour non
  rectangulaire avec un détail, enregistrée au démarrage du moteur. Elle écoute
  `shapesMissing` : la bibliothèque d'exemple est (ré)enregistrée, toute autre est déclarée introuvable. Le
  rechargement du moteur en dev (`engineFullReload`) la retrouve par cet événement.
- **Composant** `<DrawioSpatial />` : prop `onShapesMissing` relayant l'événement, et accès à `registerShapes` /
  `markShapesUnavailable` par la ref du moteur ; `docs/COMPOSANT.md` mis à jour.
- **Fini quand :** dans l'appli, la section « Dynamic shapes » est dans la palette ; une forme posée depuis elle survit à
  l'enregistrement et à la réouverture du fichier ; la fixture de 530 ouverte dans l'appli montre ses formes d'une
  bibliothèque inconnue avec le badge introuvable ; sur une page Machine à états, « Dynamic shapes » ne montre que
  la forme déclarée pour ce mode. Tests : émission unique par paire, regroupement, remise à zéro à
  l'ouverture, `markShapesUnavailable` avec et sans `kind`.
- Fait : événement `shapesMissing` émis par `ShapeLibraries.documentShown` à chaque `load` et `documentChange`
  (abonnement dans `EngineCore`) : une liste par émission, chaque paire vue une fois depuis l'ouverture (mémoire remise
  à zéro par `resetDocument`, une paire chargée à l'ouverture puis retirée n'est pas signalée). Façade
  `markShapesUnavailable` (sans `kind` : toute la bibliothèque ; levé par `registerShapes`). Composant : prop
  `onShapesMissing` ; `docs/COMPOSANT.md` (section « Bibliothèques de formes ») et SPEC §8.2 mis à jour. Appli :
  `src/app/demoShapeLibrary.ts` (catégorie « Dynamic shapes » : Serveur pour les pages sans mode, Jeton pour Machine à
  états) enregistrée à la création du moteur ; elle se recharge si le fichier la réclame et déclare introuvable toute
  autre bibliothèque. Validé : tests (`tests/engine/core/domains/document/shapeLibraries.test.ts`) ; dans l'appli, la
  fixture de 530 ouverte montre les formes `infra-aws` introuvables et le compteur des Diagnostics. Le filtrage sur une
  page Machine à états n'est vérifié que par les tests.
