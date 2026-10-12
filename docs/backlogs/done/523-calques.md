# Calques

> Milestone 2 — Éditeur. Calques natifs draw.io (`<mxCell>` enfants de la cellule racine), déjà lus par le modèle
> (`page.layers`, `layerId`) mais pas éditables.

- **Moteur.** Tout élément appartient à un calque ; la page en a toujours au moins un (le « principal », le premier,
  créé d'office). L'ordre des calques est l'ordre de rendu : tout ce qui est sur un calque est dessiné au-dessus des
  calques précédents, quel que soit l'ordre des cellules dans le fichier (le `z` du modèle suit le rang du calque).
  Une cellule créée (palette, flèche tirée, collage) est écrite à la fin du bloc de son calque dans le fichier.
- **Calque courant** (état de session par page, jamais écrit, oublié au chargement) : par défaut le premier calque.
  Tout ce qu'on dépose, tire, colle ou duplique va sur le calque courant ; s'il est masqué ou verrouillé, sur le plus
  haut calque visible et déverrouillé (à défaut, sur le courant).
- **Opérations** (une étape d'annulation chacune) :
  - ajouter : nouveau calque au-dessus de tous, nommé « Calque N » (premier N libre), qui devient courant ;
  - renommer : `value` de la cellule du calque ; un calque sans nom s'affiche « Principal » ;
  - monter / descendre d'un rang (bloc du calque et de son contenu déplacé dans le fichier) ;
  - supprimer, avec son contenu (comme une suppression : les flèches reliées à ce contenu partent aussi),
    confirmation si le calque n'est pas vide ; **impossible sur le dernier calque** ;
  - masquer / afficher (`visible="0"` sur la cellule du calque) : contenu ni dessiné, ni cliquable ;
  - verrouiller / déverrouiller (`locked=1` dans le style du calque) : contenu dessiné, mais ni cliquable, ni
    sélectionnable (rectangle, tout sélectionner), ni accrochable par une flèche ; le clic passe au travers (un lien
    porté par ce contenu ne se suit plus au clic) ;
  - déplacer la sélection vers un calque (éléments posés directement sur un calque, avec leur contenu ; un élément
    dans un conteneur suit son conteneur) : panneau d'une forme, d'une flèche ou de N éléments.
  Masquer ou verrouiller un calque retire son contenu de la sélection.
- **Modes.** Un mode n'a pas de calques sauf s'il les active (`page.layers: true` dans sa définition) ; aucun mode
  existant ne les active. Une page sans mode les a. Sur une page sans calques, la section n'est pas montrée et tout
  va sur le premier calque (les visibilités et verrous déjà écrits dans le fichier restent respectés).
- **Appli.** Panneau de la page (rien de sélectionné) : section « Calques », du plus haut au plus bas ; par calque :
  œil, cadenas, nom (clic : devient courant, mis en valeur ; double-clic : renommer), monter, descendre, supprimer ;
  bouton « Ajouter un calque ». Panneau d'une sélection : choix « Calque » (le calque de la sélection, ou vide si
  plusieurs) qui y déplace la sélection. Lecture seule : section affichée, actions désactivées.
- **Fini quand :** sur une page sans mode, on ajoute deux calques, on dépose une forme sur chacun, on les réordonne
  (le rendu suit), on en masque, verrouille, renomme, supprime un (son contenu part, une seule annulation) ; le dernier
  calque n'a pas de bouton supprimer actif ; une page en mode (ex. Séquences) n'a pas la section ; l'export s'ouvre
  dans draw.io avec les mêmes calques.
- Fait : modèle (`LayerModel.locked`, `z` par rang de calque, `core/format/cellIndex.ts`), règles partagées
  « dessiné / touchable » (`core/model/layerRules.ts`, reprises par le rendu, le clic, la sélection, l'accroche et la
  mini-carte), fichier (`core/format/layerTree.ts`, `layerEdits.ts` ; `create.ts` et `clipboardCells.ts` écrivent à la
  fin du bloc du calque), choix (`core/edit/layerChoice.ts`), domaine `core/domains/document/pageLayers.ts` (calque
  courant, opérations, événement `layerChange`), `page.layers` des modes (`core/modes/types.ts`, `registry.hasLayers`),
  façade `Engine`, appli (`src/app/context/LayersSection.tsx`, champ « Calque » dans Disposition). Écart de
  comportement : relire le document retire de la sélection les éléments devenus intouchables. Tests :
  `layerEdits`, `layerChoice`, `layerRules`, `pageLayers` ; vérifié à l'œil sur `fixtures/layers.drawio` (afficher,
  ajouter, déposer, changer de calque, verrouiller, descendre, supprimer, annuler ; section absente en mode).
  `make drawio-check` non lancé.
