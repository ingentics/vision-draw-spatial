# Limites de caméra propres à chaque moteur

> Idée — dette technique du moteur (caméra)

- `interaction/camera.ts` garde au niveau du module un objet `limits` mutable (`setCameraLimits`, appelé par
  `Config.applyCameraLimits`) : tous les `Engine` d'une même page partagent les bornes de zoom, d'inclinaison et le
  champ de vision, et des tests peuvent s'influencer.
- Porter ces limites par `ViewCamera` (ou les passer en paramètre aux fonctions de caméra) et supprimer l'état de
  module.
