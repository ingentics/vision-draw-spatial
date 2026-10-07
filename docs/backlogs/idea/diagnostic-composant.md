# Diagnostic : composant à part entière

> Idée — Diagnostics (reprise de `DiagnosticsPanel`, SPEC §8.4)

- Le bouton texte « Diagnostics » de la barre d'outils devient une **icône stéthoscope**, dans le style des icônes
  des modes.
- **Icône grisée (disabled)** quand il n'y a rien à dire ; **dégrisée** dès qu'il y a quelque chose à porter à
  l'attention de l'utilisateur.
- Une fois ouvert, le composant regroupe **tous les warnings et erreurs** (styles non supportés, avertissements de
  lecture, et le reste).
- Périmètre : **l'instance courante du moteur** uniquement. Ménage : supprimer l'onglet « Tous les fichiers », le
  cumul en `localStorage` (`diagnosticsLog.ts`), le bouton « Vider le cumul » et sa part dans l'export JSON.
- À trancher : sort du réglage « Bouton « Diagnostics » » dans les paramètres (garder ou supprimer, l'icône grisée
  rendant le masquage moins utile).
