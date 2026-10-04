# Étape 6 — Persistance et lanceur

> Milestone 1 — Viewer

- Interface `FileStore` + `IndexedDbStore` (+ `MemoryStore` de repli et pour les tests).
- Lanceur : fichiers récents, ouvrir (sélecteur + glisser-déposer partout), nouveau fichier, retrait de la liste, exemples.
- Mémorisation de la caméra par page, de la dernière page active, de la pile de navigation et de l'usage des liens (debounce 500 ms + à la fermeture).
- **Fini quand :** en rouvrant l'application, on retrouve le fichier, la page et le point de vue exacts.
