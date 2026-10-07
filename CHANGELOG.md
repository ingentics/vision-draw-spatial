# Changelog

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
