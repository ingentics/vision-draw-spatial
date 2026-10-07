# `allowsEffect` d'un mode non protégé

`PageModeRegistry.allowsEffect` appelle `PageModeDefinition.allowsEffect` sans la protection du sujet 288, depuis la
scène (`core/domains/view/scene.ts`, décors des effets) et depuis l'appli (`ContextPanel.tsx`, section Effets) : une
exception du mode casse le rendu de la page ou le panneau. Le faire passer par l'hôte des modes (`PageModes`), et
l'appli par le moteur.

Fait :
- `PageModes.allowsEffect(page, effect)` : la décision du mode est protégée (sujet 288) ; en panne, elle est traitée
  comme absente (effet permis), et les modes d'affichage de l'effet sont toujours vérifiés. Le registre gagne
  `effectViewable` (cette seconde moitié), que `allowsEffect` réutilise.
- La scène (`core/domains/view/scene.ts` : décors des effets, page en volume ou non) passe par l'hôte des modes.
- L'appli passe par la façade, `engine.allowedEffects(page)` (ids des effets permis), exposée par `AppPlugins` ;
  `ContextPanel.tsx` n'appelle plus le mode.
- La table des garanties de `AJOUTER_UN_MODE.md` donne le nouveau repli.
- Tests : `allowsEffect` qui refuse, et qui lève une exception, dans `pageModes.test.ts` ; `tests/app/plugins.test.ts`
  vérifie que l'appli n'appelle plus `modes.allowsEffect`.
- Validation :
  - `make check` vert (110 fichiers, 2049 tests) ;
  - dans l'appli : la section Effets propose la forêt sur la fixture des formes, et pas sur la page RDD (2D
    seulement) ; la forêt pousse en iso une fois cochée (décochée ensuite).
