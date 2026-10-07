# Entrée cadre la sélection

> Itération — navigation (touche `overview`, Entrée) ; `src/engine/core/view/camera.ts` (`toggleOverview`),
> `src/engine/interaction/controls/keyboard.ts`

- Sans sélection : inchangé, Entrée bascule entre la vue globale et le 1:1 sous la souris.
- Avec une sélection, Entrée fait défiler trois vues : **sélection → 1:1 → globale → sélection…**
  - **Sélection** : la boîte englobante de la sélection est cadrée (`fitBounds`
    sur cette boîte, orientation gardée, marge et zoom maximal d’« aller à l’élément » : `camera.focusPadding`,
    `camera.focusMaxZoom`).
  - **1:1** : zoom 1 ancré sous la souris, comme aujourd'hui.
  - **Globale** : la page entière, comme aujourd'hui.
- L'étape suivante se déduit de la vue courante : si elle est déjà la vue sélection (même comparaison `sameView`
  que pour la vue globale), on passe au 1:1 ; si elle est au zoom 1 après la vue sélection, on passe à la globale ;
  si elle est la vue globale, on revient à la sélection ; toute autre vue (après un pan ou un zoom à la main) part de
  la vue sélection.
- Transitions animées (`animateCameraTo`), comme aujourd'hui.
- **Fini quand :** sans sélection, Entrée se comporte comme avant ; avec une forme sélectionnée, trois appuis
  successifs donnent la forme cadrée, le 1:1 sous la souris, puis la page entière, et le quatrième recadre la forme ;
  `make check` vert.
- Fait : `nextOverviewStep` (`interaction/camera.ts`) choisit l'étape du cycle `OVERVIEW_CYCLE` à partir de la
  dernière étape jouée (si la vue n'a pas bougé), sinon de la vue globale ou sélection reconnue, et saute une étape
  qui ne changerait rien ; `ViewCamera.toggleOverview` (`core/view/camera.ts`) cadre la boîte englobante de la
  sélection (formes : `bounds`, flèches : tracé dessiné) avec `camera.focusPadding` / `camera.focusMaxZoom`, garde
  la dernière étape, et enchaîne les appuis rapides pendant l'animation. Sans sélection, comportement inchangé.
  SPEC §9.3 et tableau des raccourcis mis à jour. Tests : `tests/engine/interaction/camera.test.ts` (cycle, vues
  reconnues, étape sautée). Vérifié dans l'appli.
