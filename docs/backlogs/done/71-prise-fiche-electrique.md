# Prise en fiche électrique

> Itération — formes (Architecture) ; reprise de 55

- Le dessin de la prise devient une fiche électrique vue de face : deux broches en haut, un corps rectangulaire, le
  bas en trapèze (pans coupés). Stencil `plug` de 120 × 100 : broches de x 27 à 47 et de 73 à 93 sur y 0 à 25, corps
  de y 25 à 77 sur toute la largeur, bas de x 37 à 83 en y 100. Symétrique, un seul contour fermé.
- Palette : 96 × 80, aperçu au nouveau dessin.
- **Fini quand :** la prise se crée depuis la palette avec ce dessin, en 2D et en volume ; dans `shapes.drawio`
  régénérée, ses contours tombent sur l'export SVG de draw.io (`make drawio-check`) ; `make check` vert.
- Fait : nouveau contour `PLUG_PATH` (stencil 120 × 100) et aperçu de palette dans
  `shapes/impl/architecture/plug/index.ts`, palette 96 × 80 ; SPEC §8.3 mise à jour. Fixture `shapes.drawio`
  régénérée (`WRITE_FIXTURES=1`) ; `make drawio-check` : les 20 prises (directions, retournements) tombent au pixel
  près sur l'export SVG de draw.io. Vérifié dans l'appli : ajout depuis la palette, dessin et aperçu.
