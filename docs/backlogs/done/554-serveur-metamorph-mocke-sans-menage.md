# Serveur Metamorph mocké sans ménage

> Dette vue à l'audit 542 (reprise de 538) — appli

- `src/app/metamorph/metamorphServer.ts:135,179` : la Map `sent` n'est jamais vidée et le `setTimeout` (l.162) n'est
  pas annulé, il peut répondre à un moteur libéré (rechargement à chaud).

- Fait (audit 542) : le mock garde ses propositions par forme demandée : une nouvelle demande pour la forme (Réessayer,
  réouverture) oublie les précédentes, une acceptation oublie toutes celles de la forme. Le délai simulé n'est pas
  annulé, mais le moteur refuse désormais toute réponse après sa fin (`GeneratedShapes.waits`). Écart de comportement :
  une proposition d'une demande précédente ne s'accepte plus (le panneau ne la montre déjà plus). Tests :
  `tests/app/metamorph/metamorphServer.test.ts`, réponse tardive dans `generatedShapes.test.ts`. Vérifié par les tests
  seulement.
