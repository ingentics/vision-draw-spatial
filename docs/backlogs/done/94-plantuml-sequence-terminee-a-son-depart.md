# PlantUML : une séquence se termine là où elle a commencé

> Itération — export PlantUML des flux ; reprise de 92 et 93

- La source de la première flèche est l'initiateur de la séquence : son aller ne se referme qu'à la fin du flux.
- Tant que la séquence est ouverte, une flèche qui part de l'initiateur ne remonte pas la pile : elle part du
  participant actif (dernière cible activée), comme un consommateur d'événements. Ex. Notifications → BUS « Read »,
  puis Notifications → Mailjet « Send » donne `P1 -> P2 ++ : Read`, `P2 -> P3 ++ : Send`, `P3 --> P2 --`,
  `P2 --> P1 --`.
- Une flèche qui part d'une cible plus bas dans la pile remonte toujours jusqu'à elle.
- **Fini quand :** sur `flows.drawio` (mise à jour par l'utilisateur), « Sending flow » donne la suite ci-dessus et
  « Inscription flow » ne change pas ; `make check` vert.
- Fait : `engine/modes/sequences/export/plantuml.ts` — tant que la pile est ouverte, un aller qui part de
  l'initiateur prend pour source le participant actif au lieu de vider la pile. Tests dans
  `tests/engine/modes/sequencesExport.test.ts` : « Sending flow » de `flows.drawio` (fixture mise à jour par
  l'utilisateur : BUS, Mailjet), et le cas synthétique Client → API, API → Base, Client → Cache.
