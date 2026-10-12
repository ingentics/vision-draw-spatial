# Homonymes : `setFlattened`, `WallExport`

> Dette vue à l'audit 542 — tronc et appli

- `isFlattened` / `setFlattened` désignent la vue à plat (`viewModes.ts:132`) et les calques aplatis
  (`layerSpreads.ts:23,32`) ; `WallExport` est un type du moteur (`eventstorming/export/json.ts:38`) et un composant
  React (`src/app/plugins/modes/eventstorming/index.tsx:33`).

- Fait (audit 542) : `LayerSpreads.isFlattened` / `setFlattened` renommés `layersFlattened` / `setLayersFlattened`
  (comme `Engine.setLayersFlattened`) ; `isFlattened` / `setFlattened` ne désignent plus que les volumes aplatis
  (`ViewModes`, touche V). Le composant React `WallExport` a disparu avec le sujet 549 (`ModeExportButton`) : le nom
  ne désigne plus que le type exporté du mur. Écart de comportement : aucun. Tests : `layerSpreads.test.ts` et le faux
  cœur de `pageLayers.test.ts` suivent les nouveaux noms. Vérifié par `make check`.
