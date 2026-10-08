# RDD : styles de l'appli pour les régions

> Itération — mode RDD (région) ; reprise de 233 et 236

- Le réglage « Couleur » propre aux régions (`rdd.regionColor`, palette de six pastels) est retiré ; la couleur d'une
  région se choisit dans la section Style du panneau, comme pour les autres formes.
- Une région neuve prend un style de base de l'appli (styles draw.io : `fillColor`, `strokeColor`, `fontColor` s'il y
  en a un) au lieu de la palette des régions, toujours selon son rang parmi ses sœurs (sujet 236), mais en commençant
  au 3ᵉ style : Bleu (`#dae8fc` / `#6c8ebf`), puis Vert, Orange, Jaune, Rouge, Violet, Par défaut, Gris, Bleu…
  (rang `(2 + n) mod 8`).
- Le cadre du nom pour draw.io (`labelBorderColor`) prend la bordure du style ; la bordure grise fixe `#969696` n'est
  plus imposée.
- Fond dessiné plus clair que la couleur du style : chaque composante RVB rapprochée du blanc de 55 %, au dessin
  seulement (le fichier garde la couleur du style, que draw.io montre telle quelle). Réglage global du mode :
  Paramètres › Modes › RDD › « Éclaircissement du fond des régions » (0 à 100 %, défaut 55 %).
- **Fini quand :** trois régions posées à la suite sont bleue, verte, orange (fonds éclaircis), bordées de leur couleur ;
  une région posée dans la bleue est bleue ; le panneau d'une région n'a plus « Couleur » et sa section Style marque le
  style courant ; changer le réglage change le fond ; draw.io montre les couleurs du style ; `make check` vert.
- Fait : `REGION_STYLES` (styles de base de l'appli à partir de Bleu, en boucle), `setRegionStyle` et `regionStyle`
  (`rdd/regions/regionLayout.ts`) à la place de `REGION_COLORS` / `setRegionColor` ; `styleNewRegion` (ex.
  `colorNewRegion`) ; réglage `rdd.regionColor` retiré (`regionProperties.ts`, `rdd/index.ts`) ; modèle de palette de
  la région en Bleu. Fond éclairci : `lighten` (`render/decorations.ts`), crochet `PageDressing.shapeStyle` (clés de
  style dessinées sans toucher au modèle), appliqué par `dressedShape` (`render/pageScene.ts`) à la scène, au
  redessin en direct (`liveEdit.ts`) et à la mini-carte ; réglage du mode `regionLightening` (55 % par défaut,
  `rdd/settings.ts`). Tests : `regionLayout.test.ts` (rotation Bleu → Gris → Bleu, éclaircissement),
  `regionProperties.test.ts`, `region.test.ts`, `pageScene.test.ts`, `decorations.test.ts`. SPEC §14.5. Vérifié dans
  l'appli : régions existantes éclaircies (mini-carte comprise) ; région insérée dans « Comptes » bleue, bordure
  `#6c8ebf`, « Bleu » marqué dans Style, plus de section « Couleur ». Pas de `make drawio-check` : aucune fixture
  modifiée, seules des clés draw.io standard écrites. Dette 347 notée (cadre du nom après un style du panneau).
