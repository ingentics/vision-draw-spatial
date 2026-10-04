# Étape 19 — Binaire natif

> Milestone 3 — Packaging

- Wrapper Electron ou Tauri, `FsStore` basé sur le système de fichiers.
- Fait : Electron (44.5), construit dans Docker de bout en bout : runtime macOS téléchargé dans le conteneur, appli web en chemins relatifs, `.app` assemblée et signée ad hoc par `rcodesign`, `.zip` (Linux : `tar.gz`). `FsStore` (vrais chemins, vue dans `library.json`), dialogues Ouvrir / Enregistrer sous, glisser-déposer avec chemin, sauvegarde directe. `make desktop`, `desktop-dev`, `desktop-package`, `desktop-install`, `desktop-lock`.
- Validé sur macOS 14 (arm64) : signature acceptée par `codesign --deep --strict`, appli lancée, fichier réel ouvert depuis la bibliothèque, forme déplacée à la souris et Ctrl+S : seuls la géométrie et `spatial.view` changent sur le disque ; `make desktop-dev` affiche le serveur de dev.
