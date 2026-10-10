# Changelog

## [0.10.0](https://github.com/ingentics/vision-draw-spatial/compare/drawio-spatial-v0.9.0...drawio-spatial-v0.10.0) (2026-10-10)


### ⚠ BREAKING CHANGES

* **app:** les réglages plantumlRenderer et plantumlUrl du mode Séquences deviennent la section exporters.plantuml des paramètres ; ModePanelProps et ContextPanelProps reçoivent exporters.
* **rdd:** spatial.rdd.secondary n'est plus lu (pas de migration) : une ancienne table secondaire repasse en taille L.

### Fonctionnalités

* **app:** export de la page ou de la sélection en image PNG ([a060a72](https://github.com/ingentics/vision-draw-spatial/commit/a060a729f49cafb3b8e9fc15d56469966fc52669))
* **app:** tracé des flèches par page ([cfa32c1](https://github.com/ingentics/vision-draw-spatial/commit/cfa32c139e8ac3c35ca3d020ae93c52b323f586c))
* **engine:** réglages de page posés par un mode à son arrivée ([74ffebf](https://github.com/ingentics/vision-draw-spatial/commit/74ffebfb8f7079c1b684579a4bac07088313c01f))
* **engine:** tracé arrondi imposé en ancrage automatique ([4dd2483](https://github.com/ingentics/vision-draw-spatial/commit/4dd2483baf8dbfd62ec442b06ea243c5d0617ac0))
* **engine:** un mode peut interdire les bouts de flèche libres ([b688662](https://github.com/ingentics/vision-draw-spatial/commit/b6886629bda0710eab492eda01ef8aba10f4debb))
* **engine:** une forme peut se passer de la section Style ([1d44dfd](https://github.com/ingentics/vision-draw-spatial/commit/1d44dfde81523e0bc002db40c556f35a7de80907))
* **rdd:** flèches de relation en contour en sélection multiple ([d11bd9e](https://github.com/ingentics/vision-draw-spatial/commit/d11bd9e501a0e98a1dda8a45e3d7403560fcc1fa))
* **rdd:** trois tailles de table (L, M, S) et touches « + » / « - » ([580887c](https://github.com/ingentics/vision-draw-spatial/commit/580887c3f6dd837cabf0af43c215b5fc4b87a923))
* **states:** mode Machine à états ([f21ba8a](https://github.com/ingentics/vision-draw-spatial/commit/f21ba8a015e10e85e859b507af770d8ba3a641ad))


### Corrections

* **engine:** export d'image hors des métriques des scènes ([36d0996](https://github.com/ingentics/vision-draw-spatial/commit/36d09960242627a5312a0c236e2f1e1097519e19))
* **engine:** export PNG qui attend aussi les textes riches et sur tracé ([237278b](https://github.com/ingentics/vision-draw-spatial/commit/237278b26f6f2f85f397652936bcdccd8d647952))
* **states:** cible d'un point d'entrée d'un autre niveau déclarée avant ([148a21e](https://github.com/ingentics/vision-draw-spatial/commit/148a21e83a2a6d9d7bb58ace59c035d9d32f00d3))


### Performances

* **states:** contenu d'un ensemble en un seul passage sur les ensembles ([e930ce7](https://github.com/ingentics/vision-draw-spatial/commit/e930ce72f8f612618d51c116a88379c7ed13fffa))


### Refactorisations

* **app:** PlantUML partagé par les modes ([1382b2f](https://github.com/ingentics/vision-draw-spatial/commit/1382b2ff7e0ee9cdde1108fe84f4d6827239eebb))

## [0.9.0](https://github.com/ingentics/vision-draw-spatial/compare/drawio-spatial-v0.8.0...drawio-spatial-v0.9.0) (2026-10-09)


### ⚠ BREAKING CHANGES

* **rdd:** clés de champ pgName / pgType renommées dbName / dbType, sans migration : les anciennes clés d'un fichier ne sont plus lues.
* **engine:** méthodes retirées de Engine : fitToBounds, getBackTarget, getCachedPageIds, getGraphPage, getOverviewState, getPageScene, getReferenceRotation, getXmlTree, isTransitioning, modeKey, pickAt, placementVariant, preloadLink, reducedMotion.

### Fonctionnalités

* **app:** animation d'un lien entre pages à 0,5 s par défaut ([d9e7c50](https://github.com/ingentics/vision-draw-spatial/commit/d9e7c5001741a6a245f803af795c4cc9bdd8f736))
* **app:** bouton plein écran dans la barre d'outils ([23e5884](https://github.com/ingentics/vision-draw-spatial/commit/23e58848813b38213af85b5c4d550256cd30c6a3))
* **app:** focus sur la zone de dessin au chargement d'un fichier ([965d57e](https://github.com/ingentics/vision-draw-spatial/commit/965d57e19c1dfb3d267ff182a2b6a44f69addd0f))
* **engine:** flèche d'un flux sélectionnée sans voile ni contour ([8bdd404](https://github.com/ingentics/vision-draw-spatial/commit/8bdd404a8f0443714a814ba5b6ad4808009ff6e7))
* **engine:** glisser la flèche pleine par son corps ([913e975](https://github.com/ingentics/vision-draw-spatial/commit/913e97562267b6f2ecb81185c7c1b664f5d6e151))
* **engine:** ModePartText exporté par l'API des plugins ([26abd98](https://github.com/ingentics/vision-draw-spatial/commit/26abd98a94465d1a7888452d8ac3e393c7809875))
* **engine:** réglages déclarés par les catégories de formes ([07f6386](https://github.com/ingentics/vision-draw-spatial/commit/07f638679a64a4293ba1327a0c8a51ff30abd75c))
* **engine:** sens aller / retour d'une flèche de flux, retours en pointillés ([14326d5](https://github.com/ingentics/vision-draw-spatial/commit/14326d58fa612ccdec388532f3562010c2d03c9f))
* **engine:** Tab passe au courant suivant de la barre du mode ([ecc6d8a](https://github.com/ingentics/vision-draw-spatial/commit/ecc6d8ac389b988afddde02018959885871c6e62))
* **engine:** touches de page d'un mode, rien de sélectionné ([320cafc](https://github.com/ingentics/vision-draw-spatial/commit/320cafc227a513850fa3f607682013899bf0a75b))
* **palette:** flèche pleine, droite et effilée (« block arrow ») ([7abe82f](https://github.com/ingentics/vision-draw-spatial/commit/7abe82f0dc1e41f96d59385ad23121a979e8f7b3))
* **palette:** pointe courbe et fine des accolades arrondies ([384e382](https://github.com/ingentics/vision-draw-spatial/commit/384e382ec87f4eab77fae7b261f0b64430d7625a))
* **palette:** post-it, texte qui remplit la forme ([a2785ac](https://github.com/ingentics/vision-draw-spatial/commit/a2785ac2aa92a6fea63012930304fc31115f738c))
* **rdd:** « Entité » devient « Table », « Entité énumérative » devient « Table énumérative » ([79f0893](https://github.com/ingentics/vision-draw-spatial/commit/79f08930579aff370f5f261a5209f4ee8558a9ef))
* **rdd:** bascule entre couche logique et couche physique ([c9f05db](https://github.com/ingentics/vision-draw-spatial/commit/c9f05dbc3b20771627726870795b9da5195bec05))
* **rdd:** couches logique et physique au panneau d'une table ([be6ffdb](https://github.com/ingentics/vision-draw-spatial/commit/be6ffdba11e1ef37ccd7e7492d1dc4bf92af66d2))
* **rdd:** flèche de relation sélectionnée sans voile ni contour ([142a5e2](https://github.com/ingentics/vision-draw-spatial/commit/142a5e236b09a378e0c77d18f6bf22168a02e036))
* **rdd:** icône d'alerte pour un nom ou un type physique manquant ([31d2f60](https://github.com/ingentics/vision-draw-spatial/commit/31d2f60812ccd46c0eace9c23880f338def3c30f))
* **rdd:** post-it dans la palette d'une page RDD ([93fec20](https://github.com/ingentics/vision-draw-spatial/commit/93fec208662e6458f57a1fb39ec7cdcdce5c4123))
* **sequences:** touche « x » pour basculer le sens d'une flèche de flux ([1caff79](https://github.com/ingentics/vision-draw-spatial/commit/1caff79e378bc2b51f7343d194a2b58051f1e6fe))


### Corrections

* **app:** aide au survol des réglages de plugin, infobulles visibles dans les Paramètres ([5f149c7](https://github.com/ingentics/vision-draw-spatial/commit/5f149c70818fc89494f949c428b9a9a7c4b1c4d1))
* **engine:** courant figé pendant l'édition du texte d'une partie ([25532b9](https://github.com/ingentics/vision-draw-spatial/commit/25532b91b986965524301153892e28b2d4a3e830))
* **engine:** espaces d'un label HTML gardés à la relecture et à la saisie ([a1f6b12](https://github.com/ingentics/vision-draw-spatial/commit/a1f6b124f03ab76dc950eb691f54da21c2d5f2b0))
* **engine:** fond sans volume lu comme le rendu iso pour l'empilement ([4b0d19a](https://github.com/ingentics/vision-draw-spatial/commit/4b0d19a992128bd622f9a26424e8b1fac749b602))
* **engine:** id d'une forme vérifié à l'enregistrement ([0c93e16](https://github.com/ingentics/vision-draw-spatial/commit/0c93e16ba026460b786342175a907392e93ef79c))
* **engine:** lignes vides d'un texte gardées à la lecture, à l'écriture et au rendu ([dadcb95](https://github.com/ingentics/vision-draw-spatial/commit/dadcb95bfd5747e9da3c16355588c9dba67f6de7))
* **engine:** réglages en direct écrits dans la copie de travail, pas dans le modèle gelé ([d32198d](https://github.com/ingentics/vision-draw-spatial/commit/d32198d79bd143c782b21d107698b5e05c7c4f8b))


### Refactorisations

* **engine:** façade et API réduites à ce qui sert, code mort retiré ([9085f2c](https://github.com/ingentics/vision-draw-spatial/commit/9085f2cb22030f94de5eba0915e45377e3ff3f23))

## [0.8.0](https://github.com/ingentics/vision-draw-spatial/compare/drawio-spatial-v0.7.0...drawio-spatial-v0.8.0) (2026-10-08)


### Fonctionnalités

* **app:** barres latérales qui glissent vers et depuis la vue graphe ([8d43434](https://github.com/ingentics/vision-draw-spatial/commit/8d43434fe94c31e904b0be992a42e132f8e969f9))
* **app:** bouton « Vue graphe » en mode navigation sur une page sans parent ([9654bd1](https://github.com/ingentics/vision-draw-spatial/commit/9654bd115b057358412905b9ce90b53a4fe12040))
* **app:** boutons des pages parentes en mode navigation, Alt+↑ pour remonter ([df4f0c4](https://github.com/ingentics/vision-draw-spatial/commit/df4f0c448895ed5b8d49313ad86049dd7c75f191))
* **app:** catégorie « Utilisées » toujours présente, repliée par défaut ([b2696b8](https://github.com/ingentics/vision-draw-spatial/commit/b2696b8bb913e1a74fbfce206bec94bb3a4f7da6))
* **app:** défauts de la vue graphe, case du mini-graphe dans ses réglages ([662fa6b](https://github.com/ingentics/vision-draw-spatial/commit/662fa6b23f1881a2081f056926ad4f94e74381bc))
* **app:** focus sur la zone de dessin au choix d’une page ([bf07d56](https://github.com/ingentics/vision-draw-spatial/commit/bf07d56dc4fbf958297565d6d7a23833798c069f))
* **app:** mini-graphe à gauche de la mini-carte, touche G ([967a921](https://github.com/ingentics/vision-draw-spatial/commit/967a9212e5a5d066d0ad48369162eb12864b6cbd))
* **app:** navigateur, réécriture sur le disque du fichier ouvert depuis le disque ([7e41d91](https://github.com/ingentics/vision-draw-spatial/commit/7e41d915b8f241a927dfc8526c127ffe3652b7b6))
* **app:** nouvelle icône de l’onglet Vue graphe, nœud central en bleu ([c2b9223](https://github.com/ingentics/vision-draw-spatial/commit/c2b9223ea01814494c12cfce683d202344f15605))
* **app:** palette de formes cachée en vue graphe ([d76a0dd](https://github.com/ingentics/vision-draw-spatial/commit/d76a0ddcc4aa2fd1ebe088ac3e6edd4b91ec766e))
* **app:** pas de lien vers une page sur une flèche ([82d5f32](https://github.com/ingentics/vision-draw-spatial/commit/82d5f3240a158ea99d385a7fbdc8e545c15f8cb4))
* **app:** raccourci de la vue graphe sans touche par défaut ([36ffb07](https://github.com/ingentics/vision-draw-spatial/commit/36ffb071c5650bf040f516560d9b933511641367))
* **app:** section Disposition en boutons-icônes ([3ed9427](https://github.com/ingentics/vision-draw-spatial/commit/3ed9427e7e0fde9c58211d083447a701c38c8ed3))
* **app:** vue graphe en cercles de haut en bas, transition graphe ↔ page de 50 ms ([988e49f](https://github.com/ingentics/vision-draw-spatial/commit/988e49f8db771baf0892f41514943379d6e8c0c0))
* **engine:** nœuds sans miniature dans la vue graphe ([4ac1774](https://github.com/ingentics/vision-draw-spatial/commit/4ac1774293e36ad8b2d820dbce6665d94ffaa4e0))
* **engine:** vue graphe cadrée en entier à chaque arrivée ([cfc60ab](https://github.com/ingentics/vision-draw-spatial/commit/cfc60ab6aab5d3a3385030e5933315743afab6ab))
* **rdd:** « f » sur une table ou un champ ajuste sa région ([8d9c051](https://github.com/ingentics/vision-draw-spatial/commit/8d9c051e5d0f45673f4c5e31e04eebb2751f348a))
* **rdd:** champ de relation éclairé au survol et à la sélection de sa flèche ([f1313bc](https://github.com/ingentics/vision-draw-spatial/commit/f1313bc80228b80f62e5e5bdd8fa00e2bbd76d31))
* **rdd:** contour d'une région dans une sélection multiple ([2bb8796](https://github.com/ingentics/vision-draw-spatial/commit/2bb8796573fff31c80f7d8e46b314b2b307a38e7))
* **rdd:** corps d'un document en texte libre, sans contrôle YAML ([5a9a688](https://github.com/ingentics/vision-draw-spatial/commit/5a9a6887a0ff8efa4fb1a4574cb58fe1d3dda2d2))
* **rdd:** Ctrl détache une région de son contenu pendant son déplacement ([2a6b568](https://github.com/ingentics/vision-draw-spatial/commit/2a6b568756d58d24e01d80142d51057825f19087))
* **rdd:** losange violet de l'embed pour un champ non structuré ([c83f622](https://github.com/ingentics/vision-draw-spatial/commit/c83f622b06b3082235603253de46825750f4cb73))
* **rdd:** mode « RDB Designer », Texte et Titre en palette, contour imposé sur les tables ([36a1169](https://github.com/ingentics/vision-draw-spatial/commit/36a11691d257b8aef1591c5b31270d1114c6d2e6))
* **rdd:** nom de champ édité sur place, sans éditeur sur fond blanc ([c17524a](https://github.com/ingentics/vision-draw-spatial/commit/c17524ae97d8f0942f93fe1c61deb52f2c598699))
* **rdd:** nom de région édité en texte brut, sans panneau de format ([f9c235f](https://github.com/ingentics/vision-draw-spatial/commit/f9c235fb29005aa9eabab11c187b2a40760403be))
* **rdd:** nom du mode réduit à « RDB Designer » ([2d08d7c](https://github.com/ingentics/vision-draw-spatial/commit/2d08d7c91706e3df4f3556f2ff609d0b18823b56))
* **rdd:** styles de l'appli pour les régions, fond éclairci au dessin ([f7978f1](https://github.com/ingentics/vision-draw-spatial/commit/f7978f16b3cf59946701e28c7d8fd8fc753cd4ab))
* **rdd:** toute flèche vers une vue en pointillé ([b52c944](https://github.com/ingentics/vision-draw-spatial/commit/b52c944a7c42d96803ed654deecc3bb3a7978f2f))


### Corrections

* **app:** n'enregistrer que les écarts aux paramètres par défaut ([73904fc](https://github.com/ingentics/vision-draw-spatial/commit/73904fc7b2cfc66efe89546c4bf0cd075fb89e58))
* **engine:** le cadre du nom qui suivait la bordure suit le style appliqué ([2708025](https://github.com/ingentics/vision-draw-spatial/commit/2708025b29cfd629b67226b97d3e916479c04370))
* **engine:** mode navigation conservé pendant une plongée ([8e8de36](https://github.com/ingentics/vision-draw-spatial/commit/8e8de36f3635986996ff1b9dae7b1ec4535750a2))
* **engine:** pas de mode navigation sur la vue graphe ([cc6359f](https://github.com/ingentics/vision-draw-spatial/commit/cc6359ffd0be2602a9c0be27b318a40599512d52))

## [0.7.0](https://github.com/ingentics/vision-draw-spatial/compare/drawio-spatial-v0.6.0...drawio-spatial-v0.7.0) (2026-10-08)


### Fonctionnalités

* **app:** aperçus en direct dans les paramètres d'affichage ([a336ad9](https://github.com/ingentics/vision-draw-spatial/commit/a336ad9394992e1cc2133d062a22cb93b4c3b535))
* **app:** aperçus en direct dans les paramètres des flèches ([8c216e1](https://github.com/ingentics/vision-draw-spatial/commit/8c216e1dac4f90b4844e26317575f2ba75918087))
* **app:** choix par icônes avec bouton « Défaut » et infobulles ([a30f654](https://github.com/ingentics/vision-draw-spatial/commit/a30f65471e0fa83456168139bd7daa78db246ec2))
* **app:** pastilles et icônes pour les réglages des modes ([b142e21](https://github.com/ingentics/vision-draw-spatial/commit/b142e213ac9e8c4203d1da25aadbeb828d508a46))
* **engine:** flèche qui arrive sur une partie d'une forme de mode ([7ec62a8](https://github.com/ingentics/vision-draw-spatial/commit/7ec62a840b29e0870ec7b4c9b37fc03c7e92121c))
* **engine:** orientation limitée aux accolades et aux triangles ([1bcb6d9](https://github.com/ingentics/vision-draw-spatial/commit/1bcb6d948842144676cbc4d5e9ca9f05a59fd3a2))
* **engine:** retourner et pivoter une forme depuis le panneau ([cca11a5](https://github.com/ingentics/vision-draw-spatial/commit/cca11a5dacd72b62a58930b6322390e8747fc073))
* **engine:** style de sélection « none » imposable par une forme, utilisé par la région RDD ([e853860](https://github.com/ingentics/vision-draw-spatial/commit/e8538608a6d49966d47450b4d3f867ab8485d63a))
* **engine:** texte du triangle vers le haut ou le bas loin de la pointe ([318416a](https://github.com/ingentics/vision-draw-spatial/commit/318416a489834b06a80c56e18b7b7495bf3a1a05))
* **engine:** texte multiligne en police à chasse fixe pour les parties de forme ([9f6640a](https://github.com/ingentics/vision-draw-spatial/commit/9f6640a181aa4359286c46ba82d22c3c6e0d9dfc))
* **palette:** accolades gauche et droite dans Général ([a62dd3e](https://github.com/ingentics/vision-draw-spatial/commit/a62dd3e19bf0cfe6544365a82a5fe89f25c78f18))
* **palette:** flèche libre dans la catégorie « Général » ([277e9d7](https://github.com/ingentics/vision-draw-spatial/commit/277e9d776fbe1319e26f2adf232bae8c68e03b9a))
* **rdd:** document au corps YAML, relié aux champs dynamiques ([6582e1e](https://github.com/ingentics/vision-draw-spatial/commit/6582e1ee440c8281a86bc156bbe23377e7a2976c))
* **rdd:** marge des régions doublée, 40 px autour de leur contenu ([94da328](https://github.com/ingentics/vision-draw-spatial/commit/94da32849320a3c9b022cb4afc65fc7591562809))
* **rdd:** poignée haut-gauche d'une région au coin de son onglet ([fc03225](https://github.com/ingentics/vision-draw-spatial/commit/fc03225b41be98f0bec395c26210b6e74d36402f))
* **rdd:** sources d'une vue et vue matérialisée ([eb3d904](https://github.com/ingentics/vision-draw-spatial/commit/eb3d904b6ba99247517ffe959ec3335c826dba40))
* **rdd:** types de donnée date simple, date et heure ([db914eb](https://github.com/ingentics/vision-draw-spatial/commit/db914eb64ac4d51cefb9543e357f4652de34b7bb))
* **rdd:** vue privée avec clé, vocabulaire « Fragment » et « Non structuré » ([02f2729](https://github.com/ingentics/vision-draw-spatial/commit/02f2729358a960c3ca9ffcf46c505c50a83a0c24))


### Corrections

* **app:** infobulles des anciens boutons-icônes et unité des pages gardées en mémoire ([2e02475](https://github.com/ingentics/vision-draw-spatial/commit/2e024751ffbf34294ed6daaba2b67bac774d2e9c))
* **app:** ombre des barres latérales repliées sur la zone de dessin ([3e9a74e](https://github.com/ingentics/vision-draw-spatial/commit/3e9a74e1e634cdfdc73303213800feebfeaf304a))
* **engine:** bouts répartis écartés d'une arrivée placée par le mode ([fc7574c](https://github.com/ingentics/vision-draw-spatial/commit/fc7574c9923b8cc78ef7e7c1815103b8614778fc))
* **engine:** flèche vers un champ en ancrage automatique et Typon ([6635ac5](https://github.com/ingentics/vision-draw-spatial/commit/6635ac55a14417807e1704bfcc3a65204f6c666a))
* **engine:** inverser une flèche garde son tracé ([532cf96](https://github.com/ingentics/vision-draw-spatial/commit/532cf96d8ed4de034c3680cf32aee11c266f9450))

## [0.6.0](https://github.com/ingentics/vision-draw-spatial/compare/drawio-spatial-v0.5.0...drawio-spatial-v0.6.0) (2026-10-07)


### ⚠ BREAKING CHANGES

* **engine:** MinimapPainter reçoit un MinimapBrush au lieu d'un CanvasRenderingContext2D
* **engine:** anciennes clés `spatial.<nom>` des modes plus lues, `legacyModeSettings` et `LEGACY_DEFAULT_DEPTH` retirés de l'API du moteur, méthodes inutilisées de `Engine` retirées.
* **engine:** SPATIAL.tag, sign et nodes, ExporterSettings et la section exporters des paramètres disparaissent ; ModePanelProps reçoit values au lieu d'exporters ; paletteFor et searchTemplates prennent les catégories en paramètre.
* **engine:** defaultShapeRegistry, defaultModeRegistry et defaultEffectRegistry ne sont plus exportés ; getModeRegistry, getEffectRegistry et getShapeRegistry rendent des vues en lecture seule.
* **engine:** PageModeDefinition.namespace est obligatoire ; les attributs des modes s'écrivent spatial.seq.* et spatial.rdd.* (fichiers existants migrés à l'ouverture).
* **engine:** les membres de PageModeDefinition changent de place (ex. carries → gestures.carries, repair → lifecycle.removed, shapes → page.palette.shapes) ; contrat interne au dépôt.
* **engine:** les types ModeSetting et ModeValues exportés par le moteur sont remplacés par PluginSetting et PluginValues.
* **engine:** les clés shapes.modeObstacleGap, shapes.modeDimOpacity, shapes.modeBarSlideDuration, shapes.edgeBadge* et shapes.edgeDressingDarken disparaissent des paramètres (désormais settings.modes.rdd.* et settings.modes.sequences.*) ; RenderContext perd edgeBadge et dressingDarken ; dressing et obstacles reçoivent les valeurs du mode.

### Fonctionnalités

* **app:** Diagnostics en icône stéthoscope, limités à l'instance courante ([b2b965a](https://github.com/ingentics/vision-draw-spatial/commit/b2b965afcbc8818602707197768aa1bf605da79b))
* **app:** tirets du contour de sélection à 4 px/s par défaut ([8ea4b14](https://github.com/ingentics/vision-draw-spatial/commit/8ea4b14423ebe7be70641cd3d3d350e34e5b8b5d))
* **engine:** appels aux formes protégés par leur registre ([f84cb95](https://github.com/ingentics/vision-draw-spatial/commit/f84cb95579b70d5785e6695969711673a4ba7ded))
* **engine:** cadre de sélection autour de l'emprise de la forme, onglet de la région compris ([a69696d](https://github.com/ingentics/vision-draw-spatial/commit/a69696d93e275ca358bbdaa19a8dc4d36570780c))
* **engine:** clés des modes dans leur espace de noms ([697f4e2](https://github.com/ingentics/vision-draw-spatial/commit/697f4e21286140e4d1c84347d9b7f58116c6c8df))
* **engine:** étanchéité des plugins, vues en lecture seule, verrou des attributs et pinceau de mini-carte ([90dba26](https://github.com/ingentics/vision-draw-spatial/commit/90dba263fe956891ecc431d86a876478df017e61))
* **engine:** ligne rouge des bornes hors du cadre de sélection, prolongée en fondu ([f567266](https://github.com/ingentics/vision-draw-spatial/commit/f567266ddcabc7ab5842c1cea7484afb9cc7da40))
* **engine:** métriques du moteur dans les Diagnostics ([1698b99](https://github.com/ingentics/vision-draw-spatial/commit/1698b99f823998d0242b069aa690d6dcf78ed89a))
* **engine:** modèle en lecture seule pour les plugins ([01a9a86](https://github.com/ingentics/vision-draw-spatial/commit/01a9a86b71ea7e0eb2306b8b1298334d697c4fa6))
* **rdd:** ajouter un champ par la poignée « + » ([6175cda](https://github.com/ingentics/vision-draw-spatial/commit/6175cdafd8c4cdf42d631108f5d70d576f7d6f73))
* **rdd:** champs structurés, taille calculée, icône et type des champs ([e298ae5](https://github.com/ingentics/vision-draw-spatial/commit/e298ae50eaf44a862ea11f3bb0968561953aaa30))
* **rdd:** couper une flèche de relation, avec ses renvois ([830d623](https://github.com/ingentics/vision-draw-spatial/commit/830d6238d50d5039a9a4f61e74ae215466472219))
* **rdd:** le « + » crée tout de suite un champ sans type ; type choisi au panneau ([ab5b4e9](https://github.com/ingentics/vision-draw-spatial/commit/ab5b4e9e590b4af5c62de2cd0c6973403ac404dd))
* **rdd:** libellé et préfixe d'une relation embedded écrits en direct ([cd21e79](https://github.com/ingentics/vision-draw-spatial/commit/cd21e796d16879d0d46f97e0eef8cb803a66ee98))
* **rdd:** panneau d'un champ en sections, clé primaire imposée, commentaire du champ au survol ([54c3cb5](https://github.com/ingentics/vision-draw-spatial/commit/54c3cb5359fbb6d38a717ab0b7c2d463d3d909f0))
* **rdd:** pré-sélection d'un champ au survol ([58d8b1d](https://github.com/ingentics/vision-draw-spatial/commit/58d8b1d145acb13e5a9d8338bc36d39c8dd56a01))
* **rdd:** relation embedded à part, relations rangées par sorte ([f4bd926](https://github.com/ingentics/vision-draw-spatial/commit/f4bd92633f3ccc2cf9ce4b808ac692c6a74cb1bf))
* **rdd:** relations entre tables, champ de relation et cardinalités ([400e916](https://github.com/ingentics/vision-draw-spatial/commit/400e9162d992b9d8431f9e602ab7c07bf9d2b360))
* **rdd:** réordonner les champs au glisser ([8f0ed58](https://github.com/ingentics/vision-draw-spatial/commit/8f0ed58fa2398681e055720d3ae2c616630a35bd))
* **rdd:** sélection d'un champ, sélection en contour, tables ajustées à l'ouverture ([1cf7fb4](https://github.com/ingentics/vision-draw-spatial/commit/1cf7fb4159b6ada4a8b2eb3beb918a6222c0b915))
* **rdd:** séparateurs entre les champs, texte brut dans les tables ([3aecd8c](https://github.com/ingentics/vision-draw-spatial/commit/3aecd8c4f9bce307b0646410cd856dcf6a0ac028))
* **rdd:** supprimer un champ ([e774829](https://github.com/ingentics/vision-draw-spatial/commit/e7748291e114c182fb3b292772067280bee536a3))
* **rdd:** taille des tables sur la grille ([3ae0da2](https://github.com/ingentics/vision-draw-spatial/commit/3ae0da2eef233d275ed0fc82b680f1cc237ad6c9))


### Corrections

* **app:** réglages déclarés des modes évalués et protégés par le moteur ([14e1a93](https://github.com/ingentics/vision-draw-spatial/commit/14e1a93ef587ddda42c5bd9630fbee7401ea483a))
* **engine:** Aligner et Répartir suivent le mode de la page ([4ecb0ee](https://github.com/ingentics/vision-draw-spatial/commit/4ecb0ee6da4b91a45a55166494a77e649cbdbb3e))
* **engine:** allowsEffect d'un mode protégé comme les autres appels ([50fd8a1](https://github.com/ingentics/vision-draw-spatial/commit/50fd8a1891700b91ac682671a9ff171ed0fb7ead))
* **engine:** cylindres retournés par flipH et flipV comme dans draw.io ([e3865a2](https://github.com/ingentics/vision-draw-spatial/commit/e3865a2d0b683071418da4d78f1a1aaa95af1a42))
* **engine:** écritures d'un mode défaites si l'une échoue en route ([bc1a3d5](https://github.com/ingentics/vision-draw-spatial/commit/bc1a3d5d98cb6e38ef2b31614cef7034770247ea))
* **engine:** forêt ombrée comme les volumes, d'après les réglages ([1f9b631](https://github.com/ingentics/vision-draw-spatial/commit/1f9b631f9a446d5b82eb482593c655c1f6c7315b))
* **rdd:** bordure des régions en pointillé comme dans draw.io ([10652c6](https://github.com/ingentics/vision-draw-spatial/commit/10652c60b984f1262e2275664e21c02d444e4cae))
* **rdd:** flèche de relation sans réglages en lecture seule ([f13aaed](https://github.com/ingentics/vision-draw-spatial/commit/f13aaed36e13868d3fdbc6751ed2ad167eee0092))
* **rdd:** hauteur des tables au plus juste, hors grille ([ebc4434](https://github.com/ingentics/vision-draw-spatial/commit/ebc4434f5e0c1fe0a444763388d0b5264316f2be))
* **rdd:** la case des cardinalités ne masque que les textes ([8db1100](https://github.com/ingentics/vision-draw-spatial/commit/8db11000ebbda353743055be660ccb1b9ddf3a34))
* **sequences:** flèche pleine de retour reconnue, plus de retour PlantUML en double ([efa5533](https://github.com/ingentics/vision-draw-spatial/commit/efa55330394d4bfaeeecf0af810702ad6158e600))


### Refactorisations

* **engine:** API des plugins, seule porte d'entrée des extensions ([9394de9](https://github.com/ingentics/vision-draw-spatial/commit/9394de9618a68a1ef7a5c0b78e116ebc61d8eb59))
* **engine:** contrat des modes regroupé par thème ([d89b1a8](https://github.com/ingentics/vision-draw-spatial/commit/d89b1a820df548636c8865ff485d232639ffe930))
* **engine:** ménage du code mort et des migrations sans objet ([f71fccc](https://github.com/ingentics/vision-draw-spatial/commit/f71fccc5d8283c683fc205a7332b0be56a3fc3a5))
* **engine:** paramètres déclarés par chaque mode de page ([75c6be9](https://github.com/ingentics/vision-draw-spatial/commit/75c6be93f84e5aa13b2b4e6427d9cefcceec171e))
* **engine:** registres aux ids uniques, vus en lecture seule par l'appli ([1859055](https://github.com/ingentics/vision-draw-spatial/commit/18590553922bd0428eae0eafc3e3e02df08d5dec))
* **engine:** tronc sans connaissance d'un plugin précis ([3b74327](https://github.com/ingentics/vision-draw-spatial/commit/3b743275fed3274f895bf8fea220de05c4896db4))

## [0.5.0](https://github.com/ingentics/vision-draw-spatial/compare/drawio-spatial-v0.4.0...drawio-spatial-v0.5.0) (2026-10-07)


### ⚠ BREAKING CHANGES

* **engine:** Engine n'a plus get/setViewSettings, get/setControls, get/setTransitionSettings ni get/setPreloadSettings : utiliser getSettings() et updateSettings({ view | controls | transition | preload: … }).

### Fonctionnalités

* **engine:** cadrage gardé quand la fenêtre change d'écran ([49425f2](https://github.com/ingentics/vision-draw-spatial/commit/49425f248cdbf3fd6121a5d6a3e68d06a7767bfd))
* **engine:** contenu d'une région RDD dessiné devant elle ([c9c47cb](https://github.com/ingentics/vision-draw-spatial/commit/c9c47cb438a146a808b6ef386a1bd7d5faca2c53))
* **engine:** couleur d'une région RDD neuve selon le nombre de ses sœurs ([1672ea2](https://github.com/ingentics/vision-draw-spatial/commit/1672ea2c3cc424f5e0dd5984bb0a016e7638f081))
* **engine:** embedded, document JSONB et vue du mode RDD ([c64ff7f](https://github.com/ingentics/vision-draw-spatial/commit/c64ff7ffda65d7b48dd4042dfa6493a3f2df0b39))
* **engine:** entité et entité énumérative du mode RDD ([fb0108a](https://github.com/ingentics/vision-draw-spatial/commit/fb0108ac9edfd98f17c9b3dd2731ae041ae4eb1b))
* **engine:** Entrée cadre la sélection avant le 1:1 et la vue globale ([4792170](https://github.com/ingentics/vision-draw-spatial/commit/47921704ee726bac344d82c0afb8128da0df8c62))
* **engine:** flèche coupée en deux, fondu ou cadre de renvoi ([6d25e63](https://github.com/ingentics/vision-draw-spatial/commit/6d25e6393013f2e247e45c892efe706c8e297bb3))
* **engine:** garde canInteract, vue graphe et doublons de paramètres retirés ([66cbe65](https://github.com/ingentics/vision-draw-spatial/commit/66cbe65ac5fc67885535111ace6a78fd1d86776f))
* **engine:** icônes d'entête des tables RDD ([425fb9c](https://github.com/ingentics/vision-draw-spatial/commit/425fb9ce10fdb82dd79ed4b6bf8640f407f4e5dd))
* **engine:** ligne de survol entre les coupures, renvois en direct ([6b186b6](https://github.com/ingentics/vision-draw-spatial/commit/6b186b68c48e992f725e871a57948fae5d69137a))
* **engine:** mode RDD et forme « Modèle abstrait » ([147a535](https://github.com/ingentics/vision-draw-spatial/commit/147a53509ba6e021f708ace071cc6f774aaaba68))
* **engine:** onglet de la région RDD, fini par un S ([40f29c7](https://github.com/ingentics/vision-draw-spatial/commit/40f29c7207bcc5d011fd3016f0075fe52fe60465))
* **engine:** onglet de la région redimensionné pendant la saisie du nom ([3a7c3d2](https://github.com/ingentics/vision-draw-spatial/commit/3a7c3d2465462ca1011992dd60390b2f48b15fdf))
* **engine:** région RDD agrandie à gauche et en haut quand son contenu en sort ([6f84efa](https://github.com/ingentics/vision-draw-spatial/commit/6f84efaf0465a472aa0f9393eed3c5e93c38cb98))
* **engine:** région RDD agrandie quand on y pose une forme qui dépasse ([9387cd7](https://github.com/ingentics/vision-draw-spatial/commit/9387cd77dd7165e331e887a6df1be4705033025b))
* **engine:** région RDD qui emporte son contenu ([8fd1559](https://github.com/ingentics/vision-draw-spatial/commit/8fd15591fbcd2a2d360634f79777e6d5cc6b9968))
* **engine:** règles des régions RDD au redimensionnement, à « f » et au collage ([8b2f4de](https://github.com/ingentics/vision-draw-spatial/commit/8b2f4ded885739da0732b1a46dd618805d5a782e))
* **engine:** survol d'une flèche coupée, trait épaissi et ligne directe ([757c30f](https://github.com/ingentics/vision-draw-spatial/commit/757c30f0a9b6d6ba14e5e5032b774fda263842d5))
* **engine:** touche « f » pour ajuster une région RDD à son contenu ([36191d4](https://github.com/ingentics/vision-draw-spatial/commit/36191d4cec761fa8d148e4025f7a1e8308c5ff80))
* **engine:** une région RDD ne passe pas sur ses sœurs, borne en pointillé rouge ([a3a230b](https://github.com/ingentics/vision-draw-spatial/commit/a3a230ba26855292cb6195351b15c14db0d41d39))


### Corrections

* **engine:** forme amenée à l'écran avant l'édition de son texte ([bf63762](https://github.com/ingentics/vision-draw-spatial/commit/bf637623084498e1cc31f74e3b3bb4ceba15af29))
* **engine:** onglet d'une région enfant compté dans l'ajustement de sa parente ([5a2bd50](https://github.com/ingentics/vision-draw-spatial/commit/5a2bd50e80014e64151b655af887f68718759d1c))
* **engine:** onglet de la région au plus près du nom, édition sur le nom ([9575b75](https://github.com/ingentics/vision-draw-spatial/commit/9575b75fd3dcb79f687b23de4c6874a7ca5c76bf))
* **engine:** région dans une région dès que son coin y est, quelle que soit sa taille ([42ccbcc](https://github.com/ingentics/vision-draw-spatial/commit/42ccbcc5268a1eea2ba0f579b31d36f7249d82b6))

## [0.4.0](https://github.com/ingentics/vision-draw-spatial/compare/drawio-spatial-v0.3.0...drawio-spatial-v0.4.0) (2026-10-06)


### Fonctionnalités

* **app:** bouton « Enregistrer sous » et état de la sauvegarde automatique ([a758082](https://github.com/ingentics/vision-draw-spatial/commit/a75808291c88a6c6c265e477e2f85ad493cc9773))
* **app:** icône du mode dans l'onglet de page ([0a05ec7](https://github.com/ingentics/vision-draw-spatial/commit/0a05ec79c6de4c69385b4e8297712245a87e62ac))
* **engine:** mode Séquences en 2D seulement ([8e23fc9](https://github.com/ingentics/vision-draw-spatial/commit/8e23fc9e961d754c4f1a7c56aa695dea3e56cc77))
* **engine:** sortie du commentaire vers le mode d'origine ([68c5641](https://github.com/ingentics/vision-draw-spatial/commit/68c56411318e05b9d729f579019668bac6da8f60))
* **engine:** touche C sur l'élément sélectionné, même sans commentaire ([175750c](https://github.com/ingentics/vision-draw-spatial/commit/175750cd6019363824cf4e8e52a403af1b2d590c))
* **engine:** touche C sur la sélection, sinon sur l'élément survolé ([1bd9a8f](https://github.com/ingentics/vision-draw-spatial/commit/1bd9a8f5183d31996d6c30915ef1d88d9e1fcc51))
* **engine:** un effet déclare ses modes d'affichage ([e7eaa3b](https://github.com/ingentics/vision-draw-spatial/commit/e7eaa3b282e0e4bb639259c4e71679603070c649))
* **engine:** un mode choisit ses formes, sa palette et ses modes d'affichage ([884b52b](https://github.com/ingentics/vision-draw-spatial/commit/884b52bed3f8cf0dcef4844cfb6e601c95542b5c))


### Corrections

* **engine:** plan proche serré en perspective quasi orthographique ([f885cc8](https://github.com/ingentics/vision-draw-spatial/commit/f885cc8e4fb60fefcfc8c65777e8e224cd07189c))

## [0.3.0](https://github.com/ingentics/vision-draw-spatial/compare/drawio-spatial-v0.2.0...drawio-spatial-v0.3.0) (2026-10-06)


### Fonctionnalités

* **app:** aide de l'ancrage des flèches en liste, une ligne par ancrage ([150c397](https://github.com/ingentics/vision-draw-spatial/commit/150c39752eb71e30b5e98662cec579c41641216e))
* **app:** aligner et répartir la sélection ([759cd65](https://github.com/ingentics/vision-draw-spatial/commit/759cd65e3b99af53cd5867ee2eb5602d47d570eb))
* **app:** barre du flux qui glisse hors de la vue pendant une transition ([408d214](https://github.com/ingentics/vision-draw-spatial/commit/408d214b60ceebc0f301c9179f48aee75a8add46))
* **app:** commentaire d'une flèche, affiché au survol en bas à gauche du rendu ([a316ee2](https://github.com/ingentics/vision-draw-spatial/commit/a316ee2887033738d14a7781fb55d70a9e942edb))
* **app:** commentaire en voile dégradé, sur les formes, édité en place en texte riche ([979bb71](https://github.com/ingentics/vision-draw-spatial/commit/979bb71e6a4384b104115ab3126313b1399fc426))
* **app:** décalage du texte qui suit la flèche appliqué en direct ([4b98a77](https://github.com/ingentics/vision-draw-spatial/commit/4b98a77fe683c96b8a45da510cad822b0afe392e))
* **app:** décalage le long du trait du texte qui suit la flèche ([aa833a2](https://github.com/ingentics/vision-draw-spatial/commit/aa833a23235deddf72fa355ceeef88d8f1928044))
* **app:** étiquette de la tranche appliquée en direct ([08e884a](https://github.com/ingentics/vision-draw-spatial/commit/08e884ad97e2508d1db3351c335d22fa9f19d9d1))
* **app:** réglages propres à l'ancrage Typon et page Ancrage dans les paramètres ([0ccea5e](https://github.com/ingentics/vision-draw-spatial/commit/0ccea5e93beadb7959c6a4208a2aa522de5c48fa))
* croisements des flèches, disposition, bouts et inversion ([cfbce41](https://github.com/ingentics/vision-draw-spatial/commit/cfbce41234b4f1a0e1ba7dcfbc9444704d2ef637))
* **engine:** ancrage Typon et flèches recalculées au déplacement d'une forme ([0f706a5](https://github.com/ingentics/vision-draw-spatial/commit/0f706a5c225cabcaa277ba55dccb49777240ea8b))
* **engine:** arbres de la forêt plus petits et plus nombreux ([35650e5](https://github.com/ingentics/vision-draw-spatial/commit/35650e5807cf7cc6dbfc6d98a8aa10f185c3c912))
* **engine:** édition du texte de l'Actor sur sa pancarte en iso et en 3D ([a00add4](https://github.com/ingentics/vision-draw-spatial/commit/a00add4588c56c5bc96d419bc2eb852a1cbe47d4))
* **engine:** effets de page cumulables, premier effet Forêt ([d162edb](https://github.com/ingentics/vision-draw-spatial/commit/d162edb091ea5cfbe59583c8f0fbd9d93750bcba))
* **engine:** event consumer, tâche de fond et tâche récurrente en process à tranche étiquetée ([a3a6537](https://github.com/ingentics/vision-draw-spatial/commit/a3a653783349254d47be9d9324cff6e74bfe571c))
* **engine:** forme Droid, acteur à tête de robot avec antenne ([03f0491](https://github.com/ingentics/vision-draw-spatial/commit/03f049152584a34c5f9a43c68a289b9a7931a8a9))
* **engine:** formes Process, Event consumer, Tâche de fond et Tâche récurrente ([569f25b](https://github.com/ingentics/vision-draw-spatial/commit/569f25b177fe8c70aaa47f610a69196b237e4509))
* **engine:** l'Actor tient son texte sur une pancarte en iso et en 3D ([b3beb42](https://github.com/ingentics/vision-draw-spatial/commit/b3beb42386e533d9018e053a9161972841a0d691))
* **engine:** mains de l'Actor visibles sur sa pancarte ([374c8ca](https://github.com/ingentics/vision-draw-spatial/commit/374c8ca807857b1e820590f1da8030afe3d66418))
* **engine:** mot de la tranche aussi sur le dessus en iso et en 3D ([2e6f981](https://github.com/ingentics/vision-draw-spatial/commit/2e6f981f41f78892aac54b9e6f5b896027ab2c4d))
* **engine:** mot de la tranche en façade en iso et en 3D ([688f6b3](https://github.com/ingentics/vision-draw-spatial/commit/688f6b3f3c8321b27bc3b8ae949343fec8ba3a52))
* **engine:** process étiqueté générique et paramètres d'instance dans le panneau ([f20c185](https://github.com/ingentics/vision-draw-spatial/commit/f20c185b70688aadf9780face7be4245ebf72d74))
* **engine:** profondeur des volumes qui se chevauchent au clic ([b3f537f](https://github.com/ingentics/vision-draw-spatial/commit/b3f537f6f048552c4bc2bbfd296413b80980af23))
* **engine:** réglages des effets dans les paramètres, forêt plus étendue et plus claire ([0cda9bf](https://github.com/ingentics/vision-draw-spatial/commit/0cda9bfa2da2baf54f556c80d36de3620e1b0244))
* **engine:** sauts Arc et Marche en relief en iso et en 3D ([fe64bd8](https://github.com/ingentics/vision-draw-spatial/commit/fe64bd8c243e989ed5bdf413b702edd09e1b67aa))
* **engine:** sélection de l'Actor en iso et en 3D par un cercle autour de la tête ([621323a](https://github.com/ingentics/vision-draw-spatial/commit/621323a56592ba6f417cff43df645cf69bc322a3))
* **engine:** sélection sur tout le volume en iso et en 3D ([15cae7a](https://github.com/ingentics/vision-draw-spatial/commit/15cae7aac67b4000b6b9fee769b5cd74b94d6e22))
* **engine:** tête de droid de combat et antenne à droite du visage ([51a27c6](https://github.com/ingentics/vision-draw-spatial/commit/51a27c65d9822e34e583b36624a72a70c76a2fb4))
* **engine:** texte du milieu posé le long du tracé de la flèche ([dc671db](https://github.com/ingentics/vision-draw-spatial/commit/dc671dbc4ccde17439e33b2fe513e2708e7e9c46))
* **engine:** texte du milieu qui suit la flèche ([66e2f27](https://github.com/ingentics/vision-draw-spatial/commit/66e2f270741eeecf899e9ef5f8106ae0d4b13b9d))
* **palette:** forme Titre dans la catégorie Général ([5dcd975](https://github.com/ingentics/vision-draw-spatial/commit/5dcd975f427149b983b899ab7b01521406a42c50))


### Corrections

* **app:** cadre d'édition sur la zone de texte, marges du style déduites ([4944305](https://github.com/ingentics/vision-draw-spatial/commit/4944305302a31f84e2918c3a547f7abf19414aa1))
* **app:** éditeur et poignée tournés pour le texte qui suit la flèche ([830d380](https://github.com/ingentics/vision-draw-spatial/commit/830d38093e8872c61157a47faa509af9fbb21d47))
* **app:** marges du texte en édition identiques à l'affichage ([dcc28fb](https://github.com/ingentics/vision-draw-spatial/commit/dcc28fbef6213947337ade5b89b517c81d60a6cd))
* cleanup ([271060c](https://github.com/ingentics/vision-draw-spatial/commit/271060c914e560f37586ce6a82814127520eff52))
* **engine:** flèches des poignées de connexion complètes en iso et en 3D ([2a58192](https://github.com/ingentics/vision-draw-spatial/commit/2a58192b4c5fa5634b4dcbf278bae7a4e25823dd))
* **engine:** halo des textes en morceaux sous toutes les lettres ([3cf8187](https://github.com/ingentics/vision-draw-spatial/commit/3cf81877f3551f38cc331b665fdf54a4ffac6447))
* **engine:** texte qui suit la flèche attrapé lettre par lettre ([ae40f7a](https://github.com/ingentics/vision-draw-spatial/commit/ae40f7ae3e3cd3eca3f21bd376777dc4009b4670))
* **engine:** zone de clic de l'Actor en iso et en 3D limitée à sa silhouette ([161d218](https://github.com/ingentics/vision-draw-spatial/commit/161d218ada2798effbd7cf66cb714ed76b6e9df7))
* **palette:** infobulle jamais cachée par la barre des onglets ([8ad8e46](https://github.com/ingentics/vision-draw-spatial/commit/8ad8e460745699cc78db1f1d8272fd605cccdbe9))

## [0.2.0](https://github.com/ingentics/vision-draw-spatial/compare/drawio-spatial-v0.1.0...drawio-spatial-v0.2.0) (2026-10-05)


### Fonctionnalités

* **app:** couleurs de la vue graphe et de la mini-carte dans les paramètres ([e7515ea](https://github.com/ingentics/vision-draw-spatial/commit/e7515ea9504a7b4ac5fc7d288ac20efa76efc39a))
* **app:** fichiers récents, largeur de la zone de dessin et aller-retour du graphe dans les paramètres ([2ec1a65](https://github.com/ingentics/vision-draw-spatial/commit/2ec1a651d7d6f57ffc05ec9ed27d9cb1ae459add))
* **app:** pas du déplacement au clavier dans les paramètres ([4959581](https://github.com/ingentics/vision-draw-spatial/commit/4959581daf490f16f81c2f9b63d3b9f6561c86e7))
* **app:** pastille et texte des flèches de séquence face à la caméra au choix ([80456e8](https://github.com/ingentics/vision-draw-spatial/commit/80456e87b8179cdc7937f4b3f7c218e088063075))
* **app:** recherche dans les récents et les exemples du lanceur ([b23d720](https://github.com/ingentics/vision-draw-spatial/commit/b23d72076d4256a6423c1c0a2d4af34bd4f29593))
* **app:** réglages d'édition et de navigation dans les paramètres ([a7ca2da](https://github.com/ingentics/vision-draw-spatial/commit/a7ca2dad0c0a24b6ace6a022408eab2026c37d43))
* **app:** réglages de l'ancrage automatique dans les paramètres ([eb9c5f5](https://github.com/ingentics/vision-draw-spatial/commit/eb9c5f50d15fa604da820aa60a3ffe501983e9e7))
* **engine:** ancrage automatique des flèches ([b638339](https://github.com/ingentics/vision-draw-spatial/commit/b638339dfc26ae565208bf07375944b5c66a391c))
* **engine:** autre agencement en ancrage automatique à la touche F ([a73c103](https://github.com/ingentics/vision-draw-spatial/commit/a73c10367a8b68893b817fc2715d1c5f9b3f5d29))
* **engine:** bout de flèche perpendiculaire à son point d'ancrage ([861dc4a](https://github.com/ingentics/vision-draw-spatial/commit/861dc4a46d57f56cd5f212e0b840be9c095fb4bc))
* **engine:** déplacer la sélection aux flèches du clavier ([a8df974](https://github.com/ingentics/vision-draw-spatial/commit/a8df974bdddaf0a67860254d873aa9fdbe525bae))
* **engine:** flèche qui boucle sur sa propre forme ([93f2078](https://github.com/ingentics/vision-draw-spatial/commit/93f2078547e35dd671a22541f9cb1c8b39459397))
* **engine:** pastille de lien retirée des formes liées ([4522e7e](https://github.com/ingentics/vision-draw-spatial/commit/4522e7e13fcbf76b5f2af92f5fa4d2a3842dec9f))
* **engine:** poignées de connexion dans les quatre directions ([2605ac7](https://github.com/ingentics/vision-draw-spatial/commit/2605ac74837e7b8fc086ca98f56fa07eff5351b0))
* **engine:** point d'ancrage libre à l'arrivée d'une flèche ([8c4e850](https://github.com/ingentics/vision-draw-spatial/commit/8c4e850de49fa3344f987794ab0daae9185404c8))
* **engine:** points d'ancrage subdivisés en mode manuel ([8ed2096](https://github.com/ingentics/vision-draw-spatial/commit/8ed2096981f412bc8e765905f5b2cafec6f197ff))
* **engine:** suivre un lien à Espace + clic ([954e0cc](https://github.com/ingentics/vision-draw-spatial/commit/954e0ccc826b181fd6d6c5243c65c45e0b512674))
* **engine:** tout sélectionner à ⌘ + A sur la zone de dessin ([5625d1b](https://github.com/ingentics/vision-draw-spatial/commit/5625d1bbd4b0e3c6b0a245ecbf7ffc58be298525))
* **engine:** tracé automatique qui contourne les formes et les flèches ([25a4808](https://github.com/ingentics/vision-draw-spatial/commit/25a4808a1d77eb80e5944f3f46865c361934ef28))
* **engine:** variante de placement d'une flèche à la touche F ([2a42ac1](https://github.com/ingentics/vision-draw-spatial/commit/2a42ac1fd5c84d80e9cd3dd67230558add12b96d))


### Corrections

* **engine:** ancres prises par les attaches auto et par le bout déplacé ([bb7c20d](https://github.com/ingentics/vision-draw-spatial/commit/bb7c20d7dd19e2e93effc4c2492ba0f9315e8340))
* **engine:** croisements évités en ancrage automatique ([58ef0a9](https://github.com/ingentics/vision-draw-spatial/commit/58ef0a99d664a8d2d9ebc173296017cc25de07e4))
* **engine:** rendu net sur écran Retina ([20fdf01](https://github.com/ingentics/vision-draw-spatial/commit/20fdf01376f7dae1c3ab1b465222e47277c2ae27))
