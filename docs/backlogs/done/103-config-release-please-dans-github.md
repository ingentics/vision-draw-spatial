# Configuration de release-please rangée dans `.github/`

> Itération — outillage (CI) ; reprise de 102

- La config et le manifeste de release-please quittent la racine pour `.github/` ; le workflow pointe vers eux.
- **Fini quand :** plus de fichier release-please à la racine ; `make check` vert.
- Fait : `release-please-config.json` → `.github/release-please-config.json`, `.release-please-manifest.json` →
  `.github/release-please-manifest.json` (plus caché, donc sans point) ; `config-file` et `manifest-file` mis à jour
  dans `.github/workflows/release-please.yml`. Les chemins de la config (`.`, `desktop/…`) restent relatifs à la
  racine du dépôt. `make check` vert.
