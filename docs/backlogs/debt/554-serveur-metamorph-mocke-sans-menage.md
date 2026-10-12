# Serveur Metamorph mocké sans ménage

> Dette vue à l'audit 542 (reprise de 538) — appli

- `src/app/metamorph/metamorphServer.ts:135,179` : la Map `sent` n'est jamais vidée et le `setTimeout` (l.162) n'est
  pas annulé, il peut répondre à un moteur libéré (rechargement à chaud).
