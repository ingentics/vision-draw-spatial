# Machine à états : export PlantUML

> Milestone — mode Machine à états ; dépend de 433, 434, 435 et 439 (PlantUML partagé) ; modèle : export des flux (90, 100)

- **Périmètre** : code moteur dans `src/engine/plugins/modes/states/` et appli dans `src/app/plugins/modes/states/`
  seulement, plus `tests/`, `fixtures/states.drawio` et la doc (SPEC, SUMMARY, `AJOUTER_UN_MODE.md` si besoin).
  Aucun changement dans `src/engine/core/` : un besoin du tronc découvert en route devient un ticket moteur à part.
- Le moteur fournit le texte (`engine/plugins/modes/states/export/plantuml.ts`, `(page) → texte`) : un diagramme
  d'états PlantUML pour toute la page.
  - **Alias** : chaque état et ensemble reçoit un alias stable dans l'export (`S1`, `S2`… dans l'ordre de dessin) ;
    un état dont le titre est un identifiant simple (`[A-Za-z_][A-Za-z0-9_]*`) et unique garde son titre comme nom ;
    sinon il est déclaré `state "Titre long" as S3` (aides `quote` / `oneLine` de la brique partagée, sujet 439).
  - **Contenu** : une ligne `alias : ligne` par ligne non vide du contenu.
  - **Ensemble** : `state "Nom" as S4 {` … `}` (ou `state Nom {` pour un nom simple) avec, dedans, ses états,
    ses ensembles et les transitions dont les deux bouts y sont ; imbrication à toute profondeur, indentation de
    2 espaces.
  - **Points d'entrée et de sortie** : chacun s'écrit `[*]` (sans alias ni déclaration) au niveau de l'ensemble qui
    le contient (ou de la page) ; les points de sortie dupliqués d'un même niveau ne font qu'un seul `[*]` :
    `[*] --> alias` pour une transition depuis un point d'entrée, `alias --> [*]` vers un point de sortie, avec
    ` : nom` si elle est nommée. Une transition d'un état vers un point de sortie d'un autre niveau s'écrit au niveau
    du point de sortie (PlantUML lie `[*]` au bloc où il est écrit). Un point sans transition n'est pas écrit.
  - **Transitions** : `source --> cible` suivi de ` : nom` si la transition est nommée ; une transition qui traverse
    le bord d'un ensemble est écrite au niveau du plus petit ensemble qui contient ses deux bouts ; boucle
    `A --> A : nom`. Ordre : déclarations, puis transitions depuis les points d'entrée, puis les autres transitions dans l'ordre de
    dessin.
  - Exemple attendu (forme) :
    ```
    @startuml
    [*] --> State1
    State1 --> State2 : Succeeded
    state State3 {
      state "Accumulate Enough Data\nLong State Name" as S4
      S4 : Just a test
      [*] --> S4
      S4 --> S4 : New Data
    }
    State3 --> State3 : Failed
    State3 --> [*] : Succeeded
    State3 --> [*] : Aborted
    @enduml
    ```
- **Appli** : section « Machine à états » du panneau de la page avec un bouton « Exporter en PlantUML » qui ouvre la
  fenêtre générique `src/app/export/ExportDialog.tsx` (sujet 439) sans choix propre au mode : source copiable
  et rendu SVG par le moteur réglé dans Paramètres › Exporteurs › PlantUML.
- Une transition à bout libre (signalée, sujet 434) n'est pas écrite.
- **Fini quand :** sur la fixture (états avec contenu, titres longs, points d'entrée, plusieurs points de sortie,
  ensemble imbriqué, transitions nommées, boucle, transition vers un ensemble), le bouton ouvre la fenêtre et le
  rendu PlantUML montre le diagramme attendu ; tests de l'exporteur (alias, échappement, imbrication, `[*]` unique
  par niveau, niveau d'écriture des transitions) ; `make check` vert.
