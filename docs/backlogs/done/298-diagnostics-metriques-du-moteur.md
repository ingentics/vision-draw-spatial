# Diagnostics : métriques du moteur

> Itération — Diagnostics ; issu de l'idée « Diagnostic : composant à part entière », après 297

- Section **Métriques** du panneau Diagnostics, pour auditer le fonctionnement et les perfs de **l'instance courante**
  du moteur :
  - **Frames** : FPS et durée de frame (moyenne et pire) sur les dernières secondes ;
  - **Chargement** : durée de lecture du fichier (décodage + parsing) et de construction de la scène de la page
    courante ;
  - **Scène et GPU** : nombre de cellules du document, d'objets de la scène courante, de draw calls de la dernière
    frame, géométries et textures en mémoire (`renderer.info` de Three.js).
- Collecte côté moteur, exposée par la façade (`Engine`) ; **coût négligeable quand le panneau est fermé** (la mesure
  des frames ne tourne que panneau ouvert ; les durées de chargement sont deux `performance.now()`).
- Rafraîchissement de la section environ une fois par seconde, panneau ouvert.
- Hors périmètre (reste une idée) : mode actif et temps passé dans ses points d'entrée.
- **Fini quand :** panneau ouvert sur une fixture, la section Métriques montre FPS, durées de frame, durées de
  chargement, comptes de cellules / objets / draw calls, géométries et textures, à jour quand on change de page ou
  qu'on tourne la caméra ; panneau fermé, aucune mesure de frame ne tourne (test) ; `make check` vert.
- Fait : domaine `Metrics` (`core/domains/runtime/metrics.ts`, inscrit au chargement) : durée de lecture
  (`DocumentFile.load`), durée de construction de chaque scène (`SceneView.buildScene`), images rendues mesurées dans
  `Rendering.requestRender` seulement si la mesure est active, comptes lus à la demande ; compteurs de
  `renderer.info` remis à zéro par image et non plus par passe (le fondu enchaîné en compte deux). Façade :
  `getMetrics()`, `setFrameSampling(on)` ; types `EngineMetrics`, `FrameStats` exportés. Section Métriques du
  panneau relue chaque seconde, mesure activée à son affichage et coupée à sa fermeture. SPEC §8.4 à jour. Vérifié à
  l'œil sur `fixtures/shapes.drawio` en iso (879 cellules, 4197 objets, lecture 13 ms, scène 36,6 ms, ~31–40 images/s
  en bougeant la caméra) et mesure coupée panneau fermé ; calcul et activation vérifiés par test
  (`metrics.test.ts`). Dette notée : 312.
