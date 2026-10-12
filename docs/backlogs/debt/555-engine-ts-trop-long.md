# `Engine.ts` trop long

> Dette vue à l'audit 542 — tronc

- `src/engine/Engine.ts` passe de 796 à 932 lignes (bibliothèques, calques, Metamorph), délégation seule : regrouper
  les opérations par domaine (comme `engine.layers.*`) pour revenir sous 400 lignes.
