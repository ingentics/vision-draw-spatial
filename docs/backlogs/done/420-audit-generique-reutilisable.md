# Procédure d'audit générique, réutilisable comme skill

> Itération — docs (reprise de l'audit qualité du moteur, sujets 376 à 391)

- `AUDIT.md` (racine) passe dans `docs/AUDIT.md` et devient une procédure d'audit qualité indépendante du projet :
  plus de chemins, numéros de sujets, commandes ni constats propres à Drawio Spatial ; ce qui dépend du projet est
  découvert au lancement (fichiers d'instructions, système de tickets, commande de vérification, docs d'architecture).
- En-tête YAML `name` / `description` : le fichier peut être copié tel quel en `SKILL.md` d'un skill Claude Code.
- Les constats de la troisième passe restent dans l'historique git et les sujets 376 à 391.
- **Fini quand :** `docs/AUDIT.md` ne cite rien de propre au projet, se lit comme un skill, et `make check` passe.
- Fait : `AUDIT.md` déplacé en `docs/AUDIT.md` et réécrit sans rien de propre au projet : étape 0 de découverte
  (instructions, vérification, tickets, architecture, passes précédentes), cadrage, sept axes (dont les erreurs
  réelles), méthode en cinq temps, livrables, modèle du fichier de suivi, mode d'emploi comme skill. En-tête YAML
  `name` / `description`. Chemins d'exemple écrits avec `<…>` pour `tests/docs/paths.test.ts`. Validé par
  `make check` ; rien à voir dans l'appli.
