# Choix du moteur de rendu PlantUML

> Itération — paramètres et fenêtre d'export des flux ; reprise de 98

- Paramètres globaux, section « Exporteurs », sous-section « PlantUML » : moteur de rendu au choix, kroki.io (défaut),
  plantuml.com ou serveur local ; pour le serveur local, une zone de saisie libre pour son URL (défaut
  `http://localhost:8080`). Réglage `exporters.plantuml.renderer` / `exporters.plantuml.localUrl` ; une URL qui ne
  commence pas par `http://` ou `https://` est refusée (valeur précédente gardée).
- Rendu : kroki.io → `https://kroki.io/plantuml/svg/<code>` ; plantuml.com → `https://www.plantuml.com/plantuml/svg/<code>` ;
  local → `<URL>/svg/<code>` (API d'un serveur PlantUML). L'éditeur en ligne reste celui de plantuml.com.
- Serveur local proposé : service `plantuml` dans `compose.yaml` (image `plantuml/plantuml-server:jetty`, profil
  `plantuml`, port `PLANTUML_PORT`, 8080 par défaut), lancé par `make plantuml`.
- **Fini quand :** changer le moteur dans les paramètres change l'adresse de l'image dans la fenêtre d'export ; l'URL
  locale saisie est reprise ; `make check` vert.
- Fait : `engine/settings.ts` — section `exporters.plantuml` (`renderer`, `localUrl` validée par `serverUrl`) ;
  `SettingsPanel.tsx` — section « Exporteurs » > « PlantUML » (choix du moteur, champ `UrlField` libre, actif pour le
  serveur local) ; réglage transmis par `Viewer` → `ContextPanel` → `ModePanelProps.exporters` → `ExportViewer` ;
  `plantumlServer.ts` — adresse du rendu selon le moteur ; message « Rendu impossible : <serveur> ne répond pas ».
  `compose.yaml` : service `plantuml` (profil `plantuml`), `Makefile` : `make plantuml` / `make plantuml-down`.
  Tests : `tests/engine/settings.test.ts`, `tests/app/plantumlServer.test.ts`. Vérifié dans l'appli : les trois
  moteurs donnent l'adresse attendue, l'URL locale saisie est reprise, un serveur local absent est signalé. Le serveur
  `make plantuml` n'a pas été lancé (image à télécharger).
