# Boutons de vue désactivés grisés

> Itération — barre d'outils (modes d'affichage) ; reprise de 178

- Un mode d'affichage indisponible sur la page (ex. Iso et 3D en mode Séquences) a son bouton grisé, comme les autres
  boutons désactivés : texte atténué (`--muted`), opacité 0,6. Vaut pour tous les boutons de groupe désactivés.
- **Fini quand :** sur une page Séquences, Iso et 3D apparaissent grisés ; `make check` vert.
- Fait : `.group-button:disabled` dans `src/app/main.css` reprend le style de `.button:disabled`. Vérifié dans
  l'appli sur `fixtures/flows.drawio`.
