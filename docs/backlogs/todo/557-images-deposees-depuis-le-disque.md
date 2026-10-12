# Images déposées depuis le disque (PNG, JPEG, SVG…)

> Milestone 2 — Editor ; nouvelle forme « Image » et deux paramètres globaux

- **Dépôt** : glisser un fichier image depuis le disque sur le schéma ouvert (en édition) l'insère dans la page
  courante, centré sous le curseur au point de dépôt. Formats acceptés : PNG, JPEG, GIF, WebP, SVG (reconnus par le
  type MIME, à défaut l'extension). Plusieurs fichiers déposés d'un coup : insérés côte à côte, décalés du
  `edit.pasteOffset`. Un `.drawio` déposé garde son comportement actuel (ouverture du fichier) ; un fichier d'un
  autre type est ignoré (message bref « Format non pris en charge »). L'insertion est une seule étape d'annulation et
  sélectionne les images insérées.
- **Choix du mode** : un mode déclare `imageDrop?: boolean` (`core/modes/types.ts`, comme `grid`) ; absent ou
  `true` = dépôt permis (défaut), `false` = refusé sur les pages de ce mode : l'image n'est pas insérée et un
  message bref l'explique (« Ce mode n'accepte pas les images »). Une page sans mode accepte toujours les images.
  Aucun des modes existants ne change (tous acceptent).
- **Taille** : taille naturelle de l'image (pixels ; pour un SVG, `width`/`height` sinon `viewBox`, à défaut
  100 × 100) multipliée par le paramètre global **`edit.imageDropScale`**, « Échelle des images déposées »,
  section « Édition » : de 0,05 à 1, pas de 0,05, **défaut 0,25** (dimensions divisées par 4). Arrondie à l'unité,
  au moins `edit.minShapeSize` de côté, proportions gardées.
- **Forme** : une zone rectangulaire (`spatial.kind=image`) qui affiche l'image étirée à son rectangle, sans bordure
  ni fond. Elle se sélectionne, se déplace, se redimensionne (proportions gardées par défaut, Maj pour les libérer),
  pivote et s'efface comme un rectangle ; elle peut porter un texte (sous l'image) et recevoir des flèches. En iso
  et en 3D, image plaquée sur la face du dessus d'une dalle sans épaisseur (`spatial.height` 0).
- **Stockage** : image embarquée dans le fichier en data URI (pas de lien vers le disque), dans le style draw.io
  `shape=image;image=data:<mime>,<base64>;imageAspect=0;` pour que l'export s'ouvre dans draw.io avec l'image
  (sujet 408). Pas de limite de taille, mais un avertissement si le fichier déposé dépasse 2 Mo.
- **SVG et JavaScript** : paramètre global **`edit.svgStripScripts`**, « Retirer le JavaScript des SVG importés »,
  section « Édition », **défaut : activé**. Activé, le SVG est nettoyé au dépôt, avant stockage : éléments
  `<script>` et `<foreignObject>` retirés, attributs `on*` retirés, liens `href`/`xlink:href` en `javascript:`
  retirés. Désactivé, le SVG est stocké tel quel. Dans tous les cas l'appli l'affiche comme une image (texture), où
  aucun script ne s'exécute : le paramètre protège surtout les logiciels qui rouvriront le fichier exporté.
- **Fini quand :** sur le serveur partagé, glisser un PNG de 800 × 600 sur le schéma pose une image de 200 × 150
  sous le curseur, déplaçable, redimensionnable, visible en 2D, iso et 3D ; passer l'échelle à 0,5 donne 400 × 300 ;
  un SVG contenant un `<script>` et un `onclick` est importé sans eux (paramètre activé, vérifié dans le fichier
  enregistré) et avec eux (paramètre désactivé) ; le fichier enregistré se rouvre avec ses images ; les deux
  paramètres apparaissent dans « Édition » et se réinitialisent ; un mode passé à `imageDrop: false` (essai
  local) refuse le dépôt avec le message.
