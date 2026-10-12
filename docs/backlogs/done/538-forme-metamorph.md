# Forme « Metamorph » : forme à générer depuis une description

> Milestone — Palette (`core/edit/palette.ts`, `plugins/shapes/categories.ts`). Génération mockée : le vrai
> générateur sera un sujet à part. Pas d'export draw.io : aucune contrainte d'export sur ce sujet.

- **Entrée** : la tuile « Metamorph » (infobulle « Metamorph : décrivez la forme voulue, elle sera générée ») est
  toujours présente dans la catégorie « Général » ; en plus, quand la recherche de la palette ne trouve **aucune
  forme**, la palette la propose à la place des résultats, avec le texte de la recherche repris comme texte de la
  forme. Elle se glisse-dépose sur la page comme une forme normale.
- **Forme Metamorph** (`plugins/shapes/general/metamorph/`) : 80 × 100 px, rectangle noir et blanc à angles droits
  (fond `#ffffff`, bordure noire de 1 px, imposés), entouré d'un **halo arc-en-ciel de 6 px qui tourne**
  (un tour en 4 s) et pulse : deux pulsations puis deux temps de pause (« vou vou, pause pause », 0,45 s par temps), en boucle ; au
  repos, il a la couleur du fond. Une icône dans le coin **haut-droit** : l'**étoile de l'IA** quand il n'y a pas de
  loader (violette `#9673a6` au brouillon, verte `#2e9d5b` quand les propositions sont prêtes). Elle porte :
  - un **texte**, édité comme celui d'une forme normale (éditeur en place) ;
  - des **instructions visuelles** (texte libre multiligne), éditées dans le panneau de la forme ;
  - un bouton **« Valider »** dans le panneau (grisé tant que texte et instructions sont vides, suivi à la frappe).
