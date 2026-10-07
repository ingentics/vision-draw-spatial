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
