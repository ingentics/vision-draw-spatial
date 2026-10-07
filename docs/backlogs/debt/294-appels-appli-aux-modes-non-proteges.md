# Appels de l'appli aux modes non protégés

Les champs génériques du panneau (`src/app/plugins/modes/ModeFields.tsx` : `value`, `options`, `hidden`, `readOnly` d'un
`ModeProperty`) appellent le mode directement, hors de la protection du moteur (sujet 288) : une exception d'un mode y
casse le panneau React. Les faire passer par le moteur, ou les protéger côté appli.
