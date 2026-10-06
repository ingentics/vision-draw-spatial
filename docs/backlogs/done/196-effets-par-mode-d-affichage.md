# Un effet déclare ses modes d'affichage

> Itération — effets de page ; reprise de 143, s'appuie sur 178

- Un effet déclare les modes d'affichage où il existe (`viewModes` : 2D, iso, 3D ; absent = tous), comme un mode de
  page. La forêt : iso et 3D.
- Sur une page dont le mode n'affiche aucun de ces modes (ex. Séquences, 2D seulement), l'effet est inactif : pas de
  décor, et il n'est pas listé dans le panneau (pas plus qu'un effet refusé par le mode ; section masquée s'il n'en
  reste aucun).
- **Fini quand :** sur une page Séquences, la forêt n'est pas proposée ; sur une page normale, la forêt pousse
  en iso / 3D comme avant ; `make check` vert.
- Fait : `viewModes` dans `PageEffectDefinition` (`src/engine/effects/types.ts`), `['iso', '3d']` pour la forêt ;
  `PageModeRegistry.allowsEffect(page, effect)` vérifie aussi les modes d'affichage, et le registre des effets filtre
  sur la définition (`src/engine/effects/registry.ts`, `src/engine/core/view/scene.ts`). Panneau : seuls les effets
  disponibles sont listés, section masquée sinon (`src/app/ContextPanel.tsx`). Test dans
  `tests/engine/modes/sequences.test.ts`. Vérifié dans l'appli sur `fixtures/flows.drawio` : pas de section Effets
  sur la page Séquences.
