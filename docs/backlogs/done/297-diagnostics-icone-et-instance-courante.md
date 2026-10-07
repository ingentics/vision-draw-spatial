# Diagnostics : icône stéthoscope, tout au même endroit, instance courante seulement

> Itération — Diagnostics (reprise de `DiagnosticsPanel`, SPEC §8.4) ; issu de l’idée « Diagnostic : composant
> à part entière »

- **Bouton** : le bouton texte « Diagnostics » de la barre d'outils devient une **icône stéthoscope** 16 × 16, dans le
  style des icônes des modes (trait gris `--muted`, détail en `--accent`), avec la pastille du nombre de problèmes et
  l'aide au survol « Diagnostics ». Le réglage « Bouton « Diagnostics » » des paramètres est gardé : il masque l'icône.
- **Tout au même endroit** : le panneau regroupe tout ce qui est à signaler sur l'instance courante, en sections :
  - **Erreurs** : erreurs des plugins (`PluginGuard`, sujet 288) et erreur de l'appli (chargement, sauvegarde) ;
  - **Non supportés** : styles non supportés, comme aujourd'hui (fréquence, pages, exemple de style, occurrences) ;
  - **Avertissements** : avertissements de lecture, des modes et des effets.
  Une erreur de plugin porte un niveau `error` dans `ParseWarning` (moteur) pour être rangée sous Erreurs.
- **Instance courante uniquement** : suppression de l'onglet « Tous les fichiers », du cumul en `localStorage`
  (`diagnosticsLog.ts` : `recordFile`, `cumulativeEntries`, `clearLog`), du bouton « Vider le cumul » et de la part
  « cumul » de l'export JSON (qui garde rapport, avertissements et erreurs du fichier courant). Le module
  restant (export) devient `diagnosticsExport.ts`.
- SPEC §8.4 mise à jour.
- **Fini quand :** l'icône stéthoscope remplace le bouton texte, avec la pastille ; ouvert sur une fixture à formes
  non supportées et à avertissements, le panneau montre les sections Erreurs / Non supportés / Avertissements sans
  onglets ; une erreur de plugin (test) apparaît sous Erreurs ; l'export JSON n'a plus de cumul ; `make check` vert.
- Fait : icône stéthoscope (`Viewer.tsx`, `main.css`), pastille gardée, réglage gardé (libellé mis à jour) ; panneau
  sans onglets en sections Erreurs / Non supportés / Avertissements (`DiagnosticsPanel.tsx`) ; niveau `error` ajouté à
  `ParseWarning`, posé par `PluginGuard` (test dans `pageModes.test.ts`) ; erreur de l'appli (chargement, sauvegarde)
  sous Erreurs et dans l'export ; cumul supprimé, `diagnosticsLog.ts` devenu `diagnosticsExport.ts` ; export renommé
  `<fichier>-diagnostics.json`, sans cumul ; la clé `localStorage` déjà écrite n'est pas nettoyée (pas de migration) ;
  SPEC §8.4 à jour. Vérifié à l'œil sur `fixtures/broken.drawio` (icône, pastille 2, avertissements des pages
  illisibles) ; section Erreurs vérifiée par test seulement.
