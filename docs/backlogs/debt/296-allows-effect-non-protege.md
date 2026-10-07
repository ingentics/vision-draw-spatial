# `allowsEffect` d'un mode non protégé

`PageModeRegistry.allowsEffect` appelle `PageModeDefinition.allowsEffect` sans la protection du sujet 288, depuis la
scène (`core/domains/view/scene.ts`, décors des effets) et depuis l'appli (`ContextPanel.tsx`, section Effets) : une
exception du mode casse le rendu de la page ou le panneau. Le faire passer par l'hôte des modes (`PageModes`), et
l'appli par le moteur.
