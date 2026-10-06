# Réglages de tracé lus selon l'ancrage

> Itération — moteur (ancrage des flèches, paramètres) ; dette technique

- `core/edit/edges/arrangement.ts` reconstruit les options de tracé à la main pour l'automatique et pour le Typon
  (même liste de clés, préfixe `edgePcb…` en plus) dans un `if (=== 'pcb')`.
- Une fonction pure `tracingOf(shapes, anchoring)` (dans `edit/anchoring/`) rend les options et le routeur d'un
  ancrage ; `arrangement.ts` l'appelle.
- `settings/merge/shapes.ts` reprend `ANCHORINGS` de `edit/anchoring/mode.ts` au lieu de sa propre liste, et le type
  `edgeAnchoring` des réglages devient `Anchoring`.
- Les clés des réglages ne changent pas (réglages enregistrés et panneau intacts).
- **Fini quand :** une seule lecture des réglages de tracé ; tracés automatiques et Typon identiques dans l'appli ;
  `make check` vert.
- Fait : `edit/anchoring/tracing.ts` (`tracingOf`) lit les réglages par préfixe (`edge…` / `edgePcb…`) et choisit
  le routeur ; `EdgeArrangement.tracing` s'y réduit. `settings/merge/shapes.ts` reprend `ANCHORINGS`,
  `ShapeSettings.edgeAnchoring` est typé `Anchoring`. Clés des réglages inchangées. `make check` vert.
