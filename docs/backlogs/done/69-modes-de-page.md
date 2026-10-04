# Modes de page

> Thème — comportements de page (cadre) ; premier mode : 70 (Séquences)

Une page peut prendre un **mode** qui la spécialise : il ajoute des données de page, des réglages sur les éléments et
un habillage du rendu, sans rien changer au fichier vu par draw.io (attributs `spatial.*` seulement). Plusieurs modes
viendront (Séquences, puis d'autres) : le moteur ne connaît aucun mode en particulier, comme pour les formes (65).

- **Attributs de page.** Les attributs `spatial.*` de `<diagram>` sont lus dans `PageModel.attributes` et écrits par
  une opération d'édition (annulable). draw.io garde le nœud `<diagram>` d'origine : ils survivent à un
  réenregistrement, comme `spatial.view` (`format/viewState.ts`).
- **Un mode par page** : `spatial.mode=<id>` sur `<diagram>` ; absent = page normale. Pas de cumul de modes.
- **Un dossier par mode, en miroir entre la lib et l'appli** :
  - `src/engine/modes/<id>/` (lib, sans React) : **tout le mode** — données, règles, opérations d'édition (annulables),
    habillage du rendu, cohérence. `index.ts` exporte `definition`, collectée par un registre (`import.meta.glob`) sur
    le modèle de `shapes/registry.ts` ;
  - `src/app/modes/<id>/` (appli) : seulement les sections React du panneau, qui affichent les données du mode et
    appellent ses opérations, sans règle métier ; collectées de la même façon. Facultatif : un mode dont les réglages
    sont simples les déclare (case, nombre, texte, liste de choix) et l'appli les affiche par des champs génériques,
    comme les réglages des formes (`app/ShapeProperties.tsx`). Un réglage déclaré peut passer par une opération du
    mode au lieu d'écrire sa clé directement (ex. le rang d'une flèche, qui échange avec une autre).
  - Déposer les deux dossiers suffit, sans toucher au moteur ni à l'appli.
- **Contrat `PageModeDefinition`**, chaque champ facultatif sauf l'identité :
  - identité : `id`, nom affiché (liste du choix de mode) ;
  - panneau : réglages déclarés pour la page, une flèche, une forme (seulement si la page a ce mode) ; les sections
    React propres au mode, elles, sont dans `src/app/modes/<id>/` ;
  - habillage du rendu, appliqué au dessin sans modifier le style draw.io : couleur imposée à une flèche (trait et
    pointe), pastilles posées sur une flèche (face à la caméra en iso / 3D) ;
  - cohérence : remise en ordre à la lecture (best effort, signalée dans le panneau Diagnostics) ; nettoyage des
    attributs du mode sur les éléments collés.
- **Choix du mode** dans le panneau de la page (rien de sélectionné) : « Aucun » + les modes enregistrés.
- **Quitter un mode** retire seulement `spatial.mode` : les attributs du mode restent en sommeil sur la page et les
  éléments, et réapparaissent si on y revient.
- Hors sujet (plus tard, quand un mode en aura besoin) : animation, événements, état d'exécution, vues calculées.
- **Fini quand :** un mode de test déposé dans un dossier apparaît dans le choix du mode, ajoute ses sections au
  panneau de la page et d'une flèche, et habille une flèche ; le mode choisi est toujours là après un
  réenregistrement par draw.io (`make drawio-check`) ; quitter puis reprendre le mode retrouve les données ;
  `make check` vert.
- Fait :
  - Modèle : `PageModel.attributes` (attributs `spatial.*` de `<diagram>`, `format/parse.ts`) ; écriture par
    `setPageAttribute` (`format/edit.ts`), sans recompresser la page ; `SPATIAL.mode`.
  - Cadre : `engine/modes/types.ts` (`PageModeDefinition`, `ModeProperty` avec `value` / `write` / `hidden`,
    `PageDressing`, `ModeEdit`), `engine/modes/registry.ts` (dossiers collectés, mode d'une page, réglages par
    portée, clés de collage, avertissements), `engine/modes/edit.ts` (`applyModeEdit` : écritures d'une opération,
    attribut d'élément là où il est déjà, sinon dans le style).
  - Moteur : `setPageMode`, `editPageMode` (une étape d'annulation, rien si rien ne change), `setModeProperty` ;
    habillage passé à `buildPageScene` et au retracé des flèches (`createEdgeObject`) ; avertissements des modes
    ajoutés à ceux de la lecture (panneau Diagnostics) ; `repair` du mode après une suppression (même étape
    d'annulation) ; clés des modes retirées des éléments collés ou dupliqués (`stripCellKeys`).
  - Rendu : pastille de flèche (`render/decorations.ts`, `edgeBadge`) ; `userData.billboard = 'screen'`
    (`render/billboard.ts`) : objet entièrement face à l'écran, droit et rond sous tous les angles.
  - Appli, en miroir : `app/modes/registry.ts` (sections React par dossier), `app/modes/ModeFields.tsx` (champs
    génériques des réglages déclarés), `SelectField` (`app/Fields.tsx`) ; panneau de la page : section « Mode »
    (choix, mode inconnu affiché tel quel) puis la section du mode ; panneau d'une flèche / forme : section au nom
    du mode.
  - Tests : `tests/engine/modes/registry.test.ts` (contrat des dossiers, mode de test branché jusqu'au rendu),
    `setPageAttribute` (`edit.test.ts`), `stripCellKeys` (`clipboard.test.ts`) ; conservation par draw.io étendue
    aux attributs de page (`spatial.test.ts`), fixture `sequences.drawio` réenregistrée par draw.io 24.7.5.
  - Docs : `AJOUTER_UN_MODE.md`, SPEC §14.3 et §14.5.
  - Vérifié dans l'appli : choix du mode, quitter puis reprendre le mode (données retrouvées), annulation ;
    `make check` vert.