- **Cycle** (état porté par la forme, affiché sur la forme et dans le panneau) :
  1. **Brouillon** : texte et instructions modifiables, « Valider ».
  2. **« Morphing… »** (après « Valider ») : le serveur génère les propositions. Le texte de la forme (métier) reste
     affiché tel quel ; l'étoile laisse place à un **loader** (tournant) **en haut à droite** de la forme, champs en
     lecture seule. L'engine émet un événement
     `metamorphRequest` avec les infos de la forme : `{ pageId, shapeId, text, instructions, width, height, attempt }`.
  3. **Prêt** : à réception des résultats (méthode de l'engine `metamorphResults(shapeId, candidates)`), la forme
     remplace le loader par l'étoile, verte ; le
     panneau montre les **1, 2 ou 4 propositions** (aperçus cliquables) et les boutons **« Reprompt »** et
     **« Réessayer »** (à sa droite), grisés pendant « Morphing… ».
  - **Réessayer** : relance directement un cycle avec la même description (propositions effacées, retour en
    « Morphing… », `attempt` + 1).
  - **Reprompt** : retour en Brouillon (texte et instructions modifiables, propositions effacées), puis « Valider »
    relance un cycle (`attempt` + 1).
  - **Choisir une proposition** : la Metamorph est **remplacée** sur place par la forme choisie (même emprise, même
    texte, mêmes flèches attachées, même parent) — la Metamorph disparaît. Une seule entrée d'annulation.
- **Serveur mocké** (côté app, `src/app/`, derrière une interface qu'un vrai client serveur remplacera) :
  - à `metamorphRequest`, réponse après 2 s avec 1, 2 ou 4 propositions (nombre tiré au sort), construites à partir
    de formes existantes (rectangle, ellipse, losange, hexagone…) et des couleurs des styles prédéfinis. Une
    proposition : `{ id, name, category?, keywords, style, width, height }` ;
  - il **persiste au fur et à mesure** les formes acceptées (mock : stockage local du navigateur) et les fournit au
    démarrage.
- **Forme acceptée = forme plugin** : les formes Metamorph acceptées sont des **plugins de forme venus du serveur** :
  au démarrage l'app les récupère et les enregistre dans l'engine comme modèles de palette (nom, mots-clés, style,
  taille, catégorie) ; une forme acceptée en cours de session est envoyée au serveur et ajoutée aussitôt. Elle se
  retrouve par la recherche et se dépose comme les autres.
- **Catégorie « Autres »** : une proposition sans catégorie va dans la nouvelle catégorie `{ id: 'other', name:
  'Autres', order: 1000 }` (dernière de la palette) ; comme toute catégorie, elle est **masquée quand elle est vide**.
- **Réouverture** : l'état (Brouillon, Morphing…, Prêt) et les instructions sont enregistrés dans la forme. Une
  Metamorph rouverte en « Morphing… » ou « Prêt » redemande ses propositions au serveur (mock : nouveau tirage).
- **Fini quand :** dans l'appli, « Metamorph » est dans « Général » et proposée par une recherche sans résultat ;
  déposée (rectangle noir et blanc, halo arc-en-ciel qui tourne et pulse, étoile en haut à droite), on saisit texte et
  instructions, « Valider » affiche le loader en haut à droite (texte inchangé) puis l'étoile verte avec 1, 2 ou 4
  propositions ; « Réessayer » relance un cycle avec la même description, « Reprompt » permet de la modifier avant de
  valider à nouveau ; choisir une proposition remplace la Metamorph (flèches conservées, annulable) et la forme apparaît
  dans la palette, sous « Autres » si elle n'a pas de catégorie ; « Autres » n'apparaît pas tant qu'elle est vide ;
  après rechargement de la page, la forme acceptée est toujours dans la palette.
- Fait : forme `plugins/shapes/general/metamorph/` (rectangle noir et blanc imposé, `styleable: false`, halo
  arc-en-ciel de 6 px qui tourne et pulse, loader ou étoile de l'IA en haut à droite, `palette.fallback`). Cycle mené par
  le domaine `core/domains/edit/metamorphs.ts` (état `spatial.metamorph` dans le style, instructions
  `spatial.metamorphInstructions` sur l'objet ; demandes et propositions en mémoire, redemandées à l'ouverture ;
  « Valider », « Réessayer » et « Reprompt » font une étape d'annulation, l'arrivée des propositions non) ; façade
  `metamorphOf`, `setMetamorphInstructions`, `submitMetamorph`, `metamorphResults`, `retryMetamorph`,
  `repromptMetamorph`, `acceptMetamorph`, événements `metamorphRequest` et `metamorphChange`. Propositions et formes
  acceptées au format des bibliothèques de formes (529) : une forme choisie garde sa cellule (bornes, texte, parent,
  flèches) et prend le style du modèle `metamorph:<id>`. Écarts au format : `categories` et `category` d'une forme
  deviennent facultatifs, une forme sans catégorie va dans « Autres » (`OTHER_CATEGORY`, `core/shapes/library/`).
  Palette : `searchTemplates` propose les modèles `fallback` quand rien n'est trouvé, avec la requête pour texte ; le
  dépôt reprend le modèle glissé (`Viewer.tsx`). Animations : brique `core/render/animation.ts` (`spinObject`,
  `spinHues`, rythme `pulseIntensity`), le moteur redemande une image tant qu'un objet animé est visible. Appli :
  serveur mocké `src/app/metamorph/` (2 s, 1, 2 ou 4 propositions, formes acceptées dans le stockage local, rechargées
  au démarrage), section `context/MetamorphSection.tsx` (« Valider » suivi à la frappe, « Reprompt » et « Réessayer »
  grisés pendant la génération) ; la bibliothèque d'exemple ne déclare plus `metamorph` introuvable. Docs : SPEC §8.3,
  COMPOSANT, SUMMARY. Validé dans l'appli (fixture `metamorph.drawio`) : tuile et recherche sans résultat (clic et
  glisser), cycle complet, 1 et 4 propositions, remplacement (texte et flèche gardés), « Autres », persistance au
  rechargement, iso, animations (couleurs relevées dans la scène, rendu validé par l'utilisateur). Seulement par les
  tests : annuler le remplacement, refus des réponses invalides ou périmées.
